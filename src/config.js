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
  age: numberFromEnv('PASSENGER_AGE', 22, 1, 99),
  directOnly: process.env.DIRECT_ONLY !== 'false',
  earlyStartHour: numberFromEnv('EARLY_START_HOUR', 5, 0, 23),
  earlyEndHour: numberFromEnv('EARLY_END_HOUR', 9, 1, 24),
  endDate: process.env.END_DATE || null,
  fromCode: process.env.FROM_CODE || '005510009', // BUDAPEST* (MÁV station group)
  toCode: process.env.TO_CODE || '008101003', // Wien Hbf
  days: numberFromEnv('SCAN_DAYS', 14, 1, 60),
  pauseMs: numberFromEnv('PAUSE_MS', 1800, 0, 60000),
  thresholdEur: Number(process.env.ALERT_BELOW_EUR ?? 25),
  mode: process.env.DEMO_MODE === '1' ? 'demo' : 'live',
  bookingUrl: 'https://jegy.mav.hu/'
};
if (config.earlyStartHour >= config.earlyEndHour) throw new Error('EARLY_START_HOUR must be before EARLY_END_HOUR');
if (config.endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(config.endDate) || Number.isNaN(Date.parse(config.endDate)) || new Date(config.endDate).toISOString().slice(0,10) !== config.endDate)) throw new Error('END_DATE must be a valid YYYY-MM-DD date');
if (!Number.isFinite(config.thresholdEur) || config.thresholdEur <= 0) {
  throw new Error('ALERT_BELOW_EUR must be a positive number');
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(config.startDate) || Number.isNaN(Date.parse(config.startDate)) || new Date(config.startDate).toISOString().slice(0,10) !== config.startDate || config.startDate < budapestDate()) throw new Error('START_DATE must be a valid date today or later (YYYY-MM-DD)');
