/**
 * Integration: solve an image-based Yandex SmartCaptcha end to end and get
 * back the click coordinates in order.
 *
 * SPENDS REAL BALANCE on every run.
 *
 * Needs no target page: the main image and the instruction strip ship with the
 * repository in examples/assets/, the same files the
 * yandex_smartcaptcha_image.js example uses. Paths are resolved against this
 * file, not the working directory, so the suite runs from anywhere.
 */

import fs from 'node:fs';

import { Tasks } from '@captcha-solver-api/javascript-sdk';
import { describeIntegration, createClient } from './helpers.js';

const imagePath = new URL(
  '../../examples/assets/yandex-smartcaptcha-image.png',
  import.meta.url
);
const instructionsPath = new URL(
  '../../examples/assets/yandex-smartcaptcha-instructions.png',
  import.meta.url
);

describeIntegration('Yandex SmartCaptcha image against the real API', () => {
  test('solve returns ordered click coordinates', async () => {
    const image = fs.readFileSync(imagePath);
    const instructions = fs.readFileSync(instructionsPath);
    const task = new Tasks.YandexSmartCaptchaImageTask({
      image: image.toString('base64'),
      imgInstructions: instructions.toString('base64')
    });

    const solution = await createClient().solve(task);

    // The instruction strip in the sample shows five symbols.
    expect(solution.coordinates).toHaveLength(5);

    // Bounds come from the PNG's IHDR chunk (bytes 16..24), so swapping the
    // sample cannot silently invalidate them.
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
