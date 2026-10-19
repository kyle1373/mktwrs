import {videoKey, videoUrl, verifiedVideo, availableVideo} from './video.mjs';
const partial = r => /single-lap|isolated-lap|incomplete|strategy|partial|lap-[12]|finish-only|result-screen-only/.test([r.videoScope, r.videoCoverage].filter(Boolean).join(' '));
const rejected = r => /rejected|invalid|disputed|cancelled/.test(r.status || '') ||
  r.originalVideoMachineTextReview?.sourceTotalsReconciled === false ||
  r.oct26NbcSourceConflictReview?.sourceTotalsReconciled === false;
const sort = (a, b) => a.timeCs - b.timeCs || (a.finalDate || '').localeCompare(b.finalDate || '');
export function recordedBest(course) {
  const sources = [...(course.records || []), ...(course.submissions || [])];
  const excludedMovies = new Set(sources.filter(r => partial(r) || rejected(r))
    .map(r => videoKey(videoUrl(r))).filter(Boolean));
  const movieEligible = r => verifiedVideo(r) && !partial(r) && !rejected(r) &&
    !excludedMovies.has(videoKey(videoUrl(r))) && availableVideo(r);
  const records = (course.records || []).filter(r => Number.isFinite(r.timeCs) && !rejected(r));
  const recordsById = new Map(records.map(r => [r.id, r]));
  const reviewed = (course.submissions || []).filter(r => Number.isFinite(r.timeCs) && !rejected(r) &&
    r.proofField !== 'previous-best' && (r.proofImageVerified === true || movieEligible(r)))
    .map(r => {
      // A reviewed receipt may retain an old display name for the same performance.
      // Only an explicit matching record reference establishes that identity.
      const record = [r.matchedPerformanceId, r.enrichesRecordId, r.canonicalPerformanceId]
        .map(id => recordsById.get(id)).find(record => record?.timeCs === r.timeCs);
      return record ? {...r, playerId: record.playerId} : r;
    });
  const rows = [...records, ...reviewed].sort(sort);
  const best = rows[0] || null;
  const recordings = rows.filter(movieEligible).map(r => ({...r, video: videoUrl(r)}));
  const seen = new Set();
  const bestHolders = rows.filter(r => r.timeCs === best?.timeCs && !seen.has(r.playerId) && seen.add(r.playerId))
    .map(r => {
      const movie = recordings.find(v => v.playerId === r.playerId && v.timeCs === r.timeCs);
      return movie ? {...r, video: movie.video, videoAvailability: movie.videoAvailability, videoBackup: movie.videoBackup} : r;
    });
  return {best, bestHolders, recording: recordings[0] || null};
}
