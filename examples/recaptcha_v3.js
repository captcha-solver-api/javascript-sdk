import 'dotenv/config';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

/**
 * Solve reCAPTCHA v3 without a proxy.
 * It creates Tasks.RecaptchaV3Proxyless from the shown parameters, submits it with
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
const captchaSolver = new CaptchaClient({
  clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY'
});


// STEP-02: Create the CAPTCHA task with the values required by this challenge.
const task = new Tasks.RecaptchaV3Proxyless({
  websiteURL: 'https://example.com/login',
  websiteKey: 'YOUR_WEBSITE_KEY',
  minScore: 0.3,
  pageAction: 'homepage'
});


// STEP-03: Submit the task; solve() handles task creation and polling.
captchaSolver.solve(task)
  .then((result) => {
    // STEP-04: Print the solution returned for this CAPTCHA type.
    console.log('Solution:', result);
  })
  .catch((error) => {
    // Report SDK or transport failures without hiding the rejected Promise.
    console.error(error);
  });
