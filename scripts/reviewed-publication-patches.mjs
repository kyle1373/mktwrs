export function applyReviewedPublicationPatches(courses, patches) {
  for (const patch of patches.rows || []) {
    const course = courses.find(c => c.id === patch.courseId);
    let row = course?.[patch.collection]?.find(r => r.id === patch.id);
    if (!row && patch.restoreCandidate && patch.collection === "candidates") {
      const submission = course?.submissions?.find(r => r.id === patch.id);
      if (submission?.time === patch.time && submission?.playerId === patch.playerId) {
        row = structuredClone(patch.set);
        course.candidates.push(row);
      }
    }
    if (!row || row.time !== patch.time || row.playerId !== patch.playerId)
      throw Error("Reviewed publication patch mismatch: " + patch.id);
    Object.assign(row, structuredClone(patch.set));
    for (const key of patch.unset || []) delete row[key];
  }
}
