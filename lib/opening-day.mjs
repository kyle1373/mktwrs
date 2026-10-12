export function isReviewedOpeningDay(record, start) {
  const value = record.achievedAt || record.recordDate || (["2019-12-04", "2019-12-18", "2020-01-01", "2020-01-15", "2020-01-29", "2020-02-12", "2020-02-26", "2020-03-11", "2020-03-25", "2020-04-08", "2020-04-22", "2020-05-06", "2020-05-20", "2020-06-03", "2020-06-17", "2020-07-01", "2020-07-15", "2020-07-29", "2020-08-12", "2020-08-26", "2020-09-09", "2020-09-23", "2020-10-07", "2020-10-21", "2020-11-04"].includes(start) ? record.submittedAt : null);
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
  const removed = new Set(["curated-707501764987060265-flower-previous-14217", "curated-712597270599565352-previous-best-4254"]);
  const publishedCourses = courses.map(course => {
    for (const [tourId, start] of [["tour-3", "2019-10-23"], ["tour-4", "2019-11-06"], ["tour-5", "2019-11-20"], ["tour-6", "2019-12-04"], ["tour-7", "2019-12-18"], ["tour-8", "2020-01-01"], ["tour-9", "2020-01-15"], ["tour-10", "2020-01-29"], ["tour-11", "2020-02-12"], ["tour-12", "2020-02-26"], ["tour-13", "2020-03-11"], ["tour-14", "2020-03-25"], ["tour-15", "2020-04-08"], ["tour-16", "2020-04-22"], ["tour-17", "2020-05-06"], ["tour-18", "2020-05-20"], ["tour-19", "2020-06-03"], ["tour-20", "2020-06-17"], ["tour-21", "2020-07-01"], ["tour-22", "2020-07-15"], ["tour-23", "2020-07-29"], ["tour-24", "2020-08-12"], ["tour-25", "2020-08-26"], ["tour-26", "2020-09-09"], ["tour-27", "2020-09-23"], ["tour-28", "2020-10-07"], ["tour-29", "2020-10-21"], ["tour-30", "2020-11-04"]]) {
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
