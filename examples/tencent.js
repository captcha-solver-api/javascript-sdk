import 'dotenv/config';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY' });
const task = new Tasks.TencentTaskProxyless({
  websiteURL: 'https://example.com/register',
  appId: 'YOUR_APP_ID'
});

client.solve(task)
  .then((solution) => console.log(solution))
  .catch(console.error);
