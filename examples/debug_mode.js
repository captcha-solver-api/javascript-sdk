import 'dotenv/config';
import fs from 'fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

/**
 * Debug mode: watch every API request, server response and the final solve summary.
 * It enables `debug: true`, solves a text CAPTCHA from a bundled image with
 * CaptchaClient.solve(), and prints the recognized text. The `[CaptchaClient] ...`
 * lines are the SDK's debug log; the last line is printed by this example.
 * Credentials in the log are shown as [MASKED], so the output is safe to share.
 *
 * How it works:
 * STEP-01 - Configure the SDK client with debug logging enabled.
 * STEP-02 - Create the CAPTCHA task from a local image.
 * STEP-03 - Submit the task; the SDK logs each request and a SOLVE SUMMARY.
 * STEP-04 - Print the solution or report an error.
 */

if (!process.env.CAPTCHA_API_KEY) {
  throw new Error('Set CAPTCHA_API_KEY in .env or in the current shell before running this example.');
}

// STEP-01: Configure the SDK client; debug: true turns on the debug log.
const client = new CaptchaClient({
  clientKey: process.env.CAPTCHA_API_KEY,
  debug: true
});

// STEP-02: Create the CAPTCHA task from the bundled sample image.
const task = new Tasks.ImageToText({
  body: fs.readFileSync(new URL('./assets/text-captcha.png', import.meta.url)).toString('base64'),
  numeric: 2,
  minLength: 4,
  maxLength: 6
});

// STEP-03: Submit the task; solve() handles task creation and polling and logs each step.
client.solve(task)
  .then((solution) => {
    // STEP-04: Print the result returned by solve(), after the SDK's SOLVE SUMMARY.
    console.log('Result:', solution.text);
  })
  .catch((error) => {
    // Report SDK or transport failures without hiding the rejected Promise.
    console.error(error);
  });
