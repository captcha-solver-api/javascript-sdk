import 'dotenv/config';
import fs from 'fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

/**
 * Solve a coordinate CAPTCHA from a local image without a proxy.
 * It creates Tasks.CoordinatesTask from the shown parameters, submits it with
 * CaptchaClient.solve(), and prints the relevant returned value. Applying that value to a
 * target page is site-specific. Replace all target-specific placeholders before running.
 *
 * How it works:
 * STEP-01 - Configure the SDK client.
 * STEP-02 - Create the CAPTCHA task from the required parameters or local assets.
 * STEP-03 - Submit the task and wait for CaptchaClient.solve() to return the solution.
 * STEP-04 - Print the relevant solution value or report an error.
 */


// STEP-01: Configure the SDK client with the API key.
const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY' });

// STEP-02: Create the CAPTCHA task with the values required by this challenge.
const task = new Tasks.CoordinatesTask({
  body: fs.readFileSync(new URL('./assets/coordinates-captcha.png', import.meta.url)).toString('base64'),
  comment: 'Click on the green apple'
});


// STEP-03: Submit the task; solve() handles task creation and polling.
client.solve(task)
  .then((solution) => {
    // STEP-04: Print only the useful field returned for this CAPTCHA type.
    console.log(solution.coordinates);
  })
  .catch((error) => {
    // Report SDK or transport failures without hiding the rejected Promise.
    console.error(error);
  });
