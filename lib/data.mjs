import { recordedBest } from "./recorded-best.mjs";
import fs from "node:fs";
import { openingDayPublication, isHalloween2019OpeningDay, isReviewedOpeningDay } from "./opening-day.mjs";
import path from "node:path";
import { courseStatistics } from "../public/history.mjs";
import { fastestVideo, videoUrl, recordChronology, halloween2019RecordingComparison, tourRecordingComparison } from "./video.mjs";
let cached;
export function archive() {
  if (cached && process.env.NODE_ENV === "production") return cached;
  const read = (n) =>
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "public/data", n + ".json"),
        "utf8",
      ),
    );
  cached = {
    courses: read("courses"),
    players: read("players"),
    tours: read("tours"),
    manifest: read("manifest"),
    tourReviews: fs.existsSync(path.join(process.cwd(), "public/data/tour-review-status.json")) ? read("tour-review-status") : {},
  };
  return cached;
}
// Only presentation fields cross the client boundary. Complete evidence remains
// available in the downloadable archive, including unconfirmed submissions.
const pick = (value, fields) => Object.fromEntries(fields.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
const recordFields = [
  "id", "courseId", "playerId", "time", "timeCs", "finalDate", "finalDateBasis", "documentedAt", "documentedLocalTimestamp", "documentedDatePrecision", "documentedDateTimezone", "documentedDateSourceUrl", "durationBasis", "durationPrecision", "durationBounds", "durationIntervalsGuaranteed", "durationIntervalsPossible", "recordDate", "chronologyDate", "achievedAt",
  "submittedAt", "correctedReceiptAt", "earlierSubmissionReceipt", "videoSubmittedAt", "videoSubmissionSource", "videoPublishedAt", "videoRediscoveredAt", "originalVideo", "originalVideoAvailable", "videoReference", "videoReferenceReview", "videoSharedAt", "videoShareSource", "videoShareEvents", "announcedAt", "dateBasis", "dateUnresolved", "tourDateRange", "durationDays",
  "cancelledReceiptRetained", "independentResultReview", "durationIntervals", "status", "laps", "lapMatchBasis", "lapSourceDiscrepancyReview", "video", "proofImage",
  "proofImageLocal", "proofImageAvailability", "announcementOnlyProof", "documentaryProofReview", "tourLabel", "evidenceNote", "courseName", "isCurrent", "videoBackup", "videoAvailability", "videoFragments", "videoScope", "dateSourceDiscrepancyReview",
];
function forumSourceTimes(record) {
  const candidates = [record.source, ...(record.additionalSources || []),
    record.forumPerformanceSourceReview?.source];
  const seen = new Set();
  return candidates.filter(source => {
    if (!source?.url || !source.forumPostedAtDisplayed) return false;
    const key = source.url + "|" + source.forumPostedAtDisplayed;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(source => pick(source, ["url", "forumPostedAtDisplayed", "forumLastEditDisplayed", "forumTimezoneKnown"]));
}
function displayRecord(record) {
  return {
    ...pick(record, recordFields),
    ...(record.videoBackup ? {videoBackup: pick(record.videoBackup, ["url", "status", "kind"])} : {}),
    ...(record.originalSubmissionClockUnverified === true ? {submittedAt: undefined} : {}),
    ...(record.courseId === "rmx-rainbow-road-2r" && record.evidencePublishedAt >= "2022-07-27" && record.evidencePublishedAt < "2022-08-10" && record.source?.kind === "original-video-publication" ? {submittedAt: undefined, videoPublishedAt: record.evidencePublishedAt} : {}),
    ...(record.courseId === "rmx-rainbow-road-2r" && record.originalVideoPublicationReview?.metadataTimestamp === "2022-08-09T14:24:36Z" ? {videoPublishedAt: record.originalVideoPublicationReview.metadataTimestamp} : {}),
    submissionClockIsReport: record.submissionClockIsReport === true || Boolean(record.submittedAt && (/^https:\/\/(?:twitter|x)\.com\//.test(record.source?.url || "") || record.videoPublicationSource?.basis === "preserved-original-post-publication-review") &&
      (record.achievedAt || record.recordDate || record.submittedAt || "").slice(0,10) >= "2019-11-06" && (record.achievedAt || record.recordDate || record.submittedAt || "").slice(0,10) < "2022-01-13"),
    ...(record.oct26NbcSourceConflictReview?.sourceTotalsReconciled === false ? {
      nbcSourceConflict: {
        discordTime: record.oct26NbcSourceConflictReview.discordImageTotalPreviouslyRecorded,
        sheetTime: record.oct26NbcSourceConflictReview.originalLeaderboardTotal,
        forumTime: record.oct26NbcSourceConflictReview.forumReply40WrittenNbcTotal,
        discordUrl: record.oct26NbcSourceConflictReview.originalDiscordSourceUrl,
        forumUrl: record.originalForumConflictSourceReview?.sourceUrl,
      },
    } : {}),
    ...(record.originalVideoMachineTextReview?.sourceTotalsReconciled === false &&
      record.originalVideoMachineTextReview.sourceTitleTotal && record.originalVideoMachineTextReview.machineReadTotal ? {
      videoResultConflict: {
        documentedTime: record.originalVideoMachineTextReview.sourceTitleTotal,
        machineReadTime: record.originalVideoMachineTextReview.machineReadTotal,
      },
    } : {}),
    ...(record.videoScopeReview?.assessmentCarriedForward === true &&
      record.videoScopeReview.startToFinishContinuityVerified !== true ? {
      recordingContinuityPending: true,
    } : {}),
    ...(record.originalSocialPostRecoveryReview?.status === "original-post-metadata-recovered-media-content-and-total-pending" &&
      record.originalSocialPostRecoveryReview.preservedSourceSha256 &&
      Number.isFinite(record.originalSocialPostRecoveryReview.createdTimestamp) ? {
      recoveredSourcePost: {
        url: record.originalSocialPostRecoveryReview.originalUrl,
        postedAt: new Date(record.originalSocialPostRecoveryReview.createdTimestamp * 1000).toISOString(),
        resultContentsVerified: false,
      },
    } : {}),
    ...(record.originalPostSourceReview?.accountHandle === "40pairs" &&
      record.originalPostSourceReview.originalImageContentsVerified === false &&
      record.originalPostSourceReview.sourceSha256 &&
      record.originalPostSourceReview.originalUrl && record.originalPostSourceReview.postedAt ? {
      recoveredSourcePost: {
        url: record.originalPostSourceReview.originalUrl,
        postedAt: record.originalPostSourceReview.postedAt,
        resultContentsVerified: false,
      },
    } : {}),
    forumSourceTimes: forumSourceTimes(record),
    resultReportTimes: (record.resultReportEvents || [])
      .filter(event => event.reviewAudit && event.reportedAt && event.source?.url)
      .map(event => ({reportedAt: event.reportedAt, url: event.source.url,
        originalRunnerSubmission: event.originalRunnerSubmission === true,
        imageReport: event.source.kind === "original-runner-result-image-post",
        writtenTotalExplicit: event.writtenTotalExplicit})),
    sourceReportTimes: (record.additionalSources || [])
      .filter(source => source.url && source.clockReviewAudit && source.postedAt &&
        /^https:\/\/discord\.com\/channels\//.test(source.url))
      .map(source => pick(source, ["url", "postedAt", "kind"])),
    additionalSourceLinks: (record.additionalSources || []).filter(s => s.url)
      .map(s => ({url: s.url})),
    ...(videoUrl(record) ? { video: videoUrl(record) } : {}),
    ...(record.source ? { source: { url: record.source.url, ...(record.source.kind ? {kind: record.source.kind} : {}) } } : {}),
    ...(record.videoAudit ? { videoAudit: { status: record.videoAudit.status } } : {}),
  };
}
const summaryFields = ["id", "name", "country", "days", "durationCount", "missingDays", "daysMinimum", "daysMaximum", "wrCount", "bestCount"];

export function publicationArchive() {
  const raw = archive();
  return {...raw, ...openingDayPublication(raw.courses, raw.players)};
}

export function routeData(slugs = []) {
  const a = publicationArchive();
  const [section, id] = slugs;
  const ranking = ["player", "players", "rankings"].includes(section) ? a.players.map((p) => {
    const records = a.courses.flatMap((c) =>
      c.records.filter((r) => r.playerId === p.id),
    );
    const stats = courseStatistics(records, a.players).players[0] || {
      days: 0,
      durationCount: 0,
      missingDays: 0,
    };
    return {
      ...p,
      ...stats,
      id: p.id,
      wrCount: records.length,
      bestCount: a.courses.filter((c) =>
        c.currentHolders.some((r) => r.playerId === p.id),
      ).length,
    };
  }) : [];
  const index = a.courses.map((c) => ({
    id: c.id,
    name: c.name,
    sortName: c.sortName,
    image: c.image,
    current: c.current,
    currentHolders: c.currentHolders,
    recordCount: c.records.length,
    submissionCount: c.submissions.length,
  }));
  let view = "home",
    data;
  if (!section) data = index;
  else if (section === "course") {
    view = "course";
    data = a.courses.find((c) => c.id === id);
  } else if (section === "player") {
    view = "player";
    const player = ranking.find((p) => p.id === id);
    data = player
      ? {
          ...player,
          records: a.courses.flatMap((c) =>
            c.records
              .filter((r) => r.playerId === id)
              .map((r) => ({ ...r, courseName: c.name, courseId: c.id,
                isCurrent: c.currentHolders.some((holder) => holder.playerId === r.playerId && holder.timeCs === r.timeCs),
              })),
          ).sort(recordChronology),
          submissions: a.courses.flatMap((c) =>
            c.submissions
              .filter((r) => r.playerId === id)
              .map((r) => ({ ...r, courseName: c.name })),
          ),
        }
      : null;
  } else if (section === "players" || section === "rankings") {
    view = section;
    data = ranking;
  } else if (section === "tours") {
    view = "tours";
    data = a.tours.map((t) => ({
      ...t,
      review: a.tourReviews?.[t.id],
      courses: a.courses
        .filter((c) => c.appearances.some((x) => x.tourId === t.id))
        .map((c) => ({ id: c.id, name: c.name })),
    }));
  } else if (section === "archive") {
    view = "archive";
    data = a.manifest;
  } else data = null;
  if (view === "home") data = data.map(c => ({
    id: c.id, name: c.name, recordCount: c.recordCount,
    currentHolders: c.currentHolders.map(r => ({...pick(r, [
      "id", "playerId", "time", "finalDate", "videoAvailability",
      "durationDays", "durationPrecision", "durationBasis", "durationBounds", "video", "proofImage", "proofImageLocal", "videoAudit",
    ]), ...(r.durationBounds ? {durationBounds: pick(r.durationBounds, ["minDays", "maxDays", "basis"])} : {}), ...(r.videoBackup ? {videoBackup: pick(r.videoBackup, ["url", "status", "kind"])} : {})})),
  }));
  else if (view === "course" && data) {
    const selection = recordedBest(data);
    data = {
      ...pick(data, ["id", "name", "image", "wiki", "appearances"]),
      records: data.records.map(displayRecord),
      currentHolders: data.currentHolders.map(displayRecord),
      bestRecorded: selection.best ? displayRecord(selection.best) : null,
      bestHolders: selection.bestHolders.map(displayRecord),
      fastestVideo: selection.recording ? displayRecord(selection.recording) : null,
      hammerRecoveredProgression: (data.submissions || []).filter(r => r.recoveredLeaderEvidence?.tourId === "tour-14").map(displayRecord),
    };
  }
  else if (view === "player" && data) data = {
    ...pick(data, [...summaryFields, "avatar", "socials"]),
    records: data.records.map(displayRecord),
  };
  else if (view === "players" || view === "rankings") data = data.map(p => pick(p, summaryFields));

  const visiblePlayerIds = new Set(
    view === "home" ? data.flatMap(c => c.currentHolders.map(r => r.playerId)) :
    view === "course" || view === "player" ? (data?.records || []).map(r => r.playerId) :
    view === "rankings" ? data.map(p => p.id) : [],
  );
  if (view === "course" && data) for (const r of [...data.currentHolders, ...data.bestHolders, ...data.hammerRecoveredProgression, data.bestRecorded, data.fastestVideo].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  return {
    view,
    data,
    index: index.map(c => pick(c, ["id", "name", "sortName"])),
    players: archive().players.filter(p => visiblePlayerIds.has(p.id)).map(p => ({
      ...pick(p, ["id", "name", "country"]), hasProfile: a.players.some(profile => profile.id === p.id),
    })),
    tours: view === "archive" ? a.tours : view === "course" ? a.tours.filter(t => data.appearances.some(p => p.tourId === t.id)).map(t => pick(t, ["id", "name", "source"])) : [],
    manifest: view === "archive" ? a.manifest : { updatedAt: a.manifest.updatedAt },
  };
}
