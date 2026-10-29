/** Solve the image-based Yandex SmartCaptcha challenge using promises. */
import 'dotenv/config';
import fs from 'node:fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const captchaSolver = new CaptchaClient({
  clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY'
});

const body = fs.readFileSync(
  new URL('../assets/yandex-smartcaptcha-image.png', import.meta.url)
).toString('base64');
const imgInstructions = fs.readFileSync(
  new URL('../assets/yandex-smartcaptcha-instructions.png', import.meta.url)
).toString('base64');

const task = new Tasks.YandexSmartCaptchaImageTask({
  body,
  imgInstructions,
  minClicks: 4,
  maxClicks: 4
});

captchaSolver.solve(task)
  .then((result) => {
    console.log('Coordinates in click order:', result.coordinates);
  })
  .catch((error) => {
    console.error(error);
  });
