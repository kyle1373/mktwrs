export function isReviewedOpeningDay(record, start) {
  const value = record.achievedAt || record.recordDate;
  if (!value || record.dateUnresolved) return false;
  if (!value.includes("T")) return value === start;
  const clock = Date.parse(value);
  return clock >= Date.parse(start + "T06:00:00Z") &&
    clock < Date.parse(start + "T06:00:00Z") + 86400000;
}

export const isHalloween2019OpeningDay = record => isReviewedOpeningDay(record, "2019-10-23");

// Apply the opening-day policy as each tour receives its practical review.
// Original records and submissions remain in the downloadable source archive.
export function openingDayPublication(courses, players) {
  const removed = new Set();
  const publishedCourses = courses.map(course => {
    for (const [tourId, start] of [["tour-3", "2019-10-23"], ["tour-4", "2019-11-06"], ["tour-5", "2019-11-20"]]) {
      if (!course.appearances?.some(a => a.tourId === tourId)) continue;
      const opening = course.records.filter(r => isReviewedOpeningDay(r, start));
      const best = Math.min(...opening.map(r => r.timeCs));
      for (const record of opening) if (record.timeCs > best) removed.add(record.id);
    }
    return {...course, records:course.records.filter(r => !removed.has(r.id))};
  });
  const retainedIds = new Set(publishedCourses.flatMap(c => c.records.map(r => r.playerId)));
  const removedPlayers = new Set(courses.flatMap(c => c.records.filter(r => removed.has(r.id)).map(r => r.playerId)));
  return {courses:publishedCourses,
    players:players.filter(p => !removedPlayers.has(p.id) || retainedIds.has(p.id)),
    omittedRecordIds:[...removed], omittedProfileIds:players.filter(p => removedPlayers.has(p.id) && !retainedIds.has(p.id)).map(p=>p.id)};
}
