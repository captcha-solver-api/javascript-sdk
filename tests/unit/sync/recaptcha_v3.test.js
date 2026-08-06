/**
 * Tests for RecaptchaV3Proxyless task serialization, plus a solve() test
 * in promise-chain style.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks, ValidationError } from 'captcha-sdk';

describe('RecaptchaV3Proxyless', () => {
  test('requires minScore', () => {
    expect(() => new Tasks.RecaptchaV3Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    })).toThrow(ValidationError);
  });

  test('toDict includes minScore and pageAction', () => {
    const task = new Tasks.RecaptchaV3Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      minScore: 0.7,
      pageAction: 'login'
    });

    const result = task.toDict();
    expect(result.minScore).toBe(0.7);
    expect(result.pageAction).toBe('login');
  });

  test('toDict includes apiDomain when set', () => {
    const task = new Tasks.RecaptchaV3Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      minScore: 0.7,
      apiDomain: 'google.com'
    });

    const result = task.toDict();
    expect(result.apiDomain).toBe('google.com');
  });
});

test('solve', () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.RecaptchaV3Proxyless({ websiteURL: 'https://example.com', websiteKey: 'test_key', minScore: 0.3 });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 102 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { gRecaptchaResponse: 'v3_token' } });

  return client.solve(task).then((result) => {
    expect(result).toEqual({ gRecaptchaResponse: 'v3_token' });
  });
});
