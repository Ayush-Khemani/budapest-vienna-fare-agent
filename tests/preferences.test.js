import test from 'node:test';
import assert from 'node:assert/strict';
import { isPreferredOffer, preferredOffers } from '../src/preferences.js';
const config = { earlyStartHour:5, earlyEndHour:9, directOnly:true, endDate:'2026-11-08' };
const offer = (departure, amount=20, changes=0) => ({source:'MÁV',date:departure.slice(0,10),departure,arrival:departure.replace('T06:', 'T09:'),fareName:'START',amount,changes});
test('morning filter uses Budapest time, excludes 09:00, stops at end date', () => {
  assert.equal(isPreferredOffer(offer('2026-11-02T06:54:00+01:00'),config),true);
  assert.equal(isPreferredOffer(offer('2026-11-02T08:59:00+01:00'),config),true);
  assert.equal(isPreferredOffer(offer('2026-11-02T09:00:00+01:00'),config),false);
  assert.equal(isPreferredOffer(offer('2026-11-02T20:30:00+01:00',13),config),false);
  assert.equal(isPreferredOffer(offer('2026-11-09T06:30:00+01:00',13),config),false);
  assert.equal(isPreferredOffer(offer('2026-11-02T06:30:00+01:00',18,1),config),false);
});
test('prefer an eligible €20 morning ticket over a €13 evening ticket', () => {
  const options = [offer('2026-11-02T20:30:00+01:00',13),offer('2026-11-02T06:54:00+01:00',20),offer('2026-11-03T06:40:00+01:00',25)];
  const matches = preferredOffers(options,config);
  assert.equal(matches.length,2);
  assert.equal(matches[0].amount,20);
});
