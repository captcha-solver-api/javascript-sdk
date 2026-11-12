import 'dotenv/config';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

/**
 * Solve GeeTest v3 with a challenge fetched from the target site and a customer proxy.
 * It creates Tasks.GeeTest from the shown parameters, submits it with
 * CaptchaClient.solve(), and prints the relevant returned value. Applying that value to a
 * target page is site-specific. Replace all target-specific placeholders before running.
 *
 * How it works:
 * STEP-01 - Configure the SDK client.
 * STEP-02 - Fetch the current challenge from the target site's GeeTest endpoint.
 * STEP-03 - Create and submit the proxied task, then wait for CaptchaClient.solve().
 * STEP-04 - Print the relevant solution value or report an error.
 */


// STEP-01: Configure the SDK client with the API key.
const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY', timeout: 300000 });

// STEP-02: Fetch the dynamic challenge immediately before creating the task.
fetch('https://target-site.com/path/to/geetest/init')
  .then((response) => response.json())
  .then(({ challenge }) => {
    // STEP-03: Submit a proxied task with the fresh challenge returned by the target site.
    return client.solve(new Tasks.GeeTest({
      websiteURL: 'https://example.com/login',
      gt: 'YOUR_GT_KEY',
      challenge,
      proxyType: 'http',
      proxyAddress: '1.2.3.4',
      proxyPort: 8080
    }));
  })
  .then((solution) => {
    // STEP-04: Print only the useful field returned for this CAPTCHA type.
    console.log(solution);
  })
  .catch((error) => {
    // Report SDK or transport failures without hiding the rejected Promise.
    console.error(error);
  });
