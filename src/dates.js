const formatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit'
});

export function budapestDate(value = new Date()) {
  return formatter.format(value);
}

export function addDays(yyyyMmDd, days) {
  const date = new Date(`${yyyyMmDd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Convert local Budapest midnight to a Date, including DST, without process-TZ assumptions.
export function budapestMidnight(yyyyMmDd) {
  const utcMidnight = new Date(`${yyyyMmDd}T00:00:00Z`);
  const zone = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Budapest', timeZoneName: 'shortOffset'
  }).formatToParts(utcMidnight).find(part => part.type === 'timeZoneName')?.value;
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zone || '');
  if (!match) throw new Error(`Cannot resolve Budapest time zone: ${zone}`);
  const minutes = (Number(match[2]) * 60 + Number(match[3] ?? 0)) * (match[1] === '+' ? 1 : -1);
  return new Date(utcMidnight.getTime() - minutes * 60_000);
}

export function datesToScan(days, today = budapestDate()) {
  return Array.from({ length: days }, (_, i) => addDays(today, i));
}
