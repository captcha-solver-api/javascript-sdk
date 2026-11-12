import { ApiError, NetworkError, TimeoutError, ValidationError } from './exceptions.js';
import { __version__ } from './version.js';
import type { BaseTask } from './tasks.js';

const MAX_DEBUG_STRING_LENGTH = 200;
const REDACTED_DEBUG_FIELDS = /^(authorization|clientKey|cookie|cookies|password|proxyLogin|proxyPassword)$/i;

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
  /**
   * Print request and polling lifecycle events to `console.debug`.
   * Request and response bodies are included after credentials are redacted
   * and long strings such as base64 images and solution tokens are truncated.
   * @defaultValue `false`
   */
  debug?: boolean;
}

/** Raw response of `/getTaskResult` (and, structurally, of every other API endpoint). */
export interface TaskResult {
  /** `0` on success; any other value means an API error (already thrown as {@link ApiError}). */
  errorId: number;
  /** Task status: `'processing'` while a worker is on it, `'ready'` once solved. */
  status?: 'processing' | 'ready';
  /** The solution. Present only when `status` is `'ready'`; its shape depends on the task type. */
  solution?: unknown;
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
 * client.solve(task)
 *   .then(({ gRecaptchaResponse }) => console.log(gRecaptchaResponse))
 *   .catch(console.error);
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
  /** Whether lifecycle debug logging is enabled. */
  debug: boolean;

  /**
   * @param options - Client options; only `clientKey` is required.
   * @throws {ValidationError} If `clientKey` is empty.
   */
  constructor({ clientKey, baseUrl = 'https://api.captcha-solver.com', timeout = 120000, pollingInterval = 5000, debug = false }: CaptchaClientOptions = {} as CaptchaClientOptions) {
    if (!clientKey) throw new ValidationError('clientKey is required');
    this.clientKey = clientKey; this.baseUrl = baseUrl; this.timeout = timeout; this.pollingInterval = pollingInterval; this.debug = debug;
    this._debug('client initialized', { baseUrl, timeout, pollingInterval });
  }

