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

import * as pkg from 'captcha-sdk';
import * as tasksEntry from 'captcha-sdk/tasks';
import * as exceptionsEntry from 'captcha-sdk/exceptions';

const TASK_CLASSES = [
  'BaseTask',
  'GenericTask',
  'RecaptchaV2Proxyless',
  'RecaptchaV2',
  'RecaptchaV2EnterpriseProxyless',
  'RecaptchaV2Enterprise',
  'TurnstileProxyless',
  'Turnstile',
  'GeeTestProxyless',
  'GeeTest',
  'ImageToText',
  'YandexSmartCaptchaTaskProxyless',
  'YandexSmartCaptchaTask',
  'CoordinatesTask',
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

describe('main entry point ("captcha-sdk")', () => {
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
  test('"captcha-sdk/tasks" exposes every task class', () => {
    for (const name of TASK_CLASSES) {
      expect(typeof tasksEntry[name]).toBe('function');
    }
  });

  test('"captcha-sdk/exceptions" exposes every error class', () => {
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
    await expect(import('captcha-sdk/client')).rejects.toThrow();
  });
});
