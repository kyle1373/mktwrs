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
  return {date, timestamp: exact ? new Date(value).toISOString() : null,
    precision: exact ? 'timestamp' : 'day', timezone: exact ? 'UTC' : 'unspecified', basis, estimated: false, ...(sourceId ? {sourceId} : {})};
}
function reviewedResolution(proof) {
  if ([proof.timestamp,proof.localTimestamp,proof.localWindow].filter(Boolean).length !== 1) return null;
  if (proof.timestamp) return resolution(proof.timestamp, proof.basis);
  if (proof.localWindow) {
    const {start,end,label}=proof.localWindow;
    const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
      day(value+':00Z') && new Date(value+':00Z').toISOString().slice(0,16) === value;
    if (!valid(start) || !valid(end) || start>=end || start.slice(0,10)!==end.slice(0,10)) return null;
    return {date:start.slice(0,10),timestamp:null,localWindow:{start,end,...(label ? {label} : {})},
      precision:'period',timezone:'unspecified',basis:proof.basis,estimated:false};
  }
  const local = proof.localTimestamp;
  if (typeof local !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) ||
      !day(local + ':00Z') || new Date(local + ':00Z').toISOString().slice(0,16) !== local) return null;
  return {date:local.slice(0,10),timestamp:null,localTimestamp:local,
    precision:'minute',timezone:'unspecified',basis:proof.basis,estimated:false};
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
    // Preserve a day-only achievement date, but use an independently preserved
    // same-day post clock when it exists. A later post cannot date the race.
    const sameDaySources = [r.source, ...(r.additionalSources || []),
      r.originalPostSourceReview, r.originalVideoPublicationReview]
      .flatMap(source => {
        const explicit = ['postedAt', 'publishedAt', 'reportedAt', 'metadataTimestamp']
          .map(field => resolution(source?.[field], 'source-' + field)).filter(Boolean);
        const platform = platformClock(source);
        return [...explicit, ...(platform ? [platform] : [])];
      }).filter(result => result.date === chosen && result.precision === 'timestamp')
      .sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    if (sameDaySources.length) return sameDaySources[0];
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
  const reviewedOriginalVideo = !r.achievedAt && r.proofField !== 'previous-best' &&
    (r.videoVerified || r.proofVideoVerified) && r.videoAudit?.status !== 'title-time-mismatch' &&
    !/single-lap|isolated-lap|incomplete|strategy|partial|lap-[12]|finish-only|result-screen-only/.test([r.videoScope,r.videoCoverage].join(' ')) &&
    (r.videoPublicationClockReview?.reviewAudit || r.originalVideoPublicationReview?.reviewAudit || r.videoAudit?.status === 'title-time-matches');
  const earlierPublication = reviewedOriginalVideo && resolution(r.videoPublishedAt, 'earlier-reviewed-original-video-publication');
  if (earlierPublication && direct && earlierPublication.date < direct.date) return earlierPublication;
  if (direct) return direct;
  // Reuse a preserved clock only for the identical footage, player and total.
  const key = videoKey(videoUrl(r));
  if (key) {
    const peers = [...(course.records || []), ...(course.submissions || [])]
      .filter(p => p.id !== r.id && p.playerId === r.playerId && p.timeCs === r.timeCs && videoKey(videoUrl(p)) === key)
      .map(p => ({p, date: directDate(p)})).filter(p => p.date)
      .sort((a,b) => (a.date.timestamp || a.date.date).localeCompare(b.date.timestamp || b.date.date));
    if (peers.length) return {...peers[0].date, basis: 'identical-footage-documented-date', sourceId: peers[0].p.id};
    const post = platformClock({url: videoUrl(r)});
    if (post) return post;
  }
  return {date: null, timestamp: null, precision: 'unknown', timezone: 'unspecified', basis: 'no-preserved-dated-source', estimated: false};
}
export function applyFinalDates(courses, evidence = []) {
  const reviewed = new Map(evidence.map(e=>[`${e.courseId}/${e.collection || 'records'}/${e.id}`,e]));
  if (reviewed.size !== evidence.length) throw new Error('Duplicate documented date evidence');
  for (const e of evidence) {
    const collection=e.collection || 'records';
    if (!['records','submissions','candidates'].includes(collection)) throw new Error('Invalid documented date evidence collection: '+collection);
    const r=courses.find(c=>c.id===e.courseId)?.[collection]?.find(r=>r.id===e.id);
    if (!r || r.time!==e.time || r.playerId!==e.playerId || !reviewedResolution(e))
      throw new Error('Documented date evidence does not match its record: '+e.id);
  }
  const audit = {policy: 'documented-source-dates-v2', sourceDatesPreserved: true,
    dateOnlyClockConvention: 'No timestamp is invented; date-only bounds also cover unconfirmed source timezones', rows: [], courseCount: courses.length};
  for (const c of courses) {
    const dates = new Map();
    for (const collection of ['records', 'submissions', 'candidates']) for (const r of c[collection] || []) {
      const proof = reviewed.get(`${c.id}/${collection}/${r.id}`);
      const result = proof ? {...reviewedResolution(proof),sourceUrl:proof.sourceUrl,reviewArtifact:proof.reviewArtifact} : dates.get(r.id) || resolveFinalDate(r, c);
      dates.set(r.id, result);
      r.finalDate = result.date;
      r.finalDateBasis = result.basis;
      r.documentedAt = result.timestamp;
      if (result.localTimestamp) r.documentedLocalTimestamp = result.localTimestamp;
      else delete r.documentedLocalTimestamp;
      if (result.localWindow) r.documentedLocalWindow = result.localWindow;
      else delete r.documentedLocalWindow;
      r.documentedDatePrecision = result.precision;
      r.documentedDateTimezone = result.timezone;
      r.documentedDateSourceId = result.sourceId || null;
      r.documentedDateSourceUrl = result.sourceUrl || null;
      r.documentedDateReviewArtifact = result.reviewArtifact || null;
      audit.rows.push({courseId: c.id, collection, id: r.id, time: r.time, ...result});
    }
    for (const r of [c.current, ...(c.currentHolders || [])].filter(Boolean)) {
      const original = c.records.find(p => p.id === r.id);
      if (original) for (const f of ['finalDate','finalDateBasis','documentedAt','documentedLocalTimestamp','documentedLocalWindow','documentedDatePrecision','documentedDateSourceId','documentedDateTimezone','documentedDateSourceUrl','documentedDateReviewArtifact']) r[f] = original[f];
    }
  }
  audit.recordCount = audit.rows.filter(r => r.collection === 'records').length;
  audit.sourceRowCount = audit.rows.length;
  audit.estimatedDateCount = 0;
  audit.undatedSourceRowCount = audit.rows.filter(r => !r.date).length;
  return audit;
}
