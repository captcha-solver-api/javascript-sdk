/**
 * Tests for TencentTaskProxyless / TencentTask task serialization, plus a
 * solve() test in promise-chain style.
 */

import { jest } from '@jest/globals';
import { CaptchaClient } from '../../src/client.js';
import * as Tasks from '../../src/tasks.js';

describe('TencentTaskProxyless', () => {
  test('toDict includes required fields', () => {
    const task = new Tasks.TencentTaskProxyless({
      websiteURL: 'https://example.com',
      appId: '190014885'
    });

    const result = task.toDict();
    expect(result.type).toBe('TencentTaskProxyless');
    expect(result.websiteURL).toBe('https://example.com');
    expect(result.appId).toBe('190014885');
  });

  test('toDict includes captchaScript when set', () => {
    const task = new Tasks.TencentTaskProxyless({
      websiteURL: 'https://example.com',
      appId: '190014885',
      captchaScript: 'https://turing.captcha.qcloud.com/TCaptcha.js'
    });

    const result = task.toDict();
    expect(result.captchaScript).toBe('https://turing.captcha.qcloud.com/TCaptcha.js');
  });
});

describe('TencentTask with proxy', () => {
  test('toDict includes proxy fields', () => {
    const task = new Tasks.TencentTask({
      websiteURL: 'https://example.com',
      appId: '190014885',
      proxyType: 'http',
      proxyAddress: '1.2.3.4',
      proxyPort: 8080,
      proxyLogin: 'user',
      proxyPassword: 'pass'
    });

    const result = task.toDict();
    expect(result.type).toBe('TencentTask');
    expect(result.appId).toBe('190014885');
    expect(result.proxyType).toBe('http');
    expect(result.proxyAddress).toBe('1.2.3.4');
    expect(result.proxyLogin).toBe('user');
  });
});

test('solve', () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.TencentTaskProxyless({ websiteURL: 'https://example.com', appId: '190014885' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 109 })
    .mockResolvedValueOnce({
      errorId: 0,
      status: 'ready',
      solution: { appid: '190014885', ret: 0, ticket: 't', randstr: 'r' }
    });

  return client.solve(task).then((result) => {
    expect(result).toEqual({ appid: '190014885', ret: 0, ticket: 't', randstr: 'r' });
  });
});
