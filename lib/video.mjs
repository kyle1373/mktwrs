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

export function videoUrl(run) {
  return run.video || run.proofVideoUrl || null;
}

export function verifiedVideo(run) {
  return run.videoVerified === true || run.proofVideoVerified === true;
}

export function availableVideo(run) {
  if (run.videoAudit?.status === "title-time-mismatch") return false;
  if (run.videoBackup?.url && run.videoBackup.status === "available") return true;
  if (!videoUrl(run) || ["unavailable", "missing"].includes(run.videoAvailability)) return false;
  return verifiedVideo(run) || ["title-time-matches", "title-has-no-time"].includes(run.videoAudit?.status);
}

export function fastestVideo(course) {
  const records = course.records || [];
  // A researched personal best can supply footage without becoming a WR entry.
  const candidates = [...records, ...(course.submissions || [])];
  // A duplicate submission must not bypass the footage's recorded limitations.
  const incomplete = r =>
    (r.videoScope && r.videoScope !== "full-run") ||
    (r.videoCoverage && !["full", "full-run"].includes(r.videoCoverage)) ||
    r.videoScopeReview?.startToFinishContinuityVerified === false;
  const excludedFootage = new Set(candidates.filter(incomplete)
    .map(r => videoKey(videoUrl(r))).filter(Boolean));
  const run = candidates.filter(r => !incomplete(r) &&
    !excludedFootage.has(videoKey(videoUrl(r))) &&
    Number.isFinite(r.timeCs) && verifiedVideo(r) && availableVideo(r) &&
    // Verified finish evidence can identify a result without preserving the complete race.
    (!r.videoScope || r.videoScope === "full-run") &&
    (!r.videoCoverage || ["full", "full-run"].includes(r.videoCoverage)))
    .sort((a, b) => a.timeCs - b.timeCs ||
      // Keep researched provenance when the same footage also came from a sheet.
      Number(Boolean(b.id?.startsWith("curated-"))) - Number(Boolean(a.id?.startsWith("curated-"))))[0];
  if (!run) return null;
  return { ...run, isCurrent: (course.currentHolders || []).some(r => r.timeCs === run.timeCs && r.playerId === run.playerId) };
}

