/**
 * Example: Solve a reCAPTCHA v3 challenge.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Replace websiteURL, websiteKey, and minScore with values from your target page.
 *   Pass pageAction if the site uses it -- this increases the chance of the token being accepted.
 */

import 'dotenv/config';
import { CaptchaClient, Tasks } from '../../src/index.js';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

// reCAPTCHA v3 tasks may take longer to solve. Increase timeout if needed.
const client = new CaptchaClient({ clientKey: apiKey, timeout: 180000 });

// reCAPTCHA v3 returns a score instead of a pass/fail challenge.
// The higher the minScore you request, the harder and longer the task takes.
// minScore values: 0.3 (fastest), 0.7 (balanced), 0.9 (highest, slowest).
try {
  const task = new Tasks.RecaptchaV3Proxyless({
    websiteURL: 'https://example.com/login',           // Full URL of the page with captcha
    websiteKey: '6Le-xxxxxxxxxxxxxxxxxxxxxxxxxxxx',     // Site key of the v3 widget
    minScore: 0.3,                                       // Minimum acceptable score (0.3, 0.7, or 0.9)
    // Optional fields (pass if the site uses them, increases token acceptance)
    pageAction: 'login'                                  // Action set by site in grecaptcha.execute()
    // isEnterprise: true,                               // Set true for reCAPTCHA v3 Enterprise
    // apiDomain: 'www.recaptcha.net',                   // Set if site loads from recaptcha.net
  });
  const result = await client.solve(task);
  // Solution contains { gRecaptchaResponse: "03AGdBq..." }
  console.log('result:', result);
} catch (error) {
  console.error(error);
}
