const numberFromEnv = (key, defaultValue, min, max) => {
  const input = process.env[key];
  const number = input === undefined || input === '' ? defaultValue : Number(input);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}`);
  }
  return number;
};

export const config = {
  fromCode: process.env.FROM_CODE || '005510009', // BUDAPEST* (MÁV station group)
  toCode: process.env.TO_CODE || '008103000', // Wien Hbf
  days: numberFromEnv('SCAN_DAYS', 14, 1, 60),
  pauseMs: numberFromEnv('PAUSE_MS', 1800, 0, 60000),
  thresholdEur: Number(process.env.ALERT_BELOW_EUR ?? 15),
  mode: process.env.DEMO_MODE === '1' ? 'demo' : 'live',
  bookingUrl: 'https://jegy.mav.hu/'
};
if (!Number.isFinite(config.thresholdEur) || config.thresholdEur <= 0) {
  throw new Error('ALERT_BELOW_EUR must be a positive number');
}
