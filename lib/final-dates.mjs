import { videoKey, videoUrl } from './video.mjs';
export const day = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const s = value.slice(0, 10);
  return Number.isFinite(Date.parse(value)) && new Date(s).toISOString().slice(0, 10) === s ? s : null;
};
function resolution(value, basis, sourceId) {
  const date = day(value);
  if (!date) return null;
  const exact = /T\d\d:\d\d/.test(value);
  return {date, timestamp: exact ? new Date(value).toISOString() : `${date}T06:00:00.000Z`,
    precision: exact ? 'timestamp' : 'day', basis, estimated: false, ...(sourceId ? {sourceId} : {})};
}
function platformClock(source) {
  const url = source?.url || '';
  const discord = source?.messageId || url.match(/discord\.com\/channels\/\d+\/\d+\/(\d+)/)?.[1];
  const twitter = url.match(/(?:twitter|x)\.com\/[^/]+\/status\/(\d+)/)?.[1];
  const id = discord || twitter;
  if (!/^\d{17,20}$/.test(id || '')) return null;
  const timestamp = new Date(Number((BigInt(id) >> 22n) + (discord ? 1420070400000n : 1288834974657n))).toISOString();
  return timestamp >= '2019-09-25' && timestamp < '2027' ? resolution(timestamp, discord ? 'original-discord-post' : 'original-twitter-post') : null;
}
function directDate(r) {
  // A source publication day remains factual even when the race itself is undated.
  const dated = !r.dateUnresolved || /first-screenshot|source|submission|publication/.test(r.dateBasis || '');
  const chosen = dated && !/estimated|inferred/.test(r.dateBasis || '') ? day(r.achievedAt) || day(r.recordDate) : null;
  const clocks = ['achievedAt', 'submittedAt', 'evidencePublishedAt', 'videoPublishedAt', 'observedAt', 'announcedAt', 'proofUploadedAt'];
  if (chosen) {
    for (const field of clocks) {
      if (field === 'submittedAt' && r.originalSubmissionClockUnverified) continue;
      if (field === 'achievedAt' && r.dateUnresolved) continue;
      if (day(r[field]) === chosen && /T\d\d:\d\d/.test(r[field])) return resolution(r[field], field);
    }
    return resolution(chosen, r.dateBasis || 'documented-record-date');
  }
  for (const field of clocks.filter(f => f !== 'achievedAt')) {
    if (field === 'submittedAt' && r.originalSubmissionClockUnverified) continue;
    const result = resolution(r[field], field);
    if (result) return result;
  }
  for (const source of [r.source, ...(r.additionalSources || [])]) {
    for (const field of ['postedAt', 'publishedAt', 'reportedAt']) {
      const result = resolution(source?.[field], 'source-' + field);
      if (result) return result;
    }
    const result = platformClock(source);
    if (result) return result;
  }
  return null;
}
export function resolveFinalDate(r, course = {}) {
  const direct = directDate(r);
  if (direct) return direct;
  // Reuse a preserved clock only for the identical footage, player and total.
  const key = videoKey(videoUrl(r));
  if (key) {
    const peers = [...(course.records || []), ...(course.submissions || [])]
      .filter(p => p.id !== r.id && p.playerId === r.playerId && p.timeCs === r.timeCs && videoKey(videoUrl(p)) === key)
      .map(p => ({p, date: directDate(p)})).filter(p => p.date)
      .sort((a,b) => a.date.timestamp.localeCompare(b.date.timestamp));
    if (peers.length) return {...peers[0].date, basis: 'identical-footage-documented-date', sourceId: peers[0].p.id};
    const post = platformClock({url: videoUrl(r)});
    if (post) return post;
  }
  return {date: null, timestamp: null, precision: 'unknown', basis: 'no-preserved-dated-source', estimated: false};
}
export function applyFinalDates(courses) {
  const audit = {policy: 'documented-source-dates-v2', sourceDatesPreserved: true,
    dateOnlyClockConvention: '06:00 UTC; calculation boundary, not an asserted achievement time', rows: [], courseCount: courses.length};
  for (const c of courses) {
    const dates = new Map();
    for (const collection of ['records', 'submissions', 'candidates']) for (const r of c[collection] || []) {
      const result = dates.get(r.id) || resolveFinalDate(r, c);
      dates.set(r.id, result);
      r.finalDate = result.date;
      r.finalDateBasis = result.basis;
      r.documentedAt = result.timestamp;
      r.documentedDatePrecision = result.precision;
      r.documentedDateSourceId = result.sourceId || null;
      audit.rows.push({courseId: c.id, collection, id: r.id, time: r.time, ...result});
    }
    for (const r of [c.current, ...(c.currentHolders || [])].filter(Boolean)) {
      const original = c.records.find(p => p.id === r.id);
      if (original) for (const f of ['finalDate','finalDateBasis','documentedAt','documentedDatePrecision','documentedDateSourceId']) r[f] = original[f];
    }
  }
  audit.recordCount = audit.rows.filter(r => r.collection === 'records').length;
  audit.sourceRowCount = audit.rows.length;
  audit.estimatedDateCount = 0;
  audit.undatedSourceRowCount = audit.rows.filter(r => !r.date).length;
  return audit;
}
