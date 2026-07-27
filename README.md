# Captcha Solver JavaScript SDK

Official JavaScript SDK for the Captcha Solver API. Solve reCAPTCHA v2, reCAPTCHA v3, Cloudflare Turnstile, GeeTest, and image captchas with a single method call.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Supported CAPTCHA Types](#supported-captcha-types)
- [Usage Examples](#usage-examples)
  - [reCAPTCHA v2](#recaptcha-v2)
  - [reCAPTCHA v2 Enterprise](#recaptcha-v2-enterprise)
  - [reCAPTCHA v3](#recaptcha-v3)
  - [Cloudflare Turnstile](#cloudflare-turnstile)
  - [Image to Text](#image-to-text)
  - [GeeTest v3](#geetest-v3)
  - [GeeTest v4](#geetest-v4)
  - [Check Balance](#check-balance)
  - [Custom Timeout](#custom-timeout-and-polling)
  - [Error Handling](#error-handling)
- [Requirements](#requirements)
- [API Documentation](#api-documentation)
- [License](#license)

## Installation
```bash
npm install captcha-sdk
```
## Configuration
Set your API key as an environment variable.
```bash
export CAPTCHA_API_KEY=your_api_key
```
Or pass it directly to the client.
```javascript
import { CaptchaClient } from 'captcha-sdk';
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
import { CaptchaClient, ApiError, TimeoutError, NetworkError } from 'captcha-sdk';
const client = new CaptchaClient({ clientKey: 'your_api_key' });
try {
  const result = await client.solve(task);
} catch (error) {
  if (error instanceof ApiError) {
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
