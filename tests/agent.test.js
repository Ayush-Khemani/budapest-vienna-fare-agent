import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, budapestDate, budapestMidnight, datesToScan } from '../src/dates.js';
import { normalizeJourney, rankOffers } from '../src/normalize.js';
import { makeMarkdown, makeHtml } from '../src/report.js';
import { notificationReason, telegramMessage } from '../src/notifier.js';

const journey = {
  legs:[{origin:{name:'Budapest-Keleti'},destination:{name:'Wien Hbf'},departure:'2026-11-01T07:40:00+01:00',arrival:'2026-11-01T10:20:00+01:00',line:{name:'RJX'}}],
  price:{amount:13,currency:'EUR',name:'START Europa'}
};
const url='https://jegy.mav.hu/';
test('Budapest dates handle month and DST boundary',()=>{
  assert.equal(addDays('2026-10-31',1),'2026-11-01');
  assert.equal(budapestMidnight('2026-11-01').toISOString(),'2026-10-31T23:00:00.000Z');
  assert.equal(budapestMidnight('2026-07-01').toISOString(),'2026-06-30T22:00:00.000Z');
  assert.equal(budapestMidnight('2026-03-29').toISOString(),'2026-03-28T23:00:00.000Z');
  assert.equal(datesToScan(2,'2026-11-01').length,2);
  assert.equal(budapestDate(new Date('2026-11-01T00:01:00Z')),'2026-11-01');
});
test('normalizes price and rejects missing or wrong-day data',()=>{
  const offer=normalizeJourney(journey,'2026-11-01','2026-11-01T12:00:00Z',url);
  assert.equal(offer.amount,13);
  assert.equal(offer.changes,0);
  assert.equal(offer.reservationIncluded,null);
  assert.equal(normalizeJourney(journey,'2026-11-02','now',url),null);
  assert.equal(normalizeJourney({...journey,price:{amount:0,currency:'EUR'}},'2026-11-01','now',url),null);
  assert.equal(normalizeJourney({...journey,price:{amount:10,currency:'HUF'}},'2026-11-01','now',url),null);
});
test('ranks prices, removes duplicate entries',()=>{
  const one=normalizeJourney(journey,'2026-11-01','now',url);
  const two={...one,amount:16,departure:'2026-11-01T09:40:00+01:00'};
  assert.deepEqual(rankOffers([two,one,one]),[one,two]);
});
test('reports never claim to include other provider prices',()=>{
  const best=normalizeJourney(journey,'2026-11-01','now',url);
  const data={checkedAt:'2026-11-01T12:00:00Z',mode:'live',datesAttempted:1,datesSuccessful:1,best,top:[best],thresholdEur:15,errors:[]};
  assert.match(makeMarkdown(data),/unofficial/);
  assert.match(makeHtml(data),/not<\/b> search ÖBB or RegioJet/);
  assert.match(makeMarkdown({...data,mode:'demo'}),/DEMO/);
});

test('notifications only for target on first run or a new low',()=>{
  const best = {amount:13, departure:'2026-11-01T07:40:00+01:00',from:'Budapest',to:'Vienna',bookingUrl:url};
  assert.equal(notificationReason(best,null,15),'First fare at or below your target');
  assert.equal(notificationReason(best,null,10),null);
  assert.equal(notificationReason(best,12,15),null);
  assert.equal(notificationReason(best,14,15),'New lowest observed fare');
  assert.match(telegramMessage(best,'New low'),/€13.00/);
});
