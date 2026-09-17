/**
 * Async solve() test for YandexSmartCaptchaTaskProxyless.
 * Task serialization is covered once in tests/unit/sync/yandex_smartcaptcha.test.js.
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../../src/.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

test('solve', async () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.YandexSmartCaptchaTaskProxyless({ websiteURL: 'https://example.com', websiteKey: 'Y5Lh0ti...' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 107 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { token: 'yandex_token' } });

  const result = await client.solve(task);

  expect(result).toEqual({ token: 'yandex_token' });
});
