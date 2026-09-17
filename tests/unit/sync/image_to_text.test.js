/**
 * Tests for ImageToText task serialization, plus a solve() test in
 * promise-chain style.
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../../src/.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from '@captcha-solver-api/javascript-sdk';

describe('ImageToText', () => {
  test('toDict includes basic fields', () => {
    const task = new Tasks.ImageToText({
      body: 'base64string',
      numeric: 1,
      minLength: 4,
      maxLength: 6
    });

    const result = task.toDict();
    expect(result.body).toBe('base64string');
    expect(result.numeric).toBe(1);
  });

  test('toDict includes all fields when set', () => {
    const task = new Tasks.ImageToText({
      body: 'base64string',
      numeric: 1,
      minLength: 4,
      maxLength: 6,
      case_: true,
      phrase: true,
      comment: 'enter the text you see',
      imgInstructions: 'instructions_base64'
    });

    const result = task.toDict();
    expect(result.type).toBe('ImageToTextTask');
    expect(result.body).toBe('base64string');
    expect(result.numeric).toBe(1);
    expect(result.minLength).toBe(4);
    expect(result.maxLength).toBe(6);
    expect(result.case).toBe(true);
    expect(result.phrase).toBe(true);
    expect(result.comment).toBe('enter the text you see');
    expect(result.imgInstructions).toBe('instructions_base64');
  });
});

test('solve', () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.ImageToText({ body: 'base64string', numeric: 1, minLength: 4, maxLength: 6 });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 104 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { text: 'aB3fX9' } });

  return client.solve(task).then((result) => {
    expect(result).toEqual({ text: 'aB3fX9' });
  });
});
