/**
 * Async solve() test for ImageToText.
 * Task serialization is covered once in tests/unit/sync/image_to_text.test.js.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from 'captcha-sdk';

test('solve', async () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.ImageToText({ body: 'base64string', numeric: 1, minLength: 4, maxLength: 6 });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 104 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { text: 'aB3fX9' } });

  const result = await client.solve(task);

  expect(result).toEqual({ text: 'aB3fX9' });
});
