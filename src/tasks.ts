import { ValidationError } from './exceptions.js';

/* ------------------------------------------------------------------ */
/* Shared parameter fragments                                          */
/* ------------------------------------------------------------------ */

/** Proxy protocol accepted by most task types. */
export type ProxyType = 'http' | 'socks4' | 'socks5';

/**
 * Proxy settings for the `*Task` (non-proxyless) task variants.
 * The captcha is solved through your proxy instead of the service's own IPs.
 */
export interface ProxyParams {
  /** Proxy protocol: `'http'`, `'socks4'` or `'socks5'`. */
  proxyType: ProxyType;
  /** Proxy IP address or hostname. */
  proxyAddress: string;
  /** Proxy port. */
  proxyPort: number;
  /** Login for proxy authorization, if the proxy requires one. */
  proxyLogin?: string | null;
  /** Password for proxy authorization, if the proxy requires one. */
  proxyPassword?: string | null;
}

/* ------------------------------------------------------------------ */
/* Solution shapes                                                     */
/* ------------------------------------------------------------------ */

/** Solution of any reCAPTCHA task (v2, v2 Enterprise, v3). */
export interface RecaptchaSolution {
  /** Token to submit as the page's `g-recaptcha-response` value. */
  gRecaptchaResponse: string;
  [key: string]: unknown;
}

/** Solution of a Cloudflare Turnstile task. */
export interface TurnstileSolution {
  /** Token to submit as `cf-turnstile-response`. */
  token: string;
  /**
   * User-Agent the worker actually solved with. The token is tied to it,
   * so submit the token with this exact User-Agent.
   */
  userAgent: string;
  [key: string]: unknown;
}

/** Solution of a GeeTest v3 task. */
export type GeeTestV3Solution = {
  challenge: string;
  validate: string;
  seccode: string;
};

/** Solution of a GeeTest v4 task. */
export type GeeTestV4Solution = {
  captcha_id: string;
  lot_number: string;
  pass_token: string;
  gen_time: string;
  captcha_output: string;
};

/**
 * Solution of a GeeTest task; the shape depends on the `version` used.
 * Narrow with `'captcha_output' in solution` (v4) or `'seccode' in solution` (v3).
 */
export type GeeTestSolution = GeeTestV3Solution | GeeTestV4Solution;

/** Solution of an image-to-text task. */
export interface ImageToTextSolution {
  /** Recognized text or answer. */
  text: string;
  [key: string]: unknown;
}

/** Solution of a Yandex SmartCaptcha task. */
export interface YandexSmartCaptchaSolution {
  /** Token to submit with the form. */
  token: string;
  [key: string]: unknown;
}

/** A single click position, in pixels from the image's top-left corner. */
export interface Coordinate {
  x: number;
  y: number;
}

/** Solution of a coordinates (click) task. */
export interface CoordinatesSolution {
  /** Points to click, in order. */
  coordinates: Coordinate[];
  [key: string]: unknown;
}

/** Solution of a Tencent Captcha task. */
export interface TencentSolution {
  appid: string;
  ret: number;
  ticket: string;
  randstr: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Base classes                                                        */
/* ------------------------------------------------------------------ */

/**
 * Base class for every task type.
 *
 * A task is a plain description of what to solve; it is serialized with
 * {@link BaseTask.toDict} and sent as the `task` field of `/createTask`.
 * Parameters set to `null` or `undefined` are omitted from the request.
 *
 * @typeParam TSolution - Shape of the `solution` object returned for this
 *   task by `CaptchaClient.solve()`.
 */
export class BaseTask<TSolution extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Type-only marker that carries the solution shape to `CaptchaClient.solve()`.
   * Never set at runtime.
   * @internal
   */
  declare readonly __solution?: TSolution;

  /** Raw task parameters as passed to the constructor, including the `type` field. */
  protected readonly _params: Record<string, unknown>;