export function tourRecordingComparison(course, tourId, start, end) {
  const within = r => {
    if (r.tourDateRange?.start === start && (r.tourDateRange?.end === end ||
      (tourId === "tour-10" && r.tourDateRange.end === "2020-02-11") ||
      (tourId === "tour-11" && r.tourDateRange.end === "2020-02-25") ||
      (tourId === "tour-12" && r.tourDateRange.end === "2020-03-10") ||
      (tourId === "tour-13" && r.tourDateRange.end === "2020-03-24") ||
      (tourId === "tour-14" && r.tourDateRange.end === "2020-04-07") ||
      (tourId === "tour-15" && r.tourDateRange.end === "2020-04-21") ||
      (tourId === "tour-16" && r.tourDateRange.end === "2020-05-05") ||
      (tourId === "tour-17" && r.tourDateRange.end === "2020-05-19") ||
      (tourId === "tour-18" && r.tourDateRange.end === "2020-06-02") ||
      (tourId === "tour-19" && r.tourDateRange.end === "2020-06-16") ||
      (tourId === "tour-20" && r.tourDateRange.end === "2020-06-30") ||
      (tourId === "tour-21" && r.tourDateRange.end === "2020-07-14") ||
      (tourId === "tour-22" && r.tourDateRange.end === "2020-07-28") ||
      (tourId === "tour-23" && r.tourDateRange.end === "2020-08-11") ||
      (tourId === "tour-24" && r.tourDateRange.end === "2020-08-25") ||
      (tourId === "tour-25" && r.tourDateRange.end === "2020-09-08") ||
      (tourId === "tour-26" && r.tourDateRange.end === "2020-09-22") ||
      (tourId === "tour-27" && r.tourDateRange.end === "2020-10-06") ||
      (tourId === "tour-28" && r.tourDateRange.end === "2020-10-20") ||
      (tourId === "tour-29" && r.tourDateRange.end === "2020-11-03") ||
      (tourId === "tour-30" && r.tourDateRange.end === "2020-11-17"))) return true;
    const day = r.achievedAt || r.recordDate || r.chronologyDate ||
      (["tour-6", "tour-7", "tour-8", "tour-9", "tour-10", "tour-11", "tour-12", "tour-13", "tour-14", "tour-15", "tour-16", "tour-17", "tour-18", "tour-19", "tour-20", "tour-21", "tour-22", "tour-23", "tour-24", "tour-25", "tour-26", "tour-27", "tour-28", "tour-29", "tour-30"].includes(tourId) ? r.submittedAt : null);
    if (!day) return false;
    // Tour rollover occurs at 06:00 UTC, not at calendar midnight.
    if (/T/.test(day)) {
      const timestamp = Date.parse(day);
      return Number.isFinite(timestamp) && timestamp >= Date.parse(start + "T06:00:00Z") &&
        timestamp < Date.parse(end + "T06:00:00Z");
    }
    // A date-only closing day cannot establish which side of rollover the run belongs to.
    return day.slice(0, 10) >= start && day.slice(0, 10) < end;
  };
  const records = (course.records || []).filter(within);
  const submissions = (course.submissions || []).filter(within);
  const qualify = r => r.videoScope === "full-run" ? r :
    { ...r, videoVerified: false, proofVideoVerified: false };
  const wr = [...records].sort((a,b) => a.timeCs - b.timeCs)[0] || null;
  const recording = fastestVideo({ records: records.map(qualify),
    submissions: submissions.map(qualify), currentHolders: wr ? [wr] : [] });
  // Omitted opening-day WR entries remain in submissions and may supply faster footage.
  const seen = new Set();
  const pendingRecordings = [...records, ...submissions]
    .filter(run => Number.isFinite(run.timeCs) && (!recording || run.timeCs < recording.timeCs) &&
      (!run.videoScope || run.videoScope === "full-run") &&
      (!run.videoCoverage || ["full", "full-run"].includes(run.videoCoverage)) &&
      run.photoReferenceReview?.kind !== "archived-original-result-photo-post")
    .sort((a, b) => a.timeCs - b.timeCs)
    .filter(run => {
      const key = videoKey(videoUrl(run) || run.videoReference);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  // The practical archive also exposes prior verified result footage without
  // claiming that its uninterrupted race coverage has been freshly certified.
  const documentedRecording = [...records, ...submissions]
    .filter(run => Number.isFinite(run.timeCs) && (verifiedVideo(run) || (tourId === "tour-4" && run.proofImageVerified &&
        run.videoAvailability === "available" && run.videoPublicationSource?.basis?.startsWith("preserved-original-post"))) && availableVideo(run) &&
      (!run.videoScope || run.videoScope === "full-run") &&
      (!run.videoCoverage || ["full", "full-run"].includes(run.videoCoverage)))
    .sort((a,b) => a.timeCs - b.timeCs || Number(Boolean(b.videoPublishedAt)) - Number(Boolean(a.videoPublishedAt)))[0] || null;
  return { tourId, worldRecord: wr, recording, documentedRecording,
    pendingRecordings, complete: false };
}

export const halloween2019RecordingComparison = course => tourRecordingComparison(course, "tour-3", "2019-10-23", "2019-11-06");

export function recordChronology(a, b) {
  const day = r => r.recordDate || r.chronologyDate || r.achievedAt || r.tourDateRange?.end || r.tourDateRange?.start || r.submittedAt || r.announcedAt || "9999";
  return day(a).slice(0, 10).localeCompare(day(b).slice(0, 10)) ||
    (a.submittedAt || a.achievedAt || "").localeCompare(b.submittedAt || b.achievedAt || "") ||
    (a.courseName || "").localeCompare(b.courseName || "") || b.timeCs - a.timeCs;
}
