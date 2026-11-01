import { rankOffers } from './normalize.js';

const timeOfDayMinutes = (departure) => {
  const date = new Date(departure);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Budapest', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const hour = Number(parts.find(p => p.type === 'hour')?.value);
  const minute = Number(parts.find(p => p.type === 'minute')?.value);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null;
};

export function isPreferredOffer(offer, prefs) {
  if (!offer || !Number.isFinite(offer.amount) || !offer.departure) return false;
  const time = timeOfDayMinutes(offer.departure);
  if (time === null) return false;
  if (prefs.directOnly !== false && offer.changes !== 0) return false;
  if (prefs.endDate && offer.date > prefs.endDate) return false;
  return time >= (prefs.earlyStartHour ?? 5) * 60 && time < (prefs.earlyEndHour ?? 9) * 60;
}

export function preferredOffers(offers, prefs) {
  return rankOffers(offers.filter(o => isPreferredOffer(o, prefs)));
}