  /**
   * @param params - Raw task parameters, including the API `type` field.
   */
  constructor(params: Record<string, unknown>) {
    this._params = params;
  }

  /**
   * Serialize the task into the API payload.
   *
   * @returns A plain object with `null`/`undefined` parameters removed.
   */
  toDict(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this._params)) {
      if (value !== null && value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }
}

/** Parameters of {@link GenericTask}. */
export interface GenericTaskParams {
  /** API task type, e.g. `'HCaptchaTaskProxyless'`. */
  type: string;
  /** Any other fields the API task type accepts, passed through as-is. */
  [key: string]: unknown;
}

/**
 * Escape hatch for API task types that have no dedicated class in this SDK.
 * The object is sent to the API unchanged, so consult the API docs for the
 * fields the chosen `type` expects.
 *
 * @example
 * ```ts
 * const task = new Tasks.GenericTask({
 *   type: 'HCaptchaTaskProxyless',
 *   websiteURL: 'https://example.com',
 *   websiteKey: 'site-key'
 * });
 * ```
 */
export class GenericTask extends BaseTask {
  /**
   * @param params - Task payload; `type` is required.
   * @throws {ValidationError} If `type` is missing.
   */
  constructor({ type, ...params }: GenericTaskParams) {
    if (!type) throw new ValidationError('task type is required');
    super({ type, ...params });
  }
}

/* ------------------------------------------------------------------ */
/* reCAPTCHA v2                                                        */
/* ------------------------------------------------------------------ */

/** Parameters of {@link RecaptchaV2Proxyless}. */
export interface RecaptchaV2ProxylessParams {
  /** Full URL of the page where the captcha is located. */
  websiteURL: string;
  /** Value of the widget's `data-sitekey` attribute. */
  websiteKey: string;
  /** `true` for invisible reCAPTCHA v2. */
  isInvisible?: boolean | null;
  /** The `data-s` value, found on Google Search / YouTube pages. */
  recaptchaDataSValue?: string | null;
  /** Non-default domain the widget's script is served from, if any. */
  apiDomain?: string | null;
  /** Session cookies to use while solving, if the page requires them. */
  cookies?: string | null;
  /** User-Agent to solve with. Recommended to match the agent submitting the token. */
  userAgent?: string | null;
}

/** Parameters of {@link RecaptchaV2}. */
export interface RecaptchaV2Params extends RecaptchaV2ProxylessParams, ProxyParams {}

/**
 * reCAPTCHA v2 without a proxy (`RecaptchaV2TaskProxyless`).
 * Solution: {@link RecaptchaSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#recaptcha-v2
 */
export class RecaptchaV2Proxyless extends BaseTask<RecaptchaSolution> {
  constructor({ websiteURL, websiteKey, isInvisible = null, recaptchaDataSValue = null, apiDomain = null, cookies = null, userAgent = null }: RecaptchaV2ProxylessParams) {
    super({ type: 'RecaptchaV2TaskProxyless', websiteURL, websiteKey, isInvisible, recaptchaDataSValue, apiDomain, cookies, userAgent });
  }
}

/**
 * reCAPTCHA v2 solved through your own proxy (`RecaptchaV2Task`).
 * Solution: {@link RecaptchaSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#recaptcha-v2
 */
export class RecaptchaV2 extends BaseTask<RecaptchaSolution> {
  constructor({ websiteURL, websiteKey, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, isInvisible = null, recaptchaDataSValue = null, apiDomain = null, cookies = null, userAgent = null }: RecaptchaV2Params) {
    super({ type: 'RecaptchaV2Task', websiteURL, websiteKey, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, isInvisible, recaptchaDataSValue, apiDomain, cookies, userAgent });
  }
}

/* ------------------------------------------------------------------ */
/* reCAPTCHA v2 Enterprise                                             */
/* ------------------------------------------------------------------ */

