const day = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const s = value.slice(0, 10);
  return Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s ? s : null;
};
const shift = (s, n) => new Date(Date.parse(s) + n * 86400000).toISOString().slice(0, 10);
const clockDay = r => ['achievedAt', 'recordDate', 'submittedAt', 'evidencePublishedAt', 'videoPublishedAt', 'observedAt', 'announcedAt', 'proofUploadedAt'].map(f => day(r[f])).find(Boolean);
const sheetGroup = r => r.source?.range?.match(/^[A-Z]+/)?.[0];
function messageDay(source) {
  const id = source?.messageId || source?.url?.match(/discord\.com\/channels\/\d+\/\d+\/(\d+)/)?.[1];
  if (!/^\d{17,20}$/.test(id || '')) return null;
  const s = new Date(Number((BigInt(id) >> 22n) + 1420070400000n)).toISOString().slice(0, 10);
  return s >= '2019-09-25' && s <= '2026-12-31' ? s : null;
}
export function resolveFinalDate(r, course = {}, records = []) {
  const range = r.tourDateRange;
  const before = records.find(n => n.id === r.relativeOrderBefore);
  if (r.dateUnresolved && r.proofField === 'previous-best' && before) {
    const next = day(before.finalDate || before.recordDate || before.chronologyDate || before.submittedAt || before.announcedAt);
    if (next) return {date: [range?.start, shift(next, -1)].filter(Boolean).sort().at(-1), basis: 'estimated-predecessor-day', estimated: true};
  }
  for (const field of ['achievedAt', 'recordDate']) {
    if (day(r[field]) && !r.dateUnresolved) return {date: day(r[field]), basis: field, estimated: false};
  }
  // A retrospective announcement dates the report, not the attributed tour.
  // Choose its final named day when no contemporary result day survives.
  if (range?.start && range?.end && !day(r.submittedAt) && !day(r.achievedAt))
    return {date: day(range.end), basis: 'estimated-attributed-tour-final-day', estimated: true};
  for (const field of ['chronologyDate', 'submittedAt', 'evidencePublishedAt', 'videoPublishedAt', 'observedAt', 'announcedAt', 'proofUploadedAt']) {
    if (day(r[field])) return {date: day(r[field]), basis: field, estimated: Boolean(r.dateUnresolved || field === 'chronologyDate')};
  }
  for (const source of [r.source, ...(r.additionalSources || [])]) {
    for (const field of ['postedAt', 'publishedAt', 'reportedAt']) {
      if (day(source?.[field])) return {date: day(source[field]), basis: 'source-' + field, estimated: false};
    }
    if (messageDay(source)) return {date: messageDay(source), basis: 'original-message-date', estimated: false};
  }
  const matches = [...(course.records || []), ...(course.submissions || [])].filter(p => p.id !== r.id &&
    p.playerId === r.playerId && p.timeCs === r.timeCs && clockDay(p));
  if (matches.length) return {date: matches.map(clockDay).sort()[0], basis: 'estimated-matching-dated-performance', estimated: true};
  const groupDate = course.sheetDateEstimates?.get(sheetGroup(r));
  if (groupDate) return {date: groupDate, basis: 'estimated-sheet-cohort-day', estimated: true};
  if (day(r.achievementDateBounds?.notAfter)) return {date: day(r.achievementDateBounds.notAfter), basis: 'estimated-latest-evidence-bound', estimated: true};
  const appearance = (course.appearances || []).find(a => a.tourId === r.tourId) || (course.appearances || [])[0];
  const date = day(range?.end || appearance?.endDate || appearance?.startDate) || '2019-09-25';
  return {date, basis: 'estimated-course-availability-day', estimated: true};
}
export function applyFinalDates(courses) {
  const audit = {policy: 'final-display-dates-v1', sourceDatesPreserved: true, rows: [], courseCount: courses.length};
  for (const c of courses) {
    const dates = new Map();
    const groups = new Map();
    for (const r of c.submissions || []) {
      if (!sheetGroup(r)) continue;
      const matches = [...c.records, ...c.submissions].filter(p => p.playerId === r.playerId && p.timeCs === r.timeCs && clockDay(p));
      const date = clockDay(r) || matches.map(clockDay).sort()[0];
      if (date) groups.set(sheetGroup(r), [...(groups.get(sheetGroup(r)) || []), date]);
    }
    const sheetDateEstimates = new Map([...groups].map(([key, values]) => {
      values.sort();
      const anchor = values[Math.floor(values.length / 2)];
      const appearance = c.appearances.find(a => a.startDate <= anchor && anchor <= a.endDate);
      return [key, appearance ? shift(appearance.endDate, -1) : anchor];
    }));
    for (const collection of ['records', 'submissions', 'candidates']) {
      for (const r of c[collection] || []) {
        const resolution = dates.get(r.id) || resolveFinalDate(r, {...c, sheetDateEstimates}, c.records);
        if (!resolution.date) throw new Error('Missing final date: ' + c.id + '/' + r.id);
        dates.set(r.id, resolution);
        r.finalDate = resolution.date;
        r.finalDateBasis = resolution.basis;
        audit.rows.push({courseId: c.id, collection, id: r.id, time: r.time, ...resolution});
      }
    }
    for (const r of [c.current, ...(c.currentHolders || [])].filter(Boolean)) {
      const resolution = dates.get(r.id) || resolveFinalDate(r, c, c.records);
      r.finalDate = resolution.date;
      r.finalDateBasis = resolution.basis;
    }
  }
  audit.recordCount = audit.rows.filter(r => r.collection === 'records').length;
  audit.sourceRowCount = audit.rows.length;
  audit.estimatedDateCount = audit.rows.filter(r => r.estimated).length;
  return audit;
}
