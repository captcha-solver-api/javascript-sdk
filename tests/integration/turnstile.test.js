/**
 * Integration: solve a real Cloudflare Turnstile challenge end to end.
 *
 * SPENDS REAL BALANCE on every run.
 *
 * Needs a target page. Set TURNSTILE_URL and TURNSTILE_SITE_KEY, or the suite
 * skips. There are deliberately no defaults -- see tests/README.md.
 *
 * Only the plain widget is covered here. Cloudflare Challenge pages also need
 * action, data and pagedata scraped fresh from the page, which is a different
 * kind of test: it would need a scraper of its own to stay meaningful.
 */

import { Tasks } from 'captcha-sdk';
import { describeTarget, createClient } from './helpers.js';

describeTarget('Turnstile against the real API', ['TURNSTILE_URL', 'TURNSTILE_SITE_KEY'], (env) => {
  test('solve returns a token', async () => {
    const task = new Tasks.TurnstileProxyless({
      websiteURL: env.TURNSTILE_URL,
      websiteKey: env.TURNSTILE_SITE_KEY
    });

    const solution = await createClient().solve(task);

    expect(typeof solution.token).toBe('string');
    expect(solution.token.length).toBeGreaterThan(0);
  }, 130000);
});