/** Parameters of {@link RecaptchaV2EnterpriseProxyless}. */
export interface RecaptchaV2EnterpriseProxylessParams {
  /** Full URL of the page where the captcha is located. */
  websiteURL: string;
  /** Value of the widget's `data-sitekey` attribute. */
  websiteKey: string;
  /**
   * Extra parameters the page passes to `grecaptcha.enterprise.render`,
   * e.g. `{ s: '...' }`. Omitting them makes the site reject the token.
   */
  enterprisePayload?: Record<string, unknown> | null;
  /** `true` for invisible reCAPTCHA. */
  isInvisible?: boolean | null;
  /** Domain the reCAPTCHA script is loaded from. Defaults to `google.com`. */
  apiDomain?: string | null;
  /** Session cookies to use while solving, if the page requires them. */
  cookies?: string | null;
  /** User-Agent to solve with. */
  userAgent?: string | null;
}

/** Parameters of {@link RecaptchaV2Enterprise}. */
export interface RecaptchaV2EnterpriseParams extends RecaptchaV2EnterpriseProxylessParams, ProxyParams {}

/**
 * reCAPTCHA v2 Enterprise without a proxy (`RecaptchaV2EnterpriseTaskProxyless`).
 * Solution: {@link RecaptchaSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#recaptcha-v2-enterprise
 */
export class RecaptchaV2EnterpriseProxyless extends BaseTask<RecaptchaSolution> {
  constructor({ websiteURL, websiteKey, enterprisePayload = null, isInvisible = null, apiDomain = null, cookies = null, userAgent = null }: RecaptchaV2EnterpriseProxylessParams) {
    super({ type: 'RecaptchaV2EnterpriseTaskProxyless', websiteURL, websiteKey, enterprisePayload, isInvisible, apiDomain, cookies, userAgent });
  }
}

/**
 * reCAPTCHA v2 Enterprise solved through your own proxy (`RecaptchaV2EnterpriseTask`).
 * Solution: {@link RecaptchaSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#recaptcha-v2-enterprise
 */
export class RecaptchaV2Enterprise extends BaseTask<RecaptchaSolution> {
  constructor({ websiteURL, websiteKey, enterprisePayload = null, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, isInvisible = null, apiDomain = null, cookies = null, userAgent = null }: RecaptchaV2EnterpriseParams) {
    super({ type: 'RecaptchaV2EnterpriseTask', websiteURL, websiteKey, enterprisePayload, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, isInvisible, apiDomain, cookies, userAgent });
  }
}

/* ------------------------------------------------------------------ */
/* reCAPTCHA v3                                                        */
/* ------------------------------------------------------------------ */

/** Parameters of {@link RecaptchaV3Proxyless}. */
export interface RecaptchaV3ProxylessParams {
  /** Full URL of the page where the captcha is located. */
  websiteURL: string;
  /** Site key of the reCAPTCHA v3 widget. */
  websiteKey: string;
  /** Minimum acceptable token score, e.g. `0.3`, `0.7` or `0.9`. */
  minScore: number;
  /** Action passed to `grecaptcha.execute()` on the page. */
  pageAction?: string | null;
  /** `true` for reCAPTCHA v3 Enterprise. */
  isEnterprise?: boolean | null;
  /** Alternative domain used to load the reCAPTCHA script. */
  apiDomain?: string | null;
}

/**
 * Score-based reCAPTCHA v3 (`RecaptchaV3TaskProxyless`).
 * The API supports this type only without a customer proxy.
 * Solution: {@link RecaptchaSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#recaptcha-v3
 */
export class RecaptchaV3Proxyless extends BaseTask<RecaptchaSolution> {
  constructor({ websiteURL, websiteKey, minScore, pageAction = null, isEnterprise = null, apiDomain = null }: RecaptchaV3ProxylessParams) {
    super({ type: 'RecaptchaV3TaskProxyless', websiteURL, websiteKey, minScore, pageAction, isEnterprise, apiDomain });
  }
}

