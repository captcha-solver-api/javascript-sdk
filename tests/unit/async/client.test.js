/**
 * Generic tests for CaptchaClient (transport, error handling, polling) --
 * not tied to any specific captcha type, written in async/await style.
 * Mirrors tests/unit/sync/client.test.js.
 * See <captcha_type>.test.js in this directory for per-type solve() tests.
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../../src/.
 */

import { jest } from '@jest/globals';
import { ApiError, CaptchaClient, NetworkError, Tasks, TimeoutError, ValidationError } from '@captcha-solver-api/javascript-sdk';

describe('CaptchaClient (async)', () => {
  let client;

  beforeEach(() => {
    client = new CaptchaClient({
      clientKey: 'test_key',
      timeout: 5000,
      pollingInterval: 100
    });
  });

  test('throws ValidationError when clientKey is missing', () => {
    expect(() => new CaptchaClient({})).toThrow(ValidationError);
    expect(() => new CaptchaClient()).toThrow(ValidationError);
  });

  test('sends the SDK version header', async () => {
    let requestOptions;
    global.fetch = jest.fn((url, options) => {
      requestOptions = options;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ errorId: 0, balance: '1.00' }) });
    });

    await client.getBalance();
    expect(requestOptions.headers['X-SDK']).toBe('javascript-sdk/1.1.0');
  });

  test('debug mode logs sanitized request lifecycle events', async () => {
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true });
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ errorId: 0, balance: '1.00' })
    }));

    await client.getBalance();

    expect(debug).toHaveBeenCalledWith('[CaptchaClient] request started', { endpoint: '/getBalance' });
    expect(debug).toHaveBeenCalledWith('[CaptchaClient] server request', {
      method: 'POST',
      url: 'https://api.captcha-solver.com/getBalance',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-SDK': 'javascript-sdk/1.1.0'
      },
      body: { clientKey: '[REDACTED]' }
    });
    expect(debug).toHaveBeenCalledWith('[CaptchaClient] server response', {
      endpoint: '/getBalance',
      status: 200,
      statusText: undefined,
      body: { errorId: 0, balance: '1.00' }
    });
    expect(debug).toHaveBeenCalledWith('[CaptchaClient] client initialized', {
      baseUrl: 'https://api.captcha-solver.com',
      timeout: 120000,
      pollingInterval: 5000
    });
    expect(debug).toHaveBeenCalledWith('[CaptchaClient] request completed', {
      endpoint: '/getBalance',
      status: 200,
      durationMs: expect.any(Number)
    });
    const responseLogIndex = debug.mock.calls.findIndex(([message]) => message === '[CaptchaClient] server response');
    const completedLogIndex = debug.mock.calls.findIndex(([message]) => message === '[CaptchaClient] request completed');
    expect(responseLogIndex).toBeLessThan(completedLogIndex);
    expect(JSON.stringify(debug.mock.calls)).not.toContain('secret_key');
    debug.mockRestore();
  });

  test('debug mode logs task type, task ID, and polling progress', async () => {
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true, pollingInterval: 1 });
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ errorId: 0, taskId: 12345 })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ errorId: 0, status: 'ready', solution: { token: `start-${'x'.repeat(300)}-end` } })
      }));
    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'website_key'
    });

    await client.solve(task);

    expect(debug).toHaveBeenCalledWith('[CaptchaClient] task created', {
      taskId: 12345,
      taskType: 'RecaptchaV2TaskProxyless'
    });
    expect(debug).toHaveBeenCalledWith('[CaptchaClient] task status received', {
      taskId: 12345,
      pollAttempt: 1,
      status: 'ready',
      elapsedMs: expect.any(Number)
    });
    expect(debug).toHaveBeenCalledWith('[CaptchaClient] task solved', {
      taskId: 12345,
      pollAttempts: 1,
      elapsedMs: expect.any(Number)
    });
    expect(debug).toHaveBeenCalledWith('[CaptchaClient] solve summary', {
      status: 'solved',
      captchaId: 12345,
      elapsedTime: expect.stringMatching(/^\d+\.\d{3}s$/),
      elapsedMs: expect.any(Number),
      resultRequestCount: 1
    });
    const logged = JSON.stringify(debug.mock.calls);
    expect(logged).toContain('website_key');
    expect(logged).toContain('original length: 310');
    expect(logged).not.toContain(`start-${'x'.repeat(300)}-end`);
    expect(logged).not.toContain('secret_key');
    const resultResponseLogIndex = debug.mock.calls.findIndex(([message, details]) =>
      message === '[CaptchaClient] server response' && details.endpoint === '/getTaskResult'
    );
    const resultCompletedLogIndex = debug.mock.calls.findIndex(([message, details]) =>
      message === '[CaptchaClient] request completed' && details.endpoint === '/getTaskResult'
    );
    const statusLogIndex = debug.mock.calls.findIndex(([message]) => message === '[CaptchaClient] task status received');
    expect(resultResponseLogIndex).toBeLessThan(resultCompletedLogIndex);
    expect(resultCompletedLogIndex).toBeLessThan(statusLogIndex);
    debug.mockRestore();
  });

  test('debug mode is silent by default', async () => {
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ errorId: 0, balance: '1.00' })
    }));

    await client.getBalance();

    expect(debug).not.toHaveBeenCalled();
    debug.mockRestore();
  });

  test('debug mode logs a not-solved summary after a result request fails', async () => {
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true, pollingInterval: 1 });
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ errorId: 0, taskId: 12345 })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ errorId: 1, errorCode: 'ERROR_TASK_FAILED', errorDescription: 'Task failed' })
      }));
    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'website_key'
    });

    await expect(client.solve(task)).rejects.toThrow(ApiError);

    expect(debug).toHaveBeenCalledWith('[CaptchaClient] solve summary', {
      status: 'not solved',
      captchaId: 12345,
      elapsedTime: expect.stringMatching(/^\d+\.\d{3}s$/),
      elapsedMs: expect.any(Number),
      resultRequestCount: 1
    });
    debug.mockRestore();
  });

  test('debug mode logs the original API error response before throwing', async () => {
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true });
    const errorBody = {
      errorId: 1,
      errorCode: 'ERROR_KEY_DOES_NOT_EXIST',
      errorDescription: 'Account not found'
    };
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(errorBody)
    }));

    await expect(client.getBalance()).rejects.toThrow(ApiError);

    expect(debug).toHaveBeenCalledWith('[CaptchaClient] server response', {
      endpoint: '/getBalance',
      status: 200,
      statusText: 'OK',
      body: errorBody
    });
    const responseLogIndex = debug.mock.calls.findIndex(([message]) => message === '[CaptchaClient] server response');
    const failedLogIndex = debug.mock.calls.findIndex(([message]) => message === '[CaptchaClient] request failed');
    expect(responseLogIndex).toBeLessThan(failedLogIndex);
    debug.mockRestore();
  });

  test('aborts an HTTP request after timeout', async () => {
    client.timeout = 10;
    global.fetch = jest.fn((url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));

    await expect(client.getBalance()).rejects.toThrow(TimeoutError);
  });

  test('creates task and returns taskId', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ errorId: 0, taskId: 12345 })
      })
    );

    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    const taskId = await client.createTask(task);
    expect(taskId).toBe(12345);
  });

  test('sends languagePool when provided', async () => {
    let requestBody;
    global.fetch = jest.fn((url, options) => {
      requestBody = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ errorId: 0, taskId: 12345 })
      });
    });

    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    await client.createTask(task, 'en');
    expect(requestBody.languagePool).toBe('en');
  });

  test('does not send languagePool when not provided', async () => {
    let requestBody;
    global.fetch = jest.fn((url, options) => {
      requestBody = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ errorId: 0, taskId: 12345 })
      });
    });

    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    await client.createTask(task);
    expect(requestBody.languagePool).toBeUndefined();
  });

  test('getTaskResult returns full API response', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          errorId: 0,
          status: 'ready',
          solution: { gRecaptchaResponse: 'test_response' }
        })
      })
    );

    const result = await client.getTaskResult(12345);
    expect(result.status).toBe('ready');
    expect(result.solution.gRecaptchaResponse).toBe('test_response');
  });

  test('getBalance returns balance as float', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ errorId: 0, balance: '10.50' })
      })
    );

    const balance = await client.getBalance();
    expect(balance).toBe(10.5);
  });

  test('solve polls until status is ready and returns solution', async () => {
    let callCount = 0;
    global.fetch = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ errorId: 0, taskId: 12345 })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          errorId: 0,
          status: 'ready',
          solution: { gRecaptchaResponse: 'solved_token' }
        })
      });
    });

    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    const solution = await client.solve(task);
    expect(solution.gRecaptchaResponse).toBe('solved_token');
    expect(callCount).toBe(2);
  });

  test('solve returns a string solution for a Kaleidoscope task', async () => {
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ errorId: 0, taskId: 12345 })
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ errorId: 0, status: 'ready', solution: '8' })
      }));

    const task = new Tasks.YandexSmartCaptchaKaleidoscopeTask({
      image: 'captcha-image',
      task: '[7,15,14,0]'
    });

    await expect(client.solve(task)).resolves.toBe('8');
  });

  test('throws TimeoutError when timeout exceeded', async () => {
    client.timeout = 100;
    client.pollingInterval = 200;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ errorId: 0, taskId: 12345 })
      })
    );

    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    await expect(client.solve(task)).rejects.toThrow(TimeoutError);
  });

  test('throws ApiError when a task fails during polling', async () => {
    global.fetch = jest.fn()
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ errorId: 0, taskId: 12345 })
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            errorId: 5,
            errorCode: 'ERROR_WRONG_CAPTCHA_TYPE',
            errorDescription: 'Wrong captcha type'
          })
        })
      );

    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    await expect(client.solve(task)).rejects.toThrow(ApiError);
  });

  test('throws ApiError when errorId is not zero', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          errorId: 1,
          errorCode: 'ERROR_KEY_DOES_NOT_EXIST',
          errorDescription: 'Account not found'
        })
      })
    );

    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    await expect(client.createTask(task)).rejects.toThrow(ApiError);
  });

  test('ApiError carries the string errorCode, not the numeric errorId', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          errorId: 1,
          errorCode: 'ERROR_KEY_DOES_NOT_EXIST',
          errorDescription: 'Account not found'
        })
      })
    );

    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    try {
      await client.createTask(task);
      throw new Error('expected createTask to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.errorCode).toBe('ERROR_KEY_DOES_NOT_EXIST');
    }
  });

  test('throws NetworkError on fetch failure', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Connection refused')));

    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    await expect(client.createTask(task)).rejects.toThrow(NetworkError);
  });
});

