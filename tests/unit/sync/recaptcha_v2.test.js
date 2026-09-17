/**
 * Tests for RecaptchaV2Proxyless / RecaptchaV2 task serialization, plus a
 * solve() test in promise-chain style. Serialization is covered once here --
 * it doesn't depend on which style (sync/async) is used to call solve().
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../../src/.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

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

  test('uses recaptchaDataSValue and apiDomain, matching the API contract', () => {
    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      recaptchaDataSValue: 'data-s-value',
      apiDomain: 'google.com'
    });

    const result = task.toDict();
    expect(result.recaptchaDataSValue).toBe('data-s-value');
    expect(result.apiDomain).toBe('google.com');
    expect(result.dataSValue).toBeUndefined();
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
    expect(result.type).toBe('RecaptchaV2Task');
    expect(result.proxyType).toBe('http');
    expect(result.proxyAddress).toBe('1.2.3.4');
    expect(result.proxyPort).toBe(8080);
    expect(result.proxyLogin).toBe('user');
    expect(result.proxyPassword).toBe('pass');
  });
});

test('solve', () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.RecaptchaV2Proxyless({ websiteURL: 'https://example.com', websiteKey: 'test_key' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 100 })
    .mockResolvedValueOnce({ errorId: 0, status: 'processing' })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { gRecaptchaResponse: 'test_token' } });

  return client.solve(task).then((result) => {
    expect(result).toEqual({ gRecaptchaResponse: 'test_token' });
    expect(client._request).toHaveBeenCalledTimes(3);
  });
});
