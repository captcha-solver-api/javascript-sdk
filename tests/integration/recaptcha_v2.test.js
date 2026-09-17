/**
 * Integration: solve a real reCAPTCHA v2 end to end.
 *
 * SPENDS REAL BALANCE on every run -- it creates an actual task and waits for
 * a worker to solve it. This is the suite's proof that the whole path works:
 * createTask, polling, and the solution shape the API really returns.
 *
 * Needs a target page. Set RECAPTCHA_V2_URL and RECAPTCHA_V2_SITE_KEY, or the
 * suite skips. There are deliberately no defaults -- see tests/README.md.
 *
 * Imports the SDK by package name on purpose, not by relative path into src/.
 * See tests/README.md for why. Do not "fix" it to ../../src/.
 */

import { Tasks } from '@captcha-solver-api/javascript-sdk';
import { describeTarget, createClient } from './helpers.js';

describeTarget('reCAPTCHA v2 against the real API', ['RECAPTCHA_V2_URL', 'RECAPTCHA_V2_SITE_KEY'], (env) => {
  test('solve returns a gRecaptchaResponse token', async () => {
    const task = new Tasks.RecaptchaV2Proxyless({
      websiteURL: env.RECAPTCHA_V2_URL,
      websiteKey: env.RECAPTCHA_V2_SITE_KEY
    });

    const solution = await createClient().solve(task);

    expect(typeof solution.gRecaptchaResponse).toBe('string');
    expect(solution.gRecaptchaResponse.length).toBeGreaterThan(0);
  }, 130000);
});
