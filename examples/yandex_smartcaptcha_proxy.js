import 'dotenv/config';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY' });
const task = new Tasks.YandexSmartCaptchaTask({
  websiteURL: 'https://example.com/login',
  websiteKey: 'YOUR_WEBSITE_KEY',
  proxyType: 'http',
  proxyAddress: '1.2.3.4',
  proxyPort: 8080
});

client.solve(task)
  .then((solution) => console.log(solution.token))
  .catch(console.error);
