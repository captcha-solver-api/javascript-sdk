# SDK tests

Documentation for the `captcha-sdk` test suite: what is covered, how to run it by hand, and what runs in CI.

## Contents

- [Directory layout](#directory-layout)
- [Test types](#test-types)
- [How the tests import the SDK](#how-the-tests-import-the-sdk)
- [Unit tests](#unit-tests)
  - [How sync and async are split](#how-sync-and-async-are-split)
  - [Client tests](#client-tests-clienttestjs)
  - [Tests per captcha type](#tests-per-captcha-type)
  - [Public API contract](#public-api-contract)
- [Integration tests](#integration-tests)
  - [Why the repository carries no targets](#why-the-repository-carries-no-targets)
  - [What is not covered here](#what-is-not-covered-here)
  - [The shared helper](#the-shared-helper)
  - [How they switch on](#how-they-switch-on)
- [Running them by hand](#running-them-by-hand)
  - [Requirements](#requirements)
- [Coverage](#coverage)
- [CI / pipeline](#ci--pipeline)

## Directory layout

The top level splits tests by **type**, the nested level by **calling style**:

```
tests/
в”њв”Ђв”Ђ unit/                     # no network, fetch is mocked, no key needed
в”‚   в”њв”Ђв”Ђ public-api.test.js    # contract of the package's public entry points
в”‚   в”њв”Ђв”Ђ sync/                 # promise-chain style (.then/.catch)
в”‚   в”‚   в”њв”Ђв”Ђ client.test.js
в”‚   в”‚   в”њв”Ђв”Ђ coordinates.test.js
в”‚   в”‚   в”њв”Ђв”Ђ geetest.test.js
в”‚   в”‚   в”њв”Ђв”Ђ image_to_text.test.js
в”‚   в”‚   в”њв”Ђв”Ђ recaptcha_v2.test.js
в”‚   в”‚   в”њв”Ђв”Ђ recaptcha_v2_enterprise.test.js
в”‚   в”‚   в”њв”Ђв”Ђ recaptcha_v3.test.js
в”‚   в”‚   в”њв”Ђв”Ђ tencent.test.js
в”‚   в”‚   в”њв”Ђв”Ђ turnstile.test.js
в”‚   в”‚   в””в”Ђв”Ђ yandex_smartcaptcha.test.js
в”‚   в””в”Ђв”Ђ async/                # the same scenarios in async/await style
в”‚       в””в”Ђв”Ђ (the same 10 files)
в””в”Ђв”Ђ integration/              # against the real API (needs a key, spends balance)
    в”њв”Ђв”Ђ helpers.js            # shared guard and client factory (not a test)
    в”њв”Ђв”Ђ balance.test.js       # free check: balance
    в”њв”Ђв”Ђ image_to_text.test.js # paid checks: real solve(), one file per type
    в”њв”Ђв”Ђ coordinates.test.js
    в”њв”Ђв”Ђ recaptcha_v2.test.js
    в”њв”Ђв”Ђ recaptcha_v3.test.js
    в”њв”Ђв”Ђ turnstile.test.js
    в”њв”Ђв”Ђ geetest_v4.test.js
    в”њв”Ђв”Ђ yandex_smartcaptcha.test.js
    в””в”Ђв”Ђ tencent.test.js
```

The runner is Jest 29 in ESM mode (`node --experimental-vm-modules`), configured in [jest.config.js](../jest.config.js) at the project root. The default `testMatch` is used, so any `*.test.js` file is picked up. Suites are selected by directory path (`jest tests/unit` / `jest tests/integration`), so a new file needs no configuration — its location alone puts it in the right set.

## Test types

| Type | Where | Network | API key needed | Count |
|---|---|---|---|---|
| Unit | `tests/unit/` | no, `fetch` is mocked | no | 21 suites / 81 tests |
| Integration | `tests/integration/` | yes, the real API | yes | 9 suites / 9 tests |

Unit tests are fully isolated: the network layer is replaced either through `global.fetch = jest.fn(...)` or through `jest.spyOn(client, '_request')`. No outbound requests, no charges against the account.

## How the tests import the SDK

Every test pulls in the SDK **by package name**, the way a user would, rather than by direct file paths:

```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
```

This works with no extra setup: Node supports self-reference — a package can import itself by name as long as `package.json` has a `name` and an `exports` map. Jest's resolver honours that, including the ban on undeclared subpaths.

Why this instead of `../../../dist/client.js`:

- **The tests check what the user actually gets.** Direct imports bypass [src/index.ts](../src/index.ts) and the `exports` map. With them you could delete an export from `index.ts` or break `exports` in `package.json` and the whole suite would stay green, even though the package would work for nobody.
- **Coverage becomes honest.** With direct imports, `index.ts` was loaded by no test at all and simply dropped out of Jest's report — coverage read 97.5 % while saying nothing about an entirely unchecked entry point.
- **No brittle `../../../`.** Moving directories means editing `jest.config.js`, not 21 files.

Mocking does not depend on the import style: `global.fetch` is replaced globally, and `jest.spyOn(client, '_request')` works at the instance level.

## Unit tests

### How sync and async are split

The SDK exposes one and the same promise-based API, usable in two styles. The subdirectories reflect the calling style, not two different implementations:

- `tests/unit/sync/` — calls via `.then()/.catch()`, the test returns a promise;
- `tests/unit/async/` — the same calls via `async/await`.

To avoid duplicating checks, the rule is:

- **Task serialization** (`task.toDict()`) is checked **once**, in `tests/unit/sync/<type>.test.js`. It does not depend on the calling style.
- **`solve()`** is checked in **both** directories — that is the whole point of the split: confirming that the SDK's promises behave correctly in either style.

That is why the files under `async/` are noticeably shorter: they only hold `solve()`.

### Client tests (`client.test.js`)

`unit/sync/client.test.js` and `unit/async/client.test.js` mirror each other, 12 tests apiece. They cover transport, error handling and polling, independently of any particular captcha type:

| Test | What it checks |
|---|---|
| `throws ValidationError when clientKey is missing` | the `CaptchaClient` constructor without `clientKey` throws `ValidationError` |
| `creates task and returns taskId` | `createTask()` returns the `taskId` from the API response |
| `sends languagePool when provided` | when `languagePool` is passed, the field goes out in the request body |
| `does not send languagePool when not provided` | without `languagePool` the field is **absent** from the body |
| `getTaskResult returns full API response` | `getTaskResult()` hands back the whole response (`status`, `solution`), not just the solution |
| `getBalance returns balance as float` | the API's `"10.50"` string is coerced to the number `10.5` |
| `solve polls until status is ready and returns solution` | `solve()` polls the API until `status: 'ready'` and returns the `solution` |
| `throws TimeoutError when timeout exceeded` | exceeding `timeout` raises `TimeoutError` |
| `throws ApiError when a task fails during polling` | an error arriving **during polling** turns into `ApiError` |
| `throws ApiError when errorId is not zero` | a non-zero `errorId` in the response в†’ `ApiError` |
| `ApiError carries the string errorCode, not the numeric errorId` | `error.errorCode` holds the string code (`ERROR_KEY_DOES_NOT_EXIST`), not a number |
| `throws NetworkError on fetch failure` | a `fetch` failure is wrapped in `NetworkError` |

### Tests per captcha type

For each captcha type the suite checks that the task class serializes into the request body exactly per the API contract, and that `solve()` returns the expected solution shape.

Common to every type's serialization:
- the `type` field matches the API task type (`RecaptchaV2TaskProxyless`, `TurnstileTask` and so on);
- required fields make it into `toDict()`;
- `null`/`undefined` fields are **stripped** and never reach the request;
- the proxy variants of the classes add `proxyType`/`proxyAddress`/`proxyPort`/`proxyLogin`/`proxyPassword`.

| File | Tests (sync / async) | What is specific to it |
|---|---|---|
| `recaptcha_v2.test.js` | 6 / 1 | the field names `recaptchaDataSValue` and `apiDomain` (not `dataSValue`); `isInvisible`, `userAgent`; proxy variant. `solve()` goes through an intermediate `status: 'processing'` — exactly 3 requests |
| `recaptcha_v2_enterprise.test.js` | 4 / 1 | `enterprisePayload` as an object, `isInvisible`; an exact `toDict()` match for the minimal field set |
| `recaptcha_v3.test.js` | 4 / 1 | `minScore` is required — without it the constructor throws `ValidationError`; `pageAction`, `apiDomain` |
| `turnstile.test.js` | 5 / 1 | the field names `data` and `pagedata` (not `cData` or `pageData` -- `pagedata` is the one field on this type the real API takes lowercase); `userAgent` is rejected as input entirely -- it's response-only on this type |
| `geetest.test.js` | 7 / 2 | v3: `gt` + `challenge`, no `version` field. v4: `version: 4` + `initParameters`. Plus `geetestApiServerSubdomain` and `risk_type` (never `cookies` -- not a real field on this type). `solve()` is tested separately for v3 and v4 — their solution shapes differ |
| `yandex_smartcaptcha.test.js` | 4 / 1 | `userAgent`, `cookies`; proxy variant |
| `tencent.test.js` | 4 / 1 | `appId`, optional `captchaScript` |
| `image_to_text.test.js` | 3 / 1 | the constructor parameter `case_` serializes to the field `case` (working around the reserved word); `numeric`, `phrase`, `minLength`/`maxLength`, `comment`, `imgInstructions` |


### Public API contract

`tests/unit/public-api.test.js` — 7 tests guarding the `exports` map from [package.json](../package.json):

```json
"exports": {
  ".":            { "import": "./dist/index.js", "require": "./dist/index.cjs" },
  "./tasks":      { "import": "./dist/tasks.js", "require": "./dist/tasks.cjs" },
  "./exceptions": { "import": "./dist/exceptions.js", "require": "./dist/exceptions.cjs" }
}
```

Every other test already imports the package by name, so a broken main entry would bring the whole suite down on its own. This file covers what would otherwise go unchecked:

| Test | What it checks |
|---|---|
| `exposes the client, the task namespace and every error class` | `.` exposes `CaptchaClient`, `Tasks` and all 5 error classes |
| `Tasks namespace exposes every task class` | `Tasks` holds all 16 task classes |
| `__version__ matches the version in package.json` | `__version__` has not drifted from `version` during a release |
| `"captcha-sdk/tasks" exposes every task class` | the `./tasks` subpath resolves and hands back every class |
| `"captcha-sdk/exceptions" exposes every error class` | the `./exceptions` subpath resolves and hands back every class |
| `subpaths and the main entry expose the same classes` | these are the **same** objects, not duplicate module instances — otherwise `instanceof` would break for anyone mixing import styles |
| `internal modules are not reachable as subpaths` | `captcha-sdk/client` is rejected: the file exists, but it is not declared in `exports` and must stay private |

The class lists in the test are spelled out as explicit arrays rather than derived from the module itself. That is deliberate: comparing an export against itself always passes and checks nothing. Adding a new captcha type means extending the array by hand — and that is exactly the point where the decision to make a class public gets recorded explicitly.

## Integration tests

The only set that talks to the real API at `https://api.captcha-solver.com`. One file per check:

| File | What it checks | Target variables | Test timeout | Spends balance |
|---|---|---|---|---|
| `balance.test.js` | account balance | — | 15 s | no |
| `image_to_text.test.js` | text recognition on an image | — (image ships with the repo) | 130 s | **yes** |
| `coordinates.test.js` | `coordinates` — click points on an image | — (image ships with the repo) | 130 s | **yes** |
| `recaptcha_v2.test.js` | `gRecaptchaResponse` | `RECAPTCHA_V2_URL`, `RECAPTCHA_V2_SITE_KEY` | 130 s | **yes** |
| `recaptcha_v3.test.js` | `gRecaptchaResponse` with `minScore: 0.3` | `RECAPTCHA_V3_URL`, `RECAPTCHA_V3_SITE_KEY` | 190 s | **yes** |
| `turnstile.test.js` | `token` | `TURNSTILE_URL`, `TURNSTILE_SITE_KEY` | 130 s | **yes** |
| `geetest_v4.test.js` | `captcha_output`, `lot_number`, `pass_token` | `GEETEST_V4_URL`, `GEETEST_V4_CAPTCHA_ID` | 310 s | **yes** |
| `yandex_smartcaptcha.test.js` | `token` | `YANDEX_SMARTCAPTCHA_URL`, `YANDEX_SMARTCAPTCHA_SITE_KEY` | 130 s | **yes** |
| `tencent.test.js` | `ticket`, `randstr` | `TENCENT_URL`, `TENCENT_APP_ID` | 130 s | **yes** |

The split follows **cost, not captcha type**. `balance.test.js` costs nothing and depends on nothing, which makes it a fine smoke test for "the key is alive, the network is up":

```bash
npm test -- tests/integration/balance.test.js
```

Everything else calls `solve()` and takes money off the account on every run. That is why these are run selectively, one file at a time, rather than as a whole set.

### Why the repository carries no targets

There is not a single real page URL and not a single widget identifier in the code — **on purpose**. Everything comes from environment variables, with no defaults. `recaptcha_v2.test.js` used to fall back to Google's demo page, and `.env.example` used to carry working keys for reCAPTCHA, Turnstile and GeeTest; that has been removed.

The identifier differs per vendor: a sitekey for reCAPTCHA, Turnstile and Yandex, an `appId` for Tencent, a `captchaId` for GeeTest v4. Variable names follow the vendor's own term — `TENCENT_APP_ID`, not `TENCENT_SITE_KEY`.

The practical consequence: **a fresh clone has no working integration check other than the balance one**. That is the price of the decision, not an oversight. Put your own targets in `.env` (it is gitignored); the template with the variable names is [.env.example](../.env.example).

The exception is the two image-based tests, `image_to_text.test.js` and `coordinates.test.js`. They need neither a page nor a widget identifier, only an image, and the images ship with the repository — [text-captcha.png](../examples/assets/text-captcha.png) and [coordinates-captcha.png](../examples/assets/coordinates-captcha.png). Both work out of the box; a key is all it takes.

The tests deliberately have no fixtures directory of their own: the very same images are what the `image_to_text.js` and `coordinates.js` examples feed to the API, and one shared copy cannot drift from a second one. The path in the test is resolved through `new URL(..., import.meta.url)`, i.e. relative to the test file itself rather than the working directory.

In `coordinates.test.js` the image bounds are not hard-coded: width and height are read from the PNG's own IHDR chunk, so the "point lies inside the image" assertion stays correct even if the sample is swapped out.

The image used to be passed through an `IMAGE_TO_TEXT_BASE64` variable in `.env.example`. The string there was valid, but it encoded a 26Г—26 pixel image — there was nothing in it to recognise, and the test failed reliably with `ERROR_CAPTCHA_UNSOLVABLE`. The variable is gone.

### What is not covered here

- **GeeTest v3.** It needs a fresh session-bound `challenge` scraped from the target page immediately before the task is created. That cannot be driven from static configuration; it would take a scraper, as in [examples/async/geetest_v3.js](../examples/async/geetest_v3.js).
- **The proxy variants and reCAPTCHA v2 Enterprise.** They need a working proxy and a site with an Enterprise widget respectively.
- **Cloudflare Challenge pages** in `turnstile.test.js` — only the ordinary widget is covered. Challenge pages need fresh `action`, `data` and `pagedata` pulled off the page.

### The shared helper

`tests/integration/helpers.js` is not a test: it has no `.test.js` suffix, so the default `testMatch` does not pick it up. It holds what would otherwise be copied into every file:

| Export | Purpose |
|---|---|
| `apiKey` | `process.env.CAPTCHA_API_KEY` in one place |
| `describeIntegration(name, fn)` | `describe` when a key is present, `describe.skip` when it is not |
| `describeTarget(name, vars, fn)` | the same plus a check on the target variables; passes their values to the callback |
| `createClient(options)` | a client with the key from the environment, built per test; `options` is there for the slow types |

The file also pulls in `dotenv/config`, so `.env` is read automatically — otherwise a local run would mean exporting a dozen variables by hand. dotenv never overwrites values already present in the environment, so anything passed on the command line or by CI still wins. Unit tests do not import this file and stay free of dotenv.

### How they switch on

A suite skips itself when `CAPTCHA_API_KEY` is missing **or** its target variables are unset. The skip happens at the `describe` level, so the output reports it honestly:

```
Test Suites: 9 skipped, 0 of 9 total
Tests:       9 skipped, 9 total
```

The guard used to sit inside each test (`if (!apiKey) return;`), and a keyless run showed green `passed` for tests that had made no request at all. Skipping at the suite level removes that lie: `skipped` means `skipped`.

Note that the run still finishes **successfully**, having simply checked nothing. That is not enough for CI, which is why the workflow has a dedicated fail-early step — see [CI / pipeline](#ci--pipeline).

Optional variables that refine the behaviour:

| Variable | Purpose |
|---|---|
| `RECAPTCHA_V3_PAGE_ACTION` | the action the site passes to `grecaptcha.execute()` — without a match the site scores the token lower |
| `TENCENT_CAPTCHA_SCRIPT` | for a site that loads the widget from a non-default script URL |
| `IMAGE_TO_TEXT_EXPECTED` | the text on your image; without it the test only asserts that the answer is non-empty |

## Running them by hand

Once, before anything else:

```bash
npm install
```

### Requirements

Node.js 18+ (see `engines` in `package.json`): the SDK relies on the global `fetch`.

The `--experimental-vm-modules` flag is mandatory — the SDK is pure ESM (`"type": "module"`), and without it Jest cannot load the modules. The npm scripts already pass it; you only need it yourself when invoking Jest directly. The `ExperimentalWarning: VM Modules` line in the output is expected and not an error.

### All tests

```bash
npm test
```

Runs both the unit and the integration tests (the latter in skip mode when there is no key).

### Unit tests only

```bash
npm run test:unit
```

Requires nothing: no network, no key. The run takes about a second and a half; the expected result is `21 passed, 81 tests`.

### Integration tests only

The most convenient way is to keep a `.env` in the project root (it is gitignored; the template is [.env.example](../.env.example)). The helper pulls in dotenv, so the variables are picked up automatically:

```bash
cp .env.example .env    # fill in the key and the targets you need
npm run test:integration
```

The environment works too, and it takes priority over `.env`.

PowerShell:

```powershell
$env:CAPTCHA_API_KEY = "your_key"
npm run test:integration
```

bash / cmd:

```bash
CAPTCHA_API_KEY=your_key npm run test:integration
```

**Running the whole set at once is usually unnecessary** — that is eight paid tasks per run. Go file by file:

```bash
# free: key and network
npm test -- tests/integration/balance.test.js

# one paid check
npm test -- tests/integration/turnstile.test.js
```

Suites without their variables configured will skip, so there is no need to fill in `.env` completely — only the types you are checking right now.

### A single file or a single test

Arguments after `--` are forwarded to Jest:

```bash
# one file
npm test -- tests/unit/sync/geetest.test.js

# every test in one directory
npm test -- tests/unit/async

# one test by name
npm test -- -t "getBalance returns balance as float"

# verbose per-test output
npm run test:unit -- --verbose

# watch mode during development
npm run test:unit -- --watch

# coverage
npm run test:unit -- --coverage
```

All of the above works for integration too — the path just points at a different directory:

```bash
# one integration file: free, key and network only
npm test -- tests/integration/balance.test.js

# one integration file: a paid check
npm test -- tests/integration/turnstile.test.js

# the whole integration directory (same as npm run test:integration)
npm test -- tests/integration

# one test by name inside a file
npm test -- tests/integration/tencent.test.js -t "solve returns a ticket"

# verbose output: shows which suites were skipped and are worth a second look
npm run test:integration -- --verbose
```

Two caveats specific to integration:

**A `-t` filter without a path will sweep the integration tests too.** `npm test -- -t "solve"` picks up every paid suite that has its targets configured. Pass the file path alongside `-t` unless you want surprise charges.

**Jest runs files in parallel**, one worker per file. With few paid files this is harmless, but running the whole directory fires several tasks at the API simultaneously. To make them go one at a time:

```bash
npm run test:integration -- --runInBand
```

Jest can also be invoked directly, but then the flag is yours to pass:

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/sync/geetest.test.js
```

## Coverage

```bash
npm run test:unit -- --coverage
```

Current state:

```
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files      |   97.53 |    83.63 |     100 |    97.5 |
 client.js     |   95.45 |    80.76 |     100 |   95.34 | 35,53
 exceptions.js |     100 |      100 |     100 |     100 |
 index.js      |     100 |      100 |     100 |     100 |
 tasks.js      |     100 |    84.52 |     100 |     100 | 26,38,71-77,89,107
```

What is uncovered: the HTTP error branch (`!response.ok`) and the `AbortError` handling in `_request()`, plus some default parameter values in the task constructors.

The figure counts **unit tests only**. Integration is deliberately left out: without a key those suites skip, and the number would swing depending on whether `CAPTCHA_API_KEY` happened to be available.

Two settings in [jest.config.js](../jest.config.js) matter specifically for coverage:

- `collectCoverageFrom: ['dist/**/*.{js,cjs}']` — count every JavaScript file in the built `dist/` package, including the public entry point, even when a test does not import it directly.
- `coverageReporters: ['text', 'lcov']` — `text` for the console, `lcov` for the Coveralls upload from CI.

Artifacts are written to `coverage/` (gitignored).

## CI / pipeline

The configuration is [.github/workflows/tests.yml](../.github/workflows/tests.yml). Two jobs:

| Job | Command | When it runs | Secrets |
|---|---|---|---|
| `unit` | `npm run test:unit -- --coverage` | push to `main`, any pull request, schedule, manual dispatch | none |
| `integration` | `npm run test:integration` | **only** on schedule (daily at 03:00 UTC) and manually via workflow_dispatch | `CAPTCHA_API_KEY` |

### Why the jobs are split

- **Unit tests are the mandatory blocking step.** Deterministic, no network, no secrets, a couple of seconds. Safe on any PR, forks included. They run on a Node `18 / 20 / 22` matrix, matching `engines.node: ">=18"`.
- **Integration tests deliberately do not run on pull requests.** They spend real account balance and depend on an external API being up. More importantly, secrets are unavailable in a PR from a fork, so the tests would skip themselves and produce a **false green** instead of an honest "not checked".

### What the nightly run actually checks

The `integration` job passes only `CAPTCHA_API_KEY` to the tests. It has no target variables, so among the paid suites everything skips except the two image-based ones — `image_to_text.test.js` and `coordinates.test.js`: they need no targets, and with a live key they **really do hit the API and spend balance**. `recaptcha_v2.test.js` used to work off a hard-coded Google demo page; after targets were dropped from the repository (see [above](#why-the-repository-carries-no-targets)) that is no longer the case.

So **every night costs two tasks**, one per image. That is the price of the nightly run checking `solve()` at all, rather than the balance alone, which is all it used to check. If that spend is unwanted, the simplest fix is to narrow the step to specific files: `npm test -- tests/integration/balance.test.js`.

The remaining target-driven solve tests are not planned for CI yet. When they are wanted, the order is:

1. Add the targets as repository secrets — e.g. `RECAPTCHA_V2_URL` and `RECAPTCHA_V2_SITE_KEY`.
2. Pass them through in the `Run integration tests` step alongside `CAPTCHA_API_KEY`.
3. Run selectively — `npm test -- tests/integration/recaptcha_v2.test.js`, not the whole set, or every night will cost one task per configured type.
4. Extend the fail-early step to check those variables too, otherwise a typo in a secret name turns into a silent skip and a green job.

### Two details that are easy to miss

**Coverage is uploaded from one Node version only** (`if: matrix.node-version == 20`). The figure does not depend on the Node version, and three parallel uploads of the same report would only clutter the history in Coveralls.

**The `integration` job fails loudly when the secret did not come through.** There is a fail-early step before the tests:

```yaml
- name: Fail early if the API key is missing
  run: |
    if [ -z "$CAPTCHA_API_KEY" ]; then
      echo "::error::secrets.CAPTCHA_API_KEY is not set -- integration tests would silently skip"
      exit 1
    fi
```

Without it a missing key would look like a successful run: the tests skip themselves and the job goes green having checked nothing. This is precisely the case where a silent skip is more dangerous than a failure.

### What the pipeline does not have yet

- A lint step — no linter is configured in the project.
- Publishing to npm.
- Badges in the README — tracked in [todo.md](../todo.md) together with wiring up Coveralls (which needs action in a web UI).
