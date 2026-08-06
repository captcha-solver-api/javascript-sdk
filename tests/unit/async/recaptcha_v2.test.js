/**
 * Async solve() test for RecaptchaV2Proxyless.
 * Task serialization is covered once in tests/unit/sync/recaptcha_v2.test.js --
 * it doesn't depend on which style (sync/async) is used to call solve().
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../../src/.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from 'captcha-sdk';

test('solve', async () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.RecaptchaV2Proxyless({ websiteURL: 'https://example.com', websiteKey: 'test_key' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 100 })
    .mockResolvedValueOnce({ errorId: 0, status: 'processing' })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { gRecaptchaResponse: 'test_token' } });

  const result = await client.solve(task);

  expect(result).toEqual({ gRecaptchaResponse: 'test_token' });
  expect(client._request).toHaveBeenCalledTimes(3);
});
