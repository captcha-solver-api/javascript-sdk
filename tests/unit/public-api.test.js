/**
 * Contract tests for the package's public surface.
 *
 * Every other test file imports the SDK by package name, so a broken main
 * entry point would already fail the suite loudly. What those tests do NOT
 * cover is the rest of the "exports" map in package.json: the ./tasks and
 * ./exceptions subpaths, and the fact that undeclared subpaths stay private.
 * That is what this file guards.
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';

import * as pkg from '@captcha-solver-api/javascript-sdk';
import * as tasksEntry from '@captcha-solver-api/javascript-sdk/tasks';
import * as exceptionsEntry from '@captcha-solver-api/javascript-sdk/exceptions';

const TASK_CLASSES = [
  'BaseTask',
  'GenericTask',
  'RecaptchaV2Proxyless',
  'RecaptchaV2',
  'RecaptchaV2EnterpriseProxyless',
  'RecaptchaV2Enterprise',
  'RecaptchaV3Proxyless',
  'TurnstileProxyless',
  'Turnstile',
  'GeeTestProxyless',
  'GeeTest',
  'ImageToText',
  'YandexSmartCaptchaTaskProxyless',
  'YandexSmartCaptchaTask',
  'CoordinatesTask',
  'YandexSmartCaptchaImageTask',
  'TencentTaskProxyless',
  'TencentTask'
];

const ERROR_CLASSES = [
  'CaptchaError',
  'ApiError',
  'NetworkError',
  'TimeoutError',
  'ValidationError'
];

describe('main entry point ("@captcha-solver-api/javascript-sdk")', () => {
  test('exposes the client, the task namespace and every error class', () => {
    expect(typeof pkg.CaptchaClient).toBe('function');
    expect(typeof pkg.Tasks).toBe('object');

    for (const name of ERROR_CLASSES) {
      expect(typeof pkg[name]).toBe('function');
    }
  });

  test('Tasks namespace exposes every task class', () => {
    for (const name of TASK_CLASSES) {
      expect(typeof pkg.Tasks[name]).toBe('function');
    }
  });

  test('__version__ matches the version in package.json', () => {
    const { version } = JSON.parse(
      fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
    );

    expect(pkg.__version__).toBe(version);
  });
});

describe('subpath entry points', () => {
  test('"@captcha-solver-api/javascript-sdk/tasks" exposes every task class', () => {
    for (const name of TASK_CLASSES) {
      expect(typeof tasksEntry[name]).toBe('function');
    }
  });

  test('"@captcha-solver-api/javascript-sdk/exceptions" exposes every error class', () => {
    for (const name of ERROR_CLASSES) {
      expect(typeof exceptionsEntry[name]).toBe('function');
    }
  });

  test('subpaths and the main entry expose the same classes', () => {
    for (const name of TASK_CLASSES) {
      expect(tasksEntry[name]).toBe(pkg.Tasks[name]);
    }
    for (const name of ERROR_CLASSES) {
      expect(exceptionsEntry[name]).toBe(pkg[name]);
    }
  });
});

describe('module privacy', () => {
  test('internal modules are not reachable as subpaths', async () => {
    // Only ".", "./tasks" and "./exceptions" are declared in "exports";
    // ./client must stay private even though the file exists.
    await expect(import('@captcha-solver-api/javascript-sdk/client')).rejects.toThrow();
  });
});

describe('CommonJS build (require)', () => {
  // Every other test imports the ESM build. These guard the .cjs files that
  // "require" consumers get through the "exports" map.
  const require = createRequire(import.meta.url);

  test('main entry exposes the same API as the ESM build', () => {
    const cjs = require('@captcha-solver-api/javascript-sdk');

    expect(Object.keys(cjs).sort()).toEqual(Object.keys(pkg).sort());
    expect(Object.keys(cjs.Tasks).sort()).toEqual(Object.keys(pkg.Tasks).sort());
    expect(cjs.__version__).toBe(pkg.__version__);
  });

  test('"./tasks" and "./exceptions" subpaths expose every class', () => {
    const cjsTasks = require('@captcha-solver-api/javascript-sdk/tasks');
    const cjsExceptions = require('@captcha-solver-api/javascript-sdk/exceptions');

    for (const name of TASK_CLASSES) {
      expect(typeof cjsTasks[name]).toBe('function');
    }
    for (const name of ERROR_CLASSES) {
      expect(typeof cjsExceptions[name]).toBe('function');
    }
  });

  test('the CJS client and tasks are functional', () => {
    const { CaptchaClient, Tasks, ValidationError } = require('@captcha-solver-api/javascript-sdk');

    expect(() => new CaptchaClient({})).toThrow(ValidationError);
    expect(new Tasks.ImageToText({ body: 'base64' }).toDict()).toEqual({
      type: 'ImageToTextTask',
      body: 'base64'
    });
  });
});
