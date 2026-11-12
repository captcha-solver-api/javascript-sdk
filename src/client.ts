import { ApiError, NetworkError, TimeoutError, ValidationError } from './exceptions.js';
import { __version__ } from './version.js';
import type { BaseTask } from './tasks.js';

const MAX_DEBUG_STRING_LENGTH = 200;
const DEBUG_STRING_EDGE_LENGTH = 40;
const MASKED_DEBUG_FIELDS = /^(authorization|clientKey|cookie|cookies|password|proxyAddress|proxyLogin|proxyPassword)$/i;
/** Task fields that carry base64 images; their content is never useful in a log. */
const BASE64_DEBUG_FIELDS = /^(body|image|imgInstructions)$/;

/** Format a moment as local time with milliseconds and UTC offset: `2026-11-12 14:03:21.512 +03:00`. */
function formatDebugTimestamp(date: Date): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)} `
    + `${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
}

/** Describe a single error: name, `code` when present (e.g. undici `UND_ERR_CONNECT_TIMEOUT`) and message. */
function describeSingleDebugError(error: unknown): string {
  if (error instanceof ApiError) return `${error.name} ${error.errorCode}: ${error.errorDescription}`;
  if (error instanceof Error) {
    const code = 'code' in error && typeof error.code === 'string' ? ` ${error.code}` : '';
    return `${error.name}${code}: ${error.message}`;
  }
  return String(error);
}

/**
 * Describe an error in one line, following `originalError` / `cause` links.
 * `fetch` reports every transport failure as a bare `TypeError: fetch failed`;
 * the actual reason (DNS, connect timeout, TLS) is only in its `cause`.
 */
function describeDebugError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current !== undefined && current !== null && depth < 4; depth += 1) {
    const description = describeSingleDebugError(current);
    // NetworkError copies the message of the error it wraps; skip the duplicate link.
    if (!(depth === 1 && error instanceof NetworkError && current instanceof Error && current.message === error.message)) parts.push(description);
    current = current instanceof NetworkError ? current.originalError : (current as { cause?: unknown }).cause;
  }
  return parts.join(' <- ');
}

