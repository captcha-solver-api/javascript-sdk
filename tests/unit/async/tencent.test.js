/**
 * Async solve() test for TencentTaskProxyless.
 * Task serialization is covered once in tests/unit/sync/tencent.test.js.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from 'captcha-sdk';

test('solve', async () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.TencentTaskProxyless({ websiteURL: 'https://example.com', appId: '190014885' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 109 })
    .mockResolvedValueOnce({
      errorId: 0,
      status: 'ready',
      solution: { appid: '190014885', ret: 0, ticket: 't', randstr: 'r' }
    });

  const result = await client.solve(task);

  expect(result).toEqual({ appid: '190014885', ret: 0, ticket: 't', randstr: 'r' });
});
