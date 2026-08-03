/**
 * Tests for GeeTestProxyless / GeeTest task serialization (v3 and v4),
 * plus solve() tests in promise-chain style.
 */

import { jest } from '@jest/globals';
import { CaptchaClient } from '../../src/client.js';
import * as Tasks from '../../src/tasks.js';

describe('GeeTest v3 and v4', () => {
  test('toDict for v3 excludes version field', () => {
    const task = new Tasks.GeeTestProxyless({
      websiteURL: 'https://example.com',
      gt: 'test_gt',
      challenge: 'test_challenge'
    });

    const result = task.toDict();
    expect(result.gt).toBe('test_gt');
    expect(result.challenge).toBe('test_challenge');
    expect(result.version).toBeUndefined();
  });

  test('toDict for v4 includes version field', () => {
    const task = new Tasks.GeeTestProxyless({
      websiteURL: 'https://example.com',
      version: 4,
      initParameters: { captcha_id: 'test_id' }
    });

    const result = task.toDict();
    expect(result.version).toBe(4);
    expect(result.initParameters).toEqual({ captcha_id: 'test_id' });
  });

  test('toDict includes geetestApiServerSubdomain when set', () => {
    const task = new Tasks.GeeTestProxyless({
      websiteURL: 'https://example.com',
      gt: 'test_gt',
      challenge: 'test_challenge',
      geetestApiServerSubdomain: 'api-na.geetest.com'
    });

    const result = task.toDict();
    expect(result.geetestApiServerSubdomain).toBe('api-na.geetest.com');
  });

  test('toDict with proxy includes proxy fields', () => {
    const task = new Tasks.GeeTest({
      websiteURL: 'https://example.com',
      gt: 'test_gt',
      challenge: 'test_challenge',
      proxyType: 'http',
      proxyAddress: '1.2.3.4',
      proxyPort: 8080
    });

    const result = task.toDict();
    expect(result.type).toBe('GeeTestTask');
    expect(result.proxyType).toBe('http');
    expect(result.proxyAddress).toBe('1.2.3.4');
  });
});

test('solve v3', () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.GeeTestProxyless({ websiteURL: 'https://example.com', gt: 'test_gt', challenge: 'test_challenge' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 105 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { challenge: 'c', validate: 'v', seccode: 's' } });

  return client.solve(task).then((result) => {
    expect(result).toEqual({ challenge: 'c', validate: 'v', seccode: 's' });
  });
});

test('solve v4', () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.GeeTestProxyless({ websiteURL: 'https://example.com', version: 4, initParameters: { captcha_id: 'test_id' } });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 106 })
    .mockResolvedValueOnce({
      errorId: 0,
      status: 'ready',
      solution: { captcha_id: 'test_id', lot_number: '1', pass_token: 'p', gen_time: 't', captcha_output: 'o' }
    });

  return client.solve(task).then((result) => {
    expect(result.captcha_output).toBe('o');
  });
});
