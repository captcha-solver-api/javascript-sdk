/**
 * Tests for TurnstileProxyless / Turnstile task serialization, plus a
 * solve() test in promise-chain style.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from 'captcha-sdk';

describe('TurnstileProxyless', () => {
  test('toDict includes required fields', () => {
    const task = new Tasks.TurnstileProxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    const result = task.toDict();
    expect(result.type).toBe('TurnstileTaskProxyless');
  });

  test('uses data and pageData, matching the API contract', () => {
    const task = new Tasks.TurnstileProxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      data: 'chl_page_data',
      pageData: 'page_data_value'
    });

    const result = task.toDict();
    expect(result.data).toBe('chl_page_data');
    expect(result.pageData).toBe('page_data_value');
    expect(result.cData).toBeUndefined();
  });
});

describe('Turnstile with proxy', () => {
  test('toDict includes proxy fields', () => {
    const task = new Tasks.Turnstile({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      proxyType: 'http',
      proxyAddress: '1.2.3.4',
      proxyPort: 8080
    });

    const result = task.toDict();
    expect(result.type).toBe('TurnstileTask');
    expect(result.proxyType).toBe('http');
    expect(result.proxyAddress).toBe('1.2.3.4');
  });
});

test('solve', () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.TurnstileProxyless({ websiteURL: 'https://example.com', websiteKey: 'test_key' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 103 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { token: 'turnstile_token' } });

  return client.solve(task).then((result) => {
    expect(result).toEqual({ token: 'turnstile_token' });
  });
});