/* ------------------------------------------------------------------ */
/* Cloudflare Turnstile                                                */
/* ------------------------------------------------------------------ */

/** Parameters of {@link TurnstileProxyless}. */
export interface TurnstileProxylessParams {
  /** Full URL of the page where the widget is located. */
  websiteURL: string;
  /** Value of the widget's `data-sitekey` attribute. */
  websiteKey: string;
  /** Value of the widget's `data-action` attribute, if set. */
  action?: string | null;
  /** Custom payload from the widget's `data-cdata` attribute, if set. */
  data?: string | null;
  /**
   * Value of the `chlPageData` parameter, needed for some Cloudflare
   * challenge pages beyond the basic widget. Note the lowercase spelling:
   * the API does not accept `pageData`.
   */
  pagedata?: string | null;
}

/** Parameters of {@link Turnstile}. */
export interface TurnstileParams extends TurnstileProxylessParams, ProxyParams {}

/**
 * Cloudflare Turnstile without a proxy (`TurnstileTaskProxyless`).
 * There is no `userAgent` input: the worker picks one and returns it in the solution.
 * Solution: {@link TurnstileSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#cloudflare-turnstile
 */
export class TurnstileProxyless extends BaseTask<TurnstileSolution> {
  constructor({ websiteURL, websiteKey, action = null, data = null, pagedata = null }: TurnstileProxylessParams) {
    super({ type: 'TurnstileTaskProxyless', websiteURL, websiteKey, action, data, pagedata });
  }
}

/**
 * Cloudflare Turnstile solved through your own proxy (`TurnstileTask`).
 * Solution: {@link TurnstileSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#cloudflare-turnstile
 */
export class Turnstile extends BaseTask<TurnstileSolution> {
  constructor({ websiteURL, websiteKey, action = null, data = null, pagedata = null, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null }: TurnstileParams) {
    super({ type: 'TurnstileTask', websiteURL, websiteKey, action, data, pagedata, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword });
  }
}

/* ------------------------------------------------------------------ */
/* GeeTest                                                             */
/* ------------------------------------------------------------------ */

/** Parameters of {@link GeeTestProxyless}. */
export interface GeeTestProxylessParams {
  /** Full URL of the page where the widget is located. */
  websiteURL: string;
  /** GeeTest v3 only: public key of the widget. */
  gt?: string | null;
  /**
   * GeeTest v3 only: session-specific challenge value from the page.
   * Must be freshly fetched for every request; it cannot be reused.
   */
  challenge?: string | null;
  /** GeeTest version: `3` (default) or `4`. */
  version?: 3 | 4 | null;
  /**
   * Extra parameters from the page's `initGeetest` call.
   * For v4 this is required and must contain `captcha_id`.
   */
  initParameters?: Record<string, unknown> | null;
  /** Custom GeeTest API subdomain, if the site uses one. */
  geetestApiServerSubdomain?: string | null;
  /** User-Agent to solve with. */
  userAgent?: string | null;
  /**
   * Dynamic, single-use value from the page's captcha-loading request, if present.
   * Note the snake_case name: the API does not accept `riskType`.
   */
  risk_type?: string | null;
}

/** Parameters of {@link GeeTest}. */
export interface GeeTestParams extends GeeTestProxylessParams, ProxyParams {}

/**
 * GeeTest v3 / v4 without a proxy (`GeeTestTaskProxyless`).
 * Pass `gt` + `challenge` for v3, or `version: 4` + `initParameters.captcha_id` for v4.
 * Solution: {@link GeeTestSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#geetest-v3
 * @see https://captcha-solver.com/en/docs/captcha-types#geetest-v4
 */
export class GeeTestProxyless extends BaseTask<GeeTestSolution> {
  constructor({ websiteURL, gt = null, challenge = null, version = null, initParameters = null, geetestApiServerSubdomain = null, userAgent = null, risk_type = null }: GeeTestProxylessParams) {
    super({ type: 'GeeTestTaskProxyless', websiteURL, gt, challenge, version, initParameters, geetestApiServerSubdomain, userAgent, risk_type });
  }
}

