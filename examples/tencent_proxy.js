import 'dotenv/config';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY' });
const task = new Tasks.TencentTask({
  websiteURL: 'https://example.com/register',
  appId: 'YOUR_APP_ID',
  proxyType: 'http',
  proxyAddress: '1.2.3.4',
  proxyPort: 8080
});

client.solve(task)
  .then((solution) => console.log(solution))
  .catch(console.error);
