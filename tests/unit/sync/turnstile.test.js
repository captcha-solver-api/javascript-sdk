/**
 * Tests for TurnstileProxyless / Turnstile task serialization, plus a
 * solve() test in promise-chain style.
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../../src/.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

describe('TurnstileProxyless', () => {
  test('toDict includes required fields', () => {
    const task = new Tasks.TurnstileProxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    const result = task.toDict();
    expect(result.type).toBe('TurnstileTaskProxyless');
  });

  test('uses data and pagedata, matching the API contract', () => {
    const task = new Tasks.TurnstileProxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      data: 'chl_page_data',
      pagedata: 'page_data_value'
    });

    const result = task.toDict();
    expect(result.data).toBe('chl_page_data');
    expect(result.pagedata).toBe('page_data_value');
    expect(result.cData).toBeUndefined();
    expect(result.pageData).toBeUndefined();
  });

  test('does not accept userAgent as input -- the API only returns it in the solution', () => {
    const task = new Tasks.TurnstileProxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      userAgent: 'Mozilla/5.0'
    });

    const result = task.toDict();
    expect(result.userAgent).toBeUndefined();
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
