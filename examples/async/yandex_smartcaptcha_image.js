/** Solve the image-based Yandex SmartCaptcha challenge. */
import 'dotenv/config';
import fs from 'node:fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const captchaSolver = new CaptchaClient({
  clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY'
});

const image = fs.readFileSync(
  new URL('../assets/yandex-smartcaptcha-image.png', import.meta.url)
).toString('base64');
const imgInstructions = fs.readFileSync(
  new URL('../assets/yandex-smartcaptcha-instructions.png', import.meta.url)
).toString('base64');

try {
  const task = new Tasks.YandexSmartCaptchaImageTask({
    image,
    imgInstructions
  });
  const result = await captchaSolver.solve(task);
  console.log('Coordinates in click order:', result.coordinates);
} catch (error) {
  console.error(error);
}
