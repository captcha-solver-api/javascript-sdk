import 'dotenv/config';
import fs from 'fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY' });
const task = new Tasks.CoordinatesTask({
  body: fs.readFileSync(new URL('./assets/coordinates-captcha.png', import.meta.url)).toString('base64'),
  comment: 'Click on the green apple'
});

client.solve(task)
  .then((solution) => console.log(solution.coordinates))
  .catch(console.error);
