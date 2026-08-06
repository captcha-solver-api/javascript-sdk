/**
 * Async solve() test for RecaptchaV3Proxyless.
 * Task serialization is covered once in tests/unit/sync/recaptcha_v3.test.js.
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../../src/.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from 'captcha-sdk';

test('solve', async () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.RecaptchaV3Proxyless({ websiteURL: 'https://example.com', websiteKey: 'test_key', minScore: 0.3 });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 102 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { gRecaptchaResponse: 'v3_token' } });

  const result = await client.solve(task);

  expect(result).toEqual({ gRecaptchaResponse: 'v3_token' });
});
