/**
 * Example: Solve a Cloudflare Turnstile challenge.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Replace websiteURL and websiteKey with values from your target page.
 *   For Cloudflare Challenge pages, also extract and pass action, data, and pageData.
 */

import 'dotenv/config';
import { CaptchaClient, Tasks } from '../../src/index.js';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

const client = new CaptchaClient({ clientKey: apiKey });

// --- Proxyless example ---
// The token is tied to the User-Agent. If you pass userAgent, use the same
// User-Agent in your browser or bot when submitting the token.
try {
  const task = new Tasks.TurnstileProxyless({
    websiteURL: 'https://example.com/login',    // Full URL of the page with Turnstile
    websiteKey: '0x4AAAAAAAxxxxxxxxxxxxxxxx'     // data-sitekey attribute value
    // Optional fields (pass only if the target site sets them)
    // action: 'login',                          // Value of data-action attribute
    // data: 'custom-cdata-value',                // Value of data-cdata attribute
    // pageData: 'chl-page-data-value',           // Value of chlPageData parameter
    // userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...',
  });
  const result = await client.solve(task);
  // Solution contains { token: "0.zxcv..." }
  console.log('result:', result);
} catch (error) {
  console.error(error);
}

// --- With proxy example ---
try {
  const task = new Tasks.Turnstile({
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
    // pageData: 'chl-page-data-value',
  });
  const result = await client.solve(task);
  console.log('result:', result);
} catch (error) {
  console.error(error);
}
