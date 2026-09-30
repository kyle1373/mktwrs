// Durations are the union of playable intervals intersecting a record's reign.
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
