import { jest } from '@jest/globals';
import { CaptchaClient } from '../src/client.js';
import { ApiError, NetworkError, TimeoutError } from '../src/exceptions.js';
import * as Tasks from '../src/tasks.js';

describe('TestCaptchaClientUnit', () => {
  let client;

  beforeEach(() => {
    client = new CaptchaClient({
      clientKey: 'test_key',
      timeout: 5000,
      pollingInterval: 100
    });
  });

  describe('createTask', () => {
    test('creates task and returns taskId', async () => {
      const mockResponse = { errorId: 0, taskId: 12345 };
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
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
  });

  describe('getTaskResult', () => {
    test('returns full API response', async () => {
      const mockResponse = {
        errorId: 0,
        status: 'ready',
        solution: { gRecaptchaResponse: 'test_response' }
      };
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })
      );

      const result = await client.getTaskResult(12345);
      expect(result.status).toBe('ready');
      expect(result.solution.gRecaptchaResponse).toBe('test_response');
    });
  });

  describe('getBalance', () => {
    test('returns balance as float', async () => {
      const mockResponse = { errorId: 0, balance: '10.50' };
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })
      );

      const balance = await client.getBalance();
      expect(balance).toBe(10.5);
    });
  });

  describe('solve', () => {
    test('polls until status is ready and returns solution', async () => {
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

    test('throws ApiError when task status is error', async () => {
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
              errorId: 0,
              status: 'error',
              errorId: 5,
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
  });

  describe('error handling', () => {
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

    test('throws NetworkError on fetch failure', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Connection refused')));

      const task = new Tasks.RecaptchaV2Proxyless({
        websiteURL: 'https://example.com',
        websiteKey: 'test_key'
      });

      await expect(client.createTask(task)).rejects.toThrow(NetworkError);
    });
  });
});

describe('TestTasksUnit', () => {
  describe('RecaptchaV2Proxyless', () => {
    test('toDict includes required fields', () => {
      const task = new Tasks.RecaptchaV2Proxyless({
        websiteURL: 'https://example.com',
        websiteKey: 'test_key'
      });

      const result = task.toDict();
      expect(result.type).toBe('RecaptchaV2TaskProxyless');
      expect(result.websiteURL).toBe('https://example.com');
      expect(result.websiteKey).toBe('test_key');
    });

    test('toDict includes optional fields when set', () => {
      const task = new Tasks.RecaptchaV2Proxyless({
        websiteURL: 'https://example.com',
        websiteKey: 'test_key',
        isInvisible: true,
        userAgent: 'Mozilla/5.0'
      });

      const result = task.toDict();
      expect(result.isInvisible).toBe(true);
      expect(result.userAgent).toBe('Mozilla/5.0');
    });

    test('toDict excludes null and undefined fields', () => {
      const task = new Tasks.RecaptchaV2Proxyless({
        websiteURL: 'https://example.com',
        websiteKey: 'test_key'
      });

      const result = task.toDict();
      expect(result.isInvisible).toBeUndefined();
      expect(result.cookies).toBeUndefined();
    });
  });

  describe('RecaptchaV2 with proxy', () => {
    test('toDict includes proxy fields', () => {
      const task = new Tasks.RecaptchaV2({
        websiteURL: 'https://example.com',
        websiteKey: 'test_key',
        proxyType: 'http',
        proxyAddress: '1.2.3.4',
        proxyPort: 8080,
        proxyLogin: 'user',
        proxyPassword: 'pass'
      });

      const result = task.toDict();
      expect(result.proxyType).toBe('http');
      expect(result.proxyAddress).toBe('1.2.3.4');
      expect(result.proxyPort).toBe(8080);
      expect(result.proxyLogin).toBe('user');
      expect(result.proxyPassword).toBe('pass');
    });
  });

  describe('GeeTest v3 and v4', () => {
    test('toDict for v3 excludes version field', () => {
      const task = new Tasks.GeeTestProxyless({
        websiteURL: 'https://example.com',
        gt: 'test_gt',
        challenge: 'test_challenge'
      });

      const result = task.toDict();
      expect(result.gt).toBe('test_gt');
      expect(result.challenge).toBe('test_challenge');
      expect(result.version).toBeUndefined();
    });

    test('toDict for v4 includes version field', () => {
      const task = new Tasks.GeeTestProxyless({
        websiteURL: 'https://example.com',
        version: 4,
        initParameters: { captcha_id: 'test_id' }
      });

      const result = task.toDict();
      expect(result.version).toBe(4);
      expect(result.initParameters).toEqual({ captcha_id: 'test_id' });
    });
  });

  describe('ImageToText', () => {
    test('toDict includes all fields when set', () => {
      const task = new Tasks.ImageToText({
        body: 'base64string',
        numeric: 1,
        minLength: 4,
        maxLength: 6,
        case_: true
      });

      const result = task.toDict();
      expect(result.type).toBe('ImageToTextTask');
      expect(result.body).toBe('base64string');
      expect(result.numeric).toBe(1);
      expect(result.minLength).toBe(4);
      expect(result.maxLength).toBe(6);
      expect(result.case).toBe(true);
    });
  });
});

describe('TestCaptchaClientIntegration', () => {
  let client;
  const apiKey = process.env.CAPTCHA_API_KEY;

  beforeAll(() => {
    if (!apiKey) {
      console.log('CAPTCHA_API_KEY not set. Skipping integration tests.');
    }
  });

  beforeEach(() => {
    client = new CaptchaClient({ clientKey: apiKey });
  });

  test('getBalance returns a number', async () => {
    if (!apiKey) return;
    const balance = await client.getBalance();
    expect(typeof balance).toBe('number');
  }, 15000);

  test('solve reCAPTCHA v2', async () => {
    if (!apiKey) return;
    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: process.env.RECAPTCHA_V2_URL || 'https://recaptcha-demo.appspot.com/recaptcha-v2-checkbox.php',
      websiteKey: process.env.RECAPTCHA_V2_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
    });

    const solution = await client.solve(task);
    expect(solution.gRecaptchaResponse).toBeDefined();
  }, 120000);
});