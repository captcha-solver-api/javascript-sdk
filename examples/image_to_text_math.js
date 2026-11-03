import 'dotenv/config';
import fs from 'fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY' });
const task = new Tasks.ImageToText({
  body: fs.readFileSync(new URL('./assets/captcha-math.png', import.meta.url)).toString('base64'),
  math: true,
  comment: 'Enter the result of the equation',
  imgInstructions: fs.readFileSync(new URL('./assets/captcha-math-instructions.png', import.meta.url)).toString('base64')
});

client.solve(task)
  .then((solution) => console.log(solution.text))
  .catch(console.error);
