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
      (tourId === "tour-83" && r.tourDateRange.start === "2022-11-15" && r.tourDateRange.end === "2022-11-29") ||
      (tourId === "tour-103" && r.tourDateRange.start === "2023-08-23" && r.tourDateRange.end === "2023-09-05") ||
      (tourId === "tour-104" && r.tourDateRange.start === "2023-09-06" && r.tourDateRange.end === "2023-09-19") ||
      (tourId === "tour-105" && r.tourDateRange.start === "2023-09-20" && r.tourDateRange.end === "2023-10-03") ||
      (tourId === "tour-106" && r.tourDateRange.start === "2023-10-04" && r.tourDateRange.end === "2023-10-17") ||
      (tourId === "tour-107" && r.tourDateRange.start === "2023-10-18" && r.tourDateRange.end === "2023-10-31") ||
      (tourId === "tour-108" && r.tourDateRange.start === "2023-11-01" && r.tourDateRange.end === "2023-11-14") ||
      (tourId === "tour-109" && r.tourDateRange.start === "2023-11-15" && r.tourDateRange.end === "2023-11-28") ||
      (tourId === "tour-110" && r.tourDateRange.start === "2023-11-29" && r.tourDateRange.end === "2023-12-12") ||
      (tourId === "tour-111" && r.tourDateRange.start === "2023-12-13" && r.tourDateRange.end === "2023-12-26") ||
      (tourId === "tour-112" && r.tourDateRange.start === "2023-12-27" && r.tourDateRange.end === "2024-01-09") ||
      (tourId === "tour-113" && r.tourDateRange.start === "2024-01-10" && r.tourDateRange.end === "2024-01-23") ||
      (tourId === "tour-114" && r.tourDateRange.start === "2024-01-24" && r.tourDateRange.end === "2024-02-06") ||
      (tourId === "tour-115" && r.tourDateRange.start === "2024-02-07" && r.tourDateRange.end === "2024-02-20") ||
      (tourId === "tour-116" && r.tourDateRange.start === "2024-02-21" && r.tourDateRange.end === "2024-03-05") ||
      (tourId === "tour-117" && r.tourDateRange.start === "2024-03-06" && r.tourDateRange.end === "2024-03-19") ||
      (tourId === "tour-118" && r.tourDateRange.start === "2024-03-20" && r.tourDateRange.end === "2024-04-02") ||
      (tourId === "tour-119" && r.tourDateRange.start === "2024-04-03" && r.tourDateRange.end === "2024-04-16") ||
      (tourId === "tour-120" && r.tourDateRange.start === "2024-04-17" && r.tourDateRange.end === "2024-04-30") ||
      (tourId === "tour-121" && r.tourDateRange.start === "2024-05-01" && r.tourDateRange.end === "2024-05-14") ||
      (tourId === "tour-122" && r.tourDateRange.start === "2024-05-15" && r.tourDateRange.end === "2024-05-28") ||
      (tourId === "tour-123" && r.tourDateRange.start === "2024-05-29" && r.tourDateRange.end === "2024-06-11") ||
      (tourId === "tour-124" && r.tourDateRange.start === "2024-06-12" && r.tourDateRange.end === "2024-06-25") ||
      (tourId === "tour-125" && r.tourDateRange.start === "2024-06-26" && r.tourDateRange.end === "2024-07-09") ||
      (tourId === "tour-126" && r.tourDateRange.start === "2024-07-10" && r.tourDateRange.end === "2024-07-23") ||
      (tourId === "tour-127" && r.tourDateRange.start === "2024-07-24" && r.tourDateRange.end === "2024-08-06") ||
      (tourId === "tour-128" && r.tourDateRange.start === "2024-08-07" && r.tourDateRange.end === "2024-08-20") ||
      (tourId === "tour-129" && r.tourDateRange.start === "2024-08-21" && r.tourDateRange.end === "2024-09-03") ||
      (tourId === "tour-130" && r.tourDateRange.start === "2024-09-04" && r.tourDateRange.end === "2024-09-17") ||
      (tourId === "tour-131" && r.tourDateRange.start === "2024-09-18" && r.tourDateRange.end === "2024-10-01") ||
      (tourId === "tour-132" && r.tourDateRange.start === "2024-10-02" && r.tourDateRange.end === "2024-10-15") ||
      (tourId === "tour-133" && r.tourDateRange.start === "2024-10-16" && r.tourDateRange.end === "2024-10-29") ||
      (tourId === "tour-134" && r.tourDateRange.start === "2024-10-30" && r.tourDateRange.end === "2024-11-12") ||
      (tourId === "tour-135" && r.tourDateRange.start === "2024-11-13" && r.tourDateRange.end === "2024-11-26") ||
      (tourId === "tour-136" && r.tourDateRange.start === "2024-11-27" && r.tourDateRange.end === "2024-12-10") ||
      (tourId === "tour-137" && r.tourDateRange.start === "2024-12-11" && r.tourDateRange.end === "2024-12-24") ||
      (tourId === "tour-138" && r.tourDateRange.start === "2024-12-25" && r.tourDateRange.end === "2025-01-07") ||
      (tourId === "tour-139" && r.tourDateRange.start === "2025-01-08" && r.tourDateRange.end === "2025-01-21") ||
      (tourId === "tour-140" && r.tourDateRange.start === "2025-01-22" && r.tourDateRange.end === "2025-02-04") ||
      (tourId === "tour-141" && r.tourDateRange.start === "2025-02-05" && r.tourDateRange.end === "2025-02-18") ||
      (tourId === "tour-142" && r.tourDateRange.start === "2025-02-19" && r.tourDateRange.end === "2025-03-04") ||
      (tourId === "tour-143" && r.tourDateRange.start === "2025-03-05" && r.tourDateRange.end === "2025-03-18") ||
      (tourId === "tour-144" && r.tourDateRange.start === "2025-03-19" && r.tourDateRange.end === "2025-04-01") ||
      (tourId === "tour-145" && r.tourDateRange.start === "2025-04-02" && r.tourDateRange.end === "2025-04-15") ||
      (tourId === "tour-146" && r.tourDateRange.start === "2025-04-16" && r.tourDateRange.end === "2025-04-29") ||
      (tourId === "tour-147" && r.tourDateRange.start === "2025-04-30" && r.tourDateRange.end === "2025-05-13") ||
      (tourId === "tour-148" && r.tourDateRange.start === "2025-05-14" && r.tourDateRange.end === "2025-05-27") ||
      (tourId === "tour-149" && r.tourDateRange.start === "2025-05-28" && r.tourDateRange.end === "2025-06-10") ||
      (tourId === "tour-150" && r.tourDateRange.start === "2025-06-11" && r.tourDateRange.end === "2025-06-24") ||
      (tourId === "tour-151" && r.tourDateRange.start === "2025-06-25" && r.tourDateRange.end === "2025-07-08") ||
      (tourId === "tour-152" && r.tourDateRange.start === "2025-07-09" && r.tourDateRange.end === "2025-07-22") ||
      (tourId === "tour-153" && r.tourDateRange.start === "2025-07-23" && r.tourDateRange.end === "2025-08-05") ||
      (tourId === "tour-154" && r.tourDateRange.start === "2025-08-06" && r.tourDateRange.end === "2025-08-19") ||
      (tourId === "tour-155" && r.tourDateRange.start === "2025-08-20" && r.tourDateRange.end === "2025-09-02") ||
      (tourId === "tour-156" && r.tourDateRange.start === "2025-09-03" && r.tourDateRange.end === "2025-09-16") ||
      (tourId === "tour-157" && r.tourDateRange.start === "2025-09-17" && r.tourDateRange.end === "2025-09-30") ||
      (tourId === "tour-158" && r.tourDateRange.start === "2025-10-01" && r.tourDateRange.end === "2025-10-14") ||
      (tourId === "tour-159" && r.tourDateRange.start === "2025-10-15" && r.tourDateRange.end === "2025-10-28"))) return true;
    const nightClock = ["tour-99", "tour-100", "tour-101", "tour-102", "tour-103", "tour-104", "tour-105", "tour-106", "tour-107", "tour-108", "tour-109", "tour-110", "tour-111", "tour-112", "tour-113", "tour-114", "tour-115", "tour-116", "tour-117", "tour-118", "tour-119", "tour-120", "tour-121", "tour-122", "tour-123", "tour-124", "tour-125", "tour-126", "tour-127", "tour-128", "tour-129", "tour-130", "tour-131", "tour-132", "tour-133", "tour-134", "tour-135", "tour-136", "tour-137", "tour-138", "tour-139", "tour-140", "tour-141", "tour-142", "tour-143", "tour-144", "tour-145", "tour-146", "tour-147", "tour-148", "tour-149", "tour-150", "tour-151", "tour-152", "tour-153", "tour-154", "tour-155", "tour-156", "tour-157", "tour-158", "tour-159"].includes(tourId) ? [r.submittedAt, r.videoPublishedAt].filter(Boolean).sort()[0] : null;
    const day = r.achievedAt || nightClock || r.recordDate || r.chronologyDate ||
      (["tour-6", "tour-7", "tour-8", "tour-9", "tour-10", "tour-11", "tour-12", "tour-13", "tour-14", "tour-15", "tour-16", "tour-17", "tour-18", "tour-19", "tour-20", "tour-21", "tour-22", "tour-23", "tour-24", "tour-25", "tour-26", "tour-27", "tour-28", "tour-29", "tour-30", "tour-31", "tour-32", "tour-33", "tour-34", "tour-35", "tour-36", "tour-37", "tour-38", "tour-39", "tour-40", "tour-41", "tour-42", "tour-43", "tour-44", "tour-45", "tour-46", "tour-47", "tour-48", "tour-49", "tour-50", "tour-51", "tour-52", "tour-53", "tour-54", "tour-55", "tour-56", "tour-57", "tour-58", "tour-59", "tour-60", "tour-61", "tour-62", "tour-63", "tour-64", "tour-65", "tour-66", "tour-67", "tour-68", "tour-69", "tour-70", "tour-71", "tour-72", "tour-73", "tour-74", "tour-75", "tour-76", "tour-77", "tour-78", "tour-79", "tour-80", "tour-81", "tour-82", "tour-83", "tour-84", "tour-85", "tour-86", "tour-87", "tour-88", "tour-89", "tour-90", "tour-91", "tour-92", "tour-93", "tour-94", "tour-95", "tour-96", "tour-97", "tour-98", "tour-99", "tour-100", "tour-101", "tour-102", "tour-103", "tour-104", "tour-105", "tour-106", "tour-107", "tour-108", "tour-109", "tour-110", "tour-111", "tour-112", "tour-113", "tour-114", "tour-115", "tour-116", "tour-117", "tour-118", "tour-119", "tour-120", "tour-121", "tour-122", "tour-123", "tour-124", "tour-125", "tour-126", "tour-127", "tour-128", "tour-129", "tour-130", "tour-131", "tour-132", "tour-133", "tour-134", "tour-135", "tour-136", "tour-137", "tour-138", "tour-139", "tour-140", "tour-141", "tour-142", "tour-143", "tour-144", "tour-145", "tour-146", "tour-147", "tour-148", "tour-149", "tour-150", "tour-151", "tour-152", "tour-153", "tour-154", "tour-155", "tour-156", "tour-157", "tour-158", "tour-159"].includes(tourId) ? r.submittedAt : null);
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
  const carriedBattleWr = tourId === "tour-106" && course.id === "snes-donut-plains-1r"
    ? (course.records || []).filter(r => r.id === "1032525641465200660" && r.timeCs === 4915) : [];
  const battleEarlierRecording = tourId === "tour-106" && course.id === "snes-donut-plains-1r"
    ? (course.records || []).filter(r => r.id === "curated-1030520974854078604-1030520974598221945-august2022-image-reviewed" && r.timeCs === 4931) : [];
  const carriedHalloween2023Wr = tourId === "tour-107" && course.id === "snes-donut-plains-3"
    ? (course.records || []).filter(r => r.id === "1039950316147322890" && r.timeCs === 5642) : [];
  const carriedAutumn2023Wr = tourId === "tour-108" && course.id === "los-angeles-laps-3"
    ? (course.records || []).filter(r => r.id === "1042970214414950400" && r.timeCs === 7878) : [];
  const carriedAnimal2023Wr = tourId === "tour-109"
    ? (course.records || []).filter(r => r.id === {"n64-choco-mountain": "curated-animal2022-1044131789247098930-choco-11837-leaderboard", "n64-yoshi-valley-r": "1053521178179932180"}[course.id]) : [];
  const animal2023EarlierRecording = tourId === "tour-109"
    ? (course.submissions || []).filter(r => r.id === {"n64-choco-mountain": "curated-789023960645369898-n64-choco-mountain", "n64-yoshi-valley-r": "curated-1046114136062439514-yoshi-valley-r-video-context"}[course.id]) : [];
  const carriedPeachBowser2023Wr = tourId === "tour-110"
    ? (course.records || []).filter(r => r.id === {"3ds-bowser-s-castle-r": "966559082955821056", "ds-peach-gardens": "1053522904882626601", "n64-royal-raceway": "896333179479285770"}[course.id]) : [];
  const carriedHoliday2023Wr = tourId === "tour-111"
    ? (course.records || []).filter(r => r.id === {"gba-snow-land": "1058253597781000283", "vancouver-velocity-3": "1058254544313782272"}[course.id]) : [];
  const carriedNewYear2024Wr = tourId === "tour-112"
    ? (course.records || []).filter(r => r.id === {"wii-koopa-cape": "1062874009567502386", "3ds-piranha-plant-slide": "1062872650449436742"}[course.id]) : [];
  const carriedSpace2024Wr = tourId === "tour-113"
    ? (course.records || []).filter(r => r.id === {"gba-cheep-cheep-island-r": "1068224700599255101", "n64-kalimari-desert-2": "1068224230715559956"}[course.id]) : [];
  // This result is attributed to the tour, but its posting after rollover earns no current-tour days.
  const lateSpace2024Wr = tourId === "tour-113" && course.id === "n64-kalimari-desert-2"
    ? (course.records || []).filter(r => r.id === "1204260087687024680" && r.documentedAt === "2024-01-24T06:03:32.560Z") : [];
  const carriedWinter2024Wr = tourId === "tour-114"
    ? (course.records || []).filter(r => r.id === {"bangkok-rush-2": "1074903912617869332", "singapore-speedway-r": "1074903599689248788", "tokyo-blur-4": "1074903169542389840"}[course.id]) : [];
  const winter2024EarlierRecording = tourId === "tour-114" && course.id === "singapore-speedway-r"
    ? (course.submissions || []).filter(r => r.id === "curated-1070619816957853726-winter2023-contender-source-reviewed") : [];
  const carriedExploration2024Wr = tourId === "tour-115"
    ? (course.records || []).filter(r => r.id === {"piranha-plant-cove": "1078514612225441792", "piranha-plant-cove-2": "1078515335923257476"}[course.id]) : [];
  const exploration2024EarlierRecording = tourId === "tour-115" && course.id === "piranha-plant-cove-2"
    ? (course.records || []).filter(r => r.id === "curated-1074269225121763338-exploration2023-original-result-reviewed") : [];
  const carriedDoctor2024Wr = tourId === "tour-116"
    ? (course.records || []).filter(r => r.id === {"ds-peach-gardens-r": "1084274701741862943", "gba-sky-garden": "1084274769643454484"}[course.id]) : [];
  const lateDoctor2024Wr = tourId === "tour-116" && course.id === "ds-peach-gardens-r"
    ? (course.records || []).filter(r => r.id === "1219694565657804833" && r.documentedAt === "2024-03-06T06:02:56.277Z") : [];
  const carriedMario2024Wr = tourId === "tour-117"
    ? (course.records || []).filter(r => r.id === {"n64-luigi-raceway": "1089607541148889108", "snes-donut-plains-3r": "1089608065063596185"}[course.id]) : [];
  const carriedNinja2024Wr = tourId === "tour-118"
    ? (course.records || []).filter(r => r.id === {"wii-rainbow-road": "1093745302051242004", "3ds-wario-shipyard": "1093745717182472272"}[course.id]) : [];
  const carriedYoshi2024Wr = tourId === "tour-119"
    ? (course.records || []).filter(r => r.id === {"gcn-yoshi-circuit": "1099918465650933810", "snes-donut-plains-2r": "1099917584113090641"}[course.id]) : [];
  const lateYoshi2024Wr = tourId === "tour-119" && course.id === "gcn-yoshi-circuit"
    ? (course.records || []).filter(r => r.id === "1232480525512343592" && r.documentedAt === "2024-04-17T06:00:40.383Z") : [];
  const carriedSpring2024Wr = tourId === "tour-120"
    ? (course.records || []).filter(r => r.id === {"athens-dash-2": "1104263861131018400", "berlin-byways": "1104263697943240844"}[course.id]) : [];
  const spring2024EarlierRecording = tourId === "tour-120" && course.id === "athens-dash-2"
    ? (course.records || []).filter(r => r.id === "curated-1102014542545956965-spring2023-recovered-accepted-result") : [];
  const carriedBowser2024Wr = tourId === "tour-121"
    ? (course.records || []).filter(r => ({"gba-bowser-s-castle-4": ["1109324308658004028"], "n64-kalimari-desert-2r": ["896334182928760863", "966540176568512563"]}[course.id] || []).includes(r.id)) : [];
  const bowser2024EarlierRecording = tourId === "tour-121" && course.id === "gba-bowser-s-castle-4"
    ? (course.submissions || []).filter(r => r.id === "curated-1106178959563046932-bowser2023-original-result-reviewed") : [];
  const carriedMii2024Wr = tourId === "tour-122"
    ? (course.records || []).filter(r => ({"wii-maple-treeway-r": ["1022593479790043236"], "gcn-mushroom-bridge": ["1114964088326471821"]}[course.id] || []).includes(r.id)) : [];
  const carriedPrincess2024Wr = tourId === "tour-123"
    ? (course.records || []).filter(r => ({"wii-coconut-mall": ["1000615548633227364"], "gba-snow-land-r": ["1124182218407944233"]}[course.id] || []).includes(r.id)) : [];
  const carriedMarioLuigi2024Wr = tourId === "tour-124" && course.id === "n64-luigi-raceway-r"
    ? (course.records || []).filter(r => r.id === "1124183833839939655") : [];
  const carriedNight2024Wr = tourId === "tour-125"
    ? (course.records || []).filter(r => r.id === {"rome-avanti-2": "1130210516791464016", "singapore-speedway": "935931716575559721", "singapore-speedway-2r": "1130210018206171236"}[course.id]) : [];
  const carriedPipe2024Wr = tourId === "tour-126"
    ? (course.records || []).filter(r => r.id === {"wii-dry-dry-ruins": "1136096968901398628", "piranha-plant-cove-2r": "1136090192722264194"}[course.id]) : [];
  const carriedSunshine2024Wr = tourId === "tour-127"
    ? (course.records || []).filter(r => r.id === {"wii-daisy-circuit": "1139362445480177824", "snes-koopa-troopa-beach-2r": "1139362790906265772"}[course.id]) : [];
  const carriedVacation2024Wr = tourId === "tour-128"
    ? (course.records || []).filter(r => ({"athens-dash": ["1147355757961031690"], "athens-dash-2r": ["1147355556978364506"], "squeaky-clean-sprint": ["1147355273481175120-phillish", "1147355273481175120-sasakikojiro"]}[course.id] || []).includes(r.id)) : [];
  const carriedSummer2024Wr = tourId === "tour-129"
    ? (course.records || []).filter(r => ({"berlin-byways-2": ["897020683991793685", "1152023809864503306"], "madrid-drive": ["1152024419473047663"], "piranha-plant-cove-3": ["1152015541180051578"]}[course.id] || []).includes(r.id)) : [];
  const carriedSundae2024Wr = tourId === "tour-130"
    ? (course.records || []).filter(r => r.id === {"gba-luigi-circuit": "1157161238137163826", "snes-vanilla-lake-2r": "1157160735848267859"}[course.id]) : [];
  const sundae2024EarlierRecording = tourId === "tour-130" && course.id === "snes-vanilla-lake-2r"
    ? (course.submissions || []).filter(r => r.id === "discord-1153813378867941447") : [];
  const carriedAnniversary2024Wr = tourId === "tour-131"
    ? (course.records || []).filter(r => r.id === {"athens-dash-3": "1162597423470878732", "madrid-drive-3": "1162598591001546913", "rome-avanti-3": "1162598789530538094"}[course.id]) : [];
  const anniversary2024EarlierRecording = tourId === "tour-131" && course.id === "athens-dash-3"
    ? (course.records || []).filter(r => r.id === "discord-1155446902016462959") : [];
  const carriedBattle2024Wr = tourId === "tour-132"
    ? (course.records || []).filter(r => r.id === {"snes-donut-plains-1r": "1032525641465200660", "snes-donut-plains-2": "1168941274380914769"}[course.id]) : [];
  const battle2024EarlierRecording = tourId === "tour-132" && course.id === "snes-donut-plains-1r"
    ? (course.records || []).filter(r => r.id === "curated-1030520974854078604-1030520974598221945-august2022-image-reviewed") : [];
  const carriedHalloween2024Wr = tourId === "tour-133" && course.id === "snes-donut-plains-3"
    ? (course.records || []).filter(r => r.id === "1039950316147322890") : [];
  const carriedAutumn2024Wr = tourId === "tour-134"
    ? (course.records || []).filter(r => ({ "los-angeles-laps-2": ["1178887189124370537"], "los-angeles-laps-3": ["1042970214414950400"] }[course.id] || []).includes(r.id)) : [];
  const carriedAnimal2024Wr = tourId === "tour-135"
    ? (course.records || []).filter(r => ({ "n64-choco-mountain": ["curated-animal2022-1044131789247098930-choco-11837-leaderboard"], "n64-yoshi-valley-r": ["1053521178179932180"] }[course.id] || []).includes(r.id)) : [];
  const animal2024EarlierRecording = tourId === "tour-135" && course.id === "n64-yoshi-valley-r"
    ? (course.submissions || []).filter(r => r.id === "curated-animal2022-nu11-M011AAJ6zGg-distinct-recording") : [];
  const carriedPeachBowser2024Wr = tourId === "tour-136"
    ? (course.records || []).filter(r => ({"3ds-bowser-s-castle-r":["966559082955821056"],"ds-peach-gardens":["1189361589913124894"],"n64-royal-raceway":["1189361686306619392"]}[course.id] || []).includes(r.id)) : [];
  const carriedHoliday2024Wr = tourId === "tour-137"
    ? (course.records || []).filter(r => ({"gba-snow-land":["1058253597781000283"],"vancouver-velocity-3":["1192533972043964436"]}[course.id] || []).includes(r.id)) : [];
  const carriedNewYear2025Wr = tourId === "tour-138"
    ? (course.records || []).filter(r => ({"wii-koopa-cape":["1197596670645518491"],"3ds-piranha-plant-slide":["1197596509772984370"]}[course.id] || []).includes(r.id)) : [];
  const carriedSpace2025Wr = tourId === "tour-139"
    ? (course.records || []).filter(r => ({"gba-cheep-cheep-island-r":["1068224700599255101"],"n64-kalimari-desert-2":["1204260087687024680","1068224230715559956"]}[course.id] || []).includes(r.id)) : [];
  const carriedWinter2025Wr = tourId === "tour-140"
    ? (course.records || []).filter(r => ({"bangkok-rush-2":["1074903912617869332"],"singapore-speedway-r":["1074903599689248788"],"tokyo-blur-4":["1209624145000792084","1074903169542389840"]}[course.id] || []).includes(r.id)) : [];
  const carriedExploration2025Wr = tourId === "tour-141"
    ? (course.records || []).filter(r => ({"piranha-plant-cove":["1078514612225441792"],"piranha-plant-cove-2":["1215068996248936541","curated-1074269225121763338-exploration2023-original-result-reviewed"]}[course.id] || []).includes(r.id)) : [];
  const carriedDoctor2025Wr = tourId === "tour-142"
    ? (course.records || []).filter(r => ({"ds-peach-gardens-r":["1219694565657804833","1084274701741862943"],"gba-sky-garden":["1219694774953443399","1084274769643454484"]}[course.id] || []).includes(r.id)) : [];
  const carriedMario2025Wr = tourId === "tour-143"
    ? (course.records || []).filter(r => ({"snes-donut-plains-3r":["1089608065063596185"],"n64-luigi-raceway":["1224448025263345876"]}[course.id] || []).includes(r.id)) : [];
  const carriedNinja2025Wr = tourId === "tour-144"
    ? (course.records || []).filter(r => ({"wii-rainbow-road":["1229525362023858277"],"3ds-wario-shipyard":["1229525504084934686","1093745717182472272"]}[course.id] || []).includes(r.id)) : [];
  const carriedYoshi2025Wr = tourId === "tour-145"
    ? (course.records || []).filter(r => ({"gcn-yoshi-circuit":["1232480525512343592"],"snes-donut-plains-2r":["1099917584113090641"]}[course.id] || []).includes(r.id)) : [];
  const carriedSpring2025Wr = tourId === "tour-146"
    ? (course.records || []).filter(r => ({"berlin-byways":["1104263697943240844"]}[course.id] || []).includes(r.id)) : [];
  const bowser2025EarlierRecording = tourId === "tour-147" && course.id === "gba-bowser-s-castle-4"
    ? (course.submissions || []).filter(r => r.id === "discord-1106178965829320746") : [];
  const carriedBowser2025Wr = tourId === "tour-147"
    ? (course.records || []).filter(r => ({"gba-bowser-s-castle-4":["1109324308658004028"],"n64-kalimari-desert-2r":["896334182928760863","966540176568512563"]}[course.id] || []).includes(r.id)) : [];
  const carriedMii2025Wr = tourId === "tour-148"
    ? (course.records || []).filter(r => ({"wii-maple-treeway-r":["1022593479790043236"],"gcn-mushroom-bridge":["1114964088326471821"]}[course.id] || []).includes(r.id)) : [];
  const carriedPrincess2025Wr = tourId === "tour-149"
    ? (course.records || []).filter(r => ({"wii-coconut-mall":["1252349131188469841"],"gba-snow-land-r":["1124182218407944233"]}[course.id] || []).includes(r.id)) : [];
  const princess2025EarlierRecording = tourId === "tour-149" && course.id === "wii-coconut-mall"
    ? (course.records || []).filter(r => r.id === "curated-1249676586463264841-princess2024-image-reviewed") : [];
  const carriedMarioLuigi2025Wr = tourId === "tour-150" && course.id === "n64-luigi-raceway-r"
    ? (course.records || []).filter(r => r.id === "1264386099934003281") : [];
  const marioLuigi2025EarlierRecording = tourId === "tour-150" && course.id === "n64-luigi-raceway-r"
    ? (course.records || []).filter(r => r.id === "curated-sucha-supplied-16vI7eIWw-4") : [];
  const carriedNight2025Wr = tourId === "tour-151"
    ? (course.records || []).filter(r => ({"rome-avanti-2":["1264395735814635612"],"singapore-speedway":["935931716575559721"],"singapore-speedway-2r":["1264395851904585738"]}[course.id] || []).includes(r.id)) : [];
  const night2025EarlierRecording = tourId === "tour-151"
    ? (course.records || []).filter(r => ({"rome-avanti-2":["1130210516791464016"],"singapore-speedway-2r":["curated-1257277274265354242-night2024-image-reviewed"]}[course.id] || []).includes(r.id)) : [];
  const carriedPipe2025Wr = tourId === "tour-152"
    ? (course.records || []).filter(r => ({"wii-dry-dry-ruins":["1136096968901398628"],"piranha-plant-cove-2r":["1274824870248845414"]}[course.id] || []).includes(r.id)) : [];
  const pipe2025EarlierRecording = tourId === "tour-152" && course.id === "piranha-plant-cove-2r"
    ? (course.records || []).filter(r => r.id === "curated-1262778386078502922-pipe2024-image-reviewed") : [];
  const carriedSunshine2025Wr = tourId === "tour-153"
    ? (course.records || []).filter(r => ({"wii-daisy-circuit":["1274825087542890606"],"snes-koopa-troopa-beach-2r":["1274825400567992371"]}[course.id] || []).includes(r.id)) : [];
  const sunshine2025EarlierRecording = tourId === "tour-153" && course.id === "snes-koopa-troopa-beach-2r"
    ? (course.submissions || []).filter(r => r.id === "curated-1269954170991935508-sunshine2024-image-reviewed") : [];
  const carriedVacation2025Wr = tourId === "tour-154"
    ? (course.records || []).filter(r => r.id === {"athens-dash":"1279827290620035093","athens-dash-2r":"1279827479288086618","squeaky-clean-sprint":"1279827694330187799"}[course.id]) : [];
  const vacation2025EarlierRecording = tourId === "tour-154"
    ? [...(course.records || []), ...(course.submissions || [])].filter(r => r.timeCs === {"athens-dash":7775,"squeaky-clean-sprint":8162}[course.id] && availableVideo(r)) : [];
  const carriedSummer2025Wr = tourId === "tour-155"
    ? (course.records || []).filter(r => ({"berlin-byways-2":["897020683991793685","1152023809864503306"],"madrid-drive":["1152024419473047663"],"piranha-plant-cove-3":["1290731431890255945"]}[course.id] || []).includes(r.id)) : [];
  const carriedSundae2025Wr = tourId === "tour-156"
    ? (course.records || []).filter(r => ({"gba-luigi-circuit":["1290731539428016141"],"snes-vanilla-lake-2r":["1157160735848267859"]}[course.id] || []).includes(r.id)) : [];
  const carriedAnniversary2025Wr = tourId === "tour-157"
    ? (course.records || []).filter(r => r.id === {"athens-dash-3":"1162597423470878732","madrid-drive-3":"1162598591001546913","rome-avanti-3":"1308276465279959090"}[course.id]) : [];
  const anniversary2025EarlierRecording = tourId === "tour-157" && course.id === "athens-dash-3"
    ? (course.records || []).filter(r => r.id === "discord-1155446902016462959") : [];
  const carriedBattle2025Wr = tourId === "tour-158"
    ? (course.records || []).filter(r => r.id === {"snes-donut-plains-1r":"1032525641465200660","snes-donut-plains-2":"1308276800647991408"}[course.id]) : [];
  const carriedHalloween2025Wr = tourId === "tour-159" && course.id === "snes-donut-plains-3"
    ? (course.records || []).filter(r => r.id === "1039950316147322890") : [];
  const wr = [...records, ...carriedSummerWr, ...carriedHolidayWr, ...carriedNightWr, ...carriedBattleWr, ...carriedHalloween2023Wr, ...carriedAutumn2023Wr, ...carriedAnimal2023Wr, ...carriedPeachBowser2023Wr, ...carriedHoliday2023Wr, ...carriedNewYear2024Wr, ...carriedSpace2024Wr, ...lateSpace2024Wr, ...carriedWinter2024Wr, ...carriedExploration2024Wr, ...carriedDoctor2024Wr, ...lateDoctor2024Wr, ...carriedMario2024Wr, ...carriedNinja2024Wr, ...carriedYoshi2024Wr, ...lateYoshi2024Wr, ...carriedSpring2024Wr, ...carriedBowser2024Wr, ...carriedMii2024Wr, ...carriedPrincess2024Wr, ...carriedMarioLuigi2024Wr, ...carriedNight2024Wr, ...carriedPipe2024Wr, ...carriedSunshine2024Wr, ...carriedVacation2024Wr, ...carriedSummer2024Wr, ...carriedSundae2024Wr, ...carriedAnniversary2024Wr, ...carriedBattle2024Wr, ...carriedHalloween2024Wr, ...carriedAutumn2024Wr, ...carriedAnimal2024Wr, ...carriedPeachBowser2024Wr, ...carriedHoliday2024Wr, ...carriedNewYear2025Wr, ...carriedSpace2025Wr, ...carriedWinter2025Wr, ...carriedExploration2025Wr, ...carriedDoctor2025Wr, ...carriedMario2025Wr, ...carriedNinja2025Wr, ...carriedYoshi2025Wr, ...carriedSpring2025Wr, ...carriedBowser2025Wr, ...carriedMii2025Wr, ...carriedPrincess2025Wr, ...carriedMarioLuigi2025Wr, ...carriedNight2025Wr, ...carriedPipe2025Wr, ...carriedSunshine2025Wr, ...carriedVacation2025Wr, ...carriedSummer2025Wr, ...carriedSundae2025Wr, ...carriedAnniversary2025Wr, ...carriedBattle2025Wr, ...carriedHalloween2025Wr].sort((a,b) => a.timeCs - b.timeCs)[0] || null;
  const recording = fastestVideo({ records: [...records, ...holidayEarlierRecording, ...carriedNightWr, ...battleEarlierRecording, ...carriedHalloween2023Wr, ...carriedAutumn2023Wr, ...animal2023EarlierRecording, ...carriedPeachBowser2023Wr, ...carriedHoliday2023Wr, ...carriedNewYear2024Wr, ...carriedSpace2024Wr, ...carriedWinter2024Wr, ...winter2024EarlierRecording, ...carriedExploration2024Wr, ...exploration2024EarlierRecording, ...carriedDoctor2024Wr, ...carriedMario2024Wr, ...carriedNinja2024Wr, ...carriedYoshi2024Wr, ...carriedSpring2024Wr, ...spring2024EarlierRecording, ...carriedBowser2024Wr, ...bowser2024EarlierRecording, ...carriedMii2024Wr, ...carriedPrincess2024Wr, ...carriedMarioLuigi2024Wr, ...carriedNight2024Wr, ...carriedPipe2024Wr, ...carriedSunshine2024Wr, ...carriedVacation2024Wr, ...carriedSummer2024Wr, ...carriedSundae2024Wr, ...sundae2024EarlierRecording, ...carriedAnniversary2024Wr, ...anniversary2024EarlierRecording, ...anniversary2025EarlierRecording, ...carriedBattle2024Wr, ...battle2024EarlierRecording, ...carriedHalloween2024Wr, ...carriedAutumn2024Wr, ...carriedAnimal2024Wr, ...animal2024EarlierRecording, ...carriedPeachBowser2024Wr, ...carriedHoliday2024Wr, ...carriedNewYear2025Wr, ...carriedSpace2025Wr, ...carriedWinter2025Wr, ...carriedExploration2025Wr, ...carriedDoctor2025Wr, ...carriedMario2025Wr, ...carriedNinja2025Wr, ...carriedYoshi2025Wr, ...carriedSpring2025Wr, ...carriedBowser2025Wr, ...carriedMii2025Wr, ...carriedPrincess2025Wr, ...carriedMarioLuigi2025Wr, ...carriedNight2025Wr, ...carriedPipe2025Wr, ...carriedSunshine2025Wr, ...carriedVacation2025Wr, ...carriedSummer2025Wr, ...carriedSundae2025Wr, ...carriedAnniversary2025Wr, ...carriedBattle2025Wr, ...carriedHalloween2025Wr, ...vacation2025EarlierRecording, ...sunshine2025EarlierRecording, ...pipe2025EarlierRecording, ...night2025EarlierRecording, ...marioLuigi2025EarlierRecording, ...princess2025EarlierRecording, ...bowser2025EarlierRecording].map(qualify),
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
  const documentedRecording = [...records, ...submissions, ...holidayEarlierRecording, ...carriedNightWr, ...battleEarlierRecording, ...carriedHalloween2023Wr, ...carriedAutumn2023Wr, ...animal2023EarlierRecording, ...carriedPeachBowser2023Wr, ...carriedHoliday2023Wr, ...carriedNewYear2024Wr, ...carriedSpace2024Wr, ...carriedWinter2024Wr, ...winter2024EarlierRecording, ...carriedExploration2024Wr, ...exploration2024EarlierRecording, ...carriedDoctor2024Wr, ...carriedMario2024Wr, ...carriedNinja2024Wr, ...carriedYoshi2024Wr, ...carriedSpring2024Wr, ...spring2024EarlierRecording, ...carriedBowser2024Wr, ...bowser2024EarlierRecording, ...carriedMii2024Wr, ...carriedPrincess2024Wr, ...carriedMarioLuigi2024Wr, ...carriedNight2024Wr, ...carriedPipe2024Wr, ...carriedSunshine2024Wr, ...carriedVacation2024Wr, ...carriedSummer2024Wr, ...carriedSundae2024Wr, ...sundae2024EarlierRecording, ...carriedAnniversary2024Wr, ...anniversary2024EarlierRecording, ...anniversary2025EarlierRecording, ...carriedBattle2024Wr, ...battle2024EarlierRecording, ...carriedHalloween2024Wr, ...carriedAutumn2024Wr, ...carriedAnimal2024Wr, ...animal2024EarlierRecording, ...carriedPeachBowser2024Wr, ...carriedHoliday2024Wr, ...carriedNewYear2025Wr, ...carriedSpace2025Wr, ...carriedWinter2025Wr, ...carriedExploration2025Wr, ...carriedDoctor2025Wr, ...carriedMario2025Wr, ...carriedNinja2025Wr, ...carriedYoshi2025Wr, ...carriedSpring2025Wr, ...carriedBowser2025Wr, ...carriedMii2025Wr, ...carriedPrincess2025Wr, ...carriedMarioLuigi2025Wr, ...carriedNight2025Wr, ...carriedPipe2025Wr, ...carriedSunshine2025Wr, ...carriedVacation2025Wr, ...carriedSummer2025Wr, ...carriedSundae2025Wr, ...carriedAnniversary2025Wr, ...carriedBattle2025Wr, ...carriedHalloween2025Wr, ...vacation2025EarlierRecording, ...sunshine2025EarlierRecording, ...pipe2025EarlierRecording, ...night2025EarlierRecording, ...marioLuigi2025EarlierRecording, ...princess2025EarlierRecording, ...bowser2025EarlierRecording]
    .filter(run => Number.isFinite(run.timeCs) && (verifiedVideo(run) || (tourId === "tour-55" && run.videoBackup?.kind === "r2-preserved-player-recovery" && run.videoBackup.verifiedTime === run.time && run.videoBackup.sha256) || (tourId === "tour-4" && run.proofImageVerified &&
        run.videoAvailability === "available" && run.videoPublicationSource?.basis?.startsWith("preserved-original-post"))) && availableVideo(run) &&
      (!run.videoScope || run.videoScope === "full-run" ||
        (["tour-110", "tour-111", "tour-112", "tour-113", "tour-114", "tour-115", "tour-116", "tour-117", "tour-118", "tour-119", "tour-120", "tour-121", "tour-122", "tour-123", "tour-124", "tour-125", "tour-126", "tour-127", "tour-128", "tour-129", "tour-130", "tour-131", "tour-132", "tour-133", "tour-134", "tour-135", "tour-136", "tour-137", "tour-138", "tour-139", "tour-140", "tour-141", "tour-142", "tour-143", "tour-144", "tour-145", "tour-146", "tour-147", "tour-148", "tour-149", "tour-150", "tour-151", "tour-152", "tour-153", "tour-154", "tour-155", "tour-156", "tour-157", "tour-158", "tour-159"].includes(tourId) && run.videoScope === "result-reviewed") ||
        (tourId === "tour-117" && run.id === "curated-1215219574576783420-mario2024-discussion-video-reviewed" && run.videoScope === "completed-result-prior-start-and-finish-reviewed") ||
        (["tour-118", "tour-144"].includes(tourId) && run.id === "1229525362023858277" && run.videoScope === "completed-result-prior-countdown-and-finish-reviewed") ||
        (tourId === "tour-119" && ((run.id === "curated-1229804749059260496-yoshi2024-image-reviewed" && run.videoScope === "completed-result-prior-start-and-finish-reviewed") || (run.id === "curated-1227638050587152384-yoshi2024-image-reviewed" && run.videoScope === "completed-result-prior-countdown-and-finish-reviewed")))) &&
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
