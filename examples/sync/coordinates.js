/**
 * Example: Solve a click-based image captcha using CoordinatesTask.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Provide the captcha image as base64 in the body parameter.
 *   Use comment to tell the worker what to click on the image.
 *   No proxy is required. The image is submitted directly to the service.
 */

import 'dotenv/config';
import fs from 'fs';
import { CaptchaClient, Tasks } from '../../src/index.js';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

const client = new CaptchaClient({ clientKey: apiKey });

// Read and encode the captcha image to base64.
// The body must be a pure base64 string without the data:image/...;base64, prefix.
const body = fs.readFileSync('./captcha.png').toString('base64');

// --- Basic example ---
// Solves a simple click-based captcha with a hint for the worker.
const basicTask = new Tasks.CoordinatesTask({
  body: body,                             // Base64-encoded captcha image (required)
  comment: 'click on the green apple'      // Text hint for the worker
});

client.solve(basicTask)
  .then((result) => {
    // Solution contains { coordinates: [{ x: 358, y: 268 }] }
    console.log('result:', result);
  })
  .catch((error) => {
    console.error(error);
  });

// --- Advanced example ---
// Solves a captcha with instruction image and click count limits.
const imgInstructions = fs.readFileSync('./instruction.png').toString('base64');

const advancedTask = new Tasks.CoordinatesTask({
  body: body,                                 // Base64-encoded captcha image
  comment: 'click on all traffic lights',      // Text hint for the worker
  imgInstructions: imgInstructions,            // Optional instruction image
  minClicks: 1,                                // Minimum number of clicks (default 1)
  maxClicks: 3                                 // Maximum number of clicks allowed
});

client.solve(advancedTask)
  .then((result) => {
    console.log('result:', result);
  })
  .catch((error) => {
    console.error(error);
  });

// --- Yandex SmartCaptcha image mode ---
// CoordinatesTask also solves Yandex SmartCaptcha in image mode via imgType.
const yandexTask = new Tasks.CoordinatesTask({
  body: body,
  imgType: 'smart_captcha',                    // smart_captcha for object selection, or pazl_smart_captcha for puzzle
  imgInstructions: imgInstructions,            // Required for smart_captcha
  comment: 'select objects in the order of the instruction'
});

client.solve(yandexTask)
  .then((result) => {
    console.log('result:', result);
  })
  .catch((error) => {
    console.error(error);
  });
