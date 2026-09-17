/**
 * Example: Solve a Tencent captcha challenge.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Replace websiteURL and appId with values from your target page.
 *   Pass captchaScript if the site uses a non-default script URL.
 */

import 'dotenv/config';
import { CaptchaClient, Tasks } from 'captcha-sdk';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

const captchaSolver = new CaptchaClient({ clientKey: apiKey });

// --- Proxyless example ---
// The service's own proxies are used to solve the captcha.
// appId is found in the page source code. captchaScript is optional if the site uses the default.
try {
  const task = new Tasks.TencentTaskProxyless({
    websiteURL: 'https://example.com/login',    // Full URL of the page with captcha
    appId: '190014885'                            // appId from page source code (required)
    // Optional fields:
    // captchaScript: 'https://turing.captcha.qcloud.com/TCaptcha.js',
  });
  const result = await captchaSolver.solve(task);
  // Solution contains { appid, ret, ticket, randstr }
  // Pass all four values together into the page's captcha callback as-is.
  console.log('result:', result);
} catch (error) {
  console.error(error);
}

// --- With proxy example ---
// Use when the target site is geo-restricted or you need a consistent session.
try {
  const task = new Tasks.TencentTask({
    websiteURL: 'https://example.com/login',
    appId: '190014885',
    // --- Proxy parameters ---
    proxyType: 'http',           // http, socks4, or socks5
    proxyAddress: '1.2.3.4',     // Proxy IP address
    proxyPort: 8080,             // Proxy port
    proxyLogin: 'user',          // Login for proxy authorization (optional)
    proxyPassword: 'password'    // Password for proxy authorization (optional)
  });
  const result = await captchaSolver.solve(task);
  console.log('result:', result);
} catch (error) {
  console.error(error);
}
