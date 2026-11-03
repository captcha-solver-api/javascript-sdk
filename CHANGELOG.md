# Changelog

All notable changes are documented here.

## [1.1.0] - 2026-11-03

### Added

- add Yandex SmartCaptcha image support

### Fixed

- validate Yandex SmartCaptcha image task parameters
- send Yandex image captcha as SmartCaptchaTask
- validate omitted constructor options
- validate required task parameters
- link package homepage to product site

### Documentation

- use promise chains in all examples
- clarify critical captcha integration notes
- add JSDoc usage examples
- split and standardize promise examples
- clarify solution response fields
- link example names in requirements table
- add security policy
- remove long polling interval from geetest examples
- clarify captcha types without proxy variants
- add AI integration guide
- link Selenium Python examples
- add useful repository links
- add Turnstile Puppeteer demo link
- update changelog for v1.0.1

### Maintenance

- set version to 1.1.0
- fix brace-expansion audit vulnerability
- refresh Yandex SmartCaptcha sample assets
- cover Yandex SmartCaptcha image integration
- run integration tests on pull requests
- test against Node.js 24

[Full diff](https://github.com/captcha-solver-api/javascript-sdk/compare/v1.0.1...v1.1.0)


## [1.0.1] - 2026-09-29

### Fixed

- support user agent for Turnstile Challenge

### Documentation

- show main push test status
- align Turnstile test documentation
- add useful links section
- add README badges
- update banner install command
- update README banner and badges

### Maintenance

- update SDK version header
- set version to 1.0.1
- generate changelog on release

[Full diff](https://github.com/captcha-solver-api/javascript-sdk/compare/v1.0.0...v1.0.1)


New sections are generated from Conventional Commits when a version tag is published.

## [1.0.0] - 2026-09-17

### Added

- Published the initial JavaScript SDK with TypeScript declarations, ESM and CommonJS builds.
- Added official npm package installation and runnable examples.
- Added all documented task types, including proxyless reCAPTCHA v3.
