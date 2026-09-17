/**
 * Example: Solve a click-based image captcha using CoordinatesTask.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable. That is all: the sample
 *   captcha ships with the repository, in examples/assets/.
 *   Point the read below at your own file to solve a different image, and use
 *   comment to tell the worker what to click on it.
 *   No proxy is required. The image is submitted directly to the service.
 */

import 'dotenv/config';
import fs from 'fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

const captchaSolver = new CaptchaClient({ clientKey: apiKey });

// Read and encode the captcha image to base64.
// The body must be a pure base64 string without the data:image/...;base64, prefix.
// The path is resolved against this file rather than the working directory, so
// the example runs from anywhere -- including from the repository root.
const body = fs.readFileSync(new URL('../assets/coordinates-captcha.png', import.meta.url)).toString('base64');

// --- Basic example ---
// Solves a simple click-based captcha with a hint for the worker. The comment
// repeats the instruction printed on the sample image, because nothing
// guarantees the worker reads the text baked into the picture.
try {
  const task = new Tasks.CoordinatesTask({
    body: body,                                          // Base64-encoded captcha image (required)
    comment: 'click on all squares with street signs'     // Text hint for the worker
  });
  const result = await captchaSolver.solve(task);
  // Solution contains { coordinates: [{ x: 358, y: 268 }] }
  console.log('result:', result);
} catch (error) {
  console.error(error);
}

// --- Advanced example ---
// Solves a captcha (examples/assets/traffic-lights.png) with instruction image
// (examples/assets/traffic-lights-instructions.png) and click count limits.
// Uses its own body -- the basic example's sample image above isn't traffic lights.
try {
  const trafficBody = fs.readFileSync(new URL('../assets/traffic-lights.png', import.meta.url)).toString('base64');
  const imgInstructions = fs.readFileSync(
    new URL('../assets/traffic-lights-instructions.png', import.meta.url)
  ).toString('base64');

  const task = new Tasks.CoordinatesTask({
    body: trafficBody,                          // Base64-encoded captcha image
    comment: 'click on all traffic lights',      // Text hint for the worker
    imgInstructions: imgInstructions,            // Optional instruction image
    minClicks: 1,                                // Minimum number of clicks (default 1)
    maxClicks: 3                                 // Maximum number of clicks allowed
  });
  const result = await captchaSolver.solve(task);
  console.log('result:', result);
} catch (error) {
  console.error(error);
}
