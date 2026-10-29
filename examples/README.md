# Examples

Every file is a standalone Promise-chain example and contains exactly one API
operation. Examples with a customer proxy use the `_proxy.js` suffix.

## Setup

Install dependencies and provide your API key:

```bash
npm install
```

```text
CAPTCHA_API_KEY=your_api_key_here
```

Run an example from the repository root:

```bash
node examples/recaptcha_v2.js
```

Replace placeholder URLs, site keys, application IDs, dynamic values, and
proxy credentials before running token CAPTCHA examples.

## Example index

| CAPTCHA type | Without customer proxy | With customer proxy |
|---|---|---|
| reCAPTCHA v2 | [`recaptcha_v2.js`](recaptcha_v2.js) | [`recaptcha_v2_proxy.js`](recaptcha_v2_proxy.js) |
| reCAPTCHA v2 Enterprise | [`recaptcha_v2_enterprise.js`](recaptcha_v2_enterprise.js) | [`recaptcha_v2_enterprise_proxy.js`](recaptcha_v2_enterprise_proxy.js) |
| reCAPTCHA v3 | [`recaptcha_v3.js`](recaptcha_v3.js) | No separate proxy task |
| Cloudflare Turnstile | [`turnstile.js`](turnstile.js) | [`turnstile_proxy.js`](turnstile_proxy.js) |
| GeeTest v3 | [`geetest_v3.js`](geetest_v3.js) | [`geetest_v3_proxy.js`](geetest_v3_proxy.js) |
| GeeTest v4 | [`geetest_v4.js`](geetest_v4.js) | [`geetest_v4_proxy.js`](geetest_v4_proxy.js) |
| Yandex SmartCaptcha | [`yandex_smartcaptcha.js`](yandex_smartcaptcha.js) | [`yandex_smartcaptcha_proxy.js`](yandex_smartcaptcha_proxy.js) |
| Tencent | [`tencent.js`](tencent.js) | [`tencent_proxy.js`](tencent_proxy.js) |
| Image to Text | [`image_to_text.js`](image_to_text.js) | No separate proxy task |
| Coordinates | [`coordinates.js`](coordinates.js) | No separate proxy task |
| Account balance | [`balance.js`](balance.js) | Not applicable |

Additional one-scenario examples:

- [`image_to_text_math.js`](image_to_text_math.js) — math CAPTCHA with an instruction image.
- [`image_to_text_language_pool.js`](image_to_text_language_pool.js) — select the English worker pool.
- [`coordinates_traffic_lights.js`](coordinates_traffic_lights.js) — click coordinates with an instruction image.

> **Important:** `geetest_v3.js` and `geetest_v3_proxy.js` contain a placeholder
> initialization endpoint. Replace it with the target website's endpoint and
> fetch a fresh `challenge` for every task.

> **Important:** Proxy examples contain placeholder proxy details. Replace all
> of them with your own proxy settings before running a script.
