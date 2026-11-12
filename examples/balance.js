import 'dotenv/config';
import { CaptchaClient } from '@captcha-solver-api/javascript-sdk';

/**
 * Check the current Captcha Solver account balance without creating a CAPTCHA task.
 * Set the CAPTCHA_API_KEY environment variable before running this example.
 *
 * How it works:
 * STEP-01 - Read the API key and configure the SDK client.
 * STEP-02 - Request the account balance with CaptchaClient.getBalance().
 * STEP-03 - Print the returned amount or report an error.
 */

// STEP-01: Read the API key and configure the SDK client.
const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';
const captchaSolver = new CaptchaClient({ clientKey: apiKey });

// STEP-02: Request the balance; this method does not create a CAPTCHA task.
captchaSolver.getBalance()
  .then((balance) => {
    // STEP-03: Print the available amount in the account currency.
    console.log('Balance:', balance);
  })
  .catch((error) => {
    // Report SDK or transport failures without hiding the rejected Promise.
    console.error(error);
  });
