/**
 * Async solve() test for TurnstileProxyless.
 * Task serialization is covered once in tests/sync/turnstile.test.js.
 */

import { jest } from '@jest/globals';
import { CaptchaClient } from '../../src/client.js';
import * as Tasks from '../../src/tasks.js';

test('solve', async () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.TurnstileProxyless({ websiteURL: 'https://example.com', websiteKey: 'test_key' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 103 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { token: 'turnstile_token' } });

  const result = await client.solve(task);

  expect(result).toEqual({ token: 'turnstile_token' });
});