describe('CaptchaClient error edge cases (async)', () => {
  let client;

  const task = () => new Tasks.RecaptchaV2Proxyless({
    websiteURL: 'https://example.com',
    websiteKey: 'test_key'
  });

  const respond = (body) => jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body)
  }));

  beforeEach(() => {
    client = new CaptchaClient({
      clientKey: 'test_key',
      timeout: 5000,
      pollingInterval: 10
    });
  });

  test('throws NetworkError on a non-2xx HTTP status after reading the error body', async () => {
    const json = jest.fn();
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json
    }));

    const error = await client.createTask(task()).catch((e) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toBe('HTTP error: 502 Bad Gateway');
    expect(json).toHaveBeenCalledTimes(1);
  });

  test('throws NetworkError when the response body is not valid JSON', async () => {
    const parseError = new SyntaxError('Unexpected token < in JSON at position 0');
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.reject(parseError)
    }));

    const error = await client.getBalance().catch((e) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error.message).toBe(parseError.message);
    expect(error.originalError).toBe(parseError);
  });

  test('wraps a non-Error rejection into NetworkError', async () => {
    global.fetch = jest.fn(() => Promise.reject('connection reset'));

    const error = await client.getBalance().catch((e) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toBe('connection reset');
    expect(error.originalError).toBe('connection reset');
  });

  test('ApiError falls back to UNKNOWN_ERROR when the API sends no details', async () => {
    global.fetch = respond({ errorId: 1 });

    const error = await client.createTask(task()).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.errorCode).toBe('UNKNOWN_ERROR');
    expect(error.errorDescription).toBe('Unknown API error');
  });

  test('ApiError uses the "error" field when errorDescription is absent', async () => {
    global.fetch = respond({ errorId: 1, errorCode: 'ERROR_ZERO_BALANCE', error: 'No funds' });

    const error = await client.createTask(task()).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.errorCode).toBe('ERROR_ZERO_BALANCE');
    expect(error.errorDescription).toBe('No funds');
  });

  test('solve returns an empty object when a ready result has no solution', async () => {
    let callCount = 0;
    global.fetch = jest.fn(() => {
      callCount++;
      const body = callCount === 1
        ? { errorId: 0, taskId: 12345 }
        : { errorId: 0, status: 'ready' };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    });

    await expect(client.solve(task())).resolves.toEqual({});
  });
});
