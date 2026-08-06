/**
 * Generic tests for CaptchaClient (transport, error handling, polling) --
 * not tied to any specific captcha type, written in promise-chain style
 * (.then/.catch, no async/await). Mirrors tests/unit/async/client.test.js.
 * See <captcha_type>.test.js in this directory for per-type task
 * serialization tests.
 */

import { jest } from '@jest/globals';
import { ApiError, CaptchaClient, NetworkError, Tasks, TimeoutError, ValidationError } from 'captcha-sdk';

describe('CaptchaClient (sync-style)', () => {
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
  });

  test('creates task and returns taskId', () => {
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

    return client.createTask(task).then((taskId) => {
      expect(taskId).toBe(12345);
    });
  });

  test('sends languagePool when provided', () => {
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

    return client.createTask(task, 'en').then(() => {
      expect(requestBody.languagePool).toBe('en');
    });
  });

  test('does not send languagePool when not provided', () => {
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

    return client.createTask(task).then(() => {
      expect(requestBody.languagePool).toBeUndefined();
    });
  });

  test('getTaskResult returns full API response', () => {
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

    return client.getTaskResult(12345).then((result) => {
      expect(result.status).toBe('ready');
      expect(result.solution.gRecaptchaResponse).toBe('test_response');
    });
  });

  test('getBalance returns balance as float', () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ errorId: 0, balance: '10.50' })
      })
    );

    return client.getBalance().then((balance) => {
      expect(balance).toBe(10.5);
    });
  });

  test('solve polls until status is ready and returns solution', () => {
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

    return client.solve(task).then((solution) => {
      expect(solution.gRecaptchaResponse).toBe('solved_token');
      expect(callCount).toBe(2);
    });
  });

  test('throws TimeoutError when timeout exceeded', () => {
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

    return expect(client.solve(task)).rejects.toThrow(TimeoutError);
  });

  test('throws ApiError when a task fails during polling', () => {
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

    return expect(client.solve(task)).rejects.toThrow(ApiError);
  });

  test('throws ApiError when errorId is not zero', () => {
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

    return expect(client.createTask(task)).rejects.toThrow(ApiError);
  });

  test('ApiError carries the string errorCode, not the numeric errorId', () => {
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

    return client.createTask(task)
      .then(() => {
        throw new Error('expected createTask to reject');
      })
      .catch((error) => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.errorCode).toBe('ERROR_KEY_DOES_NOT_EXIST');
      });
  });

  test('throws NetworkError on fetch failure', () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Connection refused')));

    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    return expect(client.createTask(task)).rejects.toThrow(NetworkError);
  });
});
