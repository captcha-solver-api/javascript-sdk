# Captcha Solver JavaScript SDK

![js-examples-banner](assets/repo-banner-javascript.png)

Official JavaScript SDK for the Captcha Solver API. Solve reCAPTCHA v2/v3, Cloudflare Turnstile, GeeTest, Yandex SmartCaptcha, Tencent, and image/click captchas with a single method call.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Supported CAPTCHA Types](#supported-captcha-types)
- [Usage Examples](#usage-examples)
  - [reCAPTCHA v2](#recaptcha-v2-with-proxy)
  - [reCAPTCHA v2 Enterprise](#recaptcha-v2-enterprise)
  - [reCAPTCHA v3](#recaptcha-v3)
  - [Cloudflare Turnstile](#cloudflare-turnstile)
  - [Image to Text](#image-to-text)
  - [GeeTest v3](#geetest-v3)
  - [GeeTest v4](#geetest-v4)
  - [Yandex SmartCaptcha](#yandex-smartcaptcha)
  - [Coordinates (click captcha)](#coordinates-click-captcha)
  - [Tencent](#tencent)
  - [Check Balance](#check-balance)
  - [Custom Timeout](#custom-timeout-and-polling)
  - [Error Handling](#error-handling)
- [Requirements](#requirements)
- [API Documentation](#api-documentation)
- [License](#license)

## Installation
```bash
# npm install captcha-sdk

npm install git+https://github.com/captcha-solver-api/javascript-sdk.git
```
## Configuration
The client always takes the API key as an explicit argument -- it does not read
environment variables on its own. Read `CAPTCHA_API_KEY` yourself and pass it in:
```bash
export CAPTCHA_API_KEY=your_api_key
```
```javascript
import { CaptchaClient } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: process.env.CAPTCHA_API_KEY });
```
Or just pass the key directly, without an environment variable:
```javascript
const client = new CaptchaClient({ clientKey: 'your_api_key' });
```
## Quick Start
Solve a reCAPTCHA v2 in 4 lines.
```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const task = new Tasks.RecaptchaV2Proxyless({
  websiteURL: 'https://example.com/login',
  websiteKey: '6Le-xxxxxxxxx'
});
const result = await client.solve(task);
console.log(result.gRecaptchaResponse);
```
Runnable versions of every example below live in [examples/async](examples/async) (async/await
style) and [examples/sync](examples/sync) (promise-chain style, `.then()/.catch()`) -- both call
the same `CaptchaClient`, since JavaScript has no blocking HTTP client to mirror `requests` vs.
`httpx` the way the Python SDK does.
## Supported CAPTCHA Types
| Type | Proxyless | With Proxy |
|---|---|---|
| reCAPTCHA v2 | Yes | Yes |
| reCAPTCHA v2 Enterprise | Yes | Yes |
| reCAPTCHA v3 | Yes | No |
| Cloudflare Turnstile | Yes | Yes |
| GeeTest v3 | Yes | Yes |
| GeeTest v4 | Yes | Yes |
| Image to Text | Yes | No |
| Yandex SmartCaptcha | Yes | Yes |
| Coordinates (click captcha) | Yes | No |
| Tencent | Yes | Yes |
## Usage Examples
### reCAPTCHA v2 with proxy
```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const task = new Tasks.RecaptchaV2({
  websiteURL: 'https://example.com/login',
  websiteKey: '6Le-xxxxxxxxx',
  proxyType: 'http',
  proxyAddress: '1.2.3.4',
  proxyPort: 8080,
  proxyLogin: 'user',
  proxyPassword: 'password'
});
const result = await client.solve(task);
console.log(result.gRecaptchaResponse);
```
### reCAPTCHA v2 Enterprise
```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const task = new Tasks.RecaptchaV2EnterpriseProxyless({
  websiteURL: 'https://example.com/login',
  websiteKey: '6Le-xxxxxxxxx',
  enterprisePayload: { s: 'data-s-value' }
});
const result = await client.solve(task);
console.log(result.gRecaptchaResponse);
```
### reCAPTCHA v3
```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const task = new Tasks.RecaptchaV3Proxyless({
  websiteURL: 'https://example.com/login',
  websiteKey: '6Le-xxxxxxxxx',
  minScore: 0.7,
  pageAction: 'login'
});
const result = await client.solve(task);
console.log(result.gRecaptchaResponse);
```
### Cloudflare Turnstile
```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const task = new Tasks.TurnstileProxyless({
  websiteURL: 'https://example.com/login',
  websiteKey: '0x4AAAAAAAxxxxxxxx'
});
const result = await client.solve(task);
console.log(result.token);
```
### Image to Text
```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
import fs from 'fs';
const imageBase64 = fs.readFileSync('captcha.png').toString('base64');
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const task = new Tasks.ImageToText({
  body: imageBase64,
  numeric: 1,
  minLength: 4,
  maxLength: 6
});
const result = await client.solve(task);
console.log(result.text);
```
### GeeTest v3
```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const task = new Tasks.GeeTestProxyless({
  websiteURL: 'https://example.com/login',
  gt: 'f2ae6cadcf7886856696c46d84d109d1',
  challenge: '12345678abc90123d45678e90123f45g6'
});
const result = await client.solve(task);
console.log(result.validate);
console.log(result.seccode);
```
### GeeTest v4
```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const task = new Tasks.GeeTestProxyless({
  websiteURL: 'https://example.com/login',
  version: 4,
  initParameters: { captcha_id: 'e392e65f912c780f2c3ebac7702651de' }
});
const result = await client.solve(task);
console.log(result.captcha_output);
```
### Yandex SmartCaptcha
```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const task = new Tasks.YandexSmartCaptchaTaskProxyless({
  websiteURL: 'https://example.com/login',
  websiteKey: 'FEXfAbHQsToo97VidNVk3j4dC74nGW1DgdxK4OoR'
});
const result = await client.solve(task);
console.log(result.token);
```
Use `Tasks.YandexSmartCaptchaTask` instead for the with-proxy variant (same extra
`proxyType`/`proxyAddress`/`proxyPort`/`proxyLogin`/`proxyPassword` fields as `Tasks.RecaptchaV2`).

To solve Yandex SmartCaptcha's image challenge instead of the token challenge, use
`Tasks.CoordinatesTask` with `imgType: 'smart_captcha'` or `imgType: 'pazl_smart_captcha'` -- see
the "Yandex SmartCaptcha image mode" section in
[examples/async/coordinates.js](examples/async/coordinates.js) (or
[examples/sync/coordinates.js](examples/sync/coordinates.js) for the promise-chain version).
### Coordinates (click captcha)
```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
import fs from 'fs';
const body = fs.readFileSync('captcha.png').toString('base64');
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const task = new Tasks.CoordinatesTask({
  body: body,
  comment: 'click on the green apple'
});
const result = await client.solve(task);
console.log(result.coordinates);
```
### Tencent
```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const task = new Tasks.TencentTaskProxyless({
  websiteURL: 'https://example.com/login',
  appId: '190014885'
});
const result = await client.solve(task);
console.log(result.ticket);
```
### Check balance
```javascript
import { CaptchaClient } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
const balance = await client.getBalance();
console.log(`Balance: ${balance}`);
```
### Custom timeout and polling
```javascript
const client = new CaptchaClient({
  clientKey: 'your_api_key',
  timeout: 180000,
  pollingInterval: 5000
});
```
### Error handling
```javascript
import { CaptchaClient, ApiError, TimeoutError, NetworkError, ValidationError } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
try {
  const result = await client.solve(task);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(`Invalid input: ${error.message}`);
  } else if (error instanceof ApiError) {
    console.log(`API error: ${error.errorCode} ${error.errorDescription}`);
  } else if (error instanceof TimeoutError) {
    console.log('Task timed out');
  } else if (error instanceof NetworkError) {
    console.log(`Network error: ${error.message}`);
  }
}
```
## Requirements
- Node.js 18 or newer. Modern browser with fetch support.
- Captcha Solver account with a valid API key.
## API Documentation
Full API reference: https://captcha-solver.com/en/docs/captcha-types
## License
This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.
