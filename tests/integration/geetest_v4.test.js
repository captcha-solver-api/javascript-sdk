/**
 * Integration: solve a real GeeTest v4 challenge end to end.
 *
 * SPENDS REAL BALANCE on every run.
 *
 * Needs a target page. Set GEETEST_V4_URL and GEETEST_V4_CAPTCHA_ID, or the
 * suite skips. There are deliberately no defaults -- see tests/README.md.
 *
 * v4 is covered but v3 is not, and that is a deliberate gap: v3 needs a fresh,
 * session-specific `challenge` fetched from the target immediately before the
 * task is created. A hardcoded one is stale on arrival, so a v3 test would
 * have to scrape the target first -- see examples/async/geetest_v3.js for what
 * that looks like. v4 identifies the widget by captcha_id, which is stable.
 */

import { Tasks } from 'captcha-sdk';
import { describeTarget, createClient } from './helpers.js';

describeTarget('GeeTest v4 against the real API', ['GEETEST_V4_URL', 'GEETEST_V4_CAPTCHA_ID'], (env) => {
  test('solve returns a captcha_output payload', async () => {
    const task = new Tasks.GeeTestProxyless({
      websiteURL: env.GEETEST_V4_URL,
      version: 4,
      initParameters: { captcha_id: env.GEETEST_V4_CAPTCHA_ID }
    });

    // GeeTest is the slowest supported type, hence the raised client timeout
    // and the matching polling interval from the examples.
    const solution = await createClient({ timeout: 300000, pollingInterval: 10000 }).solve(task);

    expect(typeof solution.captcha_output).toBe('string');
    expect(solution.captcha_output.length).toBeGreaterThan(0);
    expect(solution.lot_number).toBeDefined();
    expect(solution.pass_token).toBeDefined();
  }, 310000);
});
