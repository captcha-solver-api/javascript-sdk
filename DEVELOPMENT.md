# Development and release

## Verify

```bash
npm ci
npm test -- --runInBand
npm pack --dry-run
```

Real API tests require `CAPTCHA_API_KEY` and the target variables documented in `tests/README.md`:

```bash
npm run test:integration -- --runInBand
```

## Publish

1. Confirm that `package.json`, `package-lock.json`, and `src/version.ts` contain the same version.
2. Push `main` to `https://github.com/captcha-solver-api/javascript-sdk`.
3. Add an npm automation token as the `NPM_TOKEN` repository secret.
4. Create and push a matching `v<version>` tag. The tag starts the publish workflow.
5. In a new empty directory, run `npm install @captcha-solver-api/javascript-sdk` and import `CaptchaClient`, `Tasks`, and `__version__`.

A version removed from npm cannot be reused. If npm reports that `1.0.0` existed before, update all three version files to the next unused version before publishing.