/**
 * GeeTest v3 / v4 solved through your own proxy (`GeeTestTask`).
 * Solution: {@link GeeTestSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#geetest-v3
 * @see https://captcha-solver.com/en/docs/captcha-types#geetest-v4
 */
export class GeeTest extends BaseTask<GeeTestSolution> {
  constructor({ websiteURL, gt = null, challenge = null, version = null, initParameters = null, geetestApiServerSubdomain = null, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, userAgent = null, risk_type = null }: GeeTestParams) {
    super({ type: 'GeeTestTask', websiteURL, gt, challenge, version, initParameters, geetestApiServerSubdomain, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, userAgent, risk_type });
  }
}

/* ------------------------------------------------------------------ */
/* Image to text                                                       */
/* ------------------------------------------------------------------ */

/**
 * Character-set hint for {@link ImageToTextParams.numeric}:
 * `0` unspecified, `1` digits only, `2` letters only,
 * `3` any characters including digits, `4` any characters including letters.
 */
export type ImageToTextNumeric = 0 | 1 | 2 | 3 | 4;

/** Parameters of {@link ImageToText}. */
export interface ImageToTextParams {
  /** The captcha image, base64-encoded, without a `data:image/...;base64,` prefix. */
  body: string;
  /** `true` if the answer consists of multiple words. */
  phrase?: boolean | null;
  /**
   * `true` if the answer is case-sensitive.
   * Serialized as the API's `case` field (renamed to avoid the reserved word).
   */
  case_?: boolean | null;
  /** Expected character set, see {@link ImageToTextNumeric}. */
  numeric?: ImageToTextNumeric | null;
  /** `true` if the image contains a math expression to evaluate. */
  math?: boolean | null;
  /** Minimum expected answer length. */
  minLength?: number | null;
  /** Maximum expected answer length. */
  maxLength?: number | null;
  /** Free-text hint for the worker. */
  comment?: string | null;
  /** Optional supplementary instruction image, base64-encoded. */
  imgInstructions?: string | null;
}

/**
 * Text / number / math recognition in an image captcha (`ImageToTextTask`).
 * The image is submitted directly, so there is no proxy variant.
 * Solution: {@link ImageToTextSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#image-to-text
 */
export class ImageToText extends BaseTask<ImageToTextSolution> {
  constructor({ body, phrase = null, case_ = null, numeric = null, math = null, minLength = null, maxLength = null, comment = null, imgInstructions = null }: ImageToTextParams) {
    super({ type: 'ImageToTextTask', body, phrase, case: case_, numeric, math, minLength, maxLength, comment, imgInstructions });
  }
}

/* ------------------------------------------------------------------ */
/* Yandex SmartCaptcha                                                 */
/* ------------------------------------------------------------------ */

/** Parameters of {@link YandexSmartCaptchaTaskProxyless}. */
export interface YandexSmartCaptchaTaskProxylessParams {
  /** Full URL of the page where the widget is located. */
  websiteURL: string;
  /** The `sitekey` value from the page source or the captcha iframe. */
  websiteKey: string;
  /** User-Agent to solve with. */
  userAgent?: string | null;
  /** Session cookies to use while solving, if the page requires them. */
  cookies?: string | null;
}

/** Parameters of {@link YandexSmartCaptchaTask}. */
export interface YandexSmartCaptchaTaskParams extends YandexSmartCaptchaTaskProxylessParams, Omit<ProxyParams, 'proxyType'> {
  /** Proxy protocol. Unlike other task types, `'https'` is also accepted here. */
  proxyType: ProxyType | 'https';
}

/**
 * Token-based Yandex SmartCaptcha without a proxy (`YandexSmartCaptchaTaskProxyless`).
 * For the image challenge use {@link CoordinatesTask} instead.
 * Solution: {@link YandexSmartCaptchaSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#yandex-smartcaptcha
 */
