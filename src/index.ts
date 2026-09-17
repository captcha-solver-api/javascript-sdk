export { CaptchaClient } from './client.js';
export type { CaptchaClientOptions, TaskResult, SolutionOf } from './client.js';
export { ApiError, NetworkError, TimeoutError, ValidationError, CaptchaError } from './exceptions.js';
export * as Tasks from './tasks.js';
export type {
  ProxyType,
  ProxyParams,
  RecaptchaSolution,
  TurnstileSolution,
  GeeTestV3Solution,
  GeeTestV4Solution,
  GeeTestSolution,
  ImageToTextSolution,
  ImageToTextNumeric,
  YandexSmartCaptchaSolution,
  Coordinate,
  CoordinatesSolution,
  TencentSolution,
  GenericTaskParams,
  RecaptchaV2ProxylessParams,
  RecaptchaV2Params,
  RecaptchaV2EnterpriseProxylessParams,
  RecaptchaV2EnterpriseParams,
  RecaptchaV3ProxylessParams,
  TurnstileProxylessParams,
  TurnstileParams,
  GeeTestProxylessParams,
  GeeTestParams,
  ImageToTextParams,
  YandexSmartCaptchaTaskProxylessParams,
  YandexSmartCaptchaTaskParams,
  CoordinatesTaskParams,
  TencentTaskProxylessParams,
  TencentTaskParams
} from './tasks.js';
export { __version__ } from './version.js';
