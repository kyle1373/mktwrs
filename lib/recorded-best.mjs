const partial = r => /single-lap|isolated-lap|incomplete|strategy|partial/.test(r.videoScope || '');
const rejected = r => /rejected|invalid|disputed/.test(r.status || '') ||
  r.originalVideoMachineTextReview?.sourceTotalsReconciled === false ||
  r.oct26NbcSourceConflictReview?.sourceTotalsReconciled === false;
const sort = (a, b) => a.timeCs - b.timeCs || (a.finalDate || '').localeCompare(b.finalDate || '');
export function recordedBest(course) {
  const records = (course.records || []).filter(r => Number.isFinite(r.timeCs) && !rejected(r));
  const reviewed = (course.submissions || []).filter(r => Number.isFinite(r.timeCs) && !rejected(r) &&
    !partial(r) && r.proofField !== 'previous-best' && (r.videoVerified === true || r.proofImageVerified === true));
  const rows = [...records, ...reviewed].sort(sort);
  const best = rows[0] || course.current || null;
  const recordings = rows.filter(r => r.videoVerified === true && !partial(r) &&
    (r.videoBackup?.status === 'available' || (r.video && r.videoAvailability !== 'unavailable')));
  const seen = new Set();
  const bestHolders = rows.filter(r => r.timeCs === best?.timeCs && !seen.has(r.playerId) && seen.add(r.playerId))
    .map(r => {
      const movie = recordings.find(v => v.playerId === r.playerId && v.timeCs === r.timeCs);
      return movie ? {...r, video: movie.video, videoAvailability: movie.videoAvailability, videoBackup: movie.videoBackup} : r;
    });
  return {best, bestHolders, recording: recordings[0] || null};
}
