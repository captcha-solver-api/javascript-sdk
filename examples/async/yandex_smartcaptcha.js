/**
 * Example: Solve a Yandex SmartCaptcha challenge (token-based).
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Replace websiteURL and websiteKey with values from your target page.
 */

import 'dotenv/config';
import { CaptchaClient, Tasks } from 'captcha-sdk';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

const captchaSolver = new CaptchaClient({ clientKey: apiKey });

// --- Proxyless example ---
// The service's own proxies are used to solve the captcha.
// websiteKey is the sitekey value from the page code or captcha iframe.
try {
  const task = new Tasks.YandexSmartCaptchaTaskProxyless({
    websiteURL: 'https://example.com/login',                  // Full URL of the page with captcha
    websiteKey: 'FEXfAbHQsToo97VidNVk3j4dC74nGW1DgdxK4OoR'     // sitekey from page code or iframe
    // Optional fields:
    // userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
    // cookies: 'session=abc123; token=xyz789',
  });
  const result = await captchaSolver.solve(task);
  // Solution contains { token: "dV9xNjYyNTU3NjkxO4k9OTQuNVMuMjkuMjM9..." }
  console.log('result:', result);
} catch (error) {
  console.error(error);
}

// --- With proxy example ---
// Note: this is the only captcha type where an https proxy is accepted.
try {
  const task = new Tasks.YandexSmartCaptchaTask({
    websiteURL: 'https://example.com/login',
    websiteKey: 'FEXfAbHQsToo97VidNVk3j4dC74nGW1DgdxK4OoR',
    // --- Proxy parameters ---
    proxyType: 'http',           // http, https, socks4, or socks5 (https is accepted only for this type)
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
