/**
 * Tests for CoordinatesTask task serialization, plus a solve() test in promise-chain style.
 *
 * Imports the SDK by package name on purpose, not by relative path into
 * src/: that is what makes the suite exercise the package's real entry
 * points. See tests/README.md for why. Do not "fix" it to ../../../src/.
 */

import { jest } from '@jest/globals';
import { CaptchaClient, Tasks } from 'captcha-sdk';

describe('CoordinatesTask', () => {
  test('toDict includes body and comment', () => {
    const task = new Tasks.CoordinatesTask({
      body: 'base64string',
      comment: 'click on the green apple'
    });

    const result = task.toDict();
    expect(result.type).toBe('CoordinatesTask');
    expect(result.body).toBe('base64string');
    expect(result.comment).toBe('click on the green apple');
  });


  test('toDict includes click limits when set', () => {
    const task = new Tasks.CoordinatesTask({
      body: 'base64string',
      minClicks: 1,
      maxClicks: 5
    });

    const result = task.toDict();
    expect(result.minClicks).toBe(1);
    expect(result.maxClicks).toBe(5);
  });
});

test('solve', () => {
  const client = new CaptchaClient({ clientKey: 'test_key', pollingInterval: 10 });
  const task = new Tasks.CoordinatesTask({ body: 'base64string', comment: 'click on the green apple' });

  jest.spyOn(client, '_request')
    .mockResolvedValueOnce({ errorId: 0, taskId: 108 })
    .mockResolvedValueOnce({ errorId: 0, status: 'ready', solution: { coordinates: [{ x: 358, y: 268 }] } });

  return client.solve(task).then((result) => {
    expect(result).toEqual({ coordinates: [{ x: 358, y: 268 }] });
  });
});
