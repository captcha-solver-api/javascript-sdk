import { Tasks, ValidationError } from '@captcha-solver-api/javascript-sdk';

describe('built-in task validation', () => {
  test('missing constructor arguments produce SDK validation errors', () => {
    expect(() => new Tasks.ImageToText()).toThrow(ValidationError);
    expect(() => new Tasks.RecaptchaV2Proxyless()).toThrow(
      'RecaptchaV2TaskProxyless requires: websiteURL, websiteKey'
    );
  });

  test.each([
    ['RecaptchaV2Proxyless', { websiteURL: 'https://example.com' }, 'websiteKey'],
    ['RecaptchaV2', { websiteURL: 'https://example.com', websiteKey: 'key' }, 'proxyType, proxyAddress, proxyPort'],
    ['RecaptchaV2EnterpriseProxyless', { websiteKey: 'key' }, 'websiteURL'],
    ['RecaptchaV3Proxyless', { websiteURL: 'https://example.com', websiteKey: 'key' }, 'minScore'],
    ['TurnstileProxyless', { websiteURL: '', websiteKey: 'key' }, 'websiteURL'],
    ['ImageToText', {}, 'body'],
    ['YandexSmartCaptchaTaskProxyless', { websiteURL: 'https://example.com' }, 'websiteKey'],
    ['CoordinatesTask', { body: '   ' }, 'body'],
    ['TencentTaskProxyless', { websiteURL: 'https://example.com' }, 'appId']
  ])('%s reports missing required parameters', (className, params, expected) => {
    expect(() => new Tasks[className](params)).toThrow(ValidationError);
    expect(() => new Tasks[className](params)).toThrow(expected);
  });

  test('GeeTest v3 requires gt and challenge', () => {
    expect(() => new Tasks.GeeTestProxyless({
      websiteURL: 'https://example.com',
      gt: 'gt'
    })).toThrow('GeeTestTaskProxyless requires: challenge');
  });

  test('GeeTest v4 requires initParameters.captcha_id', () => {
    expect(() => new Tasks.GeeTestProxyless({
      websiteURL: 'https://example.com',
      version: 4,
      initParameters: {}
    })).toThrow('GeeTestTaskProxyless requires: initParameters.captcha_id');
  });

  test('valid required parameters are accepted', () => {
    expect(new Tasks.Turnstile({
      websiteURL: 'https://example.com',
      websiteKey: 'key',
      proxyType: 'http',
      proxyAddress: '127.0.0.1',
      proxyPort: 8080
    }).toDict()).toMatchObject({ type: 'TurnstileTask', proxyPort: 8080 });
  });
});
