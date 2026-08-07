/**
 * Integration: solve a real Yandex SmartCaptcha (token challenge) end to end.
 *
 * SPENDS REAL BALANCE on every run.
 *
 * Needs a target page. Set YANDEX_SMARTCAPTCHA_URL and
 * YANDEX_SMARTCAPTCHA_SITE_KEY, or the suite skips. There are deliberately no
 * defaults -- see tests/README.md.
 *
 * This covers the token challenge only. Yandex's image challenge is solved
 * through CoordinatesTask with imgType: 'smart_captcha' and needs a captcha
 * image plus an instruction image, so it belongs with the image-based tests
 * rather than here.
 */

import { Tasks } from 'captcha-sdk';
import { describeTarget, createClient } from './helpers.js';

const REQUIRED = ['YANDEX_SMARTCAPTCHA_URL', 'YANDEX_SMARTCAPTCHA_SITE_KEY'];

describeTarget('Yandex SmartCaptcha against the real API', REQUIRED, (env) => {
  test('solve returns a token', async () => {
    const task = new Tasks.YandexSmartCaptchaTaskProxyless({
      websiteURL: env.YANDEX_SMARTCAPTCHA_URL,
      websiteKey: env.YANDEX_SMARTCAPTCHA_SITE_KEY
    });

    const solution = await createClient().solve(task);

    expect(typeof solution.token).toBe('string');
    expect(solution.token.length).toBeGreaterThan(0);
  }, 130000);
});
