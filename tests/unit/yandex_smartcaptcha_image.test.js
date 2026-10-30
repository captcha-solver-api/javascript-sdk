import { Tasks } from '@captcha-solver-api/javascript-sdk';

describe('YandexSmartCaptchaImageTask', () => {
  test('serializes as an API v2 SmartCaptchaTask with both images', () => {
    const task = new Tasks.YandexSmartCaptchaImageTask({
      image: 'captcha-image',
      imgInstructions: 'instruction-image',
      comment: 'click the symbols in the specified order'
    });

    expect(task.toDict()).toEqual({
      type: 'SmartCaptchaTask',
      image: 'captcha-image',
      imgInstructions: 'instruction-image',
      comment: 'click the symbols in the specified order'
    });
  });
});
