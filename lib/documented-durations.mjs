import { playableDays } from '../public/history.mjs';
export const archiveEnd = '2026-09-30T06:00:00.000Z';
export function playableWindows(course) {
  const windows = (course.appearances || []).map(a => ({start: `${a.startDate}T06:00:00.000Z`, end: `${a.endDate}T06:00:00.000Z`}))
    .filter(w => w.start < w.end).sort((a,b) => a.start.localeCompare(b.start));
  const union = [];
  for (const w of windows) {
    const last = union.at(-1);
    if (last && w.start <= last.end) last.end = last.end > w.end ? last.end : w.end;
    else union.push({...w});
  }
  return union;
}
export function applyDocumentedDurations(courses) {
  const audit = {policy: 'documented-playable-duration-v1', asOf: archiveEnd, rows: [],
    nonRecordPolicy: 'Personal bests have zero WR duration; identical player/total WR evidence inherits the canonical intervals.'};
  for (const c of courses) {
    const windows = playableWindows(c);
    const recovered = (c.submissions || []).filter(r => r.recoveredLeaderEvidence?.tourId === 'tour-14');
    const leaders = [...c.records, ...recovered].sort((a,b) => (a.documentedAt || '').localeCompare(b.documentedAt || '') || b.timeCs - a.timeCs);
    for (const r of leaders) {
      if (!r.documentedAt) throw new Error(`Undated history entry: ${c.id}/${r.id}`);
      const prior = leaders.some(p => p.documentedAt < r.documentedAt && p.timeCs < r.timeCs);
      const next = leaders.find(p => p.documentedAt >= r.documentedAt && p.timeCs < r.timeCs);
      const end = next?.documentedAt && next.documentedAt < archiveEnd ? next.documentedAt : archiveEnd;
      const start = r.documentedAt < archiveEnd ? r.documentedAt : archiveEnd;
      r.durationIntervals = prior ? [] : windows.map(w => ({start: w.start > start ? w.start : start, end: w.end < end ? w.end : end})).filter(w => w.start < w.end);
      r.durationDays = playableDays(start, end < start ? start : end, r.durationIntervals);
      r.durationBasis = 'documented-standing-playable-days';
      r.durationPrecision = r.documentedDatePrecision === 'timestamp' && (!next || next.documentedDatePrecision === 'timestamp') ? 'timestamp' : 'day';
      r.durationEnd = end;
    }
    for (const collection of ['records','submissions','candidates']) for (const r of c[collection] || []) {
      if (!leaders.includes(r)) {
        const same = c.records.find(p => p.playerId === r.playerId && p.timeCs === r.timeCs);
        r.durationDays = same?.durationDays ?? 0;
        r.durationIntervals = same?.durationIntervals || [];
        r.durationBasis = same ? 'same-player-total-canonical-record' : 'not-a-world-record';
        r.durationPrecision = same?.durationPrecision || 'timestamp';
        r.durationEnd = same?.durationEnd || r.documentedAt;
      }
      audit.rows.push({courseId:c.id,collection,id:r.id,days:r.durationDays,basis:r.durationBasis,precision:r.durationPrecision});
    }
    for (const r of [c.current, ...(c.currentHolders || [])].filter(Boolean)) {
      const original = c.records.find(p => p.id === r.id);
      if (original) for (const f of ['durationDays','durationIntervals','durationBasis','durationPrecision','durationEnd']) r[f] = original[f];
    }
  }
  audit.missingDurationCount = audit.rows.filter(r => !Number.isFinite(r.days)).length;
  return audit;
}
