export function videoKey(value) {
  try {
    const u = new URL(value);
    const host = u.hostname.replace(/^www\./, "");
    const id = host === "youtu.be" ? u.pathname.slice(1) :
      ["youtube.com", "m.youtube.com"].includes(host) ? u.searchParams.get("v") || u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1] : null;
    if (id && /^[\w-]{11}$/.test(id)) return `youtube:${id}`;
    if (["twitter.com", "x.com"].includes(host)) return `x:${u.pathname.match(/\/status\/(\d+)/)?.[1] || u.pathname}`;
    u.search = "";
    return u.href;
  } catch { return null; }
}

export function availableVideo(run) {
  if (run.videoAudit?.status === "title-time-mismatch") return false;
  if (run.videoBackup?.url && run.videoBackup.status === "available") return true;
  if (!run.video || ["unavailable", "missing"].includes(run.videoAvailability)) return false;
  return run.videoVerified === true || ["title-time-matches", "title-has-no-time"].includes(run.videoAudit?.status);
}

export function fastestVideo(course) {
  const records = course.records || [];
  // A researched personal best can supply footage without becoming a WR entry.
  const candidates = [...records, ...(course.submissions || []).filter(r => r.videoVerified === true)];
  const run = candidates.filter(r => Number.isFinite(r.timeCs) && availableVideo(r))
    .sort((a, b) => a.timeCs - b.timeCs)[0];
  if (!run) return null;
  return { ...run, isCurrent: (course.currentHolders || []).some(r => r.timeCs === run.timeCs && r.playerId === run.playerId) };
}

export function recordChronology(a, b) {
  const day = r => r.recordDate || r.achievedAt || r.tourDateRange?.end || r.tourDateRange?.start || r.submittedAt || r.announcedAt || "9999";
  return day(a).slice(0, 10).localeCompare(day(b).slice(0, 10)) ||
    (a.submittedAt || a.achievedAt || "").localeCompare(b.submittedAt || b.achievedAt || "") ||
    (a.courseName || "").localeCompare(b.courseName || "") || b.timeCs - a.timeCs;
}
