// Durations are the union of playable intervals intersecting a record's reign.
export function timestampWithinTour(value, range) {
  if (!value) return false;
  if (!range) return true;
  const timestamp = Date.parse(value);
  const start = Date.parse(`${range.start}T06:00:00Z`);
  // Announcement labels name the final full day; play continues until reset.
  const end = Date.parse(`${range.end}T06:00:00Z`) + 86400000;
  return timestamp >= start && timestamp < end;
}

export function playableDays(start, end, windows) {
  const a = +new Date(start),
    b = +new Date(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  const intervals = windows
    .map((w) => [
      Math.max(a, +new Date(w.start)),
      Math.min(b, +new Date(w.end)),
    ])
    .filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && e > s)
    .sort((x, y) => x[0] - y[0]);
  let total = 0,
    left = null,
    right = null;
  for (const [s, e] of intervals) {
    if (left === null) {
      left = s;
      right = e;
    } else if (s <= right) right = Math.max(right, e);
    else {
      total += right - left;
      left = s;
      right = e;
    }
  }
  if (left !== null) total += right - left;
  return total / 86400000;
}
export function recordDuration(record, next, windows, asOf) {
  if (!record.achievedAt || record.datePrecision === "unknown") return null;
  return playableDays(record.achievedAt, next?.achievedAt || asOf, windows);
}
export function progression(submissions) {
  let best = Infinity;
  return [...submissions]
    .filter((s) => s.status === "verified" && s.achievedAt)
    .sort(
      (a, b) => a.achievedAt.localeCompare(b.achievedAt) || a.timeCs - b.timeCs,
    )
    .filter((r) => {
      if (r.timeCs > best) return false;
      best = r.timeCs;
      return true;
    });
}

export function courseStatistics(records, players) {
  const people = new Map(),
    nations = new Map();
  for (const r of records) {
    if (!["announced", "community-wr", "leaderboard-wr"].includes(r.status))
      continue;
    const p = players.find((p) => p.id === r.playerId);
    for (const [map, id] of [
      [people, r.playerId],
      [nations, p?.country || ""],
    ]) {
      if (!map.has(id))
        map.set(id, {
          id,
          count: 0,
          days: 0,
          durationCount: 0,
          missingDays: 0,
          intervals: {},
        });
      const row = map.get(id);
      row.count++;
      if (r.durationDays == null) row.missingDays++;
      else {
        if (r.durationIntervals) {
          (row.intervals[r.courseId || "course"] ||= []).push(
            ...r.durationIntervals,
          );
        } else row.days += r.durationDays;
        row.durationCount++;
      }
    }
  }
  for (const row of [...people.values(), ...nations.values()]) {
    for (const windows of Object.values(row.intervals)) {
      if (windows.length)
        row.days += playableDays(
          windows.map((w) => w.start).sort()[0],
          windows
            .map((w) => w.end)
            .sort()
            .at(-1),
          windows,
        );
    }
    delete row.intervals;
  }
  const list = [...people.values()];
  return {
    players: list,
    nations: [...nations.values()],
    days: list.reduce((s, p) => s + p.days, 0),
    complete: list.every((p) => !p.missingDays),
  };
}

export function historyEvents(course, tours, asOf) {
  const records = course.records.filter((r) =>
    ["announced", "community-wr", "leaderboard-wr"].includes(r.status),
  );
  const events = records.map((r) => ({
    type: "record",
    id: r.id,
    date: r.recordDate || r.tourDateRange?.end || r.announcedAt,
    record: r,
  }));
  const seen = new Set();
  for (const a of course.appearances) {
    if (seen.has(a.tourId)) continue;
    seen.add(a.tourId);
    const t = tours.find((t) => t.id === a.tourId);
    if (!t) continue;
    if (a.startDate <= asOf.slice(0, 10))
      events.push({
        type: "tour-start",
        id: `${a.tourId}-start`,
        date: a.startDate,
        name: t.name,
        source: t.source,
      });
    if (a.endDate <= asOf.slice(0, 10))
      events.push({
        type: "tour-end",
        id: `${a.tourId}-end`,
        date: a.endDate,
        name: t.name,
        source: t.source,
      });
  }
  const order = { "tour-end": 0, "tour-start": 1, record: 2 };
  const resetDates = new Set(events.filter(e => e.type !== "record").map(e => e.date.slice(0, 10)));
  const eventOrder = (event) => {
    const timestamp = event.record?.submittedAt;
    // The final tour morning is still playable until the 06:00 UTC reset.
    if (resetDates.has(event.date.slice(0, 10)) &&
        timestamp?.slice(0, 10) === event.date.slice(0, 10) &&
        timestamp.slice(11, 19) < "06:00:00") return -1;
    return order[event.type];
  };
  return events.sort(
    (a, b) =>
      a.date.slice(0, 10).localeCompare(b.date.slice(0, 10)) ||
      eventOrder(a) - eventOrder(b) ||
      (b.record?.timeCs || 0) - (a.record?.timeCs || 0),
  );
}
