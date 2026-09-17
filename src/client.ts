import { ApiError, NetworkError, TimeoutError, ValidationError } from './exceptions.js';
import { __version__ } from './version.js';
import type { BaseTask } from './tasks.js';

/** Options accepted by the {@link CaptchaClient} constructor. */
export interface CaptchaClientOptions {
  /** Your Captcha Solver API key. Required. */
  clientKey: string;
  /**
   * API base URL. Override only for self-hosted or staging deployments.
   * @defaultValue `'https://api.captcha-solver.com'`
   */
  baseUrl?: string;
  /**
   * Maximum time in milliseconds that {@link CaptchaClient.solve} waits for a
   * solution before rejecting with {@link TimeoutError}. Also used as the
   * per-request HTTP timeout.
   * @defaultValue `120000`
   */
  timeout?: number;
  /**
   * Delay in milliseconds between `getTaskResult` polls inside
   * {@link CaptchaClient.solve}.
   * @defaultValue `5000`
   */
  pollingInterval?: number;
}

/** Raw response of `/getTaskResult` (and, structurally, of every other API endpoint). */
export interface TaskResult {
  /** `0` on success; any other value means an API error (already thrown as {@link ApiError}). */
  errorId: number;
  /** Task status: `'processing'` while a worker is on it, `'ready'` once solved. */
  status?: 'processing' | 'ready';
  /** The solution object. Present only when `status` is `'ready'`; its shape depends on the task type. */
  solution?: Record<string, unknown>;
  /** Any other fields the API returns for this endpoint (e.g. `taskId`, `balance`, `cost`). */
  [key: string]: unknown;
}

/** Solution type carried by a task class; falls back to a plain object for untyped tasks. */
export type SolutionOf<T> = T extends BaseTask<infer S> ? S : Record<string, unknown>;

/**
 * Client for the Captcha Solver API.
 *
 * Wraps the three API endpoints (`/createTask`, `/getTaskResult`, `/getBalance`)
 * and adds {@link CaptchaClient.solve}, which submits a task and polls until it
 * is solved. Uses the global `fetch`, so no connection pool needs to be opened
 * or closed.
 *
 * @example
 * ```ts
 * import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';
 *
 * const client = new CaptchaClient({ clientKey: 'your_api_key' });
 * const task = new Tasks.RecaptchaV2Proxyless({
 *   websiteURL: 'https://example.com/login',
 *   websiteKey: 'YOUR_WEBSITE_KEY'
 * });
 * const { gRecaptchaResponse } = await client.solve(task);
 * ```
 */
export class CaptchaClient {
  /** API key used for every request. */
  clientKey: string;
  /** API base URL, without a trailing slash. */
  baseUrl: string;
  /** Overall timeout for {@link solve} and per-request HTTP timeout, in milliseconds. */
  timeout: number;
  /** Delay between polls inside {@link solve}, in milliseconds. */
  pollingInterval: number;

  /**
   * @param options - Client options; only `clientKey` is required.
   * @throws {ValidationError} If `clientKey` is empty.
   */
  constructor({ clientKey, baseUrl = 'https://api.captcha-solver.com', timeout = 120000, pollingInterval = 5000 }: CaptchaClientOptions) {
    if (!clientKey) throw new ValidationError('clientKey is required');
    this.clientKey = clientKey; this.baseUrl = baseUrl; this.timeout = timeout; this.pollingInterval = pollingInterval;
  }

