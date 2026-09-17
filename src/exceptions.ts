/**
 * Base class of every error thrown by the SDK.
 * Catch this to handle all SDK failures in one place.
 */
export class CaptchaError extends Error {
  constructor(message: string) { super(message); this.name = 'CaptchaError'; }
}

/**
 * The API answered with a non-zero `errorId`.
 *
 * Covers invalid keys, zero balance, unsolvable or rejected captchas and
 * every other error the service reports explicitly. {@link errorCode} holds
 * the machine-readable code, e.g. `'ERROR_KEY_DOES_NOT_EXIST'`.
 */
export class ApiError extends CaptchaError {
  /** Machine-readable error code from the API, e.g. `'ERROR_ZERO_BALANCE'`. */
  errorCode: string;
  /** Human-readable description from the API. */
  errorDescription: string;

  /**
   * @param errorCode - Machine-readable error code from the API.
   * @param errorDescription - Human-readable description from the API.
   */
  constructor(errorCode: string, errorDescription: string) {
    super(`API error ${errorCode}: ${errorDescription}`);
    this.name = 'ApiError'; this.errorCode = errorCode; this.errorDescription = errorDescription;
  }
}

/**
 * The request never produced a valid API response: DNS or connection
 * failure, a non-2xx HTTP status, or a malformed body.
 */
export class NetworkError extends CaptchaError {
  /** The underlying error from `fetch`, if there was one. */
  originalError?: unknown;

  /**
   * @param message - Description of the failure.
   * @param originalError - The underlying error from `fetch`, if any.
   */
  constructor(message: string, originalError?: unknown) { super(message); this.name = 'NetworkError'; this.originalError = originalError; }
}

/**
 * The client's `timeout` elapsed: either a single HTTP request took too long,
 * or `solve()` did not receive a solution in time.
 */
export class TimeoutError extends CaptchaError { constructor(message: string) { super(message); this.name = 'TimeoutError'; } }

/**
 * Invalid input detected before any request was sent, e.g. an empty
 * `clientKey` or a `GenericTask` without a `type`.
 */
export class ValidationError extends CaptchaError { constructor(message: string) { super(message); this.name = 'ValidationError'; } }
