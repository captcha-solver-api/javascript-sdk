/**
 * Tests for YandexSmartCaptchaTaskProxyless / YandexSmartCaptchaTask task
 * serialization, plus a solve() test in promise-chain style.
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../../src/.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from 'captcha-sdk';

describe('YandexSmartCaptchaTaskProxyless', () => {
  test('toDict includes required fields', () => {
    const task = new Tasks.YandexSmartCaptchaTaskProxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'Y5Lh0ti...'
    });

    const result = task.toDict();
    expect(result.type).toBe('YandexSmartCaptchaTaskProxyless');
    expect(result.websiteURL).toBe('https://example.com');
    expect(result.websiteKey).toBe('Y5Lh0ti...');
  });

  test('toDict includes optional fields when set', () => {
    const task = new Tasks.YandexSmartCaptchaTaskProxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'Y5Lh0ti...',
      userAgent: 'Mozilla/5.0',
      cookies: 'session=abc123'
    });

    const result = task.toDict();
    expect(result.userAgent).toBe('Mozilla/5.0');
    expect(result.cookies).toBe('session=abc123');
  });
});

describe('YandexSmartCaptchaTask with proxy', () => {
  test('toDict includes proxy fields', () => {
    const task = new Tasks.YandexSmartCaptchaTask({
      websiteURL: 'https://example.com',
      websiteKey: 'Y5Lh0ti...',
      proxyType: 'https',
      proxyAddress: '1.2.3.4',
      proxyPort: 8080,
      proxyLogin: 'user',
      proxyPassword: 'pass'
    });

    const result = task.toDict();
    expect(result.type).toBe('YandexSmartCaptchaTask');
    expect(result.proxyType).toBe('https');
    expect(result.proxyAddress).toBe('1.2.3.4');
    expect(result.proxyLogin).toBe('user');
  });
});

test('solve', () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.YandexSmartCaptchaTaskProxyless({ websiteURL: 'https://example.com', websiteKey: 'Y5Lh0ti...' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 107 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { token: 'yandex_token' } });

  return client.solve(task).then((result) => {
    expect(result).toEqual({ token: 'yandex_token' });
  });
});
