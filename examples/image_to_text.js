import 'dotenv/config';
import fs from 'fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY' });
const task = new Tasks.ImageToText({
  body: fs.readFileSync(new URL('./assets/text-captcha.png', import.meta.url)).toString('base64'),
  numeric: 2,
  minLength: 4,
  maxLength: 6
});

client.solve(task)
  .then((solution) => console.log(solution.text))
  .catch(console.error);