/** One part of a debug event below its line: an optional title and a JSON value. */
interface DebugSection {
  title?: string;
  value?: unknown;
}

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
   * Print one timestamped `console.debug` line per API request plus a final
   * {@link CaptchaClient.solve} summary. Request and response bodies are added
   * for task creation, errors and solved tasks; routine `processing` polls stay
   * on one line. Credentials are masked, base64 images are replaced by their
   * length and other long strings such as solution tokens are shortened.
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
    this._debug(`client initialized sdk=javascript-sdk/${__version__} baseUrl=${baseUrl} timeout=${timeout}ms pollingInterval=${pollingInterval}ms`);
  }

  /**
   * Copy a value for debug output while keeping logs readable and safe to share.
   * Credential fields are masked, base64 image fields are reduced to their
   * length, and other long strings keep their edges so tokens stay comparable.
   */
  private _sanitizeForDebug(value: unknown, fieldName?: string): unknown {
    if (fieldName && MASKED_DEBUG_FIELDS.test(fieldName)) return '[MASKED]';
    if (typeof value === 'string' && fieldName && BASE64_DEBUG_FIELDS.test(fieldName)) return `[base64, ${value.length} chars]`;
    if (typeof value === 'string' && value.length > MAX_DEBUG_STRING_LENGTH) {
      return `${value.slice(0, DEBUG_STRING_EDGE_LENGTH)}...[${value.length} chars]...${value.slice(-DEBUG_STRING_EDGE_LENGTH)}`;
    }
    if (Array.isArray(value)) return value.map((item) => this._sanitizeForDebug(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this._sanitizeForDebug(item, key)])
      );
    }
    return value;
  }

  /**
   * Write one debug event: a timestamped line, optionally followed by titled
   * sections such as `REQUEST (POST <url>):` and `RESPONSE (HTTP 200 OK):`, each with a
   * sanitized JSON value. Everything goes through a single `console.debug`
   * call so the sections cannot be separated from their line.
   */
  private _debug(message: string, sections: DebugSection[] = []): void {
    if (!this.debug) return;
    const lines = [`[${formatDebugTimestamp(new Date())}] [CaptchaClient] ${message}`];
    for (const { title, value } of sections) {
      if (title) lines.push(value === undefined ? title : `${title}:`);
      if (value !== undefined) lines.push(JSON.stringify(this._sanitizeForDebug(value), null, 2));
    }
    console.debug(lines.join('\n'));
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
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-SDK': `javascript-sdk/${__version__}` };
    let httpStatus: string | undefined;
    let data: (TaskResult & { errorCode?: string; errorDescription?: string; error?: string }) | undefined;
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
      httpStatus = `${response.status} ${response.statusText ?? ''}`.trim();
      try {
        data = await response.json() as typeof data;
      } catch (parseError) {
        if (!response.ok) throw new NetworkError(`HTTP error: ${response.status} ${response.statusText}`);
        throw parseError;
      }
      if (!response.ok) throw new NetworkError(`HTTP error: ${response.status} ${response.statusText}`);
      if (data!.errorId !== 0) throw new ApiError(data!.errorCode || 'UNKNOWN_ERROR', data!.errorDescription || data!.error || 'Unknown API error');
      this._debugExchange(endpoint, payload, startedAt, { httpStatus, response: data });
      return data!;
    } catch (error) {
      let failure: unknown = error;
      if (!(error instanceof ApiError || error instanceof NetworkError)) {
        failure = error && typeof error === 'object' && 'name' in error && error.name === 'AbortError'
          ? new TimeoutError(`Request timed out after ${this.timeout}ms`)
          : new NetworkError(error instanceof Error ? error.message : String(error), error);
      }
      this._debugExchange(endpoint, payload, startedAt, { error: failure, httpStatus, response: data });
      throw failure;
    } finally { clearTimeout(timer); }
  }

  /**
   * Log one API exchange. The line names the endpoint, task type or task ID,
   * outcome and duration. Below it come `REQUEST (POST <url>):` (the body sent,
   * credentials masked) and `RESPONSE (HTTP ...):` (the server body as
   * received); both are skipped for routine `processing` polls so long waits
   * stay readable.
   */
  private _debugExchange(endpoint: string, payload: Record<string, unknown>, startedAt: number, outcome: { response?: TaskResult; error?: unknown; httpStatus?: string }): void {
    if (!this.debug) return;
    const task = payload.task as Record<string, unknown> | undefined;
    const label = [
      endpoint.replace(/^\//, ''),
      typeof task?.type === 'string' ? task.type : null,
      payload.taskId !== undefined ? `taskId=${payload.taskId}` : null
    ].filter(Boolean).join(' ');
    const durationMs = Date.now() - startedAt;
    const { response, error, httpStatus } = outcome;

    const sections: DebugSection[] = [{ title: `REQUEST (POST ${this.baseUrl}${endpoint})`, value: payload }];
    // httpStatus is set only once the server answered; without it the request failed in transit,
    // and an explicit "none" line keeps every REQUEST paired with a RESPONSE.
    if (!httpStatus) {
      const errorName = error instanceof Error ? error.name : 'Error';
      sections.push({ title: `RESPONSE: none - no response from the server (${errorName}, ${durationMs}ms)` });
    } else {
      sections.push(response === undefined
        ? { title: `RESPONSE (HTTP ${httpStatus}, ${durationMs}ms): body is not valid JSON` }
        : { title: `RESPONSE (HTTP ${httpStatus}, ${durationMs}ms)`, value: response });
    }

    if (error === undefined) {
      const result = response?.status
        ?? (response?.taskId !== undefined ? `taskId=${response.taskId}` : undefined)
        ?? (response?.balance !== undefined ? `balance=${response.balance}` : 'ok');
      this._debug(`${label} -> ${result} (${durationMs}ms)`, response?.status === 'processing' ? [] : sections);
      return;
    }
    this._debug(`${label} -> failed: ${describeDebugError(error)} (${durationMs}ms)`, sections);
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
    const startedAt = Date.now();
    let taskId: number | null = null;
    let polls = 0;
    try {
      taskId = await this.createTask(task, languagePool);
      while (true) {
        const remaining = this.timeout - (Date.now() - startedAt); if (remaining <= 0) throw new TimeoutError(`Task ${taskId} timed out after ${this.timeout}ms`);
        await new Promise(resolve => setTimeout(resolve, Math.min(this.pollingInterval, remaining)));
        if (Date.now() - startedAt >= this.timeout) throw new TimeoutError(`Task ${taskId} timed out after ${this.timeout}ms`);
        polls += 1;
        const result = await this.getTaskResult(taskId);
        if (result.status === 'ready') {
          this._debugSolveSummary(task, startedAt, { status: 'solved', taskId, polls, result });
          return (result.solution ?? {}) as SolutionOf<T>;
        }
      }
    } catch (error) {
      this._debugSolveSummary(task, startedAt, { status: 'not solved', taskId, polls, error });
      throw error;
    }
  }

  /**
   * Log the final {@link solve} outcome. `serverSolveTime` comes from the API's
   * `createTime` / `endTime` and shows how much of the total wait was spent
   * solving versus creating the task and waiting between polls.
   */
  private _debugSolveSummary(task: BaseTask, startedAt: number, outcome: { status: 'solved' | 'not solved'; taskId: number | null; polls: number; result?: TaskResult; error?: unknown }): void {
    if (!this.debug) return;
    const { status, taskId, polls, result, error } = outcome;
    let taskType: unknown;
    try { taskType = task.toDict().type; } catch { taskType = undefined; }
    const createTime = result?.createTime; const endTime = result?.endTime;
    const fields: Array<[string, string] | null> = [
      ['status', status],
      ['taskId', String(taskId)],
      typeof taskType === 'string' ? ['taskType', taskType] : null,
      ['elapsed', `${((Date.now() - startedAt) / 1000).toFixed(3)}s`],
      typeof createTime === 'number' && typeof endTime === 'number' ? ['serverSolveTime', `${endTime - createTime}s`] : null,
      ['polls', String(polls)],
      error !== undefined ? ['error', describeDebugError(error)] : null
    ];
    const present = fields.filter((field): field is [string, string] => field !== null);
    const width = Math.max(...present.map(([name]) => name.length)) + 1;
    // One aligned "name: value" line per field; line breaks inside a value are flattened.
    const lines = present.map(([name, value]) => `  ${`${name}:`.padEnd(width)} ${value.replace(/\s*\n\s*/g, ' ')}`);
    this._debug(`SOLVE SUMMARY:\n${lines.join('\n')}`);
  }
}
