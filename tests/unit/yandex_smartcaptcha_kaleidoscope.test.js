import { Tasks } from '@captcha-solver-api/javascript-sdk';

describe('YandexSmartCaptchaKaleidoscopeTask', () => {
  test('serializes as an API v2 PazlCaptchaTask', () => {
    const task = new Tasks.YandexSmartCaptchaKaleidoscopeTask({
      image: 'captcha-image',
      task: '[7,15,14,0]'
    });

    expect(task.toDict()).toEqual({
      type: 'PazlCaptchaTask',
      image: 'captcha-image',
      task: '[7,15,14,0]'
    });
  });
});
