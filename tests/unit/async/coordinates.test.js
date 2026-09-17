/**
 * Async solve() test for CoordinatesTask.
 * Task serialization is covered once in tests/unit/sync/coordinates.test.js.
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../../src/.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from 'captcha-sdk';

test('solve', async () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.CoordinatesTask({ body: 'base64string', comment: 'click on the green apple' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 108 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { coordinates: [{ x: 358, y: 268 }] } });

  const result = await client.solve(task);

  expect(result).toEqual({ coordinates: [{ x: 358, y: 268 }] });
});
