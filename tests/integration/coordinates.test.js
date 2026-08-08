/**
 * Integration: solve a click captcha end to end and get back coordinates.
 *
 * SPENDS REAL BALANCE on every run.
 *
 * Like image_to_text.test.js, this one needs no target page and no widget
 * identifier -- only an image, and the image ships with the repository. Both
 * suites read their sample from examples/assets/ rather than from a fixtures
 * directory of our own: the same pictures are what the examples feed to the
 * API, and one copy cannot drift from the other. Paths are resolved against
 * this file, not the working directory, so the suite runs from anywhere.
 *
 * Only the basic form is covered. `imgInstructions` and the Yandex image mode
 * (`imgType: 'smart_captcha'`) both need a second picture -- an instruction
 * image -- which the repository does not have yet; see todo.md.
 */

import fs from 'node:fs';

import { Tasks } from 'captcha-sdk';
import { describeIntegration, createClient } from './helpers.js';

const imagePath = new URL('../../examples/assets/coordinates-captcha.png', import.meta.url);

// The sample is a 4x4 grid captcha whose own header reads "Select all squares
// with street signs". The comment repeats that instruction for the worker,
// because nothing guarantees they read the text baked into the image.
const comment = 'click on all squares with street signs';

describeIntegration('Coordinates against the real API', () => {
  test('solve returns the clicked points', async () => {
    const image = fs.readFileSync(imagePath);

    // The API wants pure base64 with no "data:image/png;base64," prefix.
    const task = new Tasks.CoordinatesTask({ body: image.toString('base64'), comment });

    // Click tasks are image tasks: as fast as image-to-text, so the default
    // 120 s client timeout is generous already.
    const solution = await createClient().solve(task);

    expect(Array.isArray(solution.coordinates)).toBe(true);
    expect(solution.coordinates.length).toBeGreaterThan(0);

    // A point outside the picture is not a valid answer, and asserting that
    // catches a whole class of nonsense -- negatives, nulls, coordinates in a
    // different unit -- that "is a number" would let through. Dimensions come
    // from the PNG's IHDR chunk (bytes 16..24) rather than being hard-coded,
    // so swapping the sample cannot silently invalidate the bounds.
    const width = image.readUInt32BE(16);
    const height = image.readUInt32BE(20);

    for (const point of solution.coordinates) {
      expect(typeof point.x).toBe('number');
      expect(typeof point.y).toBe('number');
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(width);
      expect(point.y).toBeLessThanOrEqual(height);
    }
  }, 130000);
});
