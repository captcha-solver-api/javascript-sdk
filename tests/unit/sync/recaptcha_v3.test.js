import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

describe('RecaptchaV3Proxyless', () => {
  test('serializes only the proxyless API fields', () => {
    const task = new Tasks.RecaptchaV3Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      minScore: 0.7,
      pageAction: 'login',
      isEnterprise: true,
      apiDomain: 'www.recaptcha.net'
    });

    expect(task.toDict()).toEqual({
      type: 'RecaptchaV3TaskProxyless',
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      minScore: 0.7,
      pageAction: 'login',
      isEnterprise: true,
      apiDomain: 'www.recaptcha.net'
    });
  });

  test('solves a proxyless task', async () => {
    const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
    const task = new Tasks.RecaptchaV3Proxyless({
      websiteURL: 'https://example.com',
      websiteKey: 'test_key',
      minScore: 0.3
    });

    jest.spyOn(client, '_request')
      .mockResolvedValueOnce({ errorId: 0, taskId: 101 })
      .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { gRecaptchaResponse: 'v3_token' } });

    await expect(client.solve(task)).resolves.toEqual({ gRecaptchaResponse: 'v3_token' });
  });
});