export class YandexSmartCaptchaTaskProxyless extends BaseTask<YandexSmartCaptchaSolution> {
  constructor({ websiteURL, websiteKey, userAgent = null, cookies = null }: YandexSmartCaptchaTaskProxylessParams) {
    super({ type: 'YandexSmartCaptchaTaskProxyless', websiteURL, websiteKey, userAgent, cookies });
  }
}

/**
 * Token-based Yandex SmartCaptcha solved through your own proxy (`YandexSmartCaptchaTask`).
 * Solution: {@link YandexSmartCaptchaSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#yandex-smartcaptcha
 */
export class YandexSmartCaptchaTask extends BaseTask<YandexSmartCaptchaSolution> {
  constructor({ websiteURL, websiteKey, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, userAgent = null, cookies = null }: YandexSmartCaptchaTaskParams) {
    super({ type: 'YandexSmartCaptchaTask', websiteURL, websiteKey, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, userAgent, cookies });
  }
}

/* ------------------------------------------------------------------ */
/* Coordinates                                                         */
/* ------------------------------------------------------------------ */

/** Parameters of {@link CoordinatesTask}. */
export interface CoordinatesTaskParams {
  /** The captcha image, base64-encoded. */
  body: string;
  /** Hint for the worker, e.g. `'click on the green apple'`. Recommended. */
  comment?: string | null;
  /** Optional supplementary instruction image, base64-encoded. */
  imgInstructions?: string | null;
  /** Minimum number of clicks expected. Defaults to `1` on the API side. */
  minClicks?: number | null;
  /** Maximum number of clicks allowed. */
  maxClicks?: number | null;
}

/**
 * Click captcha: the worker marks points in an image (`CoordinatesTask`).
 * Used for generic "click on X" captchas and the image version of Yandex SmartCaptcha.
 * Solution: {@link CoordinatesSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#coordinates
 */
export class CoordinatesTask extends BaseTask<CoordinatesSolution> {
  constructor({ body, comment = null, imgInstructions = null, minClicks = null, maxClicks = null }: CoordinatesTaskParams) {
    super({ type: 'CoordinatesTask', body, comment, imgInstructions, minClicks, maxClicks });
  }
}

/* ------------------------------------------------------------------ */
/* Tencent                                                             */
/* ------------------------------------------------------------------ */

/** Parameters of {@link TencentTaskProxyless}. */
export interface TencentTaskProxylessParams {
  /** Full URL of the page where the captcha is located. */
  websiteURL: string;
  /** Value of the `appId` parameter found in the page source. */
  appId: string;
  /** URL of the Tencent captcha script, if the page uses a non-default one. */
  captchaScript?: string | null;
}

/** Parameters of {@link TencentTask}. */
export interface TencentTaskParams extends TencentTaskProxylessParams, ProxyParams {}

/**
 * Tencent Captcha without a proxy (`TencentTaskProxyless`).
 * Solution: {@link TencentSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#tencent
 */
export class TencentTaskProxyless extends BaseTask<TencentSolution> {
  constructor({ websiteURL, appId, captchaScript = null }: TencentTaskProxylessParams) {
    super({ type: 'TencentTaskProxyless', websiteURL, appId, captchaScript });
  }
}

/**
 * Tencent Captcha solved through your own proxy (`TencentTask`).
 * Solution: {@link TencentSolution}.
 *
 * @see https://captcha-solver.com/en/docs/captcha-types#tencent
 */
export class TencentTask extends BaseTask<TencentSolution> {
  constructor({ websiteURL, appId, proxyType, proxyAddress, proxyPort, proxyLogin = null, proxyPassword = null, captchaScript = null }: TencentTaskParams) {
    super({ type: 'TencentTask', websiteURL, appId, proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword, captchaScript });
  }
}
