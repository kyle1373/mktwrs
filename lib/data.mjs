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
  "submittedAt", "videoPublishedAt", "originalVideo", "originalVideoAvailable", "videoReference", "videoReferenceReview", "videoSharedAt", "videoShareSource", "videoShareEvents", "announcedAt", "dateBasis", "dateUnresolved", "tourDateRange", "durationDays",
  "durationIntervals", "status", "laps", "lapMatchBasis", "lapSourceDiscrepancyReview", "video", "proofImage",
  "proofImageLocal", "proofImageAvailability", "tourLabel", "evidenceNote", "courseName", "isCurrent", "videoBackup", "videoAvailability", "videoFragments", "videoScope", "dateSourceDiscrepancyReview",
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
    preservedHalloweenRecordings: (data.submissions || [])
      .filter(r => data.appearances.some(a => a.tourId === "tour-3") &&
        r.videoBackup?.status === "available" && r.videoBackup?.reviewAudit?.startsWith("archive/halloween2019-") &&
        !data.records.some(record => record.videoBackup?.url === r.videoBackup.url))
      .filter((r, i, rows) => rows.findIndex(other => other.videoBackup.url === r.videoBackup.url) === i)
      .map(displayRecord).sort((a,b) => a.timeCs - b.timeCs),
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-4"]?.practicalReviewComplete === true,
          worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-5"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      winterSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate;
          return day?.slice(0,10) >= "2019-11-20" && day.slice(0,10) < "2019-12-04" &&
            r.status !== "rejected-claim" && !data.records.some(record => record.id === r.id ||
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-6"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-7"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-8"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-9"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      iceSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
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
    ...(data.appearances.some(a => a.tourId === "tour-10") ? {
      valentines2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-10", "2020-01-29", "2020-02-12");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-10"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      valentinesSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-01-29" && day.slice(0,10) < "2020-02-12" &&
            r.status !== "rejected-claim" && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-01-29"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-01-29")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-01-29") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-11") ? {
      vancouverPartialClips: JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/vancouver2020-partial-clips.json"), "utf8")).clips,
      vancouver2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-11", "2020-02-12", "2020-02-26");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-11"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      vancouverSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-02-12" && day.slice(0,10) < "2020-02-26" &&
            r.status !== "rejected-claim" && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-02-12"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-02-12")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-02-12") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-12") ? {
      mariobros2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-12", "2020-02-26", "2020-03-11");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-12"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      mariobrosSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-02-26" && day.slice(0,10) < "2020-03-11" &&
            r.status !== "rejected-claim" && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-02-26"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-02-26")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-02-26") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-13") ? {
      babyrosalina2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-13", "2020-03-11", "2020-03-25");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-13"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      babyrosalinaSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-03-11" && day.slice(0,10) < "2020-03-25" &&
            r.status !== "rejected-claim" && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-03-11"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-03-11")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-03-11") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-14") ? {
      hammer2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-14", "2020-03-25", "2020-04-08");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-14"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      hammerSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-03-25" && day.slice(0,10) < "2020-04-08" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-03-25"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-03-25")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-03-25") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-15") ? {
      yoshi2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-15", "2020-04-08", "2020-04-22");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-15"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      yoshiSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-04-08" && day.slice(0,10) < "2020-04-22" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-04-08"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-04-08")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-04-08") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-16") ? {
      trick2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-16", "2020-04-22", "2020-05-06");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-16"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      trickSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-04-22" && day.slice(0,10) < "2020-05-06" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-04-22"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-04-22")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-04-22") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-17") ? {
      flower2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-17", "2020-05-06", "2020-05-20");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-17"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      flowerSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-05-06" && day.slice(0,10) < "2020-05-20" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-05-06"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-05-06")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-05-06") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-18") ? {
      jungle2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-18", "2020-05-20", "2020-06-03");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-18"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      jungleSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-05-20" && day.slice(0,10) < "2020-06-03" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-05-20"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-05-20")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-05-20") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-19") ? {
      cooking2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-19", "2020-06-03", "2020-06-17");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-19"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      cookingSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-06-03" && day.slice(0,10) < "2020-06-17" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-06-03"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-06-03")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-06-03") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-20") ? {
      peach2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-20", "2020-06-17", "2020-07-01");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-20"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      peachSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-06-17" && day.slice(0,10) < "2020-07-01" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-06-17"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-06-17")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-06-17") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-21") ? {
      marine2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-21", "2020-07-01", "2020-07-15");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-21"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      marineSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-07-01" && day.slice(0,10) < "2020-07-15" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-07-01"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-07-01")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-07-01") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-22") ? {
      exploration2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-22", "2020-07-15", "2020-07-29");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-22"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      explorationSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-07-15" && day.slice(0,10) < "2020-07-29" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-07-15"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-07-15")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-07-15") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-23") ? {
      wildwest2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-23", "2020-07-29", "2020-08-12");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-23"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      wildwestSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-07-29" && day.slice(0,10) < "2020-08-12" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-07-29"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-07-29")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-07-29") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-24") ? {
      pirate2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-24", "2020-08-12", "2020-08-26");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-24"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      pirateSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-08-12" && day.slice(0,10) < "2020-08-26" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-08-12"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-08-12")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-08-12") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-25") ? {
      summerfest2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-25", "2020-08-26", "2020-09-09");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-25"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      summerfestSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-08-26" && day.slice(0,10) < "2020-09-09" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-08-26"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-08-26")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-08-26") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-26") ? {
      supermario2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-26", "2020-09-09", "2020-09-23");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-26"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          lateStartRecording: data.id === "n64-royal-raceway" ? displayRecord(data.submissions.find(r => r.id === "curated-753758728431599679-super-mario-verified")) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      supermarioSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-09-09" && day.slice(0,10) < "2020-09-23" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-09-09"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-09-09")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-09-09") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-27") ? {
      losangeles2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-27", "2020-09-23", "2020-10-07");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-27"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      losangelesSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-09-23" && day.slice(0,10) < "2020-10-07" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-09-23"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-09-23")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-09-23") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-28") ? {
      anniversary2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-28", "2020-10-07", "2020-10-21");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-28"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      anniversarySupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-10-07" && day.slice(0,10) < "2020-10-21" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-10-07"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-10-07")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-10-07") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-29") ? {
      halloween2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-29", "2020-10-21", "2020-11-04");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-29"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      halloween2020SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-10-21" && day.slice(0,10) < "2020-11-04" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-10-21"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-10-21")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-10-21") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-30") ? {
      sunset2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-30", "2020-11-04", "2020-11-18");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-30"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      sunsetSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-11-04" && day.slice(0,10) < "2020-11-18" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-11-04"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-11-04")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-11-04") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-31") ? {
      marioluigi2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-31", "2020-11-18", "2020-12-02");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-31"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      marioluigiSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-11-18" && day.slice(0,10) < "2020-12-02" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-11-18"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-11-18")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-11-18") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-32") ? {
      winter2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-32", "2020-12-02", "2020-12-16");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-32"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      winter2020SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-12-02" && day.slice(0,10) < "2020-12-16" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-12-02"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-12-02")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-12-02") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-33") ? {
      rosalina2020Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-33", "2020-12-16", "2020-12-30");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-33"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      rosalina2020SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-12-16" && day.slice(0,10) < "2020-12-30" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-12-16"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-12-16")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-12-16") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-34") ? {
      newyear2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-34", "2020-12-30", "2021-01-13");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-34"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      newyear2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-12-30" && day.slice(0,10) < "2021-01-13" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-12-30"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-12-30")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2020-12-30") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-35") ? {
      berlin2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-35", "2021-01-13", "2021-01-27");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-35"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      berlin2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-01-13" && day.slice(0,10) < "2021-01-27" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-01-13"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-01-13")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-01-13") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-36") ? {
      cat2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-36", "2021-01-27", "2021-02-10");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-36"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      cat2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-01-27" && day.slice(0,10) < "2021-02-10" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-01-27"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-01-27")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-01-27") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-37") ? {
      peachdaisy2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-37", "2021-02-10", "2021-02-24");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-37"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      peachdaisy2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-02-10" && day.slice(0,10) < "2021-02-24" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-02-10"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-02-10")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-02-10") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-38") ? {
      snow2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-38", "2021-02-24", "2021-03-10");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-38"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      snow2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-02-24" && day.slice(0,10) < "2021-03-10" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-02-24"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-02-24")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-02-24") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-39") ? {
      mario2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-39", "2021-03-10", "2021-03-24");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-39"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      mario2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-03-10" && day.slice(0,10) < "2021-03-24" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-03-10"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-03-10")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-03-10") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-40") ? {
      yoshi2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-40", "2021-03-24", "2021-04-07");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-40"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      yoshi2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-03-24" && day.slice(0,10) < "2021-04-07" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-03-24"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-03-24")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-03-24") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-41") ? {
      ninja2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-41", "2021-04-07", "2021-04-21");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-41"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      ninja2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-04-07" && day.slice(0,10) < "2021-04-21" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-04-07"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-04-07")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-04-07") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-42") ? {
      sydney2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-42", "2021-04-21", "2021-05-05");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-42"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      sydney2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-04-21" && day.slice(0,10) < "2021-05-05" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-04-21"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-04-21")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-04-21") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-43") ? {
      bowserdk2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-43", "2021-05-05", "2021-05-19");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-43"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      bowserdk2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-05-05" && day.slice(0,10) < "2021-05-19" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-05-05"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-05-05")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-05-05") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-44") ? {
      trick2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-44", "2021-05-19", "2021-06-02");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-44"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      trick2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-05-19" && day.slice(0,10) < "2021-06-02" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-05-19"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-05-19")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-05-19") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-45") ? {
      wedding2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-45", "2021-06-02", "2021-06-16");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-45"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      wedding2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-06-02" && day.slice(0,10) < "2021-06-16" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-06-02"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-06-02")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-06-02") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-46") ? {
      paris2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-46", "2021-06-16", "2021-06-30");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-46"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      paris2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-06-16" && day.slice(0,10) < "2021-06-30" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-06-16"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-06-16")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-06-16") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-47") ? {
      summer2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-47", "2021-06-30", "2021-07-14");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-47"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      summer2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-06-30" && day.slice(0,10) < "2021-07-14" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-06-30"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-06-30")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-06-30") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-48") ? {
      la2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-48", "2021-07-14", "2021-07-28");
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-48"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      la2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-07-14" && day.slice(0,10) < "2021-07-28" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-07-14"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-07-14")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-07-14") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-49") ? {
      mariopeach2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-49", "2021-07-28", "2021-08-11");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      mariopeach2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-07-28" && day.slice(0,10) < "2021-08-11" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-07-28"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-07-28")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-07-28") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-50") ? {
      frost2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-50", "2021-08-11", "2021-08-25");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      frost2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-08-11" && day.slice(0,10) < "2021-08-25" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-08-11"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-08-11")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-08-11") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-51") ? {
      kamek2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-51", "2021-08-25", "2021-09-08");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      kamek2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-08-25" && day.slice(0,10) < "2021-09-08" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-08-25"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-08-25")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-08-25") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-52") ? {
      sydneysep2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-52", "2021-09-08", "2021-09-22");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      sydneysep2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-09-08" && day.slice(0,10) < "2021-09-22" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-09-08"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-09-08")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-09-08") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-53") ? {
      anniversary2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-53", "2021-09-22", "2021-10-06");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      anniversary2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-09-22" && day.slice(0,10) < "2021-10-06" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-09-22"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-09-22")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-09-22") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-54") ? {
      autumn2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-54", "2021-10-06", "2021-10-20");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      autumn2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-10-06" && day.slice(0,10) < "2021-10-20" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-10-06"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-10-06")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-10-06") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-55") ? {
      halloween2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-55", "2021-10-20", "2021-11-03");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      halloween2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-10-20" && day.slice(0,10) < "2021-11-03" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-10-20"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-10-20")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-10-20") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-56") ? {
      toadette2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-56", "2021-11-03", "2021-11-17");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      toadette2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-11-03" && day.slice(0,10) < "2021-11-17" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-11-03"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-11-03")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-11-03") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-57") ? {
      space2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-57", "2021-11-17", "2021-12-01");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      space2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-11-17" && day.slice(0,10) < "2021-12-01" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-11-17"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-11-17")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-11-17") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-58") ? {
      holiday2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-58", "2021-12-01", "2021-12-15");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      holiday2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-12-01" && day.slice(0,10) < "2021-12-15" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-12-01"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-12-01")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-12-01") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-59") ? {
      penguin2021Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-59", "2021-12-15", "2021-12-29");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      penguin2021SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-12-15" && day.slice(0,10) < "2021-12-29" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-12-15"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-12-15")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-12-15") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-60") ? {
      newyear2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-60", "2021-12-29", "2022-01-12");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      newyear2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2021-12-29" && day.slice(0,10) < "2022-01-12" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2021-12-29"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2021-12-29")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2021-12-29") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-61") ? {
      singapore2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-61", "2022-01-12", "2022-01-26");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      singapore2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2022-01-12" && day.slice(0,10) < "2022-01-26" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-01-12"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-01-12")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-01-12") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-62") ? {
      wariowaluigi2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-62", "2022-01-26", "2022-02-09");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      wariowaluigi2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2022-01-26" && day.slice(0,10) < "2022-02-09" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-01-26"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-01-26")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-01-26") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-63") ? {
      losangeles2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-63", "2022-02-09", "2022-02-23");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      losangeles2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2022-02-09" && day.slice(0,10) < "2022-02-23" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-02-09"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-02-09")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-02-09") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-64") ? {
      sky2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-64", "2022-02-23", "2022-03-09");
        return {...comparison, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      sky2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2022-02-23" && day.slice(0,10) < "2022-03-09" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-02-23"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-02-23")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-02-23") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    currentHolders: data.currentHolders.map(displayRecord),
    fastestVideo: fastestVideo(data) ? displayRecord(fastestVideo(data)) : null,
    ...(data.appearances.some(a => a.tourId === "tour-3") ? {
      halloween2019Recording: (() => {
        const comparison = halloween2019RecordingComparison(data);
        return { ...comparison, practicalReviewComplete: a.tourReviews?.["tour-3"]?.practicalReviewComplete === true,
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
  if (view === "course") for (const r of [...(data.valentinesSupportingResults || []), data.valentines2020Recording?.recording, data.valentines2020Recording?.documentedRecording, ...(data.valentines2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.vancouverSupportingResults || []), data.vancouver2020Recording?.recording, data.vancouver2020Recording?.documentedRecording, ...(data.vancouver2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.mariobrosSupportingResults || []), data.mariobros2020Recording?.recording, data.mariobros2020Recording?.documentedRecording, ...(data.mariobros2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.babyrosalinaSupportingResults || []), data.babyrosalina2020Recording?.recording, data.babyrosalina2020Recording?.documentedRecording, ...(data.babyrosalina2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.hammerSupportingResults || []), data.hammer2020Recording?.recording, data.hammer2020Recording?.documentedRecording, ...(data.hammer2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.yoshiSupportingResults || []), data.yoshi2020Recording?.recording, data.yoshi2020Recording?.documentedRecording, ...(data.yoshi2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.trickSupportingResults || []), data.trick2020Recording?.recording, data.trick2020Recording?.documentedRecording, ...(data.trick2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.flowerSupportingResults || []), data.flower2020Recording?.recording, data.flower2020Recording?.documentedRecording, ...(data.flower2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.jungleSupportingResults || []), data.jungle2020Recording?.recording, data.jungle2020Recording?.documentedRecording, ...(data.jungle2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.cookingSupportingResults || []), data.cooking2020Recording?.recording, data.cooking2020Recording?.documentedRecording, ...(data.cooking2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.losangelesSupportingResults || []), data.losangeles2020Recording?.recording, data.losangeles2020Recording?.documentedRecording, ...(data.losangeles2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.anniversarySupportingResults || []), data.anniversary2020Recording?.recording, data.anniversary2020Recording?.documentedRecording, ...(data.anniversary2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.halloween2020SupportingResults || []), data.halloween2020Recording?.recording, data.halloween2020Recording?.documentedRecording, ...(data.halloween2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.sunsetSupportingResults || []), data.sunset2020Recording?.recording, data.sunset2020Recording?.documentedRecording, ...(data.sunset2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.marioluigiSupportingResults || []), data.marioluigi2020Recording?.recording, data.marioluigi2020Recording?.documentedRecording, ...(data.marioluigi2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.winter2020SupportingResults || []), data.winter2020Recording?.recording, data.winter2020Recording?.documentedRecording, ...(data.winter2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.rosalina2020SupportingResults || []), data.rosalina2020Recording?.recording, data.rosalina2020Recording?.documentedRecording, ...(data.rosalina2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.newyear2021SupportingResults || []), data.newyear2021Recording?.recording, data.newyear2021Recording?.documentedRecording, ...(data.newyear2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.berlin2021SupportingResults || []), data.berlin2021Recording?.recording, data.berlin2021Recording?.documentedRecording, ...(data.berlin2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.cat2021SupportingResults || []), data.cat2021Recording?.recording, data.cat2021Recording?.documentedRecording, ...(data.cat2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.peachdaisy2021SupportingResults || []), data.peachdaisy2021Recording?.recording, data.peachdaisy2021Recording?.documentedRecording, ...(data.peachdaisy2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.snow2021SupportingResults || []), data.snow2021Recording?.recording, data.snow2021Recording?.documentedRecording, ...(data.snow2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.mario2021SupportingResults || []), data.mario2021Recording?.recording, data.mario2021Recording?.documentedRecording, ...(data.mario2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.yoshi2021SupportingResults || []), data.yoshi2021Recording?.recording, data.yoshi2021Recording?.documentedRecording, ...(data.yoshi2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.ninja2021SupportingResults || []), data.ninja2021Recording?.recording, data.ninja2021Recording?.documentedRecording, ...(data.ninja2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.sydney2021SupportingResults || []), data.sydney2021Recording?.recording, data.sydney2021Recording?.documentedRecording, ...(data.sydney2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.bowserdk2021SupportingResults || []), data.bowserdk2021Recording?.recording, data.bowserdk2021Recording?.documentedRecording, ...(data.bowserdk2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.trick2021SupportingResults || []), data.trick2021Recording?.recording, data.trick2021Recording?.documentedRecording, ...(data.trick2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.wedding2021SupportingResults || []), data.wedding2021Recording?.recording, data.wedding2021Recording?.documentedRecording, ...(data.wedding2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.paris2021SupportingResults || []), data.paris2021Recording?.recording, data.paris2021Recording?.documentedRecording, ...(data.paris2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.summer2021SupportingResults || []), data.summer2021Recording?.recording, data.summer2021Recording?.documentedRecording, ...(data.summer2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.la2021SupportingResults || []), data.la2021Recording?.recording, data.la2021Recording?.documentedRecording, ...(data.la2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.mariopeach2021SupportingResults || []), data.mariopeach2021Recording?.recording, data.mariopeach2021Recording?.documentedRecording, ...(data.mariopeach2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.frost2021SupportingResults || []), data.frost2021Recording?.recording, data.frost2021Recording?.documentedRecording, ...(data.frost2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.kamek2021SupportingResults || []), data.kamek2021Recording?.recording, data.kamek2021Recording?.documentedRecording, ...(data.kamek2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.sydneysep2021SupportingResults || []), data.sydneysep2021Recording?.recording, data.sydneysep2021Recording?.documentedRecording, ...(data.sydneysep2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.anniversary2021SupportingResults || []), data.anniversary2021Recording?.recording, data.anniversary2021Recording?.documentedRecording, ...(data.anniversary2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.autumn2021SupportingResults || []), data.autumn2021Recording?.recording, data.autumn2021Recording?.documentedRecording, ...(data.autumn2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.halloween2021SupportingResults || []), data.halloween2021Recording?.recording, data.halloween2021Recording?.documentedRecording, ...(data.halloween2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.toadette2021SupportingResults || []), data.toadette2021Recording?.recording, data.toadette2021Recording?.documentedRecording, ...(data.toadette2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.space2021SupportingResults || []), data.space2021Recording?.recording, data.space2021Recording?.documentedRecording, ...(data.space2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.holiday2021SupportingResults || []), data.holiday2021Recording?.recording, data.holiday2021Recording?.documentedRecording, ...(data.holiday2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.penguin2021SupportingResults || []), data.penguin2021Recording?.recording, data.penguin2021Recording?.documentedRecording, ...(data.penguin2021Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.newyear2022SupportingResults || []), data.newyear2022Recording?.recording, data.newyear2022Recording?.documentedRecording, ...(data.newyear2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.singapore2022SupportingResults || []), data.singapore2022Recording?.recording, data.singapore2022Recording?.documentedRecording, ...(data.singapore2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.wariowaluigi2022SupportingResults || []), data.wariowaluigi2022Recording?.recording, data.wariowaluigi2022Recording?.documentedRecording, ...(data.wariowaluigi2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.losangeles2022SupportingResults || []), data.losangeles2022Recording?.recording, data.losangeles2022Recording?.documentedRecording, ...(data.losangeles2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.sky2022SupportingResults || []), data.sky2022Recording?.recording, data.sky2022Recording?.documentedRecording, ...(data.sky2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.supermarioSupportingResults || []), data.supermario2020Recording?.recording, data.supermario2020Recording?.documentedRecording, ...(data.supermario2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.summerfestSupportingResults || []), data.summerfest2020Recording?.recording, data.summerfest2020Recording?.documentedRecording, ...(data.summerfest2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.pirateSupportingResults || []), data.pirate2020Recording?.recording, data.pirate2020Recording?.documentedRecording, ...(data.pirate2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.wildwestSupportingResults || []), data.wildwest2020Recording?.recording, data.wildwest2020Recording?.documentedRecording, ...(data.wildwest2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.explorationSupportingResults || []), data.exploration2020Recording?.recording, data.exploration2020Recording?.documentedRecording, ...(data.exploration2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.marineSupportingResults || []), data.marine2020Recording?.recording, data.marine2020Recording?.documentedRecording, ...(data.marine2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.peachSupportingResults || []), data.peach2020Recording?.recording, data.peach2020Recording?.documentedRecording, ...(data.peach2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
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
