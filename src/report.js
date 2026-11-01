import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const safe = text => String(text ?? '').replaceAll('&', '&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'", '&#39;');
const localFormat = iso => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Budapest', dateStyle: 'medium', timeStyle: 'short'
}).format(new Date(iso));
const euro = amount => `€${Number(amount).toFixed(2)}`;

export function makeMarkdown(data) {
  const lines = [
    '# Budapest → Vienna fare check',
    `Checked: ${data.checkedAt} · Mode: **${data.mode.toUpperCase()}** · Coverage: ${data.datesAttempted} day(s), ${data.datesSuccessful} query day(s)`,
    `**Provider:** MÁV pricing interface (via the unofficial \`mav-prices\` package). ÖBB/RegioJet not integrated.`,
    ''
  ];
  if (data.best) {
    const b=data.best;
    lines.push(`**Lowest observed MÁV fare: ${euro(b.amount)}** · ${b.date} · ${localFormat(b.departure)} → ${localFormat(b.arrival)} · ${b.from} → ${b.to}`, '',
      `Book / verify: ${b.bookingUrl}`, '',
      `Alert threshold: ${euro(data.thresholdEur)} — ${b.amount <= data.thresholdEur ? '**MATCH**' : 'not met'}`, '',
      '| Date | Departure (Budapest time) | Arrival | Price | Changes |', '|---|---|---|---:|---:|');
    for (const item of data.top) lines.push(`| ${item.date} | ${localFormat(item.departure)} | ${localFormat(item.arrival)} | ${euro(item.amount)} | ${item.changes} |`);
  } else {
    lines.push('**No verified offers returned.** Do not interpret this as sold out or free travel.');
  }
  if (data.daily) {
    lines.push('', '## Daily coverage', '', '| Date | Lowest fare | Windows checked | Returned / filtered |', '|---|---:|---:|---:|');
    for (const day of data.daily) lines.push(`| ${day.date} | ${day.best ? euro(day.best.amount) : 'Unavailable'} | ${day.windowsSuccessful}/${day.windowsAttempted} | ${day.returned} / ${day.rejected} |`);
  }
  if (data.errors.length) lines.push('', ...data.errors.map(e => `- ${e.window || e.date}: ${String(e.message).replaceAll('\n', ' ')}`));
  if (data.errors.length) lines.push('', `Failed dates: ${data.errors.map(e=>e.date).join(', ')}. Results are incomplete.`);
  lines.push('', '> These are quotes from an unofficial interface, not confirmed availability until checkout. Seat reservation, payment conversion, and optional fees may change the final total. Demo results are fictitious.', '');
  return lines.join('\n');
}

export function makeHtml(data) {
  const best = data.best;
  const rows = data.top.map(o => `<tr><td>${safe(o.date)}</td><td>${safe(localFormat(o.departure))}</td><td>${safe(localFormat(o.arrival))}</td><td class="price">${safe(euro(o.amount))}</td><td>${safe(o.changes)}</td><td><a href="${safe(o.bookingUrl)}" target="_blank" rel="noopener noreferrer">Check MÁV ↗</a></td></tr>`).join('\n');
  const unavailable = !best ? '<p class="notice">No verifiable fares found on this run. Check the workflow logs for errors.</p>' : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Budapest → Vienna | Fare Agent</title>
<style>body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;background:#0c1423;color:#eaf1fb;margin:0}main{max-width:1020px;margin:auto;padding:40px 20px}header{border-bottom:1px solid #334155;padding-bottom:18px}h1{font-size:clamp(1.9rem,5vw,3rem);margin:0}.muted{color:#9fb1ca}.hero{margin:26px 0;padding:24px;background:#18253b;border:1px solid #31425c;border-radius:18px}.hero strong{font-size:clamp(2.5rem,7vw,4.5rem);display:block;color:#91ffca}.hero small{color:#a9b8d1}table{width:100%;border-collapse:collapse;background:#172337}td,th{text-align:left;padding:14px;border-bottom:1px solid #31425c}th{color:#bdc9da;font-size:.85rem}.scroll{overflow-x:auto;border-radius:14px}a{color:#88c7ff}.price{font-weight:bold}.notice{color:#ffd18a}.pill{display:inline-block;background:#263852;color:#d5e6ff;border-radius:99px;padding:6px 12px;font-size:.8rem}footer{font-size:.85rem;line-height:1.6;margin-top:26px;color:#a4b1c5}</style></head>
<body><main><header><span class="pill">GitHub Actions · ${safe(data.mode.toUpperCase())}</span><h1>Budapest → Vienna</h1><p class="muted">Daily train fare tracker · 2nd class · one adult · one-way</p></header>
<section class="hero"><span class="muted">Lowest observed MÁV fare</span><strong>${best ? safe(euro(best.amount)) : 'Unavailable'}</strong><p>${best ? safe(`${best.date} · ${localFormat(best.departure)} → ${localFormat(best.arrival)} · ${best.from} → ${best.to}`) : 'No successful offer in this run'}</p>${best ? `<p><a href="${safe(best.bookingUrl)}" target="_blank" rel="noopener noreferrer">Verify fare and book with MÁV ↗</a></p>` : ''}<small>Checked ${safe(data.checkedAt)} · ${safe(data.datesSuccessful)}/${safe(data.datesAttempted)} dates successfully searched · Lowest price only within MÁV offers, not every rail operator</small></section>
${unavailable}<h2>Daily coverage</h2><div class="scroll"><table><thead><tr><th>Date</th><th>Lowest fare</th><th>Windows checked</th></tr></thead><tbody>${(data.daily || []).map(d => `<tr><td>${safe(d.date)}</td><td>${d.best ? safe(euro(d.best.amount)) : 'Unavailable'}</td><td>${safe(d.windowsSuccessful)}/${safe(d.windowsAttempted)}</td></tr>`).join('')}</tbody></table></div><h2>Lowest offers</h2><div class="scroll"><table><thead><tr><th>Date</th><th>Departure</th><th>Arrival</th><th>Fare</th><th>Changes</th><th>Booking</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No offers</td></tr>'}</tbody></table></div>
<footer><p><b>Important:</b> The agent uses the unofficial open-source <code>mav-prices</code> library. Fares may change before checkout; seat reservations and any payment conversion or service fees are not guaranteed in the quoted price. Live price coverage can fail when MÁV changes its interface. The current agent does <b>not</b> search ÖBB or RegioJet.</p><p>Errors: ${safe(data.errors.map(x=>x.date).join(', ') || 'none')} · ${safe(data.mode === 'demo' ? 'DEMO — entirely fictitious prices' : 'LIVE — retrieved fare quotes')}</p></footer></main></body></html>`;
}

export async function saveReport(root, data) {
  await mkdir(join(root,'data'), {recursive:true});
  await mkdir(join(root,'docs'), {recursive:true});
  const historyPath=join(root,'data','history.json');
  let history = [];
  try { const parsed=JSON.parse(await readFile(historyPath,'utf8')); if(Array.isArray(parsed)) history=parsed; } catch (error) { if(error.code !== 'ENOENT') throw error; }
  history.push({checkedAt:data.checkedAt, mode:data.mode, amount:data.best?.amount ?? null, date:data.best?.date ?? null, scanned:data.datesAttempted, successful:data.datesSuccessful});
  history = history.slice(-120);
  await writeFile(historyPath, JSON.stringify(history,null,2)+'\n');
  await writeFile(join(root,'data','latest.json'),JSON.stringify(data,null,2)+'\n');
  await writeFile(join(root,'docs','index.html'),makeHtml(data));
  await writeFile(join(root,'REPORT.md'),makeMarkdown(data));
}
