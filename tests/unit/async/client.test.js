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

  describe('debug mode', () => {
    const TIMESTAMP = /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} [+-]\d{2}:\d{2}\] \[CaptchaClient\] /;
    let debug;
    const okResponse = (body) => Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) });
    const logs = () => debug.mock.calls.map(([message]) => message);
    const messageOf = (text) => logs().find((message) => message.split('\n')[0].includes(text));
    const lineOf = (text) => messageOf(text)?.split('\n')[0];
    // Split the lines below an event into titled sections ("REQUEST (POST <url>)", "RESPONSE (HTTP 200 OK)");
    // the variable ", <n>ms" duration is dropped from titles so tests can use fixed keys.
    const sectionsOf = (text) => {
      const sections = {};
      let title = '';
      for (const line of messageOf(text).split('\n').slice(1)) {
        if (/^[A-Z]/.test(line)) { title = line.replace(/:$/, '').replace(/, \d+ms\)/, ')'); sections[title] = ''; }
        else sections[title] = (sections[title] ?? '') + line + '\n';
      }
      return Object.fromEntries(Object.entries(sections).map(([key, json]) => [key, json ? JSON.parse(json) : undefined]));
    };
    // Parse the "  name:  value" lines below SOLVE SUMMARY into an object.
    const summaryOf = () => Object.fromEntries(messageOf('SOLVE SUMMARY:').split('\n').slice(1).map((line) => {
      const [, name, value] = line.match(/^ {2}(\w+): +(.*)$/);
      return [name, value];
    }));
    const recaptchaTask = () => new Tasks.RecaptchaV2Proxyless({ websiteURL: 'https://example.com', websiteKey: 'website_key' });

    beforeEach(() => {
      debug = jest.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
      debug.mockRestore();
    });

    test('is silent by default', async () => {
      global.fetch = jest.fn(() => okResponse({ errorId: 0, balance: '1.00' }));

      await client.getBalance();

      expect(debug).not.toHaveBeenCalled();
    });

    test('prefixes every event with a local timestamp and UTC offset, in one console call each', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true });
      global.fetch = jest.fn(() => okResponse({ errorId: 0, balance: '1.00' }));

      await client.getBalance();

      expect(logs().length).toBeGreaterThan(0);
      for (const message of logs()) expect(message).toMatch(TIMESTAMP);
      for (const call of debug.mock.calls) expect(call).toHaveLength(1);
      expect(lineOf('client initialized')).toContain('sdk=javascript-sdk/1.1.0 baseUrl=https://api.captcha-solver.com timeout=120000ms pollingInterval=5000ms');
      expect(lineOf('getBalance')).toMatch(/getBalance -> balance=1\.00 \(\d+ms\)$/);
      expect(sectionsOf('getBalance')).toEqual({
        'REQUEST (POST https://api.captcha-solver.com/getBalance)': { clientKey: '[MASKED]' },
        'RESPONSE (HTTP 200 OK)': { errorId: 0, balance: '1.00' }
      });
      expect(JSON.stringify(debug.mock.calls)).not.toContain('secret_key');
    });

    test('keeps processing polls on one line and logs bodies for creation and the ready result', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true, pollingInterval: 1 });
      global.fetch = jest.fn()
        .mockImplementationOnce(() => okResponse({ errorId: 0, taskId: 12345 }))
        .mockImplementationOnce(() => okResponse({ errorId: 0, status: 'processing' }))
        .mockImplementationOnce(() => okResponse({
          errorId: 0, status: 'ready', solution: { token: `start-${'x'.repeat(300)}-end` }, createTime: 100, endTime: 108
        }));

      await client.solve(recaptchaTask());

      expect(lineOf('createTask')).toMatch(/createTask RecaptchaV2TaskProxyless -> taskId=12345 \(\d+ms\)$/);
      expect(sectionsOf('createTask')).toEqual({
        'REQUEST (POST https://api.captcha-solver.com/createTask)': { clientKey: '[MASKED]', task: { type: 'RecaptchaV2TaskProxyless', websiteURL: 'https://example.com', websiteKey: 'website_key' } },
        'RESPONSE (HTTP 200 OK)': { errorId: 0, taskId: 12345 }
      });
      const processing = messageOf('-> processing');
      expect(processing).toMatch(/getTaskResult taskId=12345 -> processing \(\d+ms\)$/);
      expect(processing).not.toContain('\n');
      expect(lineOf('-> ready')).toMatch(/getTaskResult taskId=12345 -> ready \(\d+ms\)$/);
      expect(sectionsOf('-> ready')['REQUEST (POST https://api.captcha-solver.com/getTaskResult)']).toEqual({ clientKey: '[MASKED]', taskId: 12345 });
      expect(sectionsOf('-> ready')['RESPONSE (HTTP 200 OK)'].solution.token).toMatch(/^start-x+\.\.\.\[310 chars\]\.\.\.x+-end$/);
      expect(summaryOf()).toEqual({
        status: 'solved',
        taskId: '12345',
        taskType: 'RecaptchaV2TaskProxyless',
        elapsed: expect.stringMatching(/^\d+\.\d{3}s$/),
        serverSolveTime: '8s',
        polls: '2'
      });
      expect(JSON.stringify(debug.mock.calls)).not.toContain('secret_key');
    });

    test('replaces base64 image fields with their length', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true });
      global.fetch = jest.fn(() => okResponse({ errorId: 0, taskId: 1 }));

      await client.createTask(new Tasks.ImageToText({ body: 'A'.repeat(1000) }));

      expect(sectionsOf('createTask')['REQUEST (POST https://api.captcha-solver.com/createTask)'].task.body).toBe('[base64, 1000 chars]');
    });

    test('masks proxy address and credentials', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true });
      global.fetch = jest.fn(() => okResponse({ errorId: 0, taskId: 1 }));

      await client.createTask(new Tasks.Turnstile({
        websiteURL: 'https://example.com',
        websiteKey: 'website_key',
        proxyType: 'http',
        proxyAddress: '203.0.113.7',
        proxyPort: 8080,
        proxyLogin: 'proxy_user',
        proxyPassword: 'proxy_pass'
      }));

      const { task } = sectionsOf('createTask')['REQUEST (POST https://api.captcha-solver.com/createTask)'];
      expect(task).toMatchObject({ proxyAddress: '[MASKED]', proxyPort: 8080, proxyLogin: '[MASKED]', proxyPassword: '[MASKED]' });
      const logged = JSON.stringify(debug.mock.calls);
      for (const secret of ['203.0.113.7', 'proxy_user', 'proxy_pass', 'secret_key']) expect(logged).not.toContain(secret);
    });

    test('logs the API error response and adds the error to a not-solved summary', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true, pollingInterval: 1 });
      global.fetch = jest.fn()
        .mockImplementationOnce(() => okResponse({ errorId: 0, taskId: 12345 }))
        .mockImplementationOnce(() => okResponse({ errorId: 1, errorCode: 'ERROR_TASK_FAILED', errorDescription: 'Task failed' }));

      await expect(client.solve(recaptchaTask())).rejects.toThrow(ApiError);

      expect(lineOf('getTaskResult')).toMatch(/getTaskResult taskId=12345 -> failed: ApiError ERROR_TASK_FAILED: Task failed \(\d+ms\)$/);
      expect(sectionsOf('getTaskResult')).toEqual({
        'REQUEST (POST https://api.captcha-solver.com/getTaskResult)': { clientKey: '[MASKED]', taskId: 12345 },
        'RESPONSE (HTTP 200 OK)': { errorId: 1, errorCode: 'ERROR_TASK_FAILED', errorDescription: 'Task failed' }
      });
      expect(summaryOf()).toEqual({
        status: 'not solved',
        taskId: '12345',
        taskType: 'RecaptchaV2TaskProxyless',
        elapsed: expect.stringMatching(/^\d+\.\d{3}s$/),
        polls: '1',
        error: 'ApiError ERROR_TASK_FAILED: Task failed'
      });
    });

    test('says the task was not created when createTask fails inside solve()', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true });
      global.fetch = jest.fn(() => okResponse({ errorId: 1, errorCode: 'ERROR_KEY_DOES_NOT_EXIST', errorDescription: 'Key not found' }));

      await expect(client.solve(recaptchaTask())).rejects.toThrow(ApiError);

      expect(summaryOf()).toMatchObject({
        status: 'not solved',
        taskId: '- (task was not created)',
        polls: '0',
        error: 'ApiError ERROR_KEY_DOES_NOT_EXIST: Key not found'
      });
    });

    test('includes the transport cause hidden behind "fetch failed"', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true });
      const cause = Object.assign(new Error('Connect Timeout Error (attempted address: api.captcha-solver.com:443, timeout: 10000ms)'), {
        name: 'ConnectTimeoutError',
        code: 'UND_ERR_CONNECT_TIMEOUT'
      });
      global.fetch = jest.fn(() => Promise.reject(new TypeError('fetch failed', { cause })));

      await expect(client.getBalance()).rejects.toThrow(NetworkError);

      expect(lineOf('getBalance')).toContain(
        'failed: NetworkError: fetch failed <- ConnectTimeoutError UND_ERR_CONNECT_TIMEOUT: Connect Timeout Error (attempted address: api.captcha-solver.com:443, timeout: 10000ms)'
      );
      expect(messageOf('getBalance').split('\n').at(-1)).toMatch(/^RESPONSE: none - no response from the server \(NetworkError, \d+ms\)$/);
    });

    test('logs the JSON body of a non-2xx HTTP response', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true, baseUrl: 'https://api.captcha-solver.com/no-such-path' });
      global.fetch = jest.fn(() => Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'The route could not be found.' })
      }));

      await expect(client.getBalance()).rejects.toThrow(NetworkError);

      expect(lineOf('getBalance')).toMatch(/getBalance -> failed: NetworkError: HTTP error: 404 Not Found \(\d+ms\)$/);
      expect(sectionsOf('getBalance')).toEqual({
        'REQUEST (POST https://api.captcha-solver.com/no-such-path/getBalance)': { clientKey: '[MASKED]' },
        'RESPONSE (HTTP 404 Not Found)': { message: 'The route could not be found.' }
      });
    });

    test('says when the response body is not valid JSON', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true });
      global.fetch = jest.fn(() => Promise.resolve({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON'))
      }));

      await expect(client.getBalance()).rejects.toThrow(NetworkError);

      expect(lineOf('getBalance')).toMatch(/getBalance -> failed: NetworkError: HTTP error: 502 Bad Gateway \(\d+ms\)$/);
      expect(messageOf('getBalance').split('\n').at(-1)).toMatch(/^RESPONSE \(HTTP 502 Bad Gateway, \d+ms\): body is not valid JSON$/);
    });

    test('a failing debug output never changes what the caller gets', async () => {
      debug.mockImplementation(() => { throw new Error('console is broken'); });
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true, pollingInterval: 1 });
      global.fetch = jest.fn()
        .mockImplementationOnce(() => okResponse({ errorId: 0, taskId: 12345 }))
        .mockImplementationOnce(() => okResponse({ errorId: 0, status: 'ready', solution: { gRecaptchaResponse: 'token' } }))
        .mockImplementationOnce(() => okResponse({ errorId: 1, errorCode: 'ERROR_KEY_DOES_NOT_EXIST', errorDescription: 'Key not found' }));

      await expect(client.solve(recaptchaTask())).resolves.toEqual({ gRecaptchaResponse: 'token' });
      const error = await client.getBalance().catch((e) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.errorCode).toBe('ERROR_KEY_DOES_NOT_EXIST');
      expect(debug).toHaveBeenCalled();
    });

    test('says the body was not received when the timeout hits while reading it', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true, timeout: 20 });
      // Headers arrive at once; the body only fails when the request is aborted by the timeout.
      global.fetch = jest.fn((url, options) => Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
        })
      }));

      await expect(client.getBalance()).rejects.toThrow(TimeoutError);

      expect(lineOf('getBalance')).toMatch(/getBalance -> failed: TimeoutError: Request timed out after 20ms \(\d+ms\)$/);
      expect(messageOf('getBalance').split('\n').at(-1)).toMatch(/^RESPONSE \(HTTP 200 OK, \d+ms\): body was not received \(TimeoutError\)$/);
    });

    test('reports a solve() timeout in the summary', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true, timeout: 40, pollingInterval: 5 });
      global.fetch = jest.fn()
        .mockImplementationOnce(() => okResponse({ errorId: 0, taskId: 12345 }))
        .mockImplementation(() => okResponse({ errorId: 0, status: 'processing' }));

      await expect(client.solve(recaptchaTask())).rejects.toThrow(TimeoutError);

      const summary = summaryOf();
      expect(summary).toMatchObject({
        status: 'not solved',
        taskId: '12345',
        error: 'TimeoutError: Task 12345 timed out after 40ms'
      });
      expect(Number(summary.polls)).toBeGreaterThan(0);
      expect(summary).not.toHaveProperty('serverSolveTime');
    });

    test('logs the error the caller receives, not the raw transport error', async () => {
      client = new CaptchaClient({ clientKey: 'secret_key', debug: true, timeout: 10 });
      global.fetch = jest.fn((url, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      }));

      await expect(client.getBalance()).rejects.toThrow(TimeoutError);

      expect(lineOf('getBalance')).toMatch(/getBalance -> failed: TimeoutError: Request timed out after 10ms \(\d+ms\)$/);
      expect(lineOf('getBalance')).not.toContain('AbortError');
      expect(messageOf('getBalance').split('\n').at(-1)).toMatch(/^RESPONSE: none - no response from the server \(TimeoutError, \d+ms\)$/);
    });
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
