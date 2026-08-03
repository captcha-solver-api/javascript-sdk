/**
 * Example: Get account balance.
 *
 * Prerequisites:
 *   Set the CAPTCHA_API_KEY environment variable.
 *   Returns the current available balance of your account.
 */

import 'dotenv/config';
import { CaptchaClient } from '../../src/index.js';

const apiKey = process.env.CAPTCHA_API_KEY || 'YOUR_API_KEY';

const client = new CaptchaClient({ clientKey: apiKey });

// Get the current account balance.
// Returns a float with the available amount in your account currency.
try {
  const balance = await client.getBalance();
  console.log('Balance:', balance);
} catch (error) {
  console.error(error);
}
