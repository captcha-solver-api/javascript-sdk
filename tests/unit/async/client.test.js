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

  test('debug logger receives timestamped and sanitized structured events', async () => {
    const events = [];
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true, logger: (event) => events.push(event) });
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve({ errorId: 0, balance: '1.00' }) }));

    await client.getBalance();

    expect(events.map(({ event }) => event)).toEqual([
      'client.initialized', 'request.started', 'server.request', 'server.response', 'request.completed'
    ]);
    expect(events.every(({ timestamp }) => !Number.isNaN(Date.parse(timestamp)))).toBe(true);
    expect(events.find(({ event }) => event === 'server.request').body.clientKey).toBe('[REDACTED]');
    expect(events.find(({ event }) => event === 'server.response')).toMatchObject({ level: 'debug', status: 200, body: { balance: '1.00' } });
    expect(JSON.stringify(events)).not.toContain('secret_key');
  });

  test('solve correlates events and counts processing result requests', async () => {
    const events = [];
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true, logger: (event) => events.push(event), pollingInterval: 1 });
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ errorId: 0, taskId: 12345 }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ errorId: 0, status: 'processing' }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ errorId: 0, status: 'ready', solution: { token: 'secret_solution' } }) }));
    const task = new Tasks.RecaptchaV2Proxyless({ websiteURL: 'https://example.com', websiteKey: 'website_key' });

    await client.solve(task);

    const solveEvents = events.filter(({ solveId }) => solveId);
    expect(new Set(solveEvents.map(({ solveId }) => solveId)).size).toBe(1);
    expect(events.find(({ event }) => event === 'task.created')).toMatchObject({ taskId: 12345, taskType: 'RecaptchaV2TaskProxyless' });
    expect(events.find(({ event }) => event === 'solve.summary')).toMatchObject({
      level: 'info', status: 'solved', taskId: 12345, createTaskRequestCount: 1, resultRequestCount: 2, totalRequestCount: 3
    });
    expect(JSON.stringify(events)).toContain('[REDACTED token; original length: 15]');
    expect(JSON.stringify(events)).not.toContain('secret_solution');
  });

  test('debug mode is silent by default', async () => {
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ errorId: 0, balance: '1.00' }) }));
    await client.getBalance();
    expect(debug).not.toHaveBeenCalled();
    debug.mockRestore();
  });

  test('solve summary explains API failures', async () => {
    const events = [];
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true, logger: (event) => events.push(event), pollingInterval: 1 });
    global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ errorId: 0, taskId: 12345 }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ errorId: 1, errorCode: 'ERROR_TASK_FAILED', errorDescription: 'Task failed' }) }));
    const task = new Tasks.RecaptchaV2Proxyless({ websiteURL: 'https://example.com', websiteKey: 'website_key' });

    await expect(client.solve(task)).rejects.toThrow(ApiError);

    expect(events.find(({ event }) => event === 'solve.summary')).toMatchObject({
      level: 'error', status: 'not_solved', reason: 'api_error', taskId: 12345,
      errorName: 'ApiError', errorCode: 'ERROR_TASK_FAILED', resultRequestCount: 1, totalRequestCount: 2
    });
  });

  test('debug logger preserves a non-JSON server error body', async () => {
    const events = [];
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true, logger: (event) => events.push(event) });
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 502, statusText: 'Bad Gateway', text: () => Promise.resolve('<html>upstream failed</html>') }));

    await expect(client.getBalance()).rejects.toThrow(NetworkError);

    expect(events.find(({ event }) => event === 'server.response')).toMatchObject({
      level: 'error', status: 502, body: '<html>upstream failed</html>'
    });
  });

  test('logger failures do not change the SDK result', async () => {
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true, logger: () => { throw new Error('logger failed'); } });
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ errorId: 0, balance: '1.00' }) }));
    await expect(client.getBalance()).resolves.toBe(1);
  });

  test('parallel solves use different correlation IDs', async () => {
    const events = [];
    let nextTaskId = 100;
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true, logger: (event) => events.push(event), pollingInterval: 1 });
    global.fetch = jest.fn((url, options) => {
      const body = JSON.parse(options.body);
      const response = url.endsWith('/createTask')
        ? { errorId: 0, taskId: nextTaskId++ }
        : { errorId: 0, status: 'ready', solution: { token: `token-${body.taskId}` } };
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(response) });
    });
    const task = () => new Tasks.RecaptchaV2Proxyless({ websiteURL: 'https://example.com', websiteKey: 'website_key' });

    await Promise.all([client.solve(task()), client.solve(task())]);

    const summaries = events.filter(({ event }) => event === 'solve.summary');
    expect(summaries).toHaveLength(2);
    expect(new Set(summaries.map(({ solveId }) => solveId)).size).toBe(2);
    expect(new Set(summaries.map(({ taskId }) => taskId))).toEqual(new Set([100, 101]));
  });

  test('createTask failure summary has no task ID and explains the error', async () => {
    const events = [];
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true, logger: (event) => events.push(event) });
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ errorId: 1, errorCode: 'ERROR_ZERO_BALANCE', errorDescription: 'No funds' })
    }));
    const task = new Tasks.RecaptchaV2Proxyless({ websiteURL: 'https://example.com', websiteKey: 'website_key' });

    await expect(client.solve(task)).rejects.toThrow(ApiError);

    const summary = events.find(({ event }) => event === 'solve.summary');
    expect(summary).toMatchObject({ reason: 'api_error', createTaskRequestCount: 1, resultRequestCount: 0, totalRequestCount: 1 });
    expect(summary).not.toHaveProperty('taskId');
  });

  test('debug sanitization omits binary data and redacts URL secrets', async () => {
    const events = [];
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true, logger: (event) => events.push(event) });
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ errorId: 0, taskId: 12345 }) }));
    const task = new Tasks.ImageToText({ body: 'a'.repeat(500), comment: 'test' });

    await client.createTask(task);
    await client.createTask(new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com/login?access_token=url-secret',
      websiteKey: 'website_key'
    }));

    const requests = events.filter(({ event }) => event === 'server.request');
    expect(requests[0].body.task.body).toBe('[OMITTED binary data; original length: 500]');
    expect(requests[1].body.task.websiteURL).not.toContain('url-secret');
    expect(JSON.stringify(events)).not.toContain('a'.repeat(200));
  });

  test('solve timeout is a deadline for the complete operation', async () => {
    const events = [];
    client = new CaptchaClient({ clientKey: 'secret_key', debug: true, logger: (event) => events.push(event), timeout: 300, pollingInterval: 0 });
    global.fetch = jest.fn()
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({
        ok: true, status: 200, json: () => Promise.resolve({ errorId: 0, taskId: 12345 })
      }), 100)))
      .mockImplementationOnce((url, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }));
    const task = new Tasks.RecaptchaV2Proxyless({ websiteURL: 'https://example.com', websiteKey: 'website_key' });
    const startedAt = performance.now();

    await expect(client.solve(task)).rejects.toThrow(TimeoutError);

    expect(performance.now() - startedAt).toBeLessThan(380);
    expect(events.find(({ event }) => event === 'solve.summary')).toMatchObject({ reason: 'timeout', totalRequestCount: 2 });
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
