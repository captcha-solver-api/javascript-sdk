/**
 * Example: Solve a Cloudflare Turnstile challenge.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Replace websiteURL and websiteKey with values from your target page.
 *   For Cloudflare Challenge pages, also extract and pass action, data, pagedata,
 *   and the current browser userAgent.
 */

import 'dotenv/config';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

const captchaSolver = new CaptchaClient({ clientKey: apiKey });

// --- Proxyless example ---
// For a Cloudflare Challenge page, pass the current browser User-Agent together
// with action, data, and pagedata. Do not change the browser User-Agent after solving.
const proxylessTask = new Tasks.TurnstileProxyless({
  websiteURL: 'https://example.com/login',    // Full URL of the page with Turnstile
  websiteKey: '0x4AAAAAAAxxxxxxxxxxxxxxxx',    // data-sitekey attribute value
  // Optional fields (pass only if the target site sets them)
  // action: 'login',                          // Value of data-action attribute
  // data: 'custom-cdata-value',                // Value of data-cdata attribute
  // pagedata: 'chl-page-data-value',           // Value of chlPageData parameter
  // userAgent: 'Mozilla/5.0 ...',              // Current browser User-Agent
});

captchaSolver.solve(proxylessTask)
  .then((result) => {
    // Solution contains { token: "0.zxcv...", userAgent: "Mozilla/5.0 ..." }
    console.log('result:', result);
  })
  .catch((error) => {
    console.error(error);
  });

// --- With proxy example ---
const proxyTask = new Tasks.Turnstile({
  websiteURL: 'https://example.com/login',
  websiteKey: '0x4AAAAAAAxxxxxxxxxxxxxxxx',
  // --- Proxy parameters ---
  proxyType: 'http',           // http, socks4, or socks5
  proxyAddress: '1.2.3.4',     // Proxy IP address
  proxyPort: 8080,             // Proxy port
  proxyLogin: 'user',          // Login for proxy authorization (optional)
  proxyPassword: 'password'    // Password for proxy authorization (optional)
  // --- Optional fields ---
  // action: 'login',
  // data: 'custom-cdata-value',
  // pagedata: 'chl-page-data-value',
});

captchaSolver.solve(proxyTask)
  .then((result) => {
    console.log('result:', result);
  })
  .catch((error) => {
    console.error(error);
  });
