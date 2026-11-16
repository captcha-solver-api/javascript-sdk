# Changelog

All notable changes are documented here.

## [2.0.0] - 2026-11-16

### Breaking changes

- require Node.js 22 or newer

### Added

- explain missing taskId in SOLVE SUMMARY
- mask proxyAddress in debug output
- show request duration in debug RESPONSE
- always pair debug REQUEST with a RESPONSE line
- compact timestamped debug output
- improve concise debug readability
- format debug output as Linux-style lines
- add concise and trace debug modes
- harden structured debug logging
- label server exchanges as JSON blocks
- show readable solve duration
- add final solve debug summary
- log sanitized server exchanges
- expand debug lifecycle logging
- add client debug mode
- add Yandex SmartCaptcha Kaleidoscope support

### Fixed

- fail on a non-2xx HTTP status without waiting for the body
- start solve() polling timeout after createTask, as in 1.x
- never let debug output change request results
- tell a timed-out response body apart from invalid JSON in debug log

### Documentation

- do not call debug output safe to share in the example
- shorten debug mode guide
- align debug guide with runnable example
- add debug mode example, disable debug in Kaleidoscope example
- align README with current SDK
- enable debug directly in Kaleidoscope example
- print Kaleidoscope result as JSON
- explain example execution flows
- make Kaleidoscope example ready to run
- add Kaleidoscope example asset
- drop npm publishing from missing pipeline features
- document integration tests running on pull requests
- update changelog for v1.1.0

### Maintenance

- bump tsup from 8.5.1 to 9.0.0
- cover debug output for HTTP errors, invalid JSON and solve timeout
- enforce debug response ordering
- bump dotenv from 16.6.1 to 18.0.9
- bump jest from 29.7.0 to 30.5.2
- map coverage to src via source maps
- cover client error edge cases, proxy validation and CJS build
- bump the actions group with 2 updates
- publish to npm on Node 24
- test on Node 26 and pin runners to ubuntu-24.04
- add Dependabot version updates config

[Full diff](https://github.com/captcha-solver-api/javascript-sdk/compare/v1.1.0...v2.0.0)


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
