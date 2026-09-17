# Examples — async/await

The 11 SDK scenarios written in `async/await` style. Every file uses **top-level `await`** (possible
because the package is ESM, `"type": "module"`) and wraps each solve in its own `try/catch`, so a
failing block prints the error and the next block still runs.

Setup, API key and the general gotchas are documented once in the [parent README](../README.md) —
read that first if you haven't. The identical scenarios in promise-chain style live in
[../sync/](../sync).

Because every block is awaited at the top level, the blocks in a file execute **sequentially**: a
file with a proxyless block and a with-proxy block submits two tasks, one after the other, and
spends balance twice. Comment out the one you don't need.

## Table of contents

- [File index](#file-index)
- [What each file does](#what-each-file-does)

## File index

| File | What it does | Blocks in the file |
|---|---|---|
| [balance.js](balance.js) | Reads the account balance | single call |
| [recaptcha_v2.js](recaptcha_v2.js) | Solves reCAPTCHA v2 | Proxyless · With proxy |
| [recaptcha_v2_enterprise.js](recaptcha_v2_enterprise.js) | Solves reCAPTCHA v2 Enterprise | Proxyless · With proxy |
| [turnstile.js](turnstile.js) | Solves Cloudflare Turnstile | Proxyless · With proxy |
| [geetest_v3.js](geetest_v3.js) | Fetches a fresh `challenge`, then solves GeeTest v3 | Fetch · Proxyless · With proxy |
| [geetest_v4.js](geetest_v4.js) | Solves GeeTest v4 via `captcha_id` | Proxyless · With proxy |
| [yandex_smartcaptcha.js](yandex_smartcaptcha.js) | Solves Yandex SmartCaptcha (token challenge) | Proxyless · With proxy |
| [tencent.js](tencent.js) | Solves a Tencent captcha | Proxyless · With proxy |
| [image_to_text.js](image_to_text.js) | Recognises text on a captcha image | Basic · Advanced · With language pool |

## What each file does

### balance.js

[Source code](balance.js) · [API documentation](https://captcha-solver.com/en/docs/methods#post-getbalance)

```javascript
const balance = await captchaSolver.getBalance();
```

One call, returning the available amount as a number. No task, no target page, no placeholders —
the only file here that runs correctly without editing anything, which makes it the quickest check
that your key works.

### recaptcha_v2.js

[Source code](recaptcha_v2.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#recaptcha-v2)

The reference file for the proxyless/with-proxy pattern that most other examples repeat.
`RecaptchaV2Proxyless` solves through the service's own IPs; `RecaptchaV2` adds `proxyType`,
`proxyAddress`, `proxyPort`, `proxyLogin` and `proxyPassword`. The client constructor is annotated
with the two optional settings — `timeout` (default 120000 ms) and `pollingInterval` (default
2000 ms) — and the task shows `isInvisible` for invisible widgets. Solution: `gRecaptchaResponse`.

### recaptcha_v2_enterprise.js

[Source code](recaptcha_v2_enterprise.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#recaptcha-v2-enterprise)

Same two blocks, plus `enterprisePayload`. Enterprise widgets are rendered through
`grecaptcha.enterprise.render()`, and any extra parameters the site passes there must be forwarded
in that object — omit them and the site rejects an otherwise valid token. Solution:
`gRecaptchaResponse`.



A single block: v3 has no with-proxy variant. `minScore` is required and controls how hard the task
is — `0.3` fastest, `0.7` balanced, `0.9` highest and slowest — so the client is created with
`timeout: 180000`. `pageAction` should mirror the action the site sets in `grecaptcha.execute()`.
Commented-out lines show `isEnterprise` and `apiDomain` for sites loading from `recaptcha.net`.
Solution: `gRecaptchaResponse`.

### turnstile.js

[Source code](turnstile.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#cloudflare-turnstile)

Proxyless and with-proxy blocks. The commented optional fields matter more here than elsewhere:
`action`, `data` (`data-cdata`) and `pagedata` (`chlPageData`, lowercase unlike the rest) are required for Cloudflare Challenge
pages. Note the User-Agent rule spelled out in the comments — there's no `userAgent` input field;
the worker picks its own and returns it as `result.userAgent`, and the browser or bot submitting
the token must send that exact one back. Solution: `token` (plus `userAgent`).

### geetest_v3.js

[Source code](geetest_v3.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#geetest-v3)

The only file that makes a request of its own before solving. `challenge` is session-specific and
must be fresh per task, so the script awaits a `fetch` to the target's init endpoint, destructures
`challenge` out of the JSON, and only then builds the task; if that fetch throws, it logs and calls
`process.exit(1)`.

That URL — `https://target-site.com/path/to/geetest/init` — is a **placeholder**, so the file does
not run end-to-end unmodified. It marks where the fetch belongs in the flow; point it at your real
source of `challenge` first.

The client uses `timeout: 300000` and `pollingInterval: 10000`, GeeTest being among the slowest
types. `version` is omitted since v3 is the default. Solution: `challenge`, `validate`, `seccode`.

### geetest_v4.js

[Source code](geetest_v4.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#geetest-v4)

Same `GeeTestProxyless`/`GeeTest` classes as v3, but v4 identifies the widget differently: no
`gt`, no `challenge`, instead `version: 4` and `captcha_id` inside `initParameters`. No pre-fetch is
needed. Same extended timeouts. Solution: `captcha_id`, `lot_number`, `pass_token`, `gen_time`,
`captcha_output`.

### yandex_smartcaptcha.js

[Source code](yandex_smartcaptcha.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#yandex-smartcaptcha)

The **token** challenge, proxyless and with proxy. `websiteKey` is the sitekey from the page source
[coordinates.js](coordinates.js) instead — different task class entirely. Solution: `token`.

### tencent.js

[Source code](tencent.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#tencent)

Proxyless and with proxy. `appId` comes from the page source; `captchaScript` is only needed when
the site loads the widget from a non-default script URL. Solution: `appid`, `ret`, `ticket`,
`randstr`.

### image_to_text.js

[Source code](image_to_text.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#image-to-text)

Three blocks, no proxy variant, all active. *Basic* sends the shipped `text-captcha.png` sample with
the character-set hints that match it — `numeric: 2` (letters), `minLength`/`maxLength`. *Advanced*
solves a different image entirely, `captcha-math.png`, using the rest of the hints — `phrase`,
`math`, `comment`, and `captcha-math-instructions.png` passed as `imgInstructions`. *With language
pool* demonstrates the one API detail that is easy to get wrong: `languagePool` is the **second
argument to `solve()`**, not a task field — `await captchaSolver.solve(task, 'en')`, accepting `'en'`
or `'ru'`.

Reads its images via `new URL(..., import.meta.url)`, so the path holds **regardless of the working
directory** and the script runs as-is. Solution: `text`.

### coordinates.js

[Source code](coordinates.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#coordinates)

Three blocks, no proxy variant, all active. *Basic* submits the shipped grid captcha
(`coordinates-captcha.png`) plus a `comment` telling the worker what to click. *Advanced* solves a
different image, a real traffic-lights photo (`traffic-lights.png`), with
`traffic-lights-instructions.png` as `imgInstructions` and `minClicks`/`maxClicks` limits. *Yandex
SmartCaptcha screenshot (`yandex-smartcaptcha-sample.jpg`) whose click-order hint is baked into the
image itself, so no separate `imgInstructions` is passed — this is how the image variant of Yandex
SmartCaptcha is solved.

Reads its images via `new URL(..., import.meta.url)`, so the path holds **regardless of the working
directory** and the script runs as-is. Solution: `coordinates`, an array of `{ x, y }` points.
