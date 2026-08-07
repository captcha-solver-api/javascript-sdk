# Тесты SDK

Документация по тестам `captcha-sdk`: что покрыто, как запускать вручную и что должно выполняться в CI.

## Оглавление

- [Структура каталога](#структура-каталога)
- [Типы тестов](#типы-тестов)
- [Как тесты импортируют SDK](#как-тесты-импортируют-sdk)
- [Unit-тесты](#unit-тесты)
  - [Как разделены sync и async](#как-разделены-sync-и-async)
  - [Тесты клиента](#тесты-клиента-clienttestjs)
  - [Тесты по типам капч](#тесты-по-типам-капч)
  - [Контракт публичного API](#контракт-публичного-api)
- [Integration-тесты](#integration-тесты)
  - [Почему в репозитории нет ни одной цели](#почему-в-репозитории-нет-ни-одной-цели)
  - [Чего здесь нет](#чего-здесь-нет)
  - [Общий хелпер](#общий-хелпер)
  - [Как включаются](#как-включаются)
- [Ручной запуск](#ручной-запуск)
- [Покрытие](#покрытие)
- [CI / пайплайн](#ci--пайплайн)

## Структура каталога

Верхний уровень делит тесты по **типу**, вложенный — по **стилю вызова**:

```
tests/
├── unit/                     # без сети, fetch замокан, ключ не нужен
│   ├── public-api.test.js    # контракт публичных точек входа пакета
│   ├── sync/                 # стиль промис-цепочек (.then/.catch)
│   │   ├── client.test.js
│   │   ├── coordinates.test.js
│   │   ├── geetest.test.js
│   │   ├── image_to_text.test.js
│   │   ├── recaptcha_v2.test.js
│   │   ├── recaptcha_v2_enterprise.test.js
│   │   ├── recaptcha_v3.test.js
│   │   ├── tencent.test.js
│   │   ├── turnstile.test.js
│   │   └── yandex_smartcaptcha.test.js
│   └── async/                # те же сценарии в стиле async/await
│       └── (те же 10 файлов)
└── integration/              # против реального API (нужен ключ, тратит баланс)
    ├── helpers.js            # общий гард и фабрика клиента (не тест)
    ├── balance.test.js       # бесплатная проверка: баланс
    ├── image_to_text.test.js # платные проверки: реальный solve(), по файлу на тип
    ├── recaptcha_v2.test.js
    ├── recaptcha_v3.test.js
    ├── turnstile.test.js
    ├── geetest_v4.test.js
    ├── yandex_smartcaptcha.test.js
    └── tencent.test.js
```

Раннер — Jest 29 в режиме ESM (`node --experimental-vm-modules`), настройки в [jest.config.js](../jest.config.js) в корне проекта. Используется дефолтный `testMatch`, то есть подхватывается любой файл `*.test.js`. Наборы отбираются по пути каталога (`jest tests/unit` / `jest tests/integration`), поэтому новый файл не требует ничего настраивать — он попадает в нужный набор по своему расположению.

## Типы тестов

| Тип | Где | Сеть | Нужен API-ключ | Кол-во |
|---|---|---|---|---|
| Unit | `tests/unit/` | нет, `fetch` замокан | нет | 21 сьют / 81 тест |
| Integration | `tests/integration/` | да, реальный API | да | 8 сьютов / 8 тестов |

Unit-тесты полностью изолированы: сетевой слой подменяется либо через `global.fetch = jest.fn(...)`, либо через `jest.spyOn(client, '_request')`. Никаких внешних запросов и никаких списаний с баланса.

## Как тесты импортируют SDK

Все тесты подключают SDK **по имени пакета**, как это делает пользователь, а не по прямым путям к файлам:

```javascript
import { CaptchaClient, Tasks } from 'captcha-sdk';
```

Это работает без дополнительной настройки: Node поддерживает self-reference — пакет может импортировать сам себя по имени, если в `package.json` есть `name` и `exports`. Резолвер Jest это уважает, включая запрет на незаявленные подпути.

Почему так, а не `../../../src/client.js`:

- **Тесты проверяют то, что получает пользователь.** Прямые импорты обходят [src/index.js](../src/index.js) и карту `exports`. С ними можно удалить экспорт из `index.js` или сломать `exports` в `package.json` — и вся сюита останется зелёной, хотя пакет не заработает ни у кого.
- **Покрытие становится честным.** При прямых импортах `index.js` не загружался ни одним тестом и просто выпадал из отчёта Jest — покрытие показывало 97.5 %, умалчивая о непроверенной точке входа.
- **Нет хрупких `../../../`.** При переносе каталогов правится только `jest.config.js`, а не 21 файл.

Моки от способа импорта не зависят: `global.fetch` подменяется глобально, а `jest.spyOn(client, '_request')` работает на уровне экземпляра.

## Unit-тесты

### Как разделены sync и async

SDK предоставляет один и тот же промисный API, который можно использовать двумя стилями. Подкаталоги отражают именно стиль вызова, а не разные реализации:

- `tests/unit/sync/` — вызовы через `.then()/.catch()`, тест возвращает промис;
- `tests/unit/async/` — те же вызовы через `async/await`.

Чтобы не дублировать проверки, действует правило:

- **Сериализация задач** (`task.toDict()`) проверяется **один раз** — в `tests/unit/sync/<тип>.test.js`. Она не зависит от стиля вызова.
- **`solve()`** проверяется **в обоих** каталогах — это и есть смысл разделения: убедиться, что промисы SDK корректно работают в обоих стилях.

Поэтому файлы в `async/` заметно короче: там только `solve()`.

### Тесты клиента (`client.test.js`)

`unit/sync/client.test.js` и `unit/async/client.test.js` — зеркальные, по 12 тестов каждый. Проверяют транспорт, обработку ошибок и polling, вне привязки к конкретному типу капчи:

| Тест | Что проверяет |
|---|---|
| `throws ValidationError when clientKey is missing` | конструктор `CaptchaClient` без `clientKey` кидает `ValidationError` |
| `creates task and returns taskId` | `createTask()` возвращает `taskId` из ответа API |
| `sends languagePool when provided` | при передаче `languagePool` поле уходит в теле запроса |
| `does not send languagePool when not provided` | без `languagePool` поле в тело **не** попадает |
| `getTaskResult returns full API response` | `getTaskResult()` отдаёт весь ответ (`status`, `solution`), а не только решение |
| `getBalance returns balance as float` | строка `"10.50"` из API приводится к числу `10.5` |
| `solve polls until status is ready and returns solution` | `solve()` опрашивает API до `status: 'ready'` и возвращает `solution` |
| `throws TimeoutError when timeout exceeded` | при превышении `timeout` бросается `TimeoutError` |
| `throws ApiError when a task fails during polling` | ошибка, пришедшая **на этапе polling**, превращается в `ApiError` |
| `throws ApiError when errorId is not zero` | ненулевой `errorId` в ответе → `ApiError` |
| `ApiError carries the string errorCode, not the numeric errorId` | в `error.errorCode` лежит строковый код (`ERROR_KEY_DOES_NOT_EXIST`), а не число |
| `throws NetworkError on fetch failure` | падение `fetch` оборачивается в `NetworkError` |

### Тесты по типам капч

Для каждого типа капчи проверяется, что класс задачи сериализуется в тело запроса ровно по контракту API, и что `solve()` возвращает ожидаемую форму решения.

Общее для всех типов сериализации:
- поле `type` соответствует типу задачи API (`RecaptchaV2TaskProxyless`, `TurnstileTask` и т.д.);
- обязательные поля попадают в `toDict()`;
- `null`/`undefined` поля **вырезаются** и не уходят в запрос;
- прокси-варианты классов добавляют `proxyType`/`proxyAddress`/`proxyPort`/`proxyLogin`/`proxyPassword`.

| Файл | Тестов (sync / async) | Что специфичного проверяется |
|---|---|---|
| `recaptcha_v2.test.js` | 6 / 1 | имена полей `recaptchaDataSValue` и `apiDomain` (а не `dataSValue`); `isInvisible`, `userAgent`; прокси-вариант. `solve()` проходит через промежуточный `status: 'processing'` — ровно 3 запроса |
| `recaptcha_v2_enterprise.test.js` | 4 / 1 | `enterprisePayload` как объект, `isInvisible`; точное совпадение `toDict()` для минимального набора полей |
| `recaptcha_v3.test.js` | 4 / 1 | `minScore` обязателен — без него конструктор кидает `ValidationError`; `pageAction`, `apiDomain` |
| `turnstile.test.js` | 4 / 1 | имена полей `data` и `pageData` (а не `cData`) |
| `geetest.test.js` | 6 / 2 | v3: `gt` + `challenge`, поле `version` отсутствует. v4: `version: 4` + `initParameters`. Плюс `geetestApiServerSubdomain`. `solve()` тестируется отдельно для v3 и v4 — у них разная форма решения |
| `yandex_smartcaptcha.test.js` | 4 / 1 | `userAgent`, `cookies`; прокси-вариант |
| `tencent.test.js` | 4 / 1 | `appId`, опциональный `captchaScript` |
| `image_to_text.test.js` | 3 / 1 | параметр конструктора `case_` сериализуется в поле `case` (обход зарезервированного слова); `numeric`, `phrase`, `minLength`/`maxLength`, `comment`, `imgInstructions` |
| `coordinates.test.js` | 5 / 1 | варианты `imgType`: `smart_captcha` (Yandex) и `pazl_smart_captcha`; `imgInstructions`; лимиты `minClicks`/`maxClicks` |

Форма решения, ожидаемая в `solve()`, отличается по типам: `gRecaptchaResponse` (reCAPTCHA), `token` (Turnstile, Yandex), `text` (ImageToText), `coordinates` (Coordinates), `challenge`/`validate`/`seccode` (GeeTest v3), `captcha_output` и др. (GeeTest v4), `ticket`/`randstr` (Tencent).

### Контракт публичного API

`tests/unit/public-api.test.js` — 7 тестов, охраняющих карту `exports` из [package.json](../package.json):

```json
"exports": {
  ".":            "./src/index.js",
  "./tasks":      "./src/tasks.js",
  "./exceptions": "./src/exceptions.js"
}
```

Остальные тесты уже импортируют пакет по имени, поэтому сломанный главный вход уронит всю сюиту сам по себе. Этот файл закрывает то, что иначе осталось бы непроверенным:

| Тест | Что проверяет |
|---|---|
| `exposes the client, the task namespace and every error class` | из `.` доступны `CaptchaClient`, `Tasks` и все 5 классов ошибок |
| `Tasks namespace exposes every task class` | в `Tasks` присутствуют все 16 классов задач |
| `__version__ matches the version in package.json` | `__version__` не разошёлся с `version` при релизе |
| `"captcha-sdk/tasks" exposes every task class` | подпуть `./tasks` резолвится и отдаёт все классы |
| `"captcha-sdk/exceptions" exposes every error class` | подпуть `./exceptions` резолвится и отдаёт все классы |
| `subpaths and the main entry expose the same classes` | это **те же самые** объекты, а не дубликаты модуля — иначе `instanceof` ломался бы у тех, кто смешивает способы импорта |
| `internal modules are not reachable as subpaths` | `captcha-sdk/client` отвергается: файл существует, но в `exports` не заявлен и должен остаться приватным |

Список классов в тесте задан явными массивами, а не выведен из самого модуля. Это намеренно: сравнение экспорта с самим собой всегда проходит и ничего не проверяет. При добавлении нового типа капчи массив нужно дополнить руками — это и есть точка, где решение «сделать класс публичным» фиксируется явно.

## Integration-тесты

Единственный набор, который ходит в реальный API `https://api.captcha-solver.com`. Один файл на проверку:

| Файл | Что проверяет | Переменные цели | Таймаут теста | Тратит баланс |
|---|---|---|---|---|
| `balance.test.js` | баланс аккаунта | — | 15 с | нет |
| `image_to_text.test.js` | распознавание текста на картинке | `IMAGE_TO_TEXT_BASE64` | 130 с | **да** |
| `recaptcha_v2.test.js` | `gRecaptchaResponse` | `RECAPTCHA_V2_URL`, `RECAPTCHA_V2_SITE_KEY` | 130 с | **да** |
| `recaptcha_v3.test.js` | `gRecaptchaResponse` при `minScore: 0.3` | `RECAPTCHA_V3_URL`, `RECAPTCHA_V3_SITE_KEY` | 190 с | **да** |
| `turnstile.test.js` | `token` | `TURNSTILE_URL`, `TURNSTILE_SITE_KEY` | 130 с | **да** |
| `geetest_v4.test.js` | `captcha_output`, `lot_number`, `pass_token` | `GEETEST_V4_URL`, `GEETEST_V4_CAPTCHA_ID` | 310 с | **да** |
| `yandex_smartcaptcha.test.js` | `token` | `YANDEX_SMARTCAPTCHA_URL`, `YANDEX_SMARTCAPTCHA_SITE_KEY` | 130 с | **да** |
| `tencent.test.js` | `ticket`, `randstr` | `TENCENT_URL`, `TENCENT_APP_ID` | 130 с | **да** |

Разбиение идёт **по цене, а не по типу капчи**. `balance.test.js` ничего не стоит и ни от чего не зависит, поэтому годится как smoke-тест «ключ жив, сеть есть»:

```bash
npm test -- tests/integration/balance.test.js
```

Всё остальное вызывает `solve()` и списывает деньги с аккаунта при каждом прогоне. Поэтому эти тесты и запускаются выборочно, по одному файлу, а не всем набором.

### Почему в репозитории нет ни одной цели

Ни одного URL реальной страницы и ни одного sitekey в коде нет — **намеренно**. Всё берётся из переменных окружения, дефолтов не предусмотрено. Раньше `recaptcha_v2.test.js` подставлял демо-страницу Google, а `.env.example` содержал рабочие ключи для reCAPTCHA, Turnstile и GeeTest — это убрано.

Практическое следствие: **у свежего клона нет ни одной работающей интеграционной проверки, кроме баланса**. Это цена решения, а не недоработка. Свои цели пропишите в `.env` (он в `.gitignore`), шаблон с именами переменных — в [.env.example](../.env.example).

Исключение — `image_to_text.test.js`: ему не нужны ни страница, ни sitekey, только картинка. В `.env.example` лежит готовая base64-строка, поэтому он работает из коробки.

### Чего здесь нет

- **GeeTest v3.** Ему нужен свежий `challenge`, привязанный к сессии и добываемый с целевой страницы непосредственно перед созданием задачи. Из статической конфигурации это не заводится — потребовался бы скрапер, как в [examples/async/geetest_v3.js](../examples/async/geetest_v3.js).
- **Coordinates.** Нужны две картинки — сама капча и инструкция; см. раздел про изображения в [todo.md](../todo.md).
- **Варианты с прокси и reCAPTCHA v2 Enterprise.** Требуют рабочего прокси и сайта с Enterprise-виджетом соответственно.
- **Cloudflare Challenge pages** в `turnstile.test.js` — покрыт только обычный виджет. Challenge-страницы требуют свежих `action`, `data` и `pageData`, вытащенных со страницы.

### Общий хелпер

`tests/integration/helpers.js` — не тест: суффикса `.test.js` нет, поэтому дефолтный `testMatch` его не подхватывает. В нём то, что иначе копировалось бы в каждый файл:

| Экспорт | Зачем |
|---|---|
| `apiKey` | `process.env.CAPTCHA_API_KEY` в одном месте |
| `describeIntegration(name, fn)` | `describe` при наличии ключа, `describe.skip` без него |
| `describeTarget(name, vars, fn)` | то же плюс проверка переменных цели; отдаёт их значения в колбэк |
| `createClient(options)` | клиент с ключом из окружения, свой на каждый тест; `options` — для медленных типов |

Файл также подключает `dotenv/config`, поэтому `.env` читается автоматически — иначе для локального прогона пришлось бы экспортировать десяток переменных руками. Значения, уже заданные в окружении, dotenv не перезаписывает, так что переданное в командной строке или из CI по-прежнему имеет приоритет. Unit-тесты этот файл не импортируют и остаются без dotenv.

### Как включаются

Сьют пропускает сам себя, если нет `CAPTCHA_API_KEY` **или** не заданы переменные его цели. Пропуск идёт на уровне `describe`, поэтому в выводе он виден честно:

```
Test Suites: 8 skipped, 0 of 8 total
Tests:       8 skipped, 8 total
```

Раньше гард стоял внутри каждого теста (`if (!apiKey) return;`), и прогон без ключа показывал зелёные `passed` для тестов, которые не сделали ни одного запроса. Пропуск на уровне сьюта убирает это враньё: `skipped` — это `skipped`.

Обратите внимание: прогон всё равно завершается **успешно**, просто ничего не проверив. Для CI этого мало, поэтому в workflow есть отдельный шаг-предохранитель — см. [CI / пайплайн](#ci--пайплайн).

Необязательные переменные, уточняющие поведение:

| Переменная | Для чего |
|---|---|
| `RECAPTCHA_V3_PAGE_ACTION` | action, который сайт передаёт в `grecaptcha.execute()` — без совпадения сайт занижает оценку токена |
| `TENCENT_CAPTCHA_SCRIPT` | если сайт грузит виджет с нестандартного URL скрипта |
| `IMAGE_TO_TEXT_EXPECTED` | текст на вашей картинке; без него тест проверяет лишь то, что ответ непустой |

## Ручной запуск

Один раз перед всем:

```bash
npm install
```

### Все тесты

```bash
npm test
```

Запускает и unit-, и integration-тесты (последние — в режиме пропуска, если нет ключа).

### Только unit-тесты

```bash
npm run test:unit
```

Ничего не требует: ни сети, ни ключа. Прогон занимает ~7 секунд, ожидаемый результат — `21 passed, 81 tests`.

### Только integration-тесты

Самый удобный способ — завести `.env` в корне проекта (он в `.gitignore`, шаблон — [.env.example](../.env.example)). Хелпер подключает dotenv, поэтому переменные подхватятся сами:

```bash
cp .env.example .env    # заполнить ключ и нужные цели
npm run test:integration
```

Можно и через окружение — оно имеет приоритет над `.env`.

PowerShell:

```powershell
$env:CAPTCHA_API_KEY = "ваш_ключ"
npm run test:integration
```

bash / cmd:

```bash
CAPTCHA_API_KEY=ваш_ключ npm run test:integration
```

**Запускать весь набор разом обычно не нужно** — это семь платных задач за прогон. Гоняйте по одному файлу:

```bash
# бесплатно: ключ и сеть
npm test -- tests/integration/balance.test.js

# одна платная проверка
npm test -- tests/integration/turnstile.test.js
```

Сьюты без настроенных переменных пропустятся, так что заполнять `.env` целиком не обязательно — только те типы, которые сейчас проверяете.

### Отдельный файл или отдельный тест

Аргументы после `--` пробрасываются в Jest:

```bash
# один файл
npm test -- tests/unit/sync/geetest.test.js

# все тесты одного каталога
npm test -- tests/unit/async

# один тест по имени
npm test -- -t "getBalance returns balance as float"

# подробный вывод по каждому тесту
npm run test:unit -- --verbose

# режим наблюдения при разработке
npm run test:unit -- --watch

# покрытие
npm run test:unit -- --coverage
```

Можно вызывать Jest и напрямую, но тогда флаг `--experimental-vm-modules` нужно указывать самому:

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/sync/geetest.test.js
```

## Покрытие

```bash
npm run test:unit -- --coverage
```

Текущее состояние:

```
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files      |   97.53 |    83.63 |     100 |    97.5 |
 client.js     |   95.45 |    80.76 |     100 |   95.34 | 35,53
 exceptions.js |     100 |      100 |     100 |     100 |
 index.js      |     100 |      100 |     100 |     100 |
 tasks.js      |     100 |    84.52 |     100 |     100 | 26,38,71-77,89,107
```

Непокрытое — ветка HTTP-ошибки (`!response.ok`) и обработка `AbortError` в `_request()`, плюс часть дефолтных значений параметров в конструкторах задач.

Считается **только по unit-тестам**. Integration в подсчёт не входят намеренно: без ключа они пропускаются, и цифра скакала бы в зависимости от того, был ли доступен `CAPTCHA_API_KEY`.

Два параметра в [jest.config.js](../jest.config.js) важны именно для покрытия:

- `collectCoverageFrom: ['src/**/*.js']` — считать по всем файлам `src/`, а не только по импортированным из тестов. Без этого новый файл, который никто не подключил, молча выпал бы из отчёта вместо того, чтобы показать 0 %. Ровно так до перехода на импорт по имени пакета из отчёта выпадал `src/index.js`, и покрытие выглядело как 97.5 % при полностью непроверенной точке входа.
- `coverageReporters: ['text', 'lcov']` — `text` для вывода в консоль, `lcov` для выгрузки в Coveralls из CI.

Артефакты пишутся в `coverage/` (в `.gitignore`).

Флаг обязателен: SDK — чистый ESM (`"type": "module"`), без него Jest не сможет загрузить модули. Предупреждение `ExperimentalWarning: VM Modules` в выводе — норма.

Требуется Node.js 18+ (см. `engines` в `package.json`): SDK опирается на глобальный `fetch`.

## CI / пайплайн

Конфигурация — [.github/workflows/tests.yml](../.github/workflows/tests.yml). Два джоба:

| Джоб | Команда | Когда запускается | Секреты |
|---|---|---|---|
| `unit` | `npm run test:unit -- --coverage` | push в `main`, любой pull request, расписание, ручной запуск | не нужны |
| `integration` | `npm run test:integration` | **только** по расписанию (ежедневно в 03:00 UTC) и вручную через workflow_dispatch | `CAPTCHA_API_KEY` |

### Почему джобы разделены

- **Unit-тесты — обязательный блокирующий шаг.** Детерминированные, без сети и секретов, ~7 секунд. Безопасны на любом PR, включая форки. Гоняются на матрице Node `18 / 20 / 22` — в соответствии с `engines.node: ">=18"`.
- **Integration-тесты не запускаются на pull request намеренно.** Они тратят реальный баланс аккаунта и зависят от доступности внешнего API. Главное же — в PR из форка секреты недоступны, поэтому тесты пропустили бы сами себя и дали **ложно-зелёный** результат вместо честного «не проверено».

### Что ночной прогон проверяет на самом деле

Джоб `integration` передаёт в тесты только `CAPTCHA_API_KEY`. Переменных цели у него нет, поэтому **фактически проверяется лишь `balance.test.js`**, а все семь solve-сьютов пропускаются. Раньше `recaptcha_v2.test.js` работал за счёт зашитой демо-страницы Google — после отказа от целей в репозитории (см. [выше](#почему-в-репозитории-нет-ни-одной-цели)) это не так.

Это осознанное состояние, а не поломка: гонять платные solve-тесты в CI пока не планируется. Когда понадобится, порядок такой:

1. Завести цели как секреты репозитория — например `RECAPTCHA_V2_URL` и `RECAPTCHA_V2_SITE_KEY`.
2. Пробросить их в шаге `Run integration tests` рядом с `CAPTCHA_API_KEY`.
3. Запускать выборочно — `npm test -- tests/integration/recaptcha_v2.test.js`, а не весь набор, иначе каждая ночь будет стоить семь задач.
4. Дополнить шаг-предохранитель проверкой этих переменных, иначе опечатка в имени секрета обернётся молчаливым пропуском и зелёным джобом.

### Две детали, которые легко упустить

**Покрытие выгружается только с одной версии Node** (`if: matrix.node-version == 20`). Цифра от версии Node не зависит, а три параллельные выгрузки одного и того же отчёта только зашумят историю в Coveralls.

**Джоб `integration` падает явно, если секрет не подставился.** Перед запуском тестов есть шаг-предохранитель:

```yaml
- name: Fail early if the API key is missing
  run: |
    if [ -z "$CAPTCHA_API_KEY" ]; then
      echo "::error::secrets.CAPTCHA_API_KEY is not set -- integration tests would silently skip"
      exit 1
    fi
```

Без него отсутствие ключа выглядело бы как успешный прогон: тесты пропускают себя сами и джоб зеленеет, ничего не проверив. Это ровно тот случай, когда молчаливый пропуск опаснее падения.

### Чего в пайплайне пока нет

- Шага линтинга — линтер в проекте не настроен.
- Публикации в npm.
- Бейджей в README — вынесено в [todo.md](../todo.md) вместе с подключением Coveralls (требует действий в веб-интерфейсе).
