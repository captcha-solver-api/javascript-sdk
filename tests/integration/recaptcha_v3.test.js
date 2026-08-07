/**
 * Integration: solve a real reCAPTCHA v3 end to end.
 *
 * SPENDS REAL BALANCE on every run.
 *
 * Needs a target page. Set RECAPTCHA_V3_URL and RECAPTCHA_V3_SITE_KEY, or the
 * suite skips. There are deliberately no defaults -- see tests/README.md.
 *
 * RECAPTCHA_V3_PAGE_ACTION is optional: pass it when the target site sets an
 * action in grecaptcha.execute(), since a mismatched action lowers the score
 * the site assigns to the token.
 */

import { Tasks } from 'captcha-sdk';
import { describeTarget, createClient } from './helpers.js';

// The cheapest and fastest threshold the API accepts. Not target data -- this
// is a property of the test, so it stays in the file rather than the env.
const MIN_SCORE = 0.3;

describeTarget('reCAPTCHA v3 against the real API', ['RECAPTCHA_V3_URL', 'RECAPTCHA_V3_SITE_KEY'], (env) => {
  test('solve returns a gRecaptchaResponse token', async () => {
    const task = new Tasks.RecaptchaV3Proxyless({
      websiteURL: env.RECAPTCHA_V3_URL,
      websiteKey: env.RECAPTCHA_V3_SITE_KEY,
      minScore: MIN_SCORE,
      pageAction: process.env.RECAPTCHA_V3_PAGE_ACTION || null
    });

    // v3 runs longer than v2, so the client gets a longer timeout than the
    // 120 s default and the test a longer one still.
    const solution = await createClient({ timeout: 180000 }).solve(task);

    expect(typeof solution.gRecaptchaResponse).toBe('string');
    expect(solution.gRecaptchaResponse.length).toBeGreaterThan(0);
  }, 190000);
});
