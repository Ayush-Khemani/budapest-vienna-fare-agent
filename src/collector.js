import { addDays, budapestMidnight } from './dates.js';
import { normalizeJourney, rankOffers } from './normalize.js';

export async function collectDate(query, date, config, checkedAt, pause = ms => new Promise(r => setTimeout(r, ms))) {
  const start = budapestMidnight(date).getTime();
  const end = budapestMidnight(addDays(date, 1)).getTime();
  const diagnostics = { date, windowsAttempted: 0, windowsSuccessful: 0, returned: 0, rejected: 0, errors: [] };
  const offers = [];
  // Avoid mav-prices' duration option: it silently discards rejected requests.
  // Elapsed-time windows also cover 23/25-hour daylight-saving days.
  for (let time = start; time < end; time += 8 * 3600000) {
    diagnostics.windowsAttempted++;
    try {
      const journeys = await query(config.fromCode, config.toCode, new Date(time), {
        class: 2, seatReservation: false, directConnection: config.directOnly,
        travellers: [{ age: config.age, discounts: [] }]
      });
      if (!Array.isArray(journeys)) throw new Error('Provider returned a non-array response');
      diagnostics.windowsSuccessful++;
      diagnostics.returned += journeys.length;
      for (const journey of journeys) {
        const offer = normalizeJourney(journey, date, checkedAt, config.bookingUrl);
        if (offer && Date.parse(offer.departure) > Date.parse(checkedAt) && (!config.directOnly || offer.changes === 0)) offers.push(offer);
        else diagnostics.rejected++;
      }
    } catch (error) {
      diagnostics.errors.push({ date, window: new Date(time).toISOString(), message: String(error.message || error).slice(0, 300) });
    }
    if (time + 8 * 3600000 < end) await pause(config.pauseMs);
  }
  const ranked = rankOffers(offers);
  return { offers: ranked, diagnostics, best: ranked[0] ?? null };
}
