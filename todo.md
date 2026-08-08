# TODO

## Бейдж покрытия тестами в README

**Статус:** отложено. Вся техническая подготовка сделана — осталось только то, что требует действий в веб-интерфейсе.

### Что уже готово

- [x] `jest.config.js` с `collectCoverageFrom: ['src/**/*.js']` — покрытие считается по всем файлам `src/`, а не только по импортированным из тестов.
- [x] Тесты импортируют SDK по имени пакета (`captcha-sdk`), а не по прямым путям к файлам — покрытие отражает реальный публичный API.
- [x] `tests/unit/public-api.test.js` — проверка контракта всех трёх точек входа из `exports`.
- [x] CI-workflow `.github/workflows/tests.yml` — прогоняет unit-тесты и выгружает `coverage/lcov.info` в Coveralls.

### Что осталось сделать

- [ ] **Подключить репозиторий к Coveralls.** Зайти на [coveralls.io](https://coveralls.io), авторизоваться через GitHub, включить репозиторий `captcha-solver-api/javascript-sdk` в списке. Отдельный секрет не нужен — GitHub Action использует встроенный `GITHUB_TOKEN`.
- [ ] **Дождаться первого прогона CI на `main`.** До него бейдж будет отдавать `unknown`.
- [ ] **Добавить бейджи в начало `README.md`** (сразу под заголовком, перед описанием):

  ```markdown
  [![Tests](https://github.com/captcha-solver-api/javascript-sdk/actions/workflows/tests.yml/badge.svg)](https://github.com/captcha-solver-api/javascript-sdk/actions/workflows/tests.yml)
  [![Coverage Status](https://coveralls.io/repos/github/captcha-solver-api/javascript-sdk/badge.svg?branch=main)](https://coveralls.io/github/captcha-solver-api/javascript-sdk?branch=main)
  ```

### Чем заблокировано

**Репозиторий сейчас приватный, а бесплатный план Coveralls работает только с публичными.** Приватные не показываются в списке — при попытке подключить сервис отвечает `No repos found`, а выгрузка из CI падает с `Couldn't find a repository matching this job`.

Ждём, когда репозиторий станет публичным. После этого настройка заработает как есть, переписывать ничего не нужно.

До тех пор шаг выгрузки в workflow тихо отваливается и джоб не роняет — за это отвечает `fail-on-error: false`.

Если решение сделать репозиторий публичным изменится, вариантов два: платный план Coveralls либо генерация бейджа локально через `istanbul-badges-readme` (без внешнего сервиса; чтобы бейдж не устаревал, в CI регенерировать его и падать по `git diff --exit-code README.md`).

### Почему Coveralls, а не Codecov

Для GitHub Actions Coveralls не требует отдельного секрета — хватает встроенного `GITHUB_TOKEN`. Codecov с 2024 года требует токен даже для публичных репозиториев, а такой секрет всё равно не будет доступен в PR из форков — то есть для внешних контрибьюторов выгрузка покрытия будет молча ломаться.

### На что обратить внимание

Покрытие считается **только по unit-тестам** (`npm run test:unit`). Integration-тесты в подсчёт не входят намеренно: без `CAPTCHA_API_KEY` они пропускаются, и цифра покрытия скакала бы в зависимости от того, был ли доступен ключ.

---

## Изображения для примеров с картинками

**Статус:** основное сделано. Все четыре примера запускаются из коробки — нужен только ключ. Осталось добавить две картинки-инструкции и раскомментировать три блока, которые их ждут.

### В чём была проблема

`image_to_text.js` и `coordinates.js` (в обоих каталогах, `async/` и `sync/`) начинали работу с чтения картинки, которой в репозитории не было, и падали с `ENOENT` на первой же строке — ещё до обращения к API. Хуже того, путь был передан как `./captcha.png` и резолвился **относительно рабочего каталога** (`process.cwd()`), а не относительно файла скрипта: положить картинки рядом со скриптами было бы недостаточно, `node examples/async/coordinates.js` из корня репозитория всё равно искал бы их в корне.

Что читается сейчас:

| Файл | Основная картинка | Картинка-инструкция (`imgInstructions`) |
|---|---|---|
| `examples/*/image_to_text.js` | `../assets/text-captcha.png` — **есть** | `../assets/text-captcha-hint.png` — нет, блок *Advanced* закомментирован |
| `examples/*/coordinates.js` | `../assets/coordinates-captcha.png` — **есть** | `../assets/coordinates-captcha-instruction.png` — нет, блоки *Advanced* и *Yandex* закомментированы |

### Что сделать

- [x] **Завести `examples/assets/`** — рядом с тем, что картинки использует. Корневой `assets/` занят баннером репозитория, мешать одно с другим не стоит. Имена — kebab-case, как у `assets/repo-banner-javascript.png`, и по типу капчи, а не по имени примера.
- [x] **Текстовая капча** — `examples/assets/text-captcha.png`. Её же читает `tests/integration/image_to_text.test.js`: одна копия на примеры и тесты, дублировать бинарник в `tests/` не нужно.
- [x] **Кликовая капча** — `examples/assets/coordinates-captcha.png`, её читает `tests/integration/coordinates.test.js`.
- [x] **Поправить пути в четырёх файлах**, чтобы они не зависели от рабочего каталога:

  ```javascript
  const body = fs.readFileSync(new URL('../assets/text-captcha.png', import.meta.url)).toString('base64');
  ```

  `new URL(..., import.meta.url)` работает начиная с Node 14 и подходит под `engines.node: ">=18"`. Вариант с `import.meta.dirname` требует Node 20.11+ и планку по Node поднимет.
- [x] **Подсказки в `image_to_text.js` подогнаны под картинку.** Было `numeric: 1` (только цифры) при буквенной капче — воркеру уходила заведомо ложная подсказка. Стало `numeric: 2` (буквы), в обоих блоках, где эти поля есть.
- [x] **`comment` в `coordinates.js`** — `'click on all squares with street signs'` вместо `'click on the green apple'`: повторяет инструкцию, напечатанную на самой картинке.
- [x] **Обновлены [examples/README.md](examples/README.md), [examples/sync/README.md](examples/sync/README.md), [examples/async/README.md](examples/async/README.md).** Раздел «Before you run», описания обоих примеров и оговорки про рабочий каталог.
- [ ] **Добавить две картинки-инструкции:** `text-captcha-hint.png` (к текстовой) и `coordinates-captcha-instruction.png` (к кликовой) — и раскомментировать три блока, которые их ждут: *Advanced* в `image_to_text.js`, *Advanced* и *Yandex SmartCaptcha image mode* в `coordinates.js`. Тогда же можно будет покрыть режим `imgType: 'smart_captcha'` в `tests/integration/coordinates.test.js`.
- [ ] **Заодно решить, что делать с блоком *Advanced* в `image_to_text.js`.** Он подписан как математическая капча (`math: true`), а `text-captcha.png` — буквенная. Либо третья картинка с примером-уравнением, либо переписать блок под ту же картинку.

### Отвергнутая альтернатива: base64 в `.env.example`

Раньше картинка для теста передавалась строкой `IMAGE_TO_TEXT_BASE64` из `.env.example`, и примеры могли бы брать `body` оттуда же — без бинарников в репозитории. Не годится по двум причинам.

Во-первых, лежавшая там строка была валидным PNG, но размером 26×26 пикселей: распознавать в ней нечего, и `image_to_text.test.js` стабильно падал с `ERROR_CAPTCHA_UNSOLVABLE`, тратя баланс. Переменная убрана вместе со строкой.

Во-вторых, для `coordinates.js` это не работает в принципе: там нужны две картинки, и пришлось бы добавлять ещё две длинные base64-строки, что читаемости файлу не добавит.

### На что обратить внимание

`examples/` и `assets/` целиком исключены из публикуемого пакета в [.npmignore](.npmignore), а `files: ["src/"]` в `package.json` и так работает как белый список. Так что вес картинок на размер npm-тарбола не повлияет — только на размер клона репозитория.

---

## Идеи на будущее (не приоритет)

- [ ] `coverageThreshold` в `jest.config.js` — чтобы CI падал при просадке покрытия ниже порога. Имеет смысл включать после того, как бейдж заработает и станет понятен реальный базовый уровень.
- [ ] Линтер (ESLint) — сейчас в проекте не настроен, в CI отдельного шага линтинга нет.
- [ ] Тест на содержимое публикуемого пакета (`npm pack`) — проверить, что в тарбол попадает всё нужное из `files: ["src/"]`.
- [ ] agent.md

---
Добавление метаданных по идентификации библиотек и примеров

---
нет подсказок для методов решения капч и других методов
---
а почему нету option примеров ?
---