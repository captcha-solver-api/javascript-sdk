/**
 * Shared setup for the real-API integration tests.
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../src/.
 *
 * Note this file is NOT a test file -- it has no .test.js suffix, so Jest's
 * default testMatch ignores it. Keep it that way when adding helpers.
 */

// Loads .env so a local run does not have to export a dozen variables by hand.
// dotenv never overwrites variables already present in the environment, so
// anything passed on the command line or by CI still wins. Missing .env is not
// an error. Unit tests do not import this file and stay unaffected.
import 'dotenv/config';

import { CaptchaClient } from 'captcha-sdk';

export const apiKey = process.env.CAPTCHA_API_KEY;

/**
 * describe() when a key is available, describe.skip() when it is not.
 *
 * The suite used to guard every test body with `if (!apiKey) return`, which
 * made a keyless run report green "passed" for tests that never touched the
 * API -- a silent lie that is worse than a failure. Skipping at the describe
 * level reports "skipped" instead, so the output matches reality.
 *
 * Resolved per call rather than captured at import time, so the module does
 * not depend on when Jest installs its globals.
 */
export function describeIntegration(name, fn) {
  (apiKey ? describe : describe.skip)(name, fn);
}

/**
 * Same as describeIntegration, but also requires a target to be configured.
 *
 * Solving a real captcha needs a real page and whatever identifies the widget
 * on it -- a sitekey for reCAPTCHA, Turnstile and Yandex, an appId for
 * Tencent, a captchaId for GeeTest v4. Those are deliberately absent from this
 * repository -- see tests/README.md. Every value comes from the environment,
 * so a suite whose variables are unset skips instead of failing on
 * `undefined`:
 *
 *   describeTarget('Turnstile', ['TURNSTILE_URL', 'TURNSTILE_SITE_KEY'], (env) => {
 *     test('...', async () => {
 *       new Tasks.TurnstileProxyless({ websiteURL: env.TURNSTILE_URL, ... });
 *     });
 *   });
 *
 * The callback receives the collected values. When the suite is skipped they
 * are undefined, which is harmless: describe.skip evaluates the block to
 * register test names, but never runs the test bodies that read them.
 *
 * @param {string} name          suite name
 * @param {string[]} requiredVars environment variables the suite cannot run without
 * @param {(env: Record<string, string>) => void} fn suite body
 */
export function describeTarget(name, requiredVars, fn) {
  const env = Object.fromEntries(requiredVars.map((key) => [key, process.env[key]]));
  const missing = requiredVars.filter((key) => !env[key]);
  const runnable = Boolean(apiKey) && missing.length === 0;

  (runnable ? describe : describe.skip)(name, () => fn(env));
}

/**
 * A client bound to the environment's key. Built per test rather than shared,
 * so nothing carries over between tests.
 *
 * Pass overrides for slow captcha types, e.g. createClient({ timeout: 300000 }).
 * Keep the Jest timeout of such a test above the client timeout, otherwise
 * Jest kills the test before the SDK can raise its own TimeoutError and the
 * failure says nothing useful.
 */
export function createClient(options = {}) {
  return new CaptchaClient({ clientKey: apiKey, ...options });
}
