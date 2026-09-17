export class CaptchaError extends Error {
  constructor(message: string) { super(message); this.name = 'CaptchaError'; }
}
export class ApiError extends CaptchaError {
  errorCode: string;
  errorDescription: string;
  constructor(errorCode: string, errorDescription: string) {
    super(`API error ${errorCode}: ${errorDescription}`);
    this.name = 'ApiError'; this.errorCode = errorCode; this.errorDescription = errorDescription;
  }
}
export class NetworkError extends CaptchaError {
  originalError?: unknown;
  constructor(message: string, originalError?: unknown) { super(message); this.name = 'NetworkError'; this.originalError = originalError; }
}
export class TimeoutError extends CaptchaError { constructor(message: string) { super(message); this.name = 'TimeoutError'; } }
export class ValidationError extends CaptchaError { constructor(message: string) { super(message); this.name = 'ValidationError'; } }
