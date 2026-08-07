/**
 * Integration: account balance against the real API.
 *
 * The cheap half of the integration suite. getBalance() spends no balance and
 * needs no target page, so this doubles as a smoke test that the key is valid
 * and the network path to the API works. Run it alone when you want to check
 * that much without paying for a solve:
 *
 *   npm test -- tests/integration/balance.test.js
 *
 * Skipped unless CAPTCHA_API_KEY is set. See helpers.js.
 */

import { describeIntegration, createClient } from './helpers.js';

describeIntegration('getBalance against the real API', () => {
  test('returns the balance as a number', async () => {
    const balance = await createClient().getBalance();

    // The API returns the amount as a string; the SDK is expected to coerce it.
    expect(typeof balance).toBe('number');
  }, 15000);
});
