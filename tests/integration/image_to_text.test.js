/**
 * Integration: recognise text on a real captcha image end to end.
 *
 * SPENDS REAL BALANCE on every run.
 *
 * The only solve test that needs no target page and no widget identifier --
 * just an image, and it ships with the repository. So unlike every other solve
 * suite this one runs on a fresh clone with nothing but CAPTCHA_API_KEY set.
 *
 * The sample lives in examples/assets/ rather than in a fixtures directory of
 * our own: the same picture is what the image_to_text examples feed to the
 * API, and one copy that both use cannot drift from the other. Path is
 * resolved against this file, not the working directory, so the suite runs
 * from anywhere.
 *
 * IMAGE_TO_TEXT_EXPECTED is optional. Without it the test only asserts that
 * some non-empty text came back, which proves the round-trip but not the
 * answer. Set it to the text on the image to assert the result itself --
 * compared case-insensitively, since the worker's casing is not guaranteed
 * unless the task sets case_.
 */

import fs from 'node:fs';

import { Tasks } from '@captcha-solver-api/javascript-sdk';
import { describeIntegration, createClient } from './helpers.js';

const imagePath = new URL('../../examples/assets/text-captcha.png', import.meta.url);
const expected = process.env.IMAGE_TO_TEXT_EXPECTED;

describeIntegration('Image to Text against the real API', () => {
  test('solve returns the recognised text', async () => {
    // The API wants pure base64 with no "data:image/png;base64," prefix.
    const body = fs.readFileSync(imagePath).toString('base64');
    const task = new Tasks.ImageToText({ body });

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
