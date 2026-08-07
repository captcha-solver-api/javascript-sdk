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
 * A client bound to the environment's key. Built per test rather than shared,
 * so nothing carries over between tests.
 */
export function createClient() {
  return new CaptchaClient({ clientKey: apiKey });
}
