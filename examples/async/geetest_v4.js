/**
 * Example: Solve a GeeTest v4 challenge.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Replace websiteURL and captcha_id with values from your target page.
 *   GeeTest v4 drops gt/challenge entirely. It uses captcha_id instead.
 */

import 'dotenv/config';
import { CaptchaClient, Tasks } from 'captcha-sdk';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

// GeeTest v4 tasks may take longer. Increase timeout if needed.
const captchaSolver = new CaptchaClient({ clientKey: apiKey, timeout: 300000, pollingInterval: 10000 });

// --- Proxyless example ---
// v4 drops gt/challenge. The widget is identified by captcha_id inside initParameters.
try {
  const task = new Tasks.GeeTestProxyless({
    websiteURL: 'https://example.com/login',    // Full URL of the page with GeeTest v4
    version: 4,                                  // Required: must be 4 for this version
    initParameters: {                             // Required: must contain captcha_id
      captcha_id: 'e392e1d7fd421dc63325744d5a2b9c73'  // Static site identifier
    }
    // Optional fields
    // risk_type: 'slide',                                 // Dynamic value from the page's captcha-loading request, if present (note: snake_case, not riskType)
    // userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
  });
  const result = await captchaSolver.solve(task);
  // Solution contains { captcha_id, lot_number, pass_token, gen_time, captcha_output }
  console.log('result:', result);
} catch (error) {
  console.error(error);
}

// --- With proxy example ---
try {
  const task = new Tasks.GeeTest({
    websiteURL: 'https://example.com/login',
    version: 4,
    initParameters: {
      captcha_id: 'e392e1d7fd421dc63325744d5a2b9c73'
    },
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
