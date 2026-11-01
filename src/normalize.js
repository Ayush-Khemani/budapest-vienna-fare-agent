import { budapestDate } from './dates.js';

export function normalizeJourney(journey, scannedDate, checkedAt, bookingUrl) {
  const legs = journey?.legs;
  if (!Array.isArray(legs) || legs.length === 0) return null;
  const first = legs[0], last = legs.at(-1);
  const departure = first?.departure;
  const arrival = last?.arrival;
  const amount = Number(journey?.price?.amount);
  const currency = journey?.price?.currency;
  if (!departure || !arrival || !Number.isFinite(amount) || amount <= 0 || currency !== 'EUR') return null;
  if (Number.isNaN(Date.parse(departure)) || Number.isNaN(Date.parse(arrival))) return null;
  if (budapestDate(new Date(departure)) !== scannedDate) return null;

  return {
    source: 'MÁV via mav-prices (unofficial API)',
    checkedAt,
    date: scannedDate,
    departure,
    arrival,
    from: first.origin?.name || 'Budapest',
    to: last.destination?.name || 'Vienna',
    fareName: journey.price?.name || 'MÁV offer',
    amount: Math.round(amount * 100) / 100,
    currency,
    changes: Math.max(0, legs.length - 1),
    trains: legs.map(leg => leg.line?.name).filter(Boolean),
    bookingUrl,
    reservationIncluded: null // Do not assert the presence or price of a seat reservation.
  };
}

export function rankOffers(offers) {
  const unique = new Map();
  for (const offer of offers) {
    const key = [offer.source, offer.departure, offer.arrival, offer.fareName, offer.amount].join('|');
    unique.set(key, offer);
  }
  return [...unique.values()].sort((a,b) =>
    a.amount - b.amount || a.departure.localeCompare(b.departure)
  );
}
