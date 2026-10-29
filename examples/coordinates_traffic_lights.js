import 'dotenv/config';
import fs from 'fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY' });
const task = new Tasks.CoordinatesTask({
  body: fs.readFileSync(new URL('./assets/traffic-lights.png', import.meta.url)).toString('base64'),
  imgInstructions: fs.readFileSync(new URL('./assets/traffic-lights-instructions.png', import.meta.url)).toString('base64'),
  minClicks: 1,
  maxClicks: 5
});

client.solve(task)
  .then((solution) => console.log(solution.coordinates))
  .catch(console.error);
