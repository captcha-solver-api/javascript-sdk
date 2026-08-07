/**
 * Example: Solve an Image to Text challenge.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Provide a captcha image file as base64 in the body parameter.
 *   Use optional fields to give hints to the worker for faster solving.
 */

import 'dotenv/config';
import fs from 'fs';
import { CaptchaClient, Tasks } from '../../src/index.js';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

// Image to Text tasks are usually fast. Default timeout is fine.
const captchaSolver = new CaptchaClient({ clientKey: apiKey });

// Read and encode the captcha image to base64.
// The body must be a pure base64 string without the data:image/...;base64, prefix.
const body = fs.readFileSync('./captcha.png').toString('base64');

// --- Basic example ---
// Solves a simple image captcha with character set hints.
try {
  const task = new Tasks.ImageToText({
    body: body,          // Base64-encoded image (required)
    numeric: 1,          // 1 = digits only
    minLength: 4,        // Minimum expected answer length
    maxLength: 6          // Maximum expected answer length
  });
  const result = await captchaSolver.solve(task);
  // Solution contains { text: "aB3fX9" }
  console.log('result:', result);
} catch (error) {
  console.error(error);
}

// --- Advanced example ---
// Solves a math captcha with comment and instruction image.
const imgInstructions = fs.readFileSync('./captcha_hint.png').toString('base64');

try {
  const task = new Tasks.ImageToText({
    body: body,                                    // Base64-encoded captcha image
    // Optional fields (pass only if needed by the captcha type)
    phrase: false,                                  // true if answer has multiple words
    case_: true,                                    // true if answer is case-sensitive
    numeric: 0,                                      // 0 = not specified, 1 = digits, 2 = letters, 3 = any with digits, 4 = any with letters
    math: true,                                      // true if image is a math expression to solve
    minLength: 1,                                    // Minimum answer length
    maxLength: 10,                                   // Maximum answer length
    comment: 'Enter the result of the equation',      // Text hint for the worker
    imgInstructions: imgInstructions                 // Optional instruction image for the worker
  });
  const result = await captchaSolver.solve(task);
  console.log('result:', result);
} catch (error) {
  console.error(error);
}

// --- With language pool ---
// The languagePool parameter selects the worker pool by language.
// Pass it as the second argument to solve(), not inside the task.
// Accepted values: "en" (English) or "ru" (Russian).
try {
  const task = new Tasks.ImageToText({
    body: body,
    numeric: 1,
    minLength: 4,
    maxLength: 6
  });
  const result = await captchaSolver.solve(task, 'en');  // Picks English-speaking worker pool
  console.log('result:', result);
} catch (error) {
  console.error(error);
}
