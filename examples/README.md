# Examples

Runnable scripts for every captcha type the SDK supports. Each file is standalone: it builds a
`CaptchaClient`, creates one or two tasks, waits for the solution and prints it. Nothing here is
imported by the library itself — the directory exists to be read and executed.

The same 11 scenarios are provided twice, once per calling style:

| Suite | Style | Look here if |
|---|---|---|
| [async/](async) | `async/await` | your code is `await`-based (the common case) |
| [sync/](sync) | `.then()/.catch()` | you chain promises instead of awaiting them |

Both suites call the same `CaptchaClient`. The SDK exposes a single promise-based API, and the split
only demonstrates two ways of consuming it — JavaScript has no blocking HTTP client, so there is no
true synchronous variant the way the Python SDK has `requests` vs. `httpx`.

## Table of contents

- [Setup](#setup)
- [Running an example](#running-an-example)
- [Example index](#example-index)
- [What each example covers](#what-each-example-covers)
- [Before you run](#before-you-run)

## Setup

**1. Install dependencies.** The scripts use `dotenv`, which is a devDependency of the repo:

```bash
npm install
```

**2. Provide an API key.** Copy the template and fill in your key:

```bash
cp .env.example .env
```

```
CAPTCHA_API_KEY=your_api_key_here
```

Every script starts with `import 'dotenv/config'` and reads `process.env.CAPTCHA_API_KEY`, falling
back to the literal `'YOUR_API_KEY'` when the variable is missing. That fallback keeps the script
importable, but the API will reject it — set a real key before expecting results.

**3. Node.js 18 or newer.** The examples rely on global `fetch` and, in `async/`, on top-level
`await`.

> The scripts import the SDK by relative path (`../../src/index.js`) because they live inside this
> repository. In your own project, import it by package name instead:
> `import { CaptchaClient, Tasks } from 'captcha-sdk';`

## Running an example

Run from the repository root:

```bash
node examples/async/balance.js
node examples/sync/recaptcha_v2.js
```

`balance.js` is the one file that works as-is — it only needs a valid key. Every other example ships
with placeholder values (`https://example.com/login`, `6Le-xxxxxxxxx`, …) that you must replace with
values from your own target page. See [Before you run](#before-you-run).

Most files contain **two independent blocks** — a proxyless one and a with-proxy one — that both run
on execution. Comment out the block you don't need, or the script will submit two tasks and spend
twice the balance.

## Example index

| Captcha type | async | sync | Task classes | Solution fields |
|---|---|---|---|---|
| reCAPTCHA v2 | [recaptcha_v2.js](async/recaptcha_v2.js) | [recaptcha_v2.js](sync/recaptcha_v2.js) | `RecaptchaV2Proxyless`, `RecaptchaV2` | `gRecaptchaResponse` |
| reCAPTCHA v2 Enterprise | [recaptcha_v2_enterprise.js](async/recaptcha_v2_enterprise.js) | [recaptcha_v2_enterprise.js](sync/recaptcha_v2_enterprise.js) | `RecaptchaV2EnterpriseProxyless`, `RecaptchaV2Enterprise` | `gRecaptchaResponse` |
| reCAPTCHA v3 | [recaptcha_v3.js](async/recaptcha_v3.js) | [recaptcha_v3.js](sync/recaptcha_v3.js) | `RecaptchaV3Proxyless` | `gRecaptchaResponse` |
| Cloudflare Turnstile | [turnstile.js](async/turnstile.js) | [turnstile.js](sync/turnstile.js) | `TurnstileProxyless`, `Turnstile` | `token` |
| GeeTest v3 | [geetest_v3.js](async/geetest_v3.js) | [geetest_v3.js](sync/geetest_v3.js) | `GeeTestProxyless`, `GeeTest` | `challenge`, `validate`, `seccode` |
| GeeTest v4 | [geetest_v4.js](async/geetest_v4.js) | [geetest_v4.js](sync/geetest_v4.js) | `GeeTestProxyless`, `GeeTest` | `captcha_id`, `lot_number`, `pass_token`, `gen_time`, `captcha_output` |
| Yandex SmartCaptcha | [yandex_smartcaptcha.js](async/yandex_smartcaptcha.js) | [yandex_smartcaptcha.js](sync/yandex_smartcaptcha.js) | `YandexSmartCaptchaTaskProxyless`, `YandexSmartCaptchaTask` | `token` |
| Tencent | [tencent.js](async/tencent.js) | [tencent.js](sync/tencent.js) | `TencentTaskProxyless`, `TencentTask` | `appid`, `ret`, `ticket`, `randstr` |
| Image to Text | [image_to_text.js](async/image_to_text.js) | [image_to_text.js](sync/image_to_text.js) | `ImageToText` | `text` |
| Coordinates (click) | [coordinates.js](async/coordinates.js) | [coordinates.js](sync/coordinates.js) | `CoordinatesTask` | `coordinates` |
| Account balance | [balance.js](async/balance.js) | [balance.js](sync/balance.js) | — (`getBalance()`) | number |

## What each example covers

### reCAPTCHA v2

The baseline example, and the best one to read first. Shows the two shapes every proxy-capable type
follows: `RecaptchaV2Proxyless` (the service uses its own IPs) and `RecaptchaV2` with the five proxy
fields — `proxyType`, `proxyAddress`, `proxyPort`, `proxyLogin`, `proxyPassword`. Also documents the
two optional client settings, `timeout` and `pollingInterval`, and the `isInvisible` flag for
invisible widgets.

### reCAPTCHA v2 Enterprise

Same two shapes as v2, with `enterprisePayload` added. If the target site passes extra parameters to
`grecaptcha.enterprise.render()`, they must be forwarded in that object — otherwise the returned
token is rejected by the site even though the API call succeeded.

### reCAPTCHA v3

Proxyless only; v3 has no with-proxy variant. `minScore` is required and drives cost and duration:
`0.3` is fastest, `0.7` balanced, `0.9` highest and slowest. `pageAction` should match the action the
site sets in `grecaptcha.execute()` — passing it raises the chance the token is accepted. The client
is created with `timeout: 180000` because v3 tasks run longer than v2. Commented-out lines show
`isEnterprise` and `apiDomain`.

### Cloudflare Turnstile

Proxyless and with-proxy variants. The important detail is in the comments: the token is tied to the
User-Agent, so if you pass `userAgent` you must reuse the exact same one when submitting the token.
For Cloudflare Challenge pages, `action`, `data` (the `data-cdata` attribute) and `pageData` (the
`chlPageData` parameter) also have to be extracted from the page and passed along.

### GeeTest v3

The only example that performs a **request of its own before solving**. The `challenge` value is
session-specific and must be fresh for every task, so the script fetches one first and then builds
the task. The fetch URL is a deliberate placeholder — see [Before you run](#before-you-run). Uses
`timeout: 300000` and `pollingInterval: 10000`, since GeeTest is among the slowest types. `version`
is omitted because v3 is the default.

### GeeTest v4

Same task classes as v3, different identification: v4 drops `gt`/`challenge` entirely and identifies
the widget by `captcha_id` inside `initParameters`, with `version: 4` set explicitly. Solution shape
differs from v3 as well — `captcha_output` and friends instead of `validate`/`seccode`.

### Yandex SmartCaptcha

Covers the **token** challenge, proxyless and with proxy. `websiteKey` is the sitekey from the page
source or the captcha iframe; `userAgent` and `cookies` are optional. Yandex's **image** challenge is
a different task type — it lives in the coordinates example below.

### Tencent

Proxyless and with proxy. `appId` is read from the page source. `captchaScript` is only needed when
the site loads the widget from a non-default script URL.

### Image to Text

Three blocks, no proxy variant. *Basic* submits a base64 image and nothing else. *Advanced* adds the
hints that speed up recognition — `numeric`, `phrase`, `minLength`/`maxLength`, `comment` and an
`imgInstructions` image. *With language pool* shows that `languagePool` is the **second argument to
`solve()`**, not a task field: `solve(task, 'en')` picks an English-speaking worker pool (`'en'` or
`'ru'`).

### Coordinates (click captcha)

Three blocks, no proxy variant. *Basic* passes an image plus a `comment` telling the worker what to
click. *Advanced* adds an `imgInstructions` image and the `minClicks`/`maxClicks` limits. *Yandex
SmartCaptcha image mode* reuses `CoordinatesTask` with `imgType: 'smart_captcha'` (object selection)
or `'pazl_smart_captcha'` (puzzle) — this is how you solve Yandex's image challenge rather than its
token challenge.

### Account balance

The shortest script: one `getBalance()` call returning the available amount as a number. It needs no
target page and no placeholder edits, which makes it the fastest way to confirm that your key and
network access work.

## Before you run

Every example except `balance.js` needs something replaced first.

| Example | What you must supply |
|---|---|
| `balance.js` | Nothing — runs as-is with a valid key |
| `recaptcha_v2.js`, `recaptcha_v2_enterprise.js`, `recaptcha_v3.js` | Real `websiteURL` and `websiteKey` |
| `turnstile.js` | Real `websiteURL` and `websiteKey`; for Challenge pages also `action`, `data`, `pageData` |
| `yandex_smartcaptcha.js` | Real `websiteURL` and `websiteKey` |
| `tencent.js` | Real `websiteURL` and `appId` |
| `geetest_v3.js` | Real `websiteURL` and `gt`, **plus a real init endpoint** (see below) |
| `geetest_v4.js` | Real `websiteURL` and `captcha_id` |
| `image_to_text.js` | `captcha.png` and `captcha_hint.png` in the working directory |
| `coordinates.js` | `captcha.png` and `instruction.png` in the working directory |

**Image files are resolved against the working directory**, not the script location — `fs.readFileSync('./captcha.png')`
looks in wherever you launched `node` from. Run those two examples from the directory holding your
images, or edit the paths. The repository intentionally ships no sample images.

**`geetest_v3.js` will not run end-to-end as-is.** It fetches
`https://target-site.com/path/to/geetest/init`, which is a placeholder, not a live endpoint; the
script exits with code 1 when that fetch fails. Point it at your real target page — or wherever it
exposes a fresh `challenge` — before running. The block is there to show *where* that fetch belongs
in the flow.

Proxy credentials (`1.2.3.4:8080`, `user`/`password`) are placeholders too. If you only want the
proxyless path, comment out the with-proxy block rather than leaving it to fail.

Full API reference: https://captcha-solver.com/en/docs/captcha-types