  /**
   * Copy a value for debug output while keeping logs readable and safe to share.
   * Credential fields are removed completely; long strings retain their edges
   * and original length so base64 images and tokens can still be identified.
   */
  private _sanitizeForDebug(value: unknown, fieldName?: string): unknown {
    if (fieldName && REDACTED_DEBUG_FIELDS.test(fieldName)) return '[REDACTED]';
    if (typeof value === 'string' && value.length > MAX_DEBUG_STRING_LENGTH) {
      const edgeLength = Math.floor(MAX_DEBUG_STRING_LENGTH / 2);
      return `${value.slice(0, edgeLength)}...[truncated; original length: ${value.length}]...${value.slice(-edgeLength)}`;
    }
    if (Array.isArray(value)) return value.map((item) => this._sanitizeForDebug(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this._sanitizeForDebug(item, key)])
      );
    }
    return value;
  }

  /** Write one debug event after sanitizing every supplied field. */
  private _debug(message: string, details?: Record<string, unknown>): void {
    if (!this.debug) return;
    if (details) console.debug(`[CaptchaClient] ${message}`, this._sanitizeForDebug(details));
    else console.debug(`[CaptchaClient] ${message}`);
  }

  /** Print an HTTP exchange as one labelled JSON block instead of an ambiguous console object. */
  private _debugServerExchange(message: 'server request' | 'server response', details: Record<string, unknown>): void {
    if (!this.debug) return;
    const json = JSON.stringify(this._sanitizeForDebug(details), null, 2);
    console.debug(`[CaptchaClient] ${message}:\n${json}`);
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
    const startedAt = Date.now();
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-SDK': `javascript-sdk/${__version__}` };
    this._debug('request started', { endpoint });
    this._debugServerExchange('server request', { method: 'POST', url, headers, body: payload });
    try {
      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
      let data: TaskResult & { errorCode?: string; errorDescription?: string; error?: string };
      try {
        data = await response.json() as typeof data;
      } catch (parseError) {
        this._debugServerExchange('server response', { endpoint, status: response.status, statusText: response.statusText, body: '[unavailable: invalid JSON]' });
        if (!response.ok) throw new NetworkError(`HTTP error: ${response.status} ${response.statusText}`);
        throw parseError;
      }
      // Log the server payload first; lifecycle messages below explain how the SDK interpreted it.
      this._debugServerExchange('server response', { endpoint, status: response.status, statusText: response.statusText, body: data });
      if (!response.ok) throw new NetworkError(`HTTP error: ${response.status} ${response.statusText}`);
      if (data.errorId !== 0) throw new ApiError(data.errorCode || 'UNKNOWN_ERROR', data.errorDescription || data.error || 'Unknown API error');
      this._debug('request completed', { endpoint, status: response.status, durationMs: Date.now() - startedAt });
      return data;
    } catch (error) {
      this._debug('request failed', { endpoint, error: error instanceof Error ? error.name : 'UnknownError', durationMs: Date.now() - startedAt });
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
   * @example
   * ```ts
   * client.createTask(task)
   *   .then((taskId) => console.log(taskId))
   *   .catch(console.error);
   * ```
   */
  async createTask(task: BaseTask, languagePool: string | null = null): Promise<number> {
    const taskPayload = task.toDict();
    const taskType = typeof taskPayload.type === 'string' ? taskPayload.type : task.constructor.name;
    this._debug('task submission started', { taskType, languagePool });
    const payload: Record<string, unknown> = { clientKey: this.clientKey, task: taskPayload }; if (languagePool !== null) payload.languagePool = languagePool;
    const taskId = (await this._request('/createTask', payload)).taskId as number;
    this._debug('task created', { taskId, taskType });
    return taskId;
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
   * @example
   * ```ts
   * client.getTaskResult(taskId)
   *   .then(console.log)
   *   .catch(console.error);
   * ```
   */
  getTaskResult(taskId: number): Promise<TaskResult> { return this._request('/getTaskResult', { clientKey: this.clientKey, taskId }); }

  /**
   * Get the account balance.
   *
   * @returns Current balance in the account's currency.
   * @throws {ApiError} If the API key is invalid.
   * @throws {TimeoutError} If the request exceeded {@link timeout}.
   * @throws {NetworkError} On a transport failure.
   * @example
   * ```ts
   * client.getBalance()
   *   .then((balance) => console.log(balance))
   *   .catch(console.error);
   * ```
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
   * @example
   * ```ts
   * client.solve(task).then(console.log).catch(console.error);
   * ```
   */
  async solve<T extends BaseTask<any>>(task: T, languagePool: string | null = null): Promise<SolutionOf<T>> {
    const taskType = task.constructor.name;
    const startedAt = Date.now();
    let taskId: number | null = null;
    let resultRequestCount = 0;
    this._debug('solve started', { taskType });
    try {
      taskId = await this.createTask(task, languagePool);
      let pollAttempt = 0;
      while (true) {
        const remaining = this.timeout - (Date.now() - startedAt); if (remaining <= 0) throw new TimeoutError(`Task ${taskId} timed out after ${this.timeout}ms`);
        const delayMs = Math.min(this.pollingInterval, remaining);
        pollAttempt += 1;
        this._debug('waiting before poll', { taskId, pollAttempt, delayMs });
        await new Promise(resolve => setTimeout(resolve, delayMs));
        if (Date.now() - startedAt >= this.timeout) throw new TimeoutError(`Task ${taskId} timed out after ${this.timeout}ms`);
        resultRequestCount += 1;
        const result = await this.getTaskResult(taskId);
        const elapsedMs = Date.now() - startedAt;
        this._debug('task status received', { taskId, pollAttempt, status: result.status, elapsedMs });
        if (result.status === 'ready') {
          this._debug('task solved', { taskId, pollAttempts: pollAttempt, elapsedMs });
          this._debug('solve summary', {
            status: 'solved',
            captchaId: taskId,
            elapsedTime: `${(elapsedMs / 1000).toFixed(3)}s`,
            elapsedMs,
            resultRequestCount
          });
          return (result.solution ?? {}) as SolutionOf<T>;
        }
      }
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      this._debug('solve summary', {
        status: 'not solved',
        captchaId: taskId,
        elapsedTime: `${(elapsedMs / 1000).toFixed(3)}s`,
        elapsedMs,
        resultRequestCount
      });
      throw error;
    }
  }
}
