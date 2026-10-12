// Publication policy currently reviewed for Halloween 2019 only.
// Original records and submissions remain in the downloadable source archive.
export function openingDayPublication(courses, players) {
  const removed = new Set();
  const publishedCourses = courses.map(course => {
    const opening = course.records.filter(record => {
      const value = record.achievedAt || record.recordDate;
      if (!value || record.dateUnresolved) return false;
      if (!value.includes("T")) return value === "2019-10-23";
      const clock = Date.parse(value);
      return clock >= Date.parse("2019-10-23T06:00:00Z") && clock < Date.parse("2019-10-24T06:00:00Z");
    });
    if (!course.appearances?.some(a => a.tourId === "tour-3") || !opening.length) return course;
    const best = Math.min(...opening.map(r => r.timeCs));
    for (const record of opening) if (record.timeCs > best) removed.add(record.id);
    return {...course, records:course.records.filter(r => !removed.has(r.id))};
  });
  const retainedIds = new Set(publishedCourses.flatMap(c => c.records.map(r => r.playerId)));
  const removedPlayers = new Set(courses.flatMap(c => c.records.filter(r => removed.has(r.id)).map(r => r.playerId)));
  return {courses:publishedCourses,
    players:players.filter(p => !removedPlayers.has(p.id) || retainedIds.has(p.id)),
    omittedRecordIds:[...removed], omittedProfileIds:players.filter(p => removedPlayers.has(p.id) && !retainedIds.has(p.id)).map(p=>p.id)};
}
