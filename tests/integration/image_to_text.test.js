/**
 * Integration: recognise text on a real captcha image end to end.
 *
 * SPENDS REAL BALANCE on every run.
 *
 * The only solve test that needs no target page and no sitekey -- just an
 * image. Set IMAGE_TO_TEXT_BASE64 to a pure base64 string (no
 * "data:image/png;base64," prefix), or the suite skips. .env.example ships a
 * usable one.
 *
 * IMAGE_TO_TEXT_EXPECTED is optional. Without it the test only asserts that
 * some non-empty text came back, which proves the round-trip but not the
 * answer. Set it to the text on your image to assert the result itself --
 * compared case-insensitively, since the worker's casing is not guaranteed
 * unless the task sets case_.
 */

import { Tasks } from 'captcha-sdk';
import { describeTarget, createClient } from './helpers.js';

const expected = process.env.IMAGE_TO_TEXT_EXPECTED;

describeTarget('Image to Text against the real API', ['IMAGE_TO_TEXT_BASE64'], (env) => {
  test('solve returns the recognised text', async () => {
    const task = new Tasks.ImageToText({ body: env.IMAGE_TO_TEXT_BASE64 });

    // Image tasks are the fastest type, so the default 120 s client timeout
    // is generous already.
    const solution = await createClient().solve(task);

    expect(typeof solution.text).toBe('string');
    expect(solution.text.length).toBeGreaterThan(0);

    if (expected) {
      expect(solution.text.toLowerCase()).toBe(expected.toLowerCase());
    }
  }, 130000);
});
