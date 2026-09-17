/**
 * Example: Solve a reCAPTCHA v2 Enterprise challenge.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Replace websiteURL and websiteKey with values from your target page.
 *   If the site uses enterprisePayload, extract and pass it or the token may be rejected.
 */

import 'dotenv/config';
import { CaptchaClient, Tasks } from 'captcha-sdk';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

const captchaSolver = new CaptchaClient({ clientKey: apiKey });

// --- Proxyless example ---
// Enterprise captchas are loaded via the reCAPTCHA Enterprise API. If the site
// passes extra parameters to grecaptcha.enterprise.render(), pass them as
// enterprisePayload or the token will be rejected.
try {
  const task = new Tasks.RecaptchaV2EnterpriseProxyless({
    websiteURL: 'https://example.com/login',
    websiteKey: '6Le-xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    isInvisible: false
    // Optional fields (pass only if the target site requires them):
    // enterprisePayload: { s: 'value-from-page' },
    // apiDomain: 'recaptcha.net',
    // userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
    // cookies: 'session=abc123; token=xyz789',
  });
  const result = await captchaSolver.solve(task);
  // Solution contains { gRecaptchaResponse: "03AGdBq..." }
  console.log('result:', result);
} catch (error) {
  console.error(error);
}

// --- With proxy example ---
try {
  const task = new Tasks.RecaptchaV2Enterprise({
    websiteURL: 'https://example.com/login',
    websiteKey: '6Le-xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    proxyType: 'http',
    proxyAddress: '1.2.3.4',
    proxyPort: 8080,
    proxyLogin: 'user',
    proxyPassword: 'password',
    isInvisible: false
  });
  const result = await captchaSolver.solve(task);
  console.log('result:', result);
} catch (error) {
  console.error(error);
}
