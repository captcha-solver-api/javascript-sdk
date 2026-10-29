import { Tasks } from '@captcha-solver-api/javascript-sdk';

describe('YandexSmartCaptchaImageTask', () => {
  test('serializes as a coordinates task with both images', () => {
    const task = new Tasks.YandexSmartCaptchaImageTask({
      body: 'captcha-image',
      imgInstructions: 'instruction-image',
      minClicks: 4,
      maxClicks: 4
    });

    expect(task.toDict()).toEqual({
      type: 'CoordinatesTask',
      body: 'captcha-image',
      imgInstructions: 'instruction-image',
      minClicks: 4,
      maxClicks: 4
    });
  });
});
