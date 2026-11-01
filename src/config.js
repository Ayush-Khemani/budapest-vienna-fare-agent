import { budapestDate } from './dates.js';
const numberFromEnv = (key, defaultValue, min, max) => {
  const input = process.env[key];
  const number = input === undefined || input === '' ? defaultValue : Number(input);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}`);
  }
  return number;
};

export const config = {
  startDate: process.env.START_DATE || budapestDate(),
  age: numberFromEnv('PASSENGER_AGE', 30, 1, 99),
  directOnly: process.env.DIRECT_ONLY === 'true',
  fromCode: process.env.FROM_CODE || '005510009', // BUDAPEST* (MÁV station group)
  toCode: process.env.TO_CODE || '008101003', // Wien Hbf
  days: numberFromEnv('SCAN_DAYS', 14, 1, 60),
  pauseMs: numberFromEnv('PAUSE_MS', 1800, 0, 60000),
  thresholdEur: Number(process.env.ALERT_BELOW_EUR ?? 15),
  mode: process.env.DEMO_MODE === '1' ? 'demo' : 'live',
  bookingUrl: 'https://jegy.mav.hu/'
};
if (!Number.isFinite(config.thresholdEur) || config.thresholdEur <= 0) {
  throw new Error('ALERT_BELOW_EUR must be a positive number');
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(config.startDate) || Number.isNaN(Date.parse(config.startDate)) || new Date(config.startDate).toISOString().slice(0,10) !== config.startDate || config.startDate < budapestDate()) throw new Error('START_DATE must be a valid date today or later (YYYY-MM-DD)');
