/**
 * Integration: solve a real Tencent captcha end to end.
 *
 * SPENDS REAL BALANCE on every run.
 *
 * Needs a target page. Set TENCENT_URL and TENCENT_APP_ID, or the suite skips.
 * There are deliberately no defaults -- see tests/README.md.
 *
 * TENCENT_CAPTCHA_SCRIPT is optional: set it only when the target loads the
 * widget from a non-default script URL.
 */

import { Tasks } from '@captcha-solver-api/javascript-sdk';
import { describeTarget, createClient } from './helpers.js';

describeTarget('Tencent against the real API', ['TENCENT_URL', 'TENCENT_APP_ID'], (env) => {
  test('solve returns a ticket', async () => {
    const task = new Tasks.TencentTaskProxyless({
      websiteURL: env.TENCENT_URL,
      appId: env.TENCENT_APP_ID,
      captchaScript: process.env.TENCENT_CAPTCHA_SCRIPT || null
    });

    const solution = await createClient().solve(task);

    expect(typeof solution.ticket).toBe('string');
    expect(solution.ticket.length).toBeGreaterThan(0);
    expect(solution.randstr).toBeDefined();
  }, 130000);
});
