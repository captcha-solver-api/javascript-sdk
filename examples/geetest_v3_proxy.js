import 'dotenv/config';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY', timeout: 300000 });

fetch('https://target-site.com/path/to/geetest/init')
  .then((response) => response.json())
  .then(({ challenge }) => client.solve(new Tasks.GeeTest({
    websiteURL: 'https://example.com/login',
    gt: 'YOUR_GT_KEY',
    challenge,
    proxyType: 'http',
    proxyAddress: '1.2.3.4',
    proxyPort: 8080
  })))
  .then((solution) => console.log(solution))
  .catch(console.error);
