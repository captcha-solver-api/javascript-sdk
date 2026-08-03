/**
 * Example: Solve a GeeTest v3 challenge.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Replace websiteURL, gt, and challenge with values from your target page.
 *   Important: the challenge value is dynamic. Fetch a fresh one for each request.
 *
 * NOTE: "https://target-site.com/path/to/geetest/init" below is a PLACEHOLDER, not a
 * real endpoint -- this script will not run end-to-end as-is. Replace it with a request
 * to your actual target page (or wherever it exposes a fresh `challenge` value) before
 * running this example. It's here only to illustrate where that fetch belongs in the flow.
 */

import 'dotenv/config';
import { CaptchaClient, Tasks } from '../../src/index.js';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

// GeeTest tasks may take longer. Increase timeout if needed.
const client = new CaptchaClient({ clientKey: apiKey, timeout: 300000, pollingInterval: 10000 });

// Fetch a fresh challenge value from the target page.
// In production, extract this from the page's initGeetest call or network requests.
// "target-site.com" is a placeholder -- point this at your real target before running.
fetch('https://target-site.com/path/to/geetest/init')
  .then((response) => response.json())
  .then(({ challenge }) => {
    // --- Proxyless example ---
    // v3 is the default version, so the version field can be omitted.
    const proxylessTask = new Tasks.GeeTestProxyless({
      websiteURL: 'https://example.com/login',    // Full URL of the page with GeeTest
      gt: 'f2ae6cadcf7886856696c46d84d109d1',      // Public key of the GeeTest widget
      challenge: challenge                          // Session-specific value, must be fresh
      // Optional fields
      // geetestApiServerSubdomain: 'api-na.geetest.com',  // Custom API subdomain
      // initParameters: {...},                              // Extra params from initGeetest call
      // userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
    });

    client.solve(proxylessTask)
      .then((result) => {
        // Solution contains { challenge, validate, seccode }
        console.log('result:', result);
      })
      .catch((error) => {
        console.error(error);
      });

    // --- With proxy example ---
    const proxyTask = new Tasks.GeeTest({
      websiteURL: 'https://example.com/login',
      gt: 'f2ae6cadcf7886856696c46d84d109d1',
      challenge: challenge,
      proxyType: 'http',           // http, socks4, or socks5
      proxyAddress: '1.2.3.4',     // Proxy IP address
      proxyPort: 8080,             // Proxy port
      proxyLogin: 'user',          // Login for proxy authorization (optional)
      proxyPassword: 'password'    // Password for proxy authorization (optional)
    });

    client.solve(proxyTask)
      .then((result) => {
        console.log('result:', result);
      })
      .catch((error) => {
        console.error(error);
      });
  })
  .catch((error) => {
    console.error(error);
  });
