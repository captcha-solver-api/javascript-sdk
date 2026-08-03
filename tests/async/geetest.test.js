/**
 * Async solve() tests for GeeTestProxyless (v3 and v4).
 * Task serialization is covered once in tests/sync/geetest.test.js.
 */

import { jest } from '@jest/globals';
import { CaptchaClient } from '../../src/client.js';
import * as Tasks from '../../src/tasks.js';

test('solve v3', async () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.GeeTestProxyless({ websiteURL: 'https://example.com', gt: 'test_gt', challenge: 'test_challenge' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 105 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { challenge: 'c', validate: 'v', seccode: 's' } });

  const result = await client.solve(task);

  expect(result).toEqual({ challenge: 'c', validate: 'v', seccode: 's' });
});

test('solve v4', async () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.GeeTestProxyless({ websiteURL: 'https://example.com', version: 4, initParameters: { captcha_id: 'test_id' } });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 106 })
    .mockResolvedValueOnce({
      errorId: 0,
      status: 'ready',
      solution: { captcha_id: 'test_id', lot_number: '1', pass_token: 'p', gen_time: 't', captcha_output: 'o' }
    });

  const result = await client.solve(task);

  expect(result.captcha_output).toBe('o');
});
