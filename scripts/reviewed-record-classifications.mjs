// Raw claims stay in the source archive; reviewed classification determines WR credit.
export function applyReviewedRecordClassifications(courses, evidence) {
  const seen = new Set();
  for (const review of evidence.rows) {
    const key = review.courseId + '/' + review.id;
    if (seen.has(key)) throw new Error('Duplicate classification review: ' + key);
    seen.add(key);
    const course = courses.find(c => c.id === review.courseId);
    const canonical = course?.records.find(r => r.id === review.id);
    const submission = course?.submissions.find(r => r.id === review.id);
    const faster = course?.records.find(r => r.id === review.earlierFasterId);
    for (const row of [canonical, submission]) {
      if (!row || row.playerId !== review.playerId || row.time !== review.time ||
          row.status !== review.originalStatus || row.submittedAt !== review.submittedAt)
        throw new Error('Classification source mismatch: ' + key);
    }
    if (review.status !== 'personal-best' || !review.reviewArtifact || !review.reason ||
        !faster || faster.time !== review.earlierFasterTime || faster.timeCs >= canonical.timeCs ||
        Date.parse(faster.submittedAt) !== Date.parse(review.earlierFasterDocumentedAt) ||
        !(Date.parse(faster.submittedAt) < Date.parse(canonical.submittedAt)))
      throw new Error('Classification chronology mismatch: ' + key);
    if (course.current?.id === review.id || course.currentHolders?.some(r => r.id === review.id))
      throw new Error('Classification review would remove a current holder: ' + key);
    // The canonical duplicate is preserved in reviewArtifact. The original submission
    // keeps its identity, source clocks, media, total and all other evidence fields.
    course.records = course.records.filter(r => r.id !== review.id);
    submission.status = review.status;
    submission.recordClassificationReview = {
      originalStatus: review.originalStatus,
      originalCollection: 'records',
      reviewArtifact: review.reviewArtifact,
      reason: review.reason,
      earlierFasterId: review.earlierFasterId,
    };
  }
}
