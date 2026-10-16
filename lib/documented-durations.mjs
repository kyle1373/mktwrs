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
export function standingBounds(r, course) {
  if (!r.documentedAt && !r.finalDate) throw new Error(`Undated history entry: ${course.id}/${r.id}`);
  const windows = playableWindows(course);
  const dayStart = `${r.finalDate || r.documentedAt.slice(0,10)}T00:00:00.000Z`;
  const dayEnd = new Date(Date.parse(dayStart)+86400000).toISOString();
  const outside = r.documentedDatePrecision === 'day' ? !windows.some(w => w.start < dayEnd && w.end > dayStart) : !windows.some(w => w.start <= r.documentedAt && r.documentedAt < w.end);
  if (outside && r.tourDateRange?.start && r.tourDateRange?.end) {
    const matches = (course.appearances || []).filter(a =>
      Math.abs(Date.parse(a.startDate) - Date.parse(r.tourDateRange.start)) <= 86400000 &&
      Math.abs(Date.parse(a.endDate) - Date.parse(r.tourDateRange.end)) <= 86400000);
    if (matches.length) return {earliest: `${matches[0].startDate}T06:00:00.000Z`, latest: `${matches[0].endDate}T06:00:00.000Z`, basis: 'attributed-tour-window', exact: false};
  }
  if (r.documentedDatePrecision === 'day') {
    const earliest = `${r.finalDate || r.documentedAt.slice(0,10)}T00:00:00.000Z`;
    const utc = r.documentedDateTimezone === 'UTC';
    return {earliest: utc ? earliest : new Date(Date.parse(earliest)-14*3600000).toISOString(),
      latest: new Date(Date.parse(earliest)+86400000+(utc ? 0 : 12*3600000)).toISOString(),
      basis: utc ? 'documented-calendar-day' : 'documented-calendar-day-timezone-unconfirmed',exact:false};
  }
  return {earliest:r.documentedAt,latest:r.documentedAt,basis:'documented-source-timestamp',exact:true};
}
const clip = (windows,start,end) => windows.map(w => ({start:w.start > start ? w.start : start,end:w.end < end ? w.end : end})).filter(w => w.start < w.end);
const intervalDays = windows => windows.length ? playableDays(windows[0].start,windows.at(-1).end,windows) : 0;
const fields = ['durationDays','durationIntervals','durationBasis','durationPrecision','durationEnd','durationBounds','durationIntervalsGuaranteed','durationIntervalsPossible'];
export function applyDocumentedDurations(courses) {
  const audit = {policy:'bounded-playable-duration-v2',asOf:archiveEnd,rows:[],
    nonRecordPolicy:'Submissions without a documented WR reign have zero credited WR duration; identical player/total WR evidence inherits canonical bounds.',
    uncertaintyPolicy:'Date-only and retrospective evidence produces duration bounds, never an asserted exact reign.'};
  for (const c of courses) {
    const windows = playableWindows(c);
    const recovered = (c.submissions || []).filter(r => r.recoveredLeaderEvidence?.tourId === 'tour-14');
    const leaders = [...c.records,...recovered];
    const bounds = new Map(leaders.map(r => [r,standingBounds(r,c)]));
    for (const r of leaders) {
      const start = bounds.get(r);
      const faster = leaders.filter(p => p.timeCs < r.timeCs).map(p => bounds.get(p));
      const definitelySuperseded = faster.some(p => p.latest <= start.earliest);
      const blockers = faster.filter(p => p.latest > start.earliest);
      const end = {earliest:[archiveEnd,...blockers.map(p => p.earliest)].sort()[0],latest:[archiveEnd,...blockers.map(p => p.latest)].sort()[0]};
      const guaranteed = definitelySuperseded ? [] : clip(windows,start.latest,end.earliest);
      const possible = definitelySuperseded ? [] : clip(windows,start.earliest,end.latest);
      const minDays = intervalDays(guaranteed),maxDays = intervalDays(possible);
      r.durationBounds = {minDays,maxDays,start,end,basis:start.basis};
      r.durationIntervalsGuaranteed = guaranteed;
      r.durationIntervalsPossible = possible;
      // The numeric compatibility field is a proven lower bound, not a guessed point estimate.
      r.durationDays = minDays;
      r.durationIntervals = guaranteed;
      r.durationBasis = 'bounded-standing-playable-days';
      r.durationPrecision = Math.abs(maxDays-minDays)<1e-10 ? 'timestamp' : 'range';
      r.durationEnd = end.latest;
    }
    for (const collection of ['records','submissions','candidates']) for (const r of c[collection] || []) {
      if (!leaders.includes(r)) {
        const same = c.records.find(p => p.playerId === r.playerId && p.timeCs === r.timeCs);
        if (same) for (const f of fields) r[f] = same[f];
        else {
          r.durationDays = 0;r.durationIntervals = [];r.durationIntervalsGuaranteed = [];r.durationIntervalsPossible = [];
          r.durationBounds = {minDays:0,maxDays:0,basis:'no-documented-wr-reign'};
          r.durationPrecision = 'timestamp';r.durationEnd = r.documentedAt;
        }
        r.durationBasis = same ? 'same-player-total-canonical-record' : 'no-documented-wr-reign';
      }
      audit.rows.push({courseId:c.id,collection,id:r.id,days:r.durationDays,bounds:r.durationBounds,basis:r.durationBasis,precision:r.durationPrecision});
    }
    for (const r of [c.current,...(c.currentHolders || [])].filter(Boolean)) {
      const original = c.records.find(p => p.id===r.id);
      if (original) for (const f of fields) r[f] = original[f];
    }
  }
  audit.missingDurationCount = audit.rows.filter(r=>!Number.isFinite(r.days)).length;
  audit.uncertainRecordCount = audit.rows.filter(r=>r.collection==='records'&&r.precision==='range').length;
  audit.attributedTourRecordCount = audit.rows.filter(r=>r.collection==='records'&&r.bounds.basis==='attributed-tour-window').length;
  return audit;
}
