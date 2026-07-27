export class CaptchaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CaptchaError';
  }
}

export class ApiError extends CaptchaError {
  constructor(errorCode, errorDescription) {
    super(`API error ${errorCode}: ${errorDescription}`);
    this.name = 'ApiError';
    this.errorCode = errorCode;
    this.errorDescription = errorDescription;
  }
}

export class NetworkError extends CaptchaError {
  constructor(message, originalError) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

export class TimeoutError extends CaptchaError {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}