/**
 * Integration: solve a real reCAPTCHA v2 end to end.
 *
 * SPENDS REAL BALANCE on every run -- it creates an actual task and waits for
 * a worker to solve it. This is the suite's proof that the whole path works:
 * createTask, polling, and the solution shape the API really returns.
 *
 * Imports the SDK by package name on purpose, not by relative path into src/.
 * See tests/README.md for why. Do not "fix" it to ../../src/.
 *
 * Skipped unless CAPTCHA_API_KEY is set. See helpers.js.
 */

import { Tasks } from 'captcha-sdk';
import { describeIntegration, createClient } from './helpers.js';

// Defaults point at Google's public demo page, so the test runs without any
// extra configuration. Override both together when targeting another page.
const websiteURL = process.env.RECAPTCHA_V2_URL
  || 'https://recaptcha-demo.appspot.com/recaptcha-v2-checkbox.php';
const websiteKey = process.env.RECAPTCHA_V2_SITE_KEY
  || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

describeIntegration('reCAPTCHA v2 against the real API', () => {
  test('solve returns a gRecaptchaResponse token', async () => {
    const task = new Tasks.RecaptchaV2Proxyless({ websiteURL, websiteKey });

    const solution = await createClient().solve(task);

    expect(solution.gRecaptchaResponse).toBeDefined();
  }, 120000);
});
