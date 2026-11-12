import { ApiError, NetworkError, TimeoutError, ValidationError } from './exceptions.js';
import { __version__ } from './version.js';
import type { BaseTask } from './tasks.js';

const MAX_DEBUG_STRING_LENGTH = 200;
const TRACE_ONLY_EVENTS = new Set([
  'client.initialized',
  'task.submission.started',
  'request.started',
  'request.completed',
  'poll.waiting',
  'task.solved'
]);
let operationSequence = 0;

interface DebugContext {
  solveId?: string;
  requestId?: string;
  taskId?: number;
}

/** Severity assigned to a structured debug event. */
export type DebugLevel = 'debug' | 'info' | 'error';

/** One structured event emitted while debug mode is enabled. */
export interface DebugEvent extends DebugContext {
  timestamp: string;
  level: DebugLevel;
  event: string;
  [key: string]: unknown;
}

/** Receives structured debug events. Use this to integrate a logger or file stream. */
export type DebugLogger = (event: DebugEvent) => void;

/** Debug output mode: `true` is concise, while `'trace'` includes every lifecycle event. */
export type DebugMode = boolean | 'trace';

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
   * Print structured request and polling events. `true` keeps the useful concise
   * flow; `'trace'` also includes low-level request timing and polling events.
   * Request and response bodies are included after credentials are redacted
   * and long strings such as base64 images and solution tokens are truncated.
   * @defaultValue `false`
   */
  debug?: DebugMode;
  /**
   * Optional structured event receiver used instead of the default console renderer.
   * Only called when {@link debug} is `true`.
   */
  logger?: DebugLogger;
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
  debug: DebugMode;
  /** Structured debug event receiver. */
  logger: DebugLogger;

  /**
   * @param options - Client options; only `clientKey` is required.
   * @throws {ValidationError} If `clientKey` is empty.
   */
  constructor({ clientKey, baseUrl = 'https://api.captcha-solver.com', timeout = 120000, pollingInterval = 5000, debug = false, logger }: CaptchaClientOptions = {} as CaptchaClientOptions) {
    if (!clientKey) throw new ValidationError('clientKey is required');
    this.clientKey = clientKey; this.baseUrl = baseUrl; this.timeout = timeout; this.pollingInterval = pollingInterval; this.debug = debug;
    this.logger = logger ?? ((event) => this._writeDebugToConsole(event));
    this._emitDebug('client.initialized', { baseUrl, timeout, pollingInterval }, 'info');
  }

  /**
   * Copy a value for debug output while keeping logs readable and safe to share.
   * Credentials and tokens are redacted, binary data is omitted, and other
   * long strings retain short edges plus their original length.
   */
  private _sanitizeForDebug(value: unknown, fieldName?: string): unknown {
    const normalizedField = fieldName?.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (normalizedField && /(authorization|clientkey|apikey|cookie|password|proxylogin|secret)/.test(normalizedField)) return '[REDACTED]';
    if (normalizedField && /(accesstoken|refreshtoken|^token$|grecaptcharesponse)/.test(normalizedField)) {
      return typeof value === 'string' ? `[REDACTED token; original length: ${value.length}]` : '[REDACTED token]';
    }
    if (normalizedField && /(body|image|imginstructions|pagedata)/.test(normalizedField) && typeof value === 'string' && value.length > MAX_DEBUG_STRING_LENGTH) {
      return `[OMITTED binary data; original length: ${value.length}]`;
    }
    if (normalizedField?.endsWith('url') && typeof value === 'string') {
      try {
        const url = new URL(value);
        for (const key of url.searchParams.keys()) {
          if (/(key|token|secret|password|authorization)/i.test(key)) url.searchParams.set(key, '[REDACTED]');
        }
        return url.toString();
      } catch { /* Keep non-standard URL placeholders unchanged. */ }
    }
    if (typeof value === 'string' && value.length > MAX_DEBUG_STRING_LENGTH) {
      const edgeLength = 32;
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

  /** Render one structured event for users who did not supply a logger callback. */
  private _writeDebugToConsole(event: DebugEvent): void {
    const level = event.level.toUpperCase().padEnd(5);
    const context = [event.solveId && `solve=${event.solveId}`, event.taskId !== undefined && `task=${event.taskId}`, event.requestId && `request=${event.requestId}`]
      .filter(Boolean)
      .join(' ');
    let message: string;
    if (event.event === 'server.request') {
      message = `→ ${event.method} ${event.url} body=${JSON.stringify(event.body)}`;
    } else if (event.event === 'server.response') {
      message = `← ${event.status} ${event.statusText || ''} ${event.endpoint} ${event.durationMs}ms body=${JSON.stringify(event.body)}`;
    } else {
      const details = Object.entries(event)
        .filter(([key]) => !['timestamp', 'level', 'event', 'solveId', 'taskId', 'requestId'].includes(key))
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      message = `${event.event}${details ? ` ${details}` : ''}`;
    }
    const output = `${event.timestamp} ${level} captcha-solver${context ? ` ${context}` : ''} ${message}`;
    if (event.level === 'error') console.error(output);
    else if (event.level === 'info') console.info(output);
    else console.debug(output);
  }

  /** Emit one sanitized event. Logger failures never change the SDK operation result. */
  private _emitDebug(event: string, details: Record<string, unknown> = {}, level: DebugLevel = 'debug', context: DebugContext = {}): void {
    if (!this.debug) return;
    if (this.debug !== 'trace' && TRACE_ONLY_EVENTS.has(event)) return;
    const record = this._sanitizeForDebug({ timestamp: new Date().toISOString(), level, event, ...context, ...details }) as DebugEvent;
    try { this.logger(record); } catch { /* Diagnostics must not break API calls. */ }
  }

  private _newOperationId(prefix: 'solve' | 'request'): string {
    operationSequence += 1;
    return `${prefix}-${Date.now().toString(36)}-${operationSequence.toString(36)}`;
  }

  private _errorDetails(error: unknown): Record<string, unknown> {
    if (!(error instanceof Error)) return { errorName: 'UnknownError', errorMessage: String(error) };
    const details: Record<string, unknown> = { errorName: error.name, errorMessage: error.message };
    if (error instanceof ApiError) { details.errorCode = error.errorCode; details.errorDescription = error.errorDescription; }
    return details;
  }

  private _failureReason(error: unknown): string {
    if (error instanceof TimeoutError) return 'timeout';
    if (error instanceof ApiError) return 'api_error';
    if (error instanceof NetworkError) return 'network_error';
    return 'unknown_error';
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
  protected async _request(endpoint: string, payload: Record<string, unknown>, context: DebugContext = {}, requestTimeout = this.timeout): Promise<TaskResult> {
    const effectiveTimeout = Math.max(1, Math.ceil(requestTimeout));
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), effectiveTimeout);
    const startedAt = performance.now();
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-SDK': `javascript-sdk/${__version__}` };
    const requestContext = { ...context, requestId: this._newOperationId('request') };
    this._emitDebug('request.started', { endpoint, timeoutMs: effectiveTimeout }, 'debug', requestContext);
    this._emitDebug('server.request', { method: 'POST', url, headers, body: payload }, 'debug', requestContext);
    try {
      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
      let data: TaskResult & { errorCode?: string; errorDescription?: string; error?: string };
      if (typeof response.text === 'function') {
        const rawBody = await response.text();
        try {
          data = JSON.parse(rawBody) as typeof data;
        } catch (parseError) {
          this._emitDebug('server.response', { endpoint, status: response.status, statusText: response.statusText, durationMs: Math.round(performance.now() - startedAt), body: rawBody }, 'error', requestContext);
          if (!response.ok) throw new NetworkError(`HTTP error: ${response.status} ${response.statusText}`, parseError);
          throw new NetworkError(`Invalid JSON response from ${endpoint}`, parseError);
        }
      } else {
        // The fallback keeps custom fetch implementations and lightweight test doubles compatible.
        data = await response.json() as typeof data;
      }
      const responseLevel: DebugLevel = !response.ok || !data || data.errorId !== 0 ? 'error' : 'debug';
      this._emitDebug('server.response', { endpoint, status: response.status, statusText: response.statusText, durationMs: Math.round(performance.now() - startedAt), body: data }, responseLevel, requestContext);
      if (!response.ok) throw new NetworkError(`HTTP error: ${response.status} ${response.statusText}`);
      if (!data || typeof data !== 'object') throw new NetworkError(`Invalid JSON response from ${endpoint}`);
      if (data.errorId !== 0) throw new ApiError(data.errorCode || 'UNKNOWN_ERROR', data.errorDescription || data.error || 'Unknown API error');
      this._emitDebug('request.completed', { endpoint, status: response.status, durationMs: Math.round(performance.now() - startedAt) }, 'debug', requestContext);
      return data;
    } catch (error) {
      const normalizedError = error && typeof error === 'object' && 'name' in error && error.name === 'AbortError'
        ? new TimeoutError(`Request timed out after ${effectiveTimeout}ms`)
        : error instanceof ApiError || error instanceof NetworkError
          ? error
          : new NetworkError(error instanceof Error ? error.message : String(error), error);
      this._emitDebug('request.failed', { endpoint, durationMs: Math.round(performance.now() - startedAt), ...this._errorDetails(normalizedError) }, 'error', requestContext);
      throw normalizedError;
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
    return this._createTask(task, languagePool, { solveId: this._newOperationId('solve') }, this.timeout);
  }

  private async _createTask(task: BaseTask, languagePool: string | null, context: DebugContext, requestTimeout: number): Promise<number> {
    const taskPayload = task.toDict();
    const taskType = typeof taskPayload.type === 'string' ? taskPayload.type : task.constructor.name;
    this._emitDebug('task.submission.started', { taskType, languagePool }, 'debug', context);
    const payload: Record<string, unknown> = { clientKey: this.clientKey, task: taskPayload }; if (languagePool !== null) payload.languagePool = languagePool;
    const taskId = (await this._request('/createTask', payload, context, requestTimeout)).taskId as number;
    this._emitDebug('task.created', { taskType }, 'info', { ...context, taskId });
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
  getTaskResult(taskId: number): Promise<TaskResult> { return this._request('/getTaskResult', { clientKey: this.clientKey, taskId }, { taskId }); }

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
    const startedAt = performance.now();
    const solveId = this._newOperationId('solve');
    let taskId: number | null = null;
    let resultRequestCount = 0;
    let totalRequestCount = 0;
    this._emitDebug('solve.started', { taskClass: task.constructor.name, timeoutMs: this.timeout }, 'info', { solveId });
    try {
      // Validate and serialize before counting the createTask HTTP attempt.
      task.toDict();
      const remainingForCreate = this.timeout - (performance.now() - startedAt);
      if (remainingForCreate <= 0) throw new TimeoutError(`Task creation timed out after ${this.timeout}ms`);
      totalRequestCount += 1;
      taskId = await this._createTask(task, languagePool, { solveId }, remainingForCreate);
      let pollAttempt = 0;
      while (true) {
        const remaining = this.timeout - (performance.now() - startedAt); if (remaining <= 0) throw new TimeoutError(`Task ${taskId} timed out after ${this.timeout}ms`);
        const delayMs = Math.min(this.pollingInterval, remaining);
        pollAttempt += 1;
        this._emitDebug('poll.waiting', { pollAttempt, delayMs }, 'debug', { solveId, taskId });
        await new Promise(resolve => setTimeout(resolve, delayMs));
        const remainingForResult = this.timeout - (performance.now() - startedAt);
        if (remainingForResult <= 0) throw new TimeoutError(`Task ${taskId} timed out after ${this.timeout}ms`);
        resultRequestCount += 1;
        totalRequestCount += 1;
        const result = await this._request('/getTaskResult', { clientKey: this.clientKey, taskId }, { solveId, taskId }, remainingForResult);
        const elapsedMs = Math.round(performance.now() - startedAt);
        this._emitDebug('task.status.received', { pollAttempt, status: result.status, elapsedMs }, 'debug', { solveId, taskId });
        if (result.status === 'ready') {
          this._emitDebug('task.solved', { pollAttempts: pollAttempt, elapsedMs }, 'info', { solveId, taskId });
          this._emitDebug('solve.summary', {
            status: 'solved',
            elapsedTime: `${(elapsedMs / 1000).toFixed(3)}s`,
            elapsedMs,
            createTaskRequestCount: 1,
            resultRequestCount,
            totalRequestCount
          }, 'info', { solveId, taskId });
          return (result.solution ?? {}) as SolutionOf<T>;
        }
      }
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      this._emitDebug('solve.summary', {
        status: 'not_solved',
        reason: this._failureReason(error),
        elapsedTime: `${(elapsedMs / 1000).toFixed(3)}s`,
        elapsedMs,
        createTaskRequestCount: totalRequestCount > 0 ? 1 : 0,
        resultRequestCount,
        totalRequestCount,
        ...this._errorDetails(error)
      }, 'error', { solveId, ...(taskId === null ? {} : { taskId }) });
      throw error;
    }
  }
}
