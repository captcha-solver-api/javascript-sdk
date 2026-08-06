/**
 * Async solve() test for RecaptchaV2EnterpriseProxyless.
 * Task serialization is covered once in tests/unit/sync/recaptcha_v2_enterprise.test.js.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from 'captcha-sdk';

test('solve', async () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.RecaptchaV2EnterpriseProxyless({ websiteURL: 'https://example.com', websiteKey: 'test_key' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 101 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { gRecaptchaResponse: 'enterprise_token' } });

  const result = await client.solve(task);

  expect(result).toEqual({ gRecaptchaResponse: 'enterprise_token' });
});
