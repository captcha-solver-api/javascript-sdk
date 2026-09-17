/**
 * Example: Solve reCAPTCHA v3 without a customer proxy.
 * Set CAPTCHA_API_KEY and replace the page-specific values before running.
 */

import 'dotenv/config';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const captchaSolver = new CaptchaClient({
  clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY'
});

const task = new Tasks.RecaptchaV3Proxyless({
  websiteURL: 'https://example.com/login',
  websiteKey: 'YOUR_WEBSITE_KEY',
  minScore: 0.3,
  pageAction: 'homepage'
});

try {
  const result = await captchaSolver.solve(task);
  console.log('result:', result);
} catch (error) {
  console.error(error);
}
