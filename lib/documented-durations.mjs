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
  // A reviewed former WR can sit between two dated results without borrowing either clock.
  if (r.retrospectiveStandingOrder) {
    const order = r.retrospectiveStandingOrder;
    const after = course.records.find(p => p.id === order.afterId);
    const before = course.records.find(p => p.id === order.beforeId);
    if (!r.dateUnresolved || !order.reviewAudit || !after || !before ||
        after.playerId !== r.playerId || before.playerId !== r.playerId ||
        !(after.timeCs > r.timeCs && r.timeCs > before.timeCs) ||
        after.documentedDatePrecision !== 'timestamp' || before.documentedDatePrecision !== 'timestamp' ||
        !Number.isFinite(Date.parse(after.documentedAt)) || !Number.isFinite(Date.parse(before.documentedAt)) ||
        !(after.documentedAt < before.documentedAt))
      throw new Error(`Invalid retrospective standing order: ${course.id}/${r.id}`);
    return {earliest:after.documentedAt,latest:before.documentedAt,
      basis:'reviewed-retrospective-between-same-player-results',exact:false};
  }
  const windows = playableWindows(course);
  const dayStart = `${r.finalDate || r.documentedAt.slice(0,10)}T00:00:00.000Z`;
  const dayEnd = new Date(Date.parse(dayStart)+86400000).toISOString();
  const localMinute = r.documentedDatePrecision === 'minute' && r.documentedLocalTimestamp;
  const localClock = localMinute ? Date.parse(r.documentedLocalTimestamp + ':00Z') : null;
  if (localMinute && (!Number.isFinite(localClock) || new Date(localClock).toISOString().slice(0,16) !== r.documentedLocalTimestamp))
    throw new Error(`Invalid documented local clock: ${course.id}/${r.id}`);
  const localBounds = localMinute ? {earliest:new Date(localClock-14*3600000).toISOString(),
    latest:new Date(localClock+12*3600000+60000).toISOString(),basis:'documented-local-minute-timezone-unconfirmed',exact:false} : null;
  const localPeriod = r.documentedDatePrecision === 'period' && r.documentedLocalWindow;
  const periodStart = localPeriod ? Date.parse(localPeriod.start+':00Z') : null;
  const periodEnd = localPeriod ? Date.parse(localPeriod.end+':00Z') : null;
  if (localPeriod && (!Number.isFinite(periodStart) || !Number.isFinite(periodEnd) || periodStart>=periodEnd ||
      new Date(periodStart).toISOString().slice(0,16)!==localPeriod.start || new Date(periodEnd).toISOString().slice(0,16)!==localPeriod.end))
    throw new Error(`Invalid documented local period: ${course.id}/${r.id}`);
  const periodBounds = localPeriod ? {earliest:new Date(periodStart-14*3600000).toISOString(),
    latest:new Date(periodEnd+12*3600000).toISOString(),basis:'documented-local-period-timezone-unconfirmed',exact:false} : null;
  const sourceBounds = localBounds || periodBounds;
  const outside = sourceBounds ? !windows.some(w => w.start < sourceBounds.latest && w.end > sourceBounds.earliest) : r.documentedDatePrecision === 'day' ? !windows.some(w => w.start < dayEnd && w.end > dayStart) : !windows.some(w => w.start <= r.documentedAt && r.documentedAt < w.end);
  if (outside && r.tourDateRange?.start && r.tourDateRange?.end) {
    const matches = (course.appearances || []).filter(a =>
      Math.abs(Date.parse(a.startDate) - Date.parse(r.tourDateRange.start)) <= 86400000 &&
      Math.abs(Date.parse(a.endDate) - Date.parse(r.tourDateRange.end)) <= 86400000);
    if (matches.length) return {earliest: `${matches[0].startDate}T06:00:00.000Z`, latest: `${matches[0].endDate}T06:00:00.000Z`, basis: 'attributed-tour-window', exact: false};
  }
  if (sourceBounds) return sourceBounds;
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
const fields = ['durationDays','durationIntervals','durationBasis','durationPrecision','durationEnd','durationBounds','durationIntervalsGuaranteed','durationIntervalsPossible','durationSupersessionReview'];
export function applyDocumentedDurations(courses, supersessionEvidence = []) {
  const reviewedEnds = new Map();
  for (const e of supersessionEvidence) {
    const c=courses.find(c=>c.id===e.courseId),r=c?.records.find(r=>r.id===e.id);
    const source=c?.submissions?.find(p=>p.id===e.sourceId);
    const key=`${e.courseId}/${e.id}`;
    if (reviewedEnds.has(key) || !r || r.playerId!==e.playerId || r.time!==e.time ||
        !source || source.playerId!==e.sourcePlayerId || source.time!==e.sourceTime ||
        source.status!==e.sourceStatus || source.proofImageVerified!==true || source.proofField==='previous-best' ||
        !(source.timeCs<r.timeCs) || source.documentedAt!==e.timestamp || source.source?.url!==e.sourceUrl)
      throw new Error('Documented supersession evidence does not match its source: '+e.id);
    reviewedEnds.set(key,{bounds:standingBounds(source,c),sourceId:e.sourceId,sourceUrl:e.sourceUrl,reviewArtifact:e.reviewArtifact});
  }
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
      const reviewedEnd = reviewedEnds.get(`${c.id}/${r.id}`);
      if (reviewedEnd) {faster.push(reviewedEnd.bounds);r.durationSupersessionReview={sourceId:reviewedEnd.sourceId,sourceUrl:reviewedEnd.sourceUrl,reviewArtifact:reviewedEnd.reviewArtifact};}
      else delete r.durationSupersessionReview;
      const definitelySuperseded = faster.some(p => p.latest <= start.earliest);
      // Already-faster evidence still establishes the end boundary of an
      // outdated result. Excluding it incorrectly points at a later record,
      // sometimes years after the result had already been superseded.
      const end = {earliest:[archiveEnd,...faster.map(p => p.earliest)].sort()[0],latest:[archiveEnd,...faster.map(p => p.latest)].sort()[0]};
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
      audit.rows.push({courseId:c.id,collection,id:r.id,days:r.durationDays,bounds:r.durationBounds,basis:r.durationBasis,precision:r.durationPrecision,...(r.durationSupersessionReview?{supersessionReview:r.durationSupersessionReview}:{})});
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
