import 'dotenv/config';
import fs from 'node:fs';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

const captchaSolver = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY });
const image = fs.readFileSync('./captcha.jpg').toString('base64');

const task = new Tasks.YandexSmartCaptchaKaleidoscopeTask({
  image,
  task: '[7,15,14,0,11,6,6,0,11,15,6,10,1,14,3,12,9,0,15,1,5,1,8,11,12,11,0,12,1,10,1,4,14,6,10,6,10,8,3,0,5,9,7,8,0,3,8,0,9,12,12,11,3,0,8,10]'
});

captchaSolver.solve(task)
  .then((clicks) => console.log('Slider arrow clicks:', clicks))
  .catch(console.error);
