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
    // The historical Animal announcement uses dates one day before the UTC tour window.
    if (tourId === "tour-83" && r.tourDateRange?.start === "2022-11-15" &&
        r.tourDateRange.end === "2022-11-29") return true;
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
      (tourId === "tour-30" && r.tourDateRange.end === "2020-11-17") ||
      (tourId === "tour-31" && r.tourDateRange.end === "2020-12-01") ||
      (tourId === "tour-32" && r.tourDateRange.end === "2020-12-15") ||
      (tourId === "tour-33" && r.tourDateRange.end === "2021-01-12") ||
      (tourId === "tour-34" && r.tourDateRange.end === "2021-01-12") ||
      (tourId === "tour-35" && r.tourDateRange.end === "2021-01-26") ||
      (tourId === "tour-36" && r.tourDateRange.end === "2021-02-09") ||
      (tourId === "tour-37" && r.tourDateRange.end === "2021-02-23") ||
      (tourId === "tour-38" && r.tourDateRange.end === "2021-03-09") ||
      (tourId === "tour-39" && r.tourDateRange.end === "2021-03-23") ||
      (tourId === "tour-40" && r.tourDateRange.end === "2021-04-06") ||
      (tourId === "tour-41" && r.tourDateRange.end === "2021-04-20") ||
      (tourId === "tour-42" && r.tourDateRange.end === "2021-05-04") ||
      (tourId === "tour-43" && r.tourDateRange.end === "2021-05-18") ||
      (tourId === "tour-44" && r.tourDateRange.end === "2021-06-01") ||
      (tourId === "tour-45" && r.tourDateRange.end === "2021-06-15") ||
      (tourId === "tour-46" && r.tourDateRange.end === "2021-06-29") ||
      (tourId === "tour-47" && r.tourDateRange.end === "2021-07-13") ||
      (tourId === "tour-48" && r.tourDateRange.end === "2021-07-27") ||
      (tourId === "tour-49" && r.tourDateRange.end === "2021-08-10") ||
      (tourId === "tour-50" && r.tourDateRange.end === "2021-08-24") ||
      (tourId === "tour-51" && r.tourDateRange.end === "2021-09-07") ||
      (tourId === "tour-52" && r.tourDateRange.end === "2021-09-21") ||
      (tourId === "tour-53" && r.tourDateRange.end === "2021-10-05") ||
      (tourId === "tour-54" && r.tourDateRange.end === "2021-10-19") ||
      (tourId === "tour-55" && r.tourDateRange.end === "2021-11-02") ||
      (tourId === "tour-56" && r.tourDateRange.end === "2021-11-16") ||
      (tourId === "tour-57" && r.tourDateRange.end === "2021-11-30") ||
      (tourId === "tour-58" && r.tourDateRange.end === "2021-12-14") ||
      (tourId === "tour-59" && r.tourDateRange.end === "2021-12-28") ||
      (tourId === "tour-60" && r.tourDateRange.end === "2022-01-11") ||
      (tourId === "tour-61" && r.tourDateRange.end === "2022-01-25") ||
      (tourId === "tour-62" && r.tourDateRange.end === "2022-02-08") ||
      (tourId === "tour-63" && r.tourDateRange.end === "2022-02-22") ||
      (tourId === "tour-64" && r.tourDateRange.end === "2022-03-08") ||
      (tourId === "tour-65" && r.tourDateRange.end === "2022-03-22") ||
      (tourId === "tour-66" && r.tourDateRange.end === "2022-04-05") ||
      (tourId === "tour-67" && r.tourDateRange.end === "2022-04-19") ||
      (tourId === "tour-68" && r.tourDateRange.end === "2022-05-03") ||
      (tourId === "tour-69" && r.tourDateRange.end === "2022-05-17") ||
      (tourId === "tour-70" && r.tourDateRange.end === "2022-05-31") ||
      (tourId === "tour-71" && r.tourDateRange.end === "2022-06-14") ||
      (tourId === "tour-72" && r.tourDateRange.end === "2022-06-28") ||
      (tourId === "tour-73" && r.tourDateRange.start === "2022-06-29" && r.tourDateRange.end === "2022-07-13") ||
      (tourId === "tour-74" && r.tourDateRange.start === "2022-07-13" && r.tourDateRange.end === "2022-07-27") ||
      (tourId === "tour-75" && r.tourDateRange.start === "2022-07-26" && r.tourDateRange.end === "2022-08-09") ||
      (tourId === "tour-76" && r.tourDateRange.start === "2022-08-09" && r.tourDateRange.end === "2022-08-23") ||
      (tourId === "tour-77" && r.tourDateRange.start === "2022-08-23" && r.tourDateRange.end === "2022-09-06") ||
      (tourId === "tour-79" && r.tourDateRange.start === "2022-09-20" && r.tourDateRange.end === "2022-10-04") ||
      (tourId === "tour-80" && r.tourDateRange.start === "2022-10-04" && r.tourDateRange.end === "2022-10-18") ||
      (tourId === "tour-81" && r.tourDateRange.start === "2022-10-18" && r.tourDateRange.end === "2022-11-01") ||
      (tourId === "tour-82" && r.tourDateRange.start === "2022-11-01" && r.tourDateRange.end === "2022-11-15") ||
      (tourId === "tour-83" && r.tourDateRange.start === "2022-11-15" && r.tourDateRange.end === "2022-11-29"))) return true;
    const nightClock = tourId === "tour-99" ? [r.submittedAt, r.videoPublishedAt].filter(Boolean).sort()[0] : null;
    const day = r.achievedAt || nightClock || r.recordDate || r.chronologyDate ||
      (["tour-6", "tour-7", "tour-8", "tour-9", "tour-10", "tour-11", "tour-12", "tour-13", "tour-14", "tour-15", "tour-16", "tour-17", "tour-18", "tour-19", "tour-20", "tour-21", "tour-22", "tour-23", "tour-24", "tour-25", "tour-26", "tour-27", "tour-28", "tour-29", "tour-30", "tour-31", "tour-32", "tour-33", "tour-34", "tour-35", "tour-36", "tour-37", "tour-38", "tour-39", "tour-40", "tour-41", "tour-42", "tour-43", "tour-44", "tour-45", "tour-46", "tour-47", "tour-48", "tour-49", "tour-50", "tour-51", "tour-52", "tour-53", "tour-54", "tour-55", "tour-56", "tour-57", "tour-58", "tour-59", "tour-60", "tour-61", "tour-62", "tour-63", "tour-64", "tour-65", "tour-66", "tour-67", "tour-68", "tour-69", "tour-70", "tour-71", "tour-72", "tour-73", "tour-74", "tour-75", "tour-76", "tour-77", "tour-78", "tour-79", "tour-80", "tour-81", "tour-82", "tour-83", "tour-84", "tour-85", "tour-86", "tour-87", "tour-88", "tour-89", "tour-90", "tour-91", "tour-92", "tour-93", "tour-94", "tour-95", "tour-96", "tour-97", "tour-98", "tour-99"].includes(tourId) ? r.submittedAt : null);
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
  const carriedSummerWr = tourId === "tour-47" && course.id === "ds-airship-fortress-r"
    ? (course.records || []).filter(r => (r.achievedAt || r.recordDate || r.chronologyDate || r.submittedAt || "").slice(0,10) < start && r.timeCs === 9644) : [];
  const carriedHolidayWr = tourId === "tour-58" && course.id === "n64-choco-mountain-r"
    ? (course.records || []).filter(r => r.timeCs === 7787 &&
      (r.achievedAt || r.recordDate || r.chronologyDate || r.submittedAt || "").slice(0,10) < start) : [];
  const holidayEarlierRecording = tourId === "tour-58" && course.id === "wii-maple-treeway"
    ? (course.records || []).filter(r => r.timeCs === 10616 &&
      (r.achievedAt || r.recordDate || r.chronologyDate || r.submittedAt || "").slice(0,10) < start) : [];
  const carriedNightWr = tourId === "tour-99" && course.id === "singapore-speedway"
    ? (course.records || []).filter(r => r.id === "935931716575559721" && r.timeCs === 6943) : [];
  const wr = [...records, ...carriedSummerWr, ...carriedHolidayWr, ...carriedNightWr].sort((a,b) => a.timeCs - b.timeCs)[0] || null;
  const recording = fastestVideo({ records: [...records, ...holidayEarlierRecording, ...carriedNightWr].map(qualify),
    submissions: submissions.map(qualify), currentHolders: wr ? [wr] : [] });
  // Omitted opening-day WR entries remain in submissions and may supply faster footage.
  const seen = new Set();
  const pendingRecordings = [...records, ...submissions]
    .filter(run => Number.isFinite(run.timeCs) && (!recording || run.timeCs < recording.timeCs) &&
      (!run.videoScope || run.videoScope === "full-run") &&
      (!run.videoCoverage || ["full", "full-run"].includes(run.videoCoverage)) &&
      run.photoReferenceReview?.kind !== "archived-original-result-photo-post" &&
      run.videoReferenceReview?.kind !== "archived-original-result-photo-post")
    .sort((a, b) => a.timeCs - b.timeCs)
    .filter(run => {
      const key = videoKey(videoUrl(run) || run.videoReference);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  // The practical archive also exposes prior verified result footage without
  // claiming that its uninterrupted race coverage has been freshly certified.
  const documentedRecording = [...records, ...submissions, ...holidayEarlierRecording, ...carriedNightWr]
    .filter(run => Number.isFinite(run.timeCs) && (verifiedVideo(run) || (tourId === "tour-55" && run.videoBackup?.kind === "r2-preserved-player-recovery" && run.videoBackup.verifiedTime === run.time && run.videoBackup.sha256) || (tourId === "tour-4" && run.proofImageVerified &&
        run.videoAvailability === "available" && run.videoPublicationSource?.basis?.startsWith("preserved-original-post"))) && availableVideo(run) &&
      (!run.videoScope || run.videoScope === "full-run") &&
      (!run.videoCoverage || ["full", "full-run"].includes(run.videoCoverage)))
    .sort((a,b) => a.timeCs - b.timeCs || Number(Boolean(b.videoPublishedAt)) - Number(Boolean(a.videoPublishedAt)))[0] || null;
  const comparisonRecording = recording || documentedRecording;
  const displayedVideoKeys = new Set([recording, documentedRecording]
    .filter(Boolean).map(run => videoKey(videoUrl(run) || run.videoReference)).filter(Boolean));
  const fasterPendingRecordings = pendingRecordings.filter(run =>
    (!comparisonRecording || run.timeCs < comparisonRecording.timeCs) &&
    !displayedVideoKeys.has(videoKey(videoUrl(run) || run.videoReference)));
  return { tourId, worldRecord: wr, recording, documentedRecording,
    pendingRecordings: fasterPendingRecordings, complete: false };
}

export const halloween2019RecordingComparison = course => tourRecordingComparison(course, "tour-3", "2019-10-23", "2019-11-06");

export function recordChronology(a, b) {
  const day = r => r.recordDate || r.chronologyDate || r.achievedAt || r.tourDateRange?.end || r.tourDateRange?.start || r.submittedAt || r.announcedAt || "9999";
  return day(a).slice(0, 10).localeCompare(day(b).slice(0, 10)) ||
    (a.submittedAt || a.achievedAt || "").localeCompare(b.submittedAt || b.achievedAt || "") ||
    (a.courseName || "").localeCompare(b.courseName || "") || b.timeCs - a.timeCs;
}
