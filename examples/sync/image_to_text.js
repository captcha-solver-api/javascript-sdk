/**
 * Example: Solve an Image to Text challenge.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable. That is all: the sample
 *   captcha ships with the repository, in examples/assets/.
 *   Point the read below at your own file to solve a different image.
 *   Use optional fields to give hints to the worker for faster solving.
 */

import 'dotenv/config';
import fs from 'fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

// Image to Text tasks are usually fast. Default timeout is fine.
const captchaSolver = new CaptchaClient({ clientKey: apiKey });

// Read and encode the captcha image to base64.
// The body must be a pure base64 string without the data:image/...;base64, prefix.
// The path is resolved against this file rather than the working directory, so
// the example runs from anywhere -- including from the repository root.
const body = fs.readFileSync(new URL('../assets/text-captcha.png', import.meta.url)).toString('base64');

// --- Basic example ---
// Solves a simple image captcha with character set hints. The hints below match
// the sample image, which is letters and no digits -- adjust them for your own.
const basicTask = new Tasks.ImageToText({
  body: body,          // Base64-encoded image (required)
  numeric: 2,          // 2 = letters only
  minLength: 4,        // Minimum expected answer length
  maxLength: 6          // Maximum expected answer length
});

captchaSolver.solve(basicTask)
  .then((result) => {
    // Solution contains { text: "aB3fX9" }
    console.log('result:', result);
  })
  .catch((error) => {
    console.error(error);
  });

// --- Advanced example ---
// Solves a math captcha (examples/assets/captcha-math.png) with comment and
// instruction image (examples/assets/captcha-math-instructions.png). Uses its
// own body -- the basic example's sample image above isn't a math captcha.
const mathBody = fs.readFileSync(new URL('../assets/captcha-math.png', import.meta.url)).toString('base64');
const imgInstructions = fs.readFileSync(
  new URL('../assets/captcha-math-instructions.png', import.meta.url)
).toString('base64');

const advancedTask = new Tasks.ImageToText({
  body: mathBody,                                 // Base64-encoded captcha image
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

captchaSolver.solve(advancedTask)
  .then((result) => {
    console.log('result:', result);
  })
  .catch((error) => {
    console.error(error);
  });

// --- With language pool ---
// The languagePool parameter selects the worker pool by language.
// Pass it as the second argument to solve(), not inside the task.
// Accepted values: "en" (English) or "ru" (Russian).
const languagePoolTask = new Tasks.ImageToText({
  body: body,
  numeric: 2,
  minLength: 4,
  maxLength: 6
});

captchaSolver.solve(languagePoolTask, 'en')  // Picks English-speaking worker pool
  .then((result) => {
    console.log('result:', result);
  })
  .catch((error) => {
    console.error(error);
  });
