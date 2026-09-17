// @ts-nocheck
import { ValidationError } from './exceptions.js';

export class BaseTask {
  constructor(params) {
    this._params = params;
  }

  toDict() {
    const result = {};
    for (const [key, value] of Object.entries(this._params)) {
      if (value !== null && value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }
}

export class GenericTask extends BaseTask {
  constructor({ type, ...params }) {
    if (!type) throw new ValidationError('task type is required');
    super({ type, ...params });
  }
}

export class RecaptchaV2Proxyless extends BaseTask {
  constructor({ websiteURL, websiteKey, isInvisible = null, recaptchaDataSValue = null, apiDomain = null, cookies = null, userAgent = null }) {
    super({ type: 'RecaptchaV2TaskProxyless', websiteURL, websiteKey, isInvisible, recaptchaDataSValue, apiDomain, cookies, userAgent });
  }
}

export class RecaptchaV2 extends BaseTask {
  constructor({ websiteURL, websiteKey, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, isInvisible = null, recaptchaDataSValue = null, apiDomain = null, cookies = null, userAgent = null }) {
    super({ type: 'RecaptchaV2Task', websiteURL, websiteKey, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, isInvisible, recaptchaDataSValue, apiDomain, cookies, userAgent });
  }
}

export class RecaptchaV2EnterpriseProxyless extends BaseTask {
  constructor({ websiteURL, websiteKey, enterprisePayload = null, isInvisible = null, apiDomain = null, cookies = null, userAgent = null }) {
    super({ type: 'RecaptchaV2EnterpriseTaskProxyless', websiteURL, websiteKey, enterprisePayload, isInvisible, apiDomain, cookies, userAgent });
  }
}

export class RecaptchaV2Enterprise extends BaseTask {
  constructor({ websiteURL, websiteKey, enterprisePayload = null, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, isInvisible = null, apiDomain = null, cookies = null, userAgent = null }) {
    super({ type: 'RecaptchaV2EnterpriseTask', websiteURL, websiteKey, enterprisePayload, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, isInvisible, apiDomain, cookies, userAgent });
  }
}


export class TurnstileProxyless extends BaseTask {
  constructor({ websiteURL, websiteKey, action = null, data = null, pagedata = null }) {
    super({ type: 'TurnstileTaskProxyless', websiteURL, websiteKey, action, data, pagedata });
  }
}

export class Turnstile extends BaseTask {
  constructor({ websiteURL, websiteKey, action = null, data = null, pagedata = null, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null }) {
    super({ type: 'TurnstileTask', websiteURL, websiteKey, action, data, pagedata, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword });
  }
}

export class GeeTestProxyless extends BaseTask {
  constructor({ websiteURL, gt = null, challenge = null, version = null, initParameters = null, geetestApiServerSubdomain = null, userAgent = null, risk_type = null }) {
    super({ type: 'GeeTestTaskProxyless', websiteURL, gt, challenge, version, initParameters, geetestApiServerSubdomain, userAgent, risk_type });
  }
}

export class GeeTest extends BaseTask {
  constructor({ websiteURL, gt = null, challenge = null, version = null, initParameters = null, geetestApiServerSubdomain = null, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, userAgent = null, risk_type = null }) {
    super({ type: 'GeeTestTask', websiteURL, gt, challenge, version, initParameters, geetestApiServerSubdomain, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, userAgent, risk_type });
  }
}

export class ImageToText extends BaseTask {
  constructor({ body, phrase = null, case_ = null, numeric = null, math = null, minLength = null, maxLength = null, comment = null, imgInstructions = null }) {
    super({ type: 'ImageToTextTask', body, phrase, case: case_, numeric, math, minLength, maxLength, comment, imgInstructions });
  }
}

export class YandexSmartCaptchaTaskProxyless extends BaseTask {
  constructor({ websiteURL, websiteKey, userAgent = null, cookies = null }) {
    super({ type: 'YandexSmartCaptchaTaskProxyless', websiteURL, websiteKey, userAgent, cookies });
  }
}

export class YandexSmartCaptchaTask extends BaseTask {
  constructor({ websiteURL, websiteKey, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, userAgent = null, cookies = null }) {
    super({ type: 'YandexSmartCaptchaTask', websiteURL, websiteKey, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, userAgent, cookies });
  }
}

export class CoordinatesTask extends BaseTask {
  constructor({ body, comment = null, imgInstructions = null, minClicks = null, maxClicks = null }) {
    super({ type: 'CoordinatesTask', body, comment, imgInstructions, minClicks, maxClicks });
  }
}

export class TencentTaskProxyless extends BaseTask {
  constructor({ websiteURL, appId, captchaScript = null }) {
    super({ type: 'TencentTaskProxyless', websiteURL, appId, captchaScript });
  }
}

export class TencentTask extends BaseTask {
  constructor({ websiteURL, appId, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, captchaScript = null }) {
    super({ type: 'TencentTask', websiteURL, appId, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, captchaScript });
  }
}
