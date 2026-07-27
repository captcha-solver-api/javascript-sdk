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

export class ProxyMixin {
  setProxy(proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null) {
    this._params.proxyType = proxyType;
    this._params.proxyAddress = proxyAddress;
    this._params.proxyPort = proxyPort;
    if (proxyLogin !== null) {
      this._params.proxyLogin = proxyLogin;
    }
    if (proxyPassword !== null) {
      this._params.proxyPassword = proxyPassword;
    }
  }
}

export class RecaptchaV2Proxyless extends BaseTask {
  constructor({ websiteURL, websiteKey, isInvisible = null, dataSValue = null, cookies = null, userAgent = null }) {
    super({ type: 'RecaptchaV2TaskProxyless', websiteURL, websiteKey, isInvisible, dataSValue, cookies, userAgent });
  }
}

export class RecaptchaV2 extends BaseTask {
  constructor({ websiteURL, websiteKey, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, isInvisible = null, dataSValue = null, cookies = null, userAgent = null }) {
    super({ type: 'RecaptchaV2Task', websiteURL, websiteKey, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, isInvisible, dataSValue, cookies, userAgent });
  }
}

export class RecaptchaV2EnterpriseProxyless extends BaseTask {
  constructor({ websiteURL, websiteKey, enterprisePayload = null, isInvisible = null, dataSValue = null, cookies = null, userAgent = null }) {
    super({ type: 'RecaptchaV2EnterpriseTaskProxyless', websiteURL, websiteKey, enterprisePayload, isInvisible, dataSValue, cookies, userAgent });
  }
}

export class RecaptchaV2Enterprise extends BaseTask {
  constructor({ websiteURL, websiteKey, enterprisePayload = null, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, isInvisible = null, dataSValue = null, cookies = null, userAgent = null }) {
    super({ type: 'RecaptchaV2EnterpriseTask', websiteURL, websiteKey, enterprisePayload, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, isInvisible, dataSValue, cookies, userAgent });
  }
}

export class RecaptchaV3Proxyless extends BaseTask {
  constructor({ websiteURL, websiteKey, minScore = null, pageAction = null, isEnterprise = null, cookies = null, userAgent = null }) {
    super({ type: 'RecaptchaV3TaskProxyless', websiteURL, websiteKey, minScore, pageAction, isEnterprise, cookies, userAgent });
  }
}

export class TurnstileProxyless extends BaseTask {
  constructor({ websiteURL, websiteKey, action = null, cData = null, userAgent = null }) {
    super({ type: 'TurnstileTaskProxyless', websiteURL, websiteKey, action, cData, userAgent });
  }
}

export class Turnstile extends BaseTask {
  constructor({ websiteURL, websiteKey, action = null, cData = null, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, userAgent = null }) {
    super({ type: 'TurnstileTask', websiteURL, websiteKey, action, cData, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, userAgent });
  }
}

export class GeeTestProxyless extends BaseTask {
  constructor({ websiteURL, gt = null, challenge = null, version = null, initParameters = null, userAgent = null, cookies = null }) {
    super({ type: 'GeeTestTaskProxyless', websiteURL, gt, challenge, version, initParameters, userAgent, cookies });
  }
}

export class GeeTest extends BaseTask {
  constructor({ websiteURL, gt = null, challenge = null, version = null, initParameters = null, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, userAgent = null, cookies = null }) {
    super({ type: 'GeeTestTask', websiteURL, gt, challenge, version, initParameters, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, userAgent, cookies });
  }
}

export class ImageToText extends BaseTask {
  constructor({ body, numeric = null, minLength = null, maxLength = null, case_ = null, math = null }) {
    super({ type: 'ImageToTextTask', body, numeric, minLength, maxLength, case: case_, math });
  }
}