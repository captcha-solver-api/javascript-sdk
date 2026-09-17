/**
 * Tests for RecaptchaV2EnterpriseProxyless / RecaptchaV2Enterprise task
 * serialization, plus a solve() test in promise-chain style.
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../../src/.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from 'captcha-sdk';

describe('RecaptchaV2EnterpriseProxyless', () => {
  test('toDict includes required fields', () => {
    const task = new Tasks.RecaptchaV2EnterpriseProxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });

    const result = task.toDict();
    expect(result).toEqual({
      type: 'RecaptchaV2EnterpriseTaskProxyless',
      websiteURL: 'https://example.com',
      websiteKey: 'test_key'
    });
  });

  test('toDict includes enterprisePayload and isInvisible when set', () => {
    const task = new Tasks.RecaptchaV2EnterpriseProxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      enterprisePayload: { s: 'data-s-value' },
      isInvisible: true
    });

    const result = task.toDict();
    expect(result.enterprisePayload).toEqual({ s: 'data-s-value' });
    expect(result.isInvisible).toBe(true);
  });
});

describe('RecaptchaV2Enterprise with proxy', () => {
  test('toDict includes proxy fields', () => {
    const task = new Tasks.RecaptchaV2Enterprise({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      proxyType: 'http',
      proxyAddress: '1.2.3.4',
      proxyPort: 8080,
      proxyLogin: 'user',
      proxyPassword: 'pass'
    });

    const result = task.toDict();
    expect(result.type).toBe('RecaptchaV2EnterpriseTask');
    expect(result.proxyType).toBe('http');
    expect(result.proxyAddress).toBe('1.2.3.4');
    expect(result.proxyLogin).toBe('user');
  });
});

test('solve', () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.RecaptchaV2EnterpriseProxyless({ websiteURL: 'https://example.com', websiteKey: 'test_key' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 101 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { gRecaptchaResponse: 'enterprise_token' } });

  return client.solve(task).then((result) => {
    expect(result).toEqual({ gRecaptchaResponse: 'enterprise_token' });
  });
});