  /**
   * Send one JSON `POST` request to the API and validate the response envelope.
   *
   * Not part of the public API; exposed as `protected` so tests can replace
   * the transport with `jest.spyOn(client, '_request')`.
   *
   * @param endpoint - API path, e.g. `'/createTask'`.
   * @param payload - JSON body to send.
   * @throws {ApiError} If the API answered with a non-zero `errorId`.
   * @throws {TimeoutError} If the request exceeded {@link timeout}.
   * @throws {NetworkError} On a non-2xx HTTP status or any transport failure.
   * @internal
   */
  protected async _request(endpoint: string, payload: Record<string, unknown>): Promise<TaskResult> {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-SDK': `javascript-sdk/${__version__}` }, body: JSON.stringify(payload), signal: controller.signal });
      if (!response.ok) throw new NetworkError(`HTTP error: ${response.status} ${response.statusText}`);
      const data = await response.json() as TaskResult & { errorCode?: string; errorDescription?: string; error?: string };
      if (data.errorId !== 0) throw new ApiError(data.errorCode || 'UNKNOWN_ERROR', data.errorDescription || data.error || 'Unknown API error');
      return data;
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) throw error;
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
      throw new NetworkError(error instanceof Error ? error.message : String(error), error);
    } finally { clearTimeout(timer); }
  }

  /**
   * Submit a task and return its ID without waiting for the solution.
   *
   * Use this instead of {@link solve} only when you need to manage polling
   * yourself, e.g. when checking many tasks from another process.
   *
   * @param task - One of the task classes from `Tasks`.
   * @param languagePool - Worker pool selector, `'en'` or `'ru'`. `null` uses the account's default pool.
   * @returns The numeric task ID to pass to {@link getTaskResult}.
   * @throws {ApiError} If the API rejected the task.
   * @throws {TimeoutError} If the request exceeded {@link timeout}.
   * @throws {NetworkError} On a transport failure.
   */
  async createTask(task: BaseTask, languagePool: string | null = null): Promise<number> {
    const payload: Record<string, unknown> = { clientKey: this.clientKey, task: task.toDict() }; if (languagePool !== null) payload.languagePool = languagePool;
    return (await this._request('/createTask', payload)).taskId as number;
  }

  /**
   * Fetch the current status of a task created with {@link createTask}.
   *
   * This is a single poll, not a wait: call it repeatedly (as {@link solve}
   * does) until `status` is `'ready'`, then read `solution`.
   *
   * @param taskId - ID returned by {@link createTask}.
   * @returns The full API response.
   * @throws {ApiError} If the task failed on the API side.
   * @throws {TimeoutError} If the request exceeded {@link timeout}.
   * @throws {NetworkError} On a transport failure.
   */
  getTaskResult(taskId: number): Promise<TaskResult> { return this._request('/getTaskResult', { clientKey: this.clientKey, taskId }); }

  /**
   * Get the account balance.
   *
   * @returns Current balance in the account's currency.
   * @throws {ApiError} If the API key is invalid.
   * @throws {TimeoutError} If the request exceeded {@link timeout}.
   * @throws {NetworkError} On a transport failure.
   */
  async getBalance(): Promise<number> { return Number((await this._request('/getBalance', { clientKey: this.clientKey })).balance); }

  /**
   * Submit a task and wait until it is solved.
   *
   * Calls {@link createTask}, then polls {@link getTaskResult} every
   * {@link pollingInterval} milliseconds. The whole wait, including the
   * initial request, is bounded by {@link timeout}.
   *
   * @param task - One of the task classes from `Tasks`.
   * @param languagePool - Worker pool selector, `'en'` or `'ru'`. `null` uses the account's default pool.
   * @returns The `solution` object. Its type follows the task class, e.g.
   *   `{ gRecaptchaResponse }` for reCAPTCHA or `{ token, userAgent }` for Turnstile.
   * @throws {TimeoutError} If no solution arrived within {@link timeout}.
   * @throws {ApiError} If the API rejected the task or the task failed while solving.
   * @throws {NetworkError} On a transport failure.
   */
  async solve<T extends BaseTask<any>>(task: T, languagePool: string | null = null): Promise<SolutionOf<T>> {
    const taskId = await this.createTask(task, languagePool); const startedAt = Date.now();
    while (true) {
      const remaining = this.timeout - (Date.now() - startedAt); if (remaining <= 0) throw new TimeoutError(`Task ${taskId} timed out after ${this.timeout}ms`);
      await new Promise(resolve => setTimeout(resolve, Math.min(this.pollingInterval, remaining)));
      if (Date.now() - startedAt >= this.timeout) throw new TimeoutError(`Task ${taskId} timed out after ${this.timeout}ms`);
      const result = await this.getTaskResult(taskId); if (result.status === 'ready') return (result.solution || {}) as SolutionOf<T>;
    }
  }
}
