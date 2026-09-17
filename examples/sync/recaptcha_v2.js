/**
 * Example: Solve a reCAPTCHA v2 challenge.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Replace websiteURL and websiteKey with values from your target page.
 */

import 'dotenv/config';
import { CaptchaClient, Tasks } from 'captcha-sdk';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

// Create a solver instance with your API key.
// Optional: timeout (ms to wait for solution, default 120000)
// Optional: pollingInterval (ms between status checks, default 5000)
const captchaSolver = new CaptchaClient({ clientKey: apiKey });

// --- Proxyless example ---
// Solves reCAPTCHA v2 without a proxy. The service uses its own IP addresses.
const proxylessTask = new Tasks.RecaptchaV2Proxyless({
  websiteURL: 'https://example.com/login',           // Full URL of the page with captcha
  websiteKey: '6Le-xxxxxxxxxxxxxxxxxxxxxxxxxxxx',     // data-sitekey attribute value
  isInvisible: false                                   // Set true for invisible reCAPTCHA
});

captchaSolver.solve(proxylessTask)
  .then((result) => {
    // Solution contains { gRecaptchaResponse: "03AGdBq..." }
    console.log('result:', result);
  })
  .catch((error) => {
    console.error(error);
  });

// --- With proxy example ---
// Solves reCAPTCHA v2 through your own proxy. Required when the target site is
// geo-restricted or you need session consistency.
const proxyTask = new Tasks.RecaptchaV2({
  websiteURL: 'https://example.com/login',
  websiteKey: '6Le-xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  // --- Proxy parameters ---
  proxyType: 'http',           // http, socks4, or socks5
  proxyAddress: '1.2.3.4',     // Proxy IP address
  proxyPort: 8080,             // Proxy port
  proxyLogin: 'user',          // Login for proxy authorization (optional)
  proxyPassword: 'password'    // Password for proxy authorization (optional)
});

captchaSolver.solve(proxyTask)
  .then((result) => {
    console.log('result:', result);
  })
  .catch((error) => {
    console.error(error);
  });
