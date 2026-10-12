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
  "id", "courseId", "playerId", "time", "timeCs", "recordDate", "chronologyDate", "achievedAt",
  "submittedAt", "videoPublishedAt", "originalVideo", "originalVideoAvailable", "videoReference", "videoSharedAt", "videoShareSource", "videoShareEvents", "announcedAt", "dateBasis", "dateUnresolved", "tourDateRange", "durationDays",
  "durationIntervals", "status", "laps", "lapMatchBasis", "lapSourceDiscrepancyReview", "video", "proofImage",
  "proofImageLocal", "tourLabel", "evidenceNote", "courseName", "isCurrent", "videoBackup", "videoAvailability", "videoFragments", "videoScope", "dateSourceDiscrepancyReview",
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
    submissionClockIsReport: Boolean(record.submittedAt && (/^https:\/\/(?:twitter|x)\.com\//.test(record.source?.url || "") || record.videoPublicationSource?.basis === "preserved-original-post-publication-review") &&
      (record.achievedAt || record.recordDate || record.submittedAt || "").slice(0,10) >= "2019-11-06" && (record.achievedAt || record.recordDate || record.submittedAt || "").slice(0,10) < "2020-01-29"),
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
    ...(record.source ? { source: { url: record.source.url } } : {}),
    ...(record.videoAudit ? { videoAudit: { status: record.videoAudit.status } } : {}),
  };
}
const summaryFields = ["id", "name", "country", "days", "durationCount", "missingDays", "wrCount", "bestCount"];

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
    currentHolders: c.currentHolders.map(r => pick(r, [
      "id", "playerId", "time", "recordDate", "chronologyDate", "achievedAt", "dateBasis", "tourDateRange",
      "durationDays", "video", "proofImage", "proofImageLocal", "videoAudit", "videoBackup",
    ])),
  }));
  else if (view === "course" && data) data = {
    ...pick(data, ["id", "name", "image", "wiki", "appearances"]),
    records: data.records.map(displayRecord),
    halloweenSupportingResults: (data.submissions || [])
      .filter(r => r.messageId?.startsWith("forum-halloween2019-") || r.messageId?.startsWith("halloween2019-original-") ||
        (r.id?.startsWith("sheet-") && r.achievedAt?.slice(0,10) >= "2019-10-23" && r.achievedAt?.slice(0,10) < "2019-11-06") ||
        (data.appearances.some(a => a.tourId === "tour-3") &&
          !data.records.some(record => record.id === r.id ||
            (record.playerId === r.playerId && record.timeCs === r.timeCs &&
              (record.resultReportEvents || []).some(report => report.reviewAudit &&
                report.source?.url && (r.resultReportEvents || []).some(event =>
                  event.reviewAudit && event.source?.url === report.source.url &&
                  event.reportedAt === report.reportedAt)))) &&
          (r.resultReportEvents || []).some(event =>
            event.reviewAudit?.startsWith("archive/halloween2019-") && event.source?.url &&
            Date.parse(event.reportedAt) >= Date.parse("2019-10-24T06:00:00Z") &&
            Date.parse(event.reportedAt) < Date.parse("2019-11-06T06:00:00Z"))))
      .concat((data.submissions || []).filter(r =>
        r.messageId?.startsWith("halloween2019-menu-") &&
        !data.records.some(record => record.id === r.id) &&
        (r.additionalSources || []).some(source =>
          source.kind === "archived-cup-menu-image-post" && source.clockReviewAudit && source.url &&
          Date.parse(source.postedAt) >= Date.parse("2019-10-24T06:00:00Z") &&
          Date.parse(source.postedAt) < Date.parse("2019-11-06T06:00:00Z"))))
      .filter(r => r.status !== "rejected-claim" && !isHalloween2019OpeningDay(r))
      .filter((r, i, rows) => rows.findIndex(other => other.id === r.id) === i)
      .map(displayRecord).sort((a,b) => a.timeCs - b.timeCs),
    ...(data.appearances.some(a => a.tourId === "tour-4") ? {
      paris2019Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-4", "2019-11-06", "2019-11-20");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      parisSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate;
          return day?.slice(0,10) >= "2019-11-06" && day.slice(0,10) < "2019-11-20" &&
            r.status !== "rejected-claim" && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2019-11-06"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2019-11-06")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2019-11-06") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-5") ? {
      winter2019Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-5", "2019-11-20", "2019-12-04");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      winterSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate;
          return day?.slice(0,10) >= "2019-11-20" && day.slice(0,10) < "2019-12-04" &&
            !r.id?.startsWith("curated-647634922776821764-") && r.status !== "rejected-claim" && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2019-11-20"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2019-11-20")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2019-11-20") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-6") ? {
      london2019Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-6", "2019-12-04", "2019-12-18");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      londonSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt;
          return day?.slice(0,10) >= "2019-12-04" && day.slice(0,10) < "2019-12-18" &&
            r.status !== "rejected-claim" && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2019-12-04"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2019-12-04")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2019-12-04") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-7") ? {
      holiday2019Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-7", "2019-12-18", "2020-01-01");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      holidaySupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt;
          return day?.slice(0,10) >= "2019-12-18" && day.slice(0,10) < "2020-01-01" &&
            r.status !== "rejected-claim" && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2019-12-18"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2019-12-18")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2019-12-18") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-8") ? {
      newyear2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-8", "2020-01-01", "2020-01-15");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      newyearSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt;
          return day?.slice(0,10) >= "2020-01-01" && day.slice(0,10) < "2020-01-15" &&
            r.status !== "rejected-claim" && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-01-01"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-01-01")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-01-01") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-9") ? {
      ice2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-9", "2020-01-15", "2020-01-29");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      iceSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt;
          return day?.slice(0,10) >= "2020-01-15" && day.slice(0,10) < "2020-01-29" &&
            r.status !== "rejected-claim" && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-01-15"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-01-15")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-01-15") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    currentHolders: data.currentHolders.map(displayRecord),
    fastestVideo: fastestVideo(data) ? displayRecord(fastestVideo(data)) : null,
    ...(data.appearances.some(a => a.tourId === "tour-3") ? {
      halloween2019Recording: (() => {
        const comparison = halloween2019RecordingComparison(data);
        return { ...comparison,
          worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord) };
      })(),
    } : {}),
  };
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
  if (view === "course") for (const r of data?.halloweenSupportingResults || []) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.parisSupportingResults || []), data.paris2019Recording?.recording, data.paris2019Recording?.documentedRecording, ...(data.paris2019Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.winterSupportingResults || []), data.winter2019Recording?.recording, data.winter2019Recording?.documentedRecording, ...(data.winter2019Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.londonSupportingResults || []), data.london2019Recording?.recording, data.london2019Recording?.documentedRecording, ...(data.london2019Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.holidaySupportingResults || []), data.holiday2019Recording?.recording, data.holiday2019Recording?.documentedRecording, ...(data.holiday2019Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.newyearSupportingResults || []), data.newyear2020Recording?.recording, data.newyear2020Recording?.documentedRecording, ...(data.newyear2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.iceSupportingResults || []), data.ice2020Recording?.recording, data.ice2020Recording?.documentedRecording, ...(data.ice2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course" && data?.halloween2019Recording?.recording) visiblePlayerIds.add(data.halloween2019Recording.recording.playerId);
  if (view === "course") for (const r of data?.halloween2019Recording?.pendingRecordings || []) visiblePlayerIds.add(r.playerId);
  if (view === "course" && data?.fastestVideo) visiblePlayerIds.add(data.fastestVideo.playerId);
  return {
    view,
    data,
    index: index.map(c => pick(c, ["id", "name", "sortName"])),
    players: archive().players.filter(p => visiblePlayerIds.has(p.id)).map(p => ({
      ...pick(p, ["id", "name", "country"]), hasProfile: a.players.some(profile => profile.id === p.id),
    })),
    tours: view === "archive" ? a.tours : view === "course" && data
      ? a.tours.filter(t => data.appearances.some(a => a.tourId === t.id)) : [],
    manifest: view === "archive" ? a.manifest : { updatedAt: a.manifest.updatedAt },
  };
}
