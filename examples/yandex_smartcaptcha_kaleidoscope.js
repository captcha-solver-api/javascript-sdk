import 'dotenv/config';
import fs from 'node:fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

/**
 * Solve a Yandex SmartCaptcha Kaleidoscope puzzle from a local image.
 * It creates Tasks.YandexSmartCaptchaKaleidoscopeTask from the shown parameters, submits it with
 * CaptchaClient.solve(), and prints the relevant returned value. Applying that value to a
 * target page is site-specific. Replace all target-specific placeholders before running.
 *
 * How it works:
 * STEP-01 - Configure the SDK client.
 * STEP-02 - Create the CAPTCHA task from the required parameters or local assets.
 * STEP-03 - Submit the task and wait for CaptchaClient.solve() to return the solution.
 * STEP-04 - Print the solution as formatted JSON or report an error.
 */

if (!process.env.CAPTCHA_API_KEY) {
  throw new Error('Set CAPTCHA_API_KEY in .env or in the current shell before running this example.');
}

// STEP-01: Configure the SDK client with the API key.
const captchaSolver = new CaptchaClient({
  clientKey: process.env.CAPTCHA_API_KEY,
  debug: process.env.CAPTCHA_DEBUG === '1'
});
const image = fs.readFileSync(
  new URL('./assets/yandex-smartcaptcha-kaleidoscope.jpg', import.meta.url)
).toString('base64');

// STEP-02: Create the CAPTCHA task with the values required by this challenge.
const task = new Tasks.YandexSmartCaptchaKaleidoscopeTask({
  image,
  task: '[7,15,14,0,11,6,6,0,11,15,6,10,1,14,3,12,9,0,15,1,5,1,8,11,12,11,0,12,1,10,1,4,14,6,10,6,10,8,3,0,5,9,7,8,0,3,8,0,9,12,12,11,3,0,8,10]'
});

// STEP-03: Submit the task; solve() handles task creation and polling.
captchaSolver.solve(task)
  .then((clicks) => {
    // STEP-04: Print a structured response that can be copied or parsed as JSON.
    console.log(JSON.stringify({ clicks }, null, 2));
  })
  .catch((error) => {
    // Report SDK or transport failures without hiding the rejected Promise.
    console.error(error);
  });
