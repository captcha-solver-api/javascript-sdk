# Examples — promise chains

The same 11 SDK scenarios as [../async/](../async), written with `.then()/.catch()` instead of
`await`. Nothing about the SDK changes between the two suites: `CaptchaClient` returns promises, and
these files simply consume them without `await`.

Setup, API key and the general gotchas are documented once in the [parent README](../README.md) —
read that first if you haven't.

Two consequences of dropping `await` are worth knowing before you run anything here:

- **Tasks are named, not inline.** Each block declares its task in a `const` (`proxylessTask`,
  `proxyTask`, `basicTask`, …) and then passes it to `captchaSolver.solve(...)`, which keeps the
  promise chain readable.
- **Blocks start concurrently.** In `async/`, a top-level `await` makes the proxyless block finish
  before the with-proxy block begins. Here nothing blocks, so both `solve()` calls are submitted
  almost simultaneously and their results arrive in whatever order the API returns them. Two tasks,
  twice the balance — comment out the block you don't need.

Errors are handled per chain with a trailing `.catch()`; a failing block does not stop the others.

## Table of contents

- [File index](#file-index)
- [What each file does](#what-each-file-does)

## File index

| File | What it does | Blocks in the file |
|---|---|---|
| [balance.js](balance.js) | Reads the account balance | single call |
| [recaptcha_v2.js](recaptcha_v2.js) | Solves reCAPTCHA v2 | Proxyless · With proxy |
| [recaptcha_v2_enterprise.js](recaptcha_v2_enterprise.js) | Solves reCAPTCHA v2 Enterprise | Proxyless · With proxy |
| [recaptcha_v3.js](recaptcha_v3.js) | Solves reCAPTCHA v3 with a score threshold | single block |
| [turnstile.js](turnstile.js) | Solves Cloudflare Turnstile | Proxyless · With proxy |
| [geetest_v3.js](geetest_v3.js) | Fetches a fresh `challenge`, then solves GeeTest v3 | one nested chain |
| [geetest_v4.js](geetest_v4.js) | Solves GeeTest v4 via `captcha_id` | Proxyless · With proxy |
| [yandex_smartcaptcha.js](yandex_smartcaptcha.js) | Solves Yandex SmartCaptcha (token challenge) | Proxyless · With proxy |
| [tencent.js](tencent.js) | Solves a Tencent captcha | Proxyless · With proxy |
| [image_to_text.js](image_to_text.js) | Recognises text on a captcha image | Basic · Advanced · With language pool |
| [coordinates.js](coordinates.js) | Solves a click captcha by coordinates | Basic · Advanced · Yandex image mode |

## What each file does

### balance.js

[Source code](balance.js) · [API documentation](https://captcha-solver.com/en/docs/methods#post-getbalance)

```javascript
captchaSolver.getBalance()
  .then((balance) => console.log('Balance:', balance))
```

One call resolving to the available amount as a number. No task, no target page, no placeholders —
the only file here that runs correctly without editing anything, and therefore the quickest check
that your key works.

### recaptcha_v2.js

[Source code](recaptcha_v2.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#recaptcha-v2)

The reference file for the proxyless/with-proxy pattern most other examples repeat.
`RecaptchaV2Proxyless` solves through the service's own IPs; `RecaptchaV2` adds `proxyType`,
`proxyAddress`, `proxyPort`, `proxyLogin` and `proxyPassword`. The client constructor is annotated
with the two optional settings — `timeout` (default 120000 ms) and `pollingInterval` (default
2000 ms) — and the task shows `isInvisible` for invisible widgets. Solution: `gRecaptchaResponse`.

### recaptcha_v2_enterprise.js

[Source code](recaptcha_v2_enterprise.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#recaptcha-v2-enterprise)

Same two chains, plus `enterprisePayload`. Enterprise widgets render through
`grecaptcha.enterprise.render()`, and any extra parameters the site passes there must be forwarded
in that object — omit them and the site rejects an otherwise valid token. Solution:
`gRecaptchaResponse`.

### recaptcha_v3.js

[Source code](recaptcha_v3.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#recaptcha-v3)

A single chain: v3 has no with-proxy variant. `minScore` is required and controls how hard the task
is — `0.3` fastest, `0.7` balanced, `0.9` highest and slowest — so the client is created with
`timeout: 180000`. `pageAction` should mirror the action the site sets in `grecaptcha.execute()`.
Commented-out lines show `isEnterprise` and `apiDomain` for sites loading from `recaptcha.net`.
Solution: `gRecaptchaResponse`.

### turnstile.js

[Source code](turnstile.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#cloudflare-turnstile)

Proxyless and with-proxy chains. The commented optional fields matter more here than elsewhere:
`action`, `data` (`data-cdata`) and `pageData` (`chlPageData`) are required for Cloudflare Challenge
pages. Note the User-Agent rule spelled out in the comments — the token is bound to it, so if you
pass `userAgent`, the browser or bot submitting the token must send the same one. Solution: `token`.

### geetest_v3.js

[Source code](geetest_v3.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#geetest-v3)

Structurally the odd one out. `challenge` is session-specific and must be fresh per task, so the
file opens with a `fetch(...).then(response => response.json())` chain and **nests both solve blocks
inside** the `.then(({ challenge }) => { … })` callback — the tasks cannot be built until the value
arrives. This is the clearest place to see what `await` buys you: the async version expresses the
same dependency as three flat statements.

That URL — `https://target-site.com/path/to/geetest/init` — is a **placeholder**, so the file does
not run end-to-end unmodified. It marks where the fetch belongs in the flow; point it at your real
source of `challenge` first.

The client uses `timeout: 300000` and `pollingInterval: 10000`, GeeTest being among the slowest
types. `version` is omitted since v3 is the default. Solution: `challenge`, `validate`, `seccode`.

### geetest_v4.js

[Source code](geetest_v4.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#geetest-v4)

Same `GeeTestProxyless`/`GeeTest` classes as v3, but v4 identifies the widget differently: no `gt`,
no `challenge`, instead `version: 4` and `captcha_id` inside `initParameters`. No pre-fetch is
needed, so this file keeps the flat two-chain layout. Same extended timeouts. Solution:
`captcha_id`, `lot_number`, `pass_token`, `gen_time`, `captcha_output`.

### yandex_smartcaptcha.js

[Source code](yandex_smartcaptcha.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#yandex-smartcaptcha)

The **token** challenge, proxyless and with proxy. `websiteKey` is the sitekey from the page source
or the captcha iframe; `userAgent` and `cookies` are optional. For Yandex's **image** challenge use
[coordinates.js](coordinates.js) instead — different task class entirely. Solution: `token`.

### tencent.js

[Source code](tencent.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#tencent)

Proxyless and with proxy. `appId` comes from the page source; `captchaScript` is only needed when
the site loads the widget from a non-default script URL. Solution: `appid`, `ret`, `ticket`,
`randstr`.

### image_to_text.js

[Source code](image_to_text.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#image-to-text)

Three chains, no proxy variant. *Basic* (`basicTask`) sends just the base64 image. *Advanced*
(`advancedTask`) adds the hints that narrow the search for the worker — `numeric`, `phrase`,
`minLength`/`maxLength`, `comment`, and a `captcha_hint.png` passed as `imgInstructions`. *With
language pool* (`languagePoolTask`) demonstrates the one API detail that is easy to get wrong:
`languagePool` is the **second argument to `solve()`**, not a task field —
`captchaSolver.solve(languagePoolTask, 'en')`, accepting `'en'` or `'ru'`.

Reads `./captcha.png` and `./captcha_hint.png` **relative to the working directory**, so run it from
where those files are. Solution: `text`.

### coordinates.js

[Source code](coordinates.js) · [API documentation](https://captcha-solver.com/en/docs/captcha-types#coordinates)

Three chains, no proxy variant. *Basic* (`basicTask`) submits an image plus a `comment` telling the
worker what to click. *Advanced* (`advancedTask`) adds an `instruction.png` as `imgInstructions` and
constrains the answer with `minClicks`/`maxClicks`. *Yandex SmartCaptcha image mode* (`yandexTask`)
reuses the same `CoordinatesTask` with `imgType: 'smart_captcha'` (object selection) or
`'pazl_smart_captcha'` (puzzle), which is how the image variant of Yandex SmartCaptcha is solved.

Reads `./captcha.png` and `./instruction.png` **relative to the working directory**. Solution:
`coordinates`, an array of `{ x, y }` points.
