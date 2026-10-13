export function isReviewedOpeningDay(record, start) {
  // Reviewed dates derived from submissions retain the exact clock at the 06:00 rollover.
  const doctorSubmissionClock = ["2022-05-04", "2022-05-18", "2022-06-01", "2022-06-15", "2022-06-29", "2022-07-13", "2022-07-27", "2022-08-10", "2022-08-24", "2022-09-07", "2022-09-21", "2022-10-05", "2022-10-19", "2022-11-02"].includes(start) && !record.achievedAt &&
    record.submittedAt && (!record.recordDate || record.recordDate === record.submittedAt.slice(0, 10))
    ? record.submittedAt : null;
  const value = record.achievedAt || doctorSubmissionClock || record.recordDate || (["2019-12-04", "2019-12-18", "2020-01-01", "2020-01-15", "2020-01-29", "2020-02-12", "2020-02-26", "2020-03-11", "2020-03-25", "2020-04-08", "2020-04-22", "2020-05-06", "2020-05-20", "2020-06-03", "2020-06-17", "2020-07-01", "2020-07-15", "2020-07-29", "2020-08-12", "2020-08-26", "2020-09-09", "2020-09-23", "2020-10-07", "2020-10-21", "2020-11-04", "2020-11-18", "2020-12-02", "2020-12-16", "2020-12-30", "2021-01-13", "2021-01-27", "2021-02-10", "2021-02-24", "2021-03-10", "2021-03-24", "2021-04-07", "2021-04-21", "2021-05-05", "2021-05-19", "2021-06-02", "2021-06-16", "2021-06-30", "2021-07-14", "2021-07-28", "2021-08-11", "2021-08-25", "2021-09-08", "2021-09-22", "2021-10-06", "2021-10-20", "2021-11-03", "2021-11-17", "2021-12-01", "2021-12-15", "2021-12-29", "2022-01-12", "2022-01-26", "2022-02-09", "2022-02-23", "2022-03-09", "2022-03-23", "2022-04-06", "2022-04-20", "2022-05-04", "2022-05-18", "2022-06-01", "2022-06-15", "2022-06-29", "2022-07-13", "2022-07-27", "2022-08-10", "2022-08-24", "2022-09-07", "2022-09-21", "2022-10-05", "2022-10-19", "2022-11-02"].includes(start) ? record.submittedAt : null);
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
    for (const [tourId, start] of [["tour-3", "2019-10-23"], ["tour-4", "2019-11-06"], ["tour-5", "2019-11-20"], ["tour-6", "2019-12-04"], ["tour-7", "2019-12-18"], ["tour-8", "2020-01-01"], ["tour-9", "2020-01-15"], ["tour-10", "2020-01-29"], ["tour-11", "2020-02-12"], ["tour-12", "2020-02-26"], ["tour-13", "2020-03-11"], ["tour-14", "2020-03-25"], ["tour-15", "2020-04-08"], ["tour-16", "2020-04-22"], ["tour-17", "2020-05-06"], ["tour-18", "2020-05-20"], ["tour-19", "2020-06-03"], ["tour-20", "2020-06-17"], ["tour-21", "2020-07-01"], ["tour-22", "2020-07-15"], ["tour-23", "2020-07-29"], ["tour-24", "2020-08-12"], ["tour-25", "2020-08-26"], ["tour-26", "2020-09-09"], ["tour-27", "2020-09-23"], ["tour-28", "2020-10-07"], ["tour-29", "2020-10-21"], ["tour-30", "2020-11-04"], ["tour-31", "2020-11-18"], ["tour-32", "2020-12-02"], ["tour-33", "2020-12-16"], ["tour-34", "2020-12-30"], ["tour-35", "2021-01-13"], ["tour-36", "2021-01-27"], ["tour-37", "2021-02-10"], ["tour-38", "2021-02-24"], ["tour-39", "2021-03-10"], ["tour-40", "2021-03-24"], ["tour-41", "2021-04-07"], ["tour-42", "2021-04-21"], ["tour-43", "2021-05-05"], ["tour-44", "2021-05-19"], ["tour-45", "2021-06-02"], ["tour-46", "2021-06-16"], ["tour-47", "2021-06-30"], ["tour-48", "2021-07-14"], ["tour-49", "2021-07-28"], ["tour-50", "2021-08-11"], ["tour-51", "2021-08-25"], ["tour-52", "2021-09-08"], ["tour-53", "2021-09-22"], ["tour-54", "2021-10-06"], ["tour-55", "2021-10-20"], ["tour-56", "2021-11-03"], ["tour-57", "2021-11-17"], ["tour-58", "2021-12-01"], ["tour-59", "2021-12-15"], ["tour-60", "2021-12-29"], ["tour-61", "2022-01-12"], ["tour-62", "2022-01-26"], ["tour-63", "2022-02-09"], ["tour-64", "2022-02-23"], ["tour-65", "2022-03-09"], ["tour-66", "2022-03-23"], ["tour-67", "2022-04-06"], ["tour-68", "2022-04-20"], ["tour-69", "2022-05-04"], ["tour-70", "2022-05-18"], ["tour-71", "2022-06-01"], ["tour-72", "2022-06-15"], ["tour-73", "2022-06-29"], ["tour-74", "2022-07-13"], ["tour-75", "2022-07-27"], ["tour-76", "2022-08-10"], ["tour-77", "2022-08-24"], ["tour-78", "2022-09-07"], ["tour-79", "2022-09-21"], ["tour-80", "2022-10-05"], ["tour-81", "2022-10-19"], ["tour-82", "2022-11-02"]]) {
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
