/**
 * Example: Solve a Cloudflare Turnstile challenge.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Replace websiteURL and websiteKey with values from your target page.
 *   For Cloudflare Challenge pages, also extract and pass action, data, and pagedata.
 */

import 'dotenv/config';
import { CaptchaClient, Tasks } from 'captcha-sdk';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

const captchaSolver = new CaptchaClient({ clientKey: apiKey });

// --- Proxyless example ---
// There's no userAgent input field here -- the worker picks its own User-Agent
// while solving and returns it as result.userAgent. The token is tied to that
// browser fingerprint, so submit it with the exact User-Agent the response gives
// you, not one you chose yourself.
try {
  const task = new Tasks.TurnstileProxyless({
    websiteURL: 'https://example.com/login',    // Full URL of the page with Turnstile
    websiteKey: '0x4AAAAAAAxxxxxxxxxxxxxxxx'     // data-sitekey attribute value
    // Optional fields (pass only if the target site sets them)
    // action: 'login',                          // Value of data-action attribute
    // data: 'custom-cdata-value',                // Value of data-cdata attribute
    // pagedata: 'chl-page-data-value',           // Value of chlPageData parameter
  });
  const result = await captchaSolver.solve(task);
  // Solution contains { token: "0.zxcv...", userAgent: "Mozilla/5.0 ..." }
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
    // pagedata: 'chl-page-data-value',
  });
  const result = await captchaSolver.solve(task);
  console.log('result:', result);
} catch (error) {
  console.error(error);
}
