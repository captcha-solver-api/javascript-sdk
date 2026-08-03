/**
 * Real-API integration tests. Skipped automatically unless CAPTCHA_API_KEY
 * is set in the environment. Run with `npm run test:integration`.
 */

import { CaptchaClient } from '../src/client.js';
import * as Tasks from '../src/tasks.js';

describe('CaptchaClient integration', () => {
  let client;
  const apiKey = process.env.CAPTCHA_API_KEY;

  beforeAll(() => {
    if (!apiKey) {
      console.log('CAPTCHA_API_KEY not set. Skipping integration tests.');
    }
  });

  beforeEach(() => {
    if (apiKey) {
      client = new CaptchaClient({ clientKey: apiKey });
    }
  });

  test('getBalance returns a number', async () => {
    if (!apiKey) return;
    const balance = await client.getBalance();
    expect(typeof balance).toBe('number');
  }, 15000);

  test('solve reCAPTCHA v2', async () => {
    if (!apiKey) return;
    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: process.env.RECAPTCHA_V2_URL || 'https://recaptcha-demo.appspot.com/recaptcha-v2-checkbox.php',
      websiteKey: process.env.RECAPTCHA_V2_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
    });

    const solution = await client.solve(task);
    expect(solution.gRecaptchaResponse).toBeDefined();
  }, 120000);
});
