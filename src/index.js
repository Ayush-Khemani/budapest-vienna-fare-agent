import { collectDate } from './collector.js';
import { readFile } from 'node:fs/promises';
import { notificationReason, sendTelegram } from './notifier.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { datesToScan } from './dates.js';
import { rankOffers } from './normalize.js';
import { makeMarkdown, saveReport } from './report.js';

const sleep = ms => new Promise(ok => setTimeout(ok, ms));

async function main() {
  const dates = datesToScan(config.days, config.startDate);
  const checkedAt = new Date().toISOString();
  let queryPrices;
  if (config.mode === 'live') {
    // Dynamic import makes offline tests and demo possible without MÁV connectivity.
    ({ queryPrices } = await import('mav-prices'));
  }
  let fakeJourneys;
  if (config.mode === 'demo') {
    fakeJourneys = JSON.parse(await readFile(new URL('../tests/fixtures/mav-offers.json',import.meta.url),'utf8'));
    console.warn('DEMO MODE: offers in this report are fictitious!');
  }
  const offers = [], errors = [], daily = [];
  let datesSuccessful = 0;
  for (const [index, date] of dates.entries()) {
    const query = config.mode === 'demo' ? async () => fakeJourneys.map(item => ({...item,
      legs: item.legs.map(leg => ({...leg, departure: leg.departure.replace('2026-11-01',date), arrival: leg.arrival.replace('2026-11-01',date)}))
    })) : queryPrices;
    const result = await collectDate(query, date, config, checkedAt);
    offers.push(...result.offers);
    errors.push(...result.diagnostics.errors);
    daily.push({...result.diagnostics, best: result.best});
    if (result.diagnostics.windowsSuccessful === result.diagnostics.windowsAttempted) datesSuccessful++;
    console.log(`${date}: ${result.offers.length} fares; ${result.diagnostics.windowsSuccessful}/${result.diagnostics.windowsAttempted} windows; ${result.diagnostics.returned} returned, ${result.diagnostics.rejected} filtered`);
    for (const error of result.diagnostics.errors) console.error(`${error.window}: ${error.message}`);
    if (index !== dates.length - 1) await sleep(config.pauseMs);
  }
  const ranked = rankOffers(offers);
  const data = {
    checkedAt, mode:config.mode, route:'Budapest → Vienna',
    parameters:{fromCode:config.fromCode,toCode:config.toCode,class:2,passengers:1,days:config.days},
    thresholdEur:config.thresholdEur, datesAttempted:dates.length, datesSuccessful,
    daily, status: !ranked.length ? 'unavailable' : errors.length ? 'partial' : 'ok',
    best:ranked[0] || null, top:ranked.slice(0,20), totalOffers:ranked.length, errors
  };
  const root = fileURLToPath(new URL('..', import.meta.url));
  // Never use demo results to trigger real notifications or compare against live history.
  if (config.mode === 'live' && data.best) {
    let previousPrice = null;
    try {
      const history = JSON.parse(await readFile(resolve(root,'data','history.json'),'utf8'));
      const previous = Array.isArray(history) ? history.filter(x=>x.mode === 'live' && Number.isFinite(x.amount)).at(-1) : null;
      previousPrice = previous ? previous.amount : null;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const reason = notificationReason(data.best,previousPrice,config.thresholdEur);
    try {
      if (await sendTelegram(data.best, reason)) console.log('Telegram notification delivered.');
    } catch (error) { console.error('Optional Telegram notification failed:',error.message); }
  }
  await saveReport(root,data);
  const markdown = makeMarkdown(data);
  console.log('\n'+markdown);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(process.env.GITHUB_STEP_SUMMARY,markdown+'\n');
  }
  if (!ranked.length) {
    console.error('No valid fares found: failing workflow; see per-window diagnostics.');
    process.exitCode = 1;
  } else if (errors.length) {
    console.warn('PARTIAL COVERAGE: See REPORT.md for failed dates.');
  }
}

main().catch(e => {console.error(e);process.exitCode=1;});
