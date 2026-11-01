import test from 'node:test';
import assert from 'node:assert/strict';
import { collectDate } from '../src/collector.js';
const config = {fromCode:'a',toCode:'b',age:30,directOnly:false,pauseMs:0,bookingUrl:'https://jegy.mav.hu/'};
test('failed windows remain failures rather than becoming successful empty searches', async () => {
  const r = await collectDate(async () => {throw new Error('Destination station not found');}, '2026-11-03', config, '2026-11-01T00:00:00Z');
  assert.equal(r.diagnostics.windowsSuccessful,0);
  assert.equal(r.diagnostics.errors.length,3);
  assert.equal(r.best,null);
});
test('partial responses retain fares and expose incomplete coverage',async () => {
  let count=0;
  const journey={legs:[{departure:'2026-11-03T09:00:00+01:00',arrival:'2026-11-03T12:00:00+01:00'}],price:{amount:19,currency:'EUR'}};
  const r=await collectDate(async (...args)=>{assert.equal(args[3].duration,undefined); if(++count===2)throw new Error('timeout');return [journey];},'2026-11-03',config,'2026-11-01T00:00:00Z');
  assert.equal(r.offers.length,1);
  assert.equal(r.diagnostics.windowsSuccessful,2);
  assert.equal(r.diagnostics.errors.length,1);
});
test('25 hour DST day includes the final window',async()=>{
  const r=await collectDate(async()=>[],'2026-10-25',config,'2026-10-01T00:00:00Z');
  assert.equal(r.diagnostics.windowsAttempted,4);
});
test('departed trains are excluded',async()=>{
  const r=await collectDate(async()=>[{legs:[{departure:'2026-11-03T09:00:00+01:00',arrival:'2026-11-03T12:00:00+01:00'}],price:{amount:19,currency:'EUR'}}],'2026-11-03',config,'2026-11-03T10:00:00Z');
  assert.equal(r.offers.length,0);
});
