import { Tasks } from '@captcha-solver-api/javascript-sdk';

test('GenericTask preserves any supported API task payload', () => {
  const task = new Tasks.GenericTask({
    type: 'HCaptchaTaskProxyless',
    websiteURL: 'https://example.com',
    websiteKey: 'site-key',
    optional: null
  });
  expect(task.toDict()).toEqual({
    type: 'HCaptchaTaskProxyless',
    websiteURL: 'https://example.com',
    websiteKey: 'site-key'
  });
});

test('GenericTask requires a task type', () => {
  expect(() => new Tasks.GenericTask({})).toThrow('task type is required');
});
