import 'dotenv/config';
import fs from 'fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY' });
const task = new Tasks.YandexSmartCaptchaImageTask({
  image: fs.readFileSync(new URL('./assets/yandex-smartcaptcha-image.png', import.meta.url)).toString('base64'),
  imgInstructions: fs.readFileSync(new URL('./assets/yandex-smartcaptcha-instructions.png', import.meta.url)).toString('base64')
});

client.solve(task)
  .then((solution) => console.log(solution.coordinates))
  .catch(console.error);
