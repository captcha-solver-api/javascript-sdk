/**
 * Generic tests for CaptchaClient (transport, error handling, polling) --
 * not tied to any specific captcha type, written in async/await style.
 * Mirrors tests/sync/client.test.js.
 * See <captcha_type>.test.js in this directory for per-type solve() tests.
 */

import { jest } from '@jest/globals';
import { CaptchaClient } from '../../src/client.js';
import { ApiError, NetworkError, TimeoutError, ValidationError } from '../../src/exceptions.js';
import * as Tasks from '../../src/tasks.js';

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
