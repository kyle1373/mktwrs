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
  "submittedAt", "correctedReceiptAt", "earlierSubmissionReceipt", "videoSubmittedAt", "videoSubmissionSource", "videoPublishedAt", "originalVideo", "originalVideoAvailable", "videoReference", "videoReferenceReview", "videoSharedAt", "videoShareSource", "videoShareEvents", "announcedAt", "dateBasis", "dateUnresolved", "tourDateRange", "durationDays",
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
        const referenceRecording = (data.submissions || []).find(r => r.id === "curated-hammer2020-kaguya-13133-original-announcement-reference");
        return {...comparison, referenceRecording: referenceRecording ? displayRecord(referenceRecording) : null,
          referenceRecordingLabel: "Closest recorded time reported by the WR announcement (video unavailable): ", practicalReviewComplete: a.tourReviews?.["tour-14"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.filter(r => r.id !== referenceRecording?.id).map(displayRecord)};
      })(),
      hammerRecoveredProgression: (data.submissions || []).filter(r => r.recoveredLeaderEvidence?.tourId === "tour-14")
        .map(r => ({...displayRecord(r), recoveredLeaderEvidence: r.recoveredLeaderEvidence,
          recordDate: r.recoveredLeaderEvidence.publishedAt.slice(0, 10),
          submittedAt: r.submittedAt || r.recoveredLeaderEvidence.publishedAt,
          dateBasis: "recovered-source-publication", durationDays: null, durationIntervals: null}))
        .sort(recordChronology),
      hammerSupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2020-03-25" && day.slice(0,10) < "2020-04-08" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !r.recoveredLeaderEvidence && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2020-03-25"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2020-03-25")).map(r => r.timeCs), ...(data.submissions || []).filter(r => r.recoveredLeaderEvidence?.tourId === "tour-14" && isReviewedOpeningDay(r, "2020-03-25")).map(r => r.timeCs));
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-49"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-50"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-51"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-52"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-53"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-54"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-55"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-56"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-57"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-58"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-59"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-60"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-61"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-62"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-63"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-64"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
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
    ...(data.appearances.some(a => a.tourId === "tour-65") ? {
      mii2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-65", "2022-03-09", "2022-03-23");
        if (data.id === "rmx-rainbow-road-1") {
          const preserved = data.submissions.find(r => r.timeCs === 7882 && r.playerId === "nu11" && r.videoBackup?.status === "available");
          if (preserved) comparison.documentedRecording = preserved;
        }
        if (comparison.documentedRecording && !comparison.recording) {
          comparison.recording = {...comparison.documentedRecording, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        // Previously reviewed complete recordings are not unresolved faster references.
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && (!comparison.documentedRecording || r.timeCs < comparison.documentedRecording.timeCs));
        if (data.id === "n64-kalimari-desert-2r") {
          const earlier = data.records.find(r => r.playerId === "kazuo" && r.timeCs === 6430 && r.videoScope === "full-run");
          // Hilton's Mii tie has result proof; Kazuo's earlier race supplies footage.
          if (earlier) {
            comparison.recording = earlier;
            comparison.documentedRecording = earlier;
            comparison.pendingRecordings = comparison.pendingRecordings.filter(r => r.timeCs < earlier.timeCs);
          }
        }
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-65"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      mii2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2022-03-09" && day.slice(0,10) < "2022-03-23" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-03-09"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-03-09")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-03-09") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-66") ? {
      samurai2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-66", "2022-03-23", "2022-04-06");
        const targetTime = data.id === "rmx-vanilla-lake-1" ? 6222 : 9736;
        const preserved = data.submissions.find(r => r.timeCs === targetTime && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && (!preserved || r.timeCs < preserved.timeCs));
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-66"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      samurai2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2022-03-23" && day.slice(0,10) < "2022-04-06" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-03-23"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-03-23")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-03-23") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-67") ? {
      yoshi2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-67", "2022-04-06", "2022-04-20");
        const targetTime = data.id === "gba-sky-garden" ? 6413 : 9839;
        const preserved = data.submissions.find(r => r.timeCs === targetTime && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && (!preserved || r.timeCs < preserved.timeCs));
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-67"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      yoshi2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2022-04-06" && day.slice(0,10) < "2022-04-20" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-04-06"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-04-06")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-04-06") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-68") ? {
      amsterdam2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-68", "2022-04-20", "2022-05-04");
        const targetTime = data.id === "snes-choco-island-1r" ? 4066 : 8137;
        const preserved = data.submissions.find(r => r.timeCs === targetTime && r.submittedAt && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && (!preserved || r.timeCs < preserved.timeCs));
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-68"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      amsterdam2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2022-04-20" && day.slice(0,10) < "2022-05-04" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-04-20"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-04-20")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-04-20") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-69") ? {
      doctor2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-69", "2022-05-04", "2022-05-18");
        const targetTime = data.id === "gba-cheep-cheep-island" ? 7175 : 7995;
        const preserved = data.submissions.find(r => r.timeCs === targetTime && r.submittedAt && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && (!preserved || r.timeCs < preserved.timeCs));
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-69"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      doctor2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day?.slice(0,10) >= "2022-05-04" && day.slice(0,10) < "2022-05-18" &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-05-04"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-05-04")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-05-04") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-70") ? {
      peachbowsermay2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-70", "2022-05-18", "2022-06-01");
        const targetTime = data.id === "n64-koopa-troopa-beach-r" ? 7502 : 6982;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && r.submittedAt && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-70"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      peachbowsermay2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-05-18T06:00:00Z") && Date.parse(day) < Date.parse("2022-06-01T06:00:00Z") : day >= "2022-05-18" && day < "2022-06-01") &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-05-18"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-05-18")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-05-18") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-71") ? {
      cat2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-71", "2022-06-01", "2022-06-15");
        const targetTime = data.id === "n64-frappe-snowland-r" ? 8034 : 9018;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && r.submittedAt && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-71"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      cat2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-06-01T06:00:00Z") && Date.parse(day) < Date.parse("2022-06-15T06:00:00Z") : day >= "2022-06-01" && day < "2022-06-15") &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-06-01"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-06-01")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-06-01") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-72") ? {
      metropolitan2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-72", "2022-06-15", "2022-06-29");
        const targetTime = data.id === "amsterdam-drift" ? 8133 : 7469;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && r.submittedAt && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-72"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      metropolitan2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-06-15T06:00:00Z") && Date.parse(day) < Date.parse("2022-06-29T06:00:00Z") : day >= "2022-06-15" && day < "2022-06-29") &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-06-15"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-06-15")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-06-15") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-73") ? {
      bangkok2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-73", "2022-06-29", "2022-07-13");
        const targetTime = data.id === "wii-coconut-mall" ? 7436 : 6116;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && r.submittedAt && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-73"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      bangkok2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-06-29T06:00:00Z") && Date.parse(day) < Date.parse("2022-07-13T06:00:00Z") : day >= "2022-06-29" && day < "2022-07-13") &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-06-29"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-06-29")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-06-29") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-74") ? {
      piranha2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-74", "2022-07-13", "2022-07-27");
        const targetTime = 4036;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && r.submittedAt && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-74"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      piranha2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-07-13T06:00:00Z") && Date.parse(day) < Date.parse("2022-07-27T06:00:00Z") : day >= "2022-07-13" && day < "2022-07-27") &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-07-13"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-07-13")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-07-13") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-75") ? {
      ocean2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-75", "2022-07-27", "2022-08-10");
        const targetTime = 8120;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-75"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      ocean2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-07-27T06:00:00Z") && Date.parse(day) < Date.parse("2022-08-10T06:00:00Z") : day >= "2022-07-27" && day < "2022-08-10") &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-07-27"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-07-27")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-07-27") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-76") ? {
      sundae2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-76", "2022-08-10", "2022-08-24");
        if (data.id === "3ds-bowser-s-castle") {
          const final = data.records.find(r => r.id === "1012410645930594304" && r.evidencePublishedAt === "2022-08-24T02:15:14.512Z");
          if (final) comparison.worldRecord = final;
        }
        const targetTime = data.id === "3ds-bowser-s-castle" ? 9516 : 8958;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-76"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      sundae2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-08-10T06:00:00Z") && Date.parse(day) < Date.parse("2022-08-24T06:00:00Z") : day >= "2022-08-10" && day < "2022-08-24") &&
            !["rejected-claim", "rejected-submission"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-08-10"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-08-10")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-08-10") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-77") ? {
      bowser2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-77", "2022-08-24", "2022-09-07");
        if (data.id === "gba-bowser-s-castle-3") {
          const final = data.records.find(r => r.id === "1017647577296027732" && r.videoPublishedAt === "2022-09-04T04:17:26Z");
          if (final) comparison.worldRecord = final;
        }
        const targetTime = data.id === "gba-bowser-s-castle-3" ? 8586 : 4849;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-77"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      bowser2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-08-24T06:00:00Z") && Date.parse(day) < Date.parse("2022-09-07T06:00:00Z") : day >= "2022-08-24" && day < "2022-09-07") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-08-24"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-08-24")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-08-24") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-78") ? {
      marioluigi2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-78", "2022-09-07", "2022-09-21");
        if (data.id === "ds-dk-pass") comparison.worldRecord = data.records.find(r => r.id === "896333065431965716") || null;
        const targetTime = {"ds-dk-pass": 9156, "wii-dk-summit": 9281, "wii-maple-treeway-r": 11037}[data.id];
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-78"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      marioluigi2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-09-07T06:00:00Z") && Date.parse(day) < Date.parse("2022-09-21T06:00:00Z") : day >= "2022-09-07" && day < "2022-09-21") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-09-07"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-09-07")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-09-07") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-79") ? {
      anniversary2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-79", "2022-09-21", "2022-10-05");
        if (data.id === "berlin-byways-3") comparison.worldRecord = data.records.find(r => r.id === "1028138576740876369") || comparison.worldRecord;
        const targetTime = data.id === "berlin-byways-3" ? 7432 : 8299;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, dateBoundaryNote: data.id === "berlin-byways-3" ? "The final announcement assigns 1:14.32 to Anniversary Tour. Its video and screenshot were published after the October 5 06:00 UTC rollover; the exact race time relative to rollover is unconfirmed." : null, practicalReviewComplete: a.tourReviews?.["tour-79"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      anniversary2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-09-21T06:00:00Z") && Date.parse(day) < Date.parse("2022-10-05T06:00:00Z") : day >= "2022-09-21" && day < "2022-10-05") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-09-21"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-09-21")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-09-21") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-80") ? {
      battle2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-80", "2022-10-05", "2022-10-19");
        const targetTime = data.id === "snes-donut-plains-1r" ? 4931 : 6061;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-80"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      battle2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-10-05T06:00:00Z") && Date.parse(day) < Date.parse("2022-10-19T06:00:00Z") : day >= "2022-10-05" && day < "2022-10-19") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-10-05"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-10-05")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-10-05") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-81") ? {
      halloween2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-81", "2022-10-19", "2022-11-02");
        const targetTime = 5642;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-81"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      halloween2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-10-19T06:00:00Z") && Date.parse(day) < Date.parse("2022-11-02T06:00:00Z") : day >= "2022-10-19" && day < "2022-11-02") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-10-19"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-10-19")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-10-19") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-82") ? {
      autumn2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-82", "2022-11-02", "2022-11-16");
        const targetTime = data.id === "los-angeles-laps-2" ? 7346 : 7878;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, practicalReviewComplete: a.tourReviews?.["tour-82"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      autumn2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-11-02T06:00:00Z") && Date.parse(day) < Date.parse("2022-11-16T06:00:00Z") : day >= "2022-11-02" && day < "2022-11-16") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-11-02"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-11-02")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-11-02") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-83") ? {
      animal2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-83", "2022-11-16", "2022-11-30");
        const targetTime = data.id === "n64-choco-mountain" ? 7893 : 9067;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        const reportedRecording = data.id === "n64-yoshi-valley-r" ? data.submissions.find(r => r.id === "curated-animal2022-nu11-M011AAJ6zGg-distinct-recording") : null;
        return {...comparison, reportedRecording: reportedRecording ? displayRecord(reportedRecording) : null, dateBoundaryNote: data.id === "n64-choco-mountain" ? "The November 21 leaderboard documents 1:18.37 under Kaguya, mapped to Nu11 in the preserved sheet. Its original achievement date is unknown; it may have been carried into this tour. The linked SuperFX video records 1:18.93, rather than the leaderboard’s 1:18.85." : "The December 17 announcement assigns Nu11’s 1:30.47 to Animal Tour. Its individual screenshot is unavailable and the original achievement date is unknown. The linked November 29 video is a separate 1:30.62 recording; the uploader says the faster WR was not recorded.", practicalReviewComplete: a.tourReviews?.["tour-83"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      animal2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-11-16T06:00:00Z") && Date.parse(day) < Date.parse("2022-11-30T06:00:00Z") : day >= "2022-11-16" && day < "2022-11-30") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-11-16"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-11-16")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-11-16") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-84") ? {
      peachbowser2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-84", "2022-11-30", "2022-12-14");
        const targetTime = data.id === "3ds-bowser-s-castle-r" ? 9839 : data.id === "n64-royal-raceway" ? 9487 : 0;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        const carriedTime = data.id === "3ds-bowser-s-castle-r" ? 9839 : data.id === "n64-royal-raceway" ? 9397 : null;
        if (carriedTime) comparison.worldRecord = data.records.find(r => r.playerId === "nu11" && r.timeCs === carriedTime);
        const reportedId = data.id === "ds-peach-gardens" ? "curated-1047419747987361794-1047419747802808371-august2022-image-reviewed" : data.id === "n64-royal-raceway" ? "discord-1049375898488541204" : null;
        const reportedRecording = reportedId ? data.submissions.find(r => r.id === reportedId) : null;
        return {...comparison, reportedRecording: reportedRecording ? displayRecord(reportedRecording) : null, dateBoundaryNote: data.id === "ds-peach-gardens" ? "The recovered opening-day leader is N at 1:26.87, followed by Troy at 1:26.60 on December 3. The reported 1:26.53 input was a typo; its preserved image and standings give 1:28.53. Sucha’s available video reports 1:27.35. Undated faster personal bests do not establish additional WR intervals." : data.id === "3ds-bowser-s-castle-r" ? "Nu11’s April 19 record of 1:38.39 was carried into this tour and appears first in the December 6 standings as N1P. The available original video is the same 1:38.39 result; its earlier review is retained." : "Nu11’s November 2020 record of 1:33.97 was carried into this tour, shown as Kaguya in the opening standings. The December 17 snapshot is corroboration after rollover. Sucha’s available 1:34.23 video is separate from the faster WR. The prior-reviewed SuperFX 1:34.87 recording has a 2026 recovery upload date.", practicalReviewComplete: a.tourReviews?.["tour-84"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      peachbowser2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-11-30T06:00:00Z") && Date.parse(day) < Date.parse("2022-12-14T06:00:00Z") : day >= "2022-11-30" && day < "2022-12-14") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-11-30"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-11-30")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-11-30") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-85") ? {
      holiday2022Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-85", "2022-12-14", "2022-12-28");
        const targetTime = data.id === "gba-snow-land" ? 0 : 7599;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        const reportedRecording = data.id === "gba-snow-land" ? data.submissions.find(r => r.id === "curated-1057203100018020425-holiday2022-proof-reviewed") : null;
        return {...comparison, reportedRecording: reportedRecording ? displayRecord(reportedRecording) : null, dateBoundaryNote: data.id === "gba-snow-land" ? "The recovered opening leader is Saki7 at 1:09.29, followed by Nu11 at 1:09.03, 1:08.83, 1:08.62 and 1:08.42. The original video title and accepted submission both report 1:08.42; full race continuity is not freshly certified. Previous best 1:08.63 lacks an original clock. kuRi’s 1:08.39 belongs to December 2025." : "The recovered opening leader is Wins at 1:16.89, followed by nekozuki’s 1:16.52 and 1:16.41, then Wins’s improvements to 1:15.99. Wins’s 1:16.23 original image and written splits are retained with the later cancelled receipt qualified. The 1:15.99 video was published after its result submission; its original Discord share clock remains unknown.", practicalReviewComplete: a.tourReviews?.["tour-85"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      holiday2022SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-12-14T06:00:00Z") && Date.parse(day) < Date.parse("2022-12-28T06:00:00Z") : day >= "2022-12-14" && day < "2022-12-28") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-12-14"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-12-14")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-12-14") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-86") ? {
      newyear2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-86", "2022-12-28", "2023-01-11");
        const targetTime = data.id === "wii-koopa-cape" ? 0 : 8873;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        const reportedRecording = data.submissions.find(r => r.id === (data.id === "wii-koopa-cape" ? "curated-1058001890484420678-koopa-cape-lap-message-confirmed" : "curated-1058903740352036864-newyear2023-proof-reviewed"));
        return {...comparison, reportedRecording: reportedRecording ? displayRecord(reportedRecording) : null, dateBoundaryNote: data.id === "wii-koopa-cape" ? "The recovered opening leader is Wins at 1:36.68, followed by 1:36.21 and 1:36.08. Contemporary WR-history assigns nekozuki’s final 1:35.85 to this tour, but its original post was 29 minutes 53 seconds after rollover; exact achievement date remains unknown. Wins’s available video reports 1:36.21. Previous best 1:36.19 remains undated." : "The recovered opening leader is Wins at 1:28.73, followed by 1:28.66, 1:28.61, 1:28.54 and 1:28.43. The 1:28.66 date is a first-place leaderboard observation; original submission is unknown. The final 1:28.43 video was published after rollover, separately from the January 1 result submission. Prior sampled 1:28.73 footage review is retained; the later video is identified by uploader title and source.", practicalReviewComplete: a.tourReviews?.["tour-86"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      newyear2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2022-12-28T06:00:00Z") && Date.parse(day) < Date.parse("2023-01-11T06:00:00Z") : day >= "2022-12-28" && day < "2023-01-11") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2022-12-28"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2022-12-28")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2022-12-28") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-87") ? {
      space2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-87", "2023-01-11", "2023-01-25");
        const targetTime = data.id === "gba-cheep-cheep-island-r" ? 7178 : 6336;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        const reportedRecording = null;
        return {...comparison, reportedRecording: reportedRecording ? displayRecord(reportedRecording) : null, dateBoundaryNote: data.id === "gba-cheep-cheep-island-r" ? "This course debuts in time trials here. No opening-day original submission was recovered; the first dated leader is Wins at 1:12.08 on January 12, followed by Sucha at 1:11.87, 1:11.83 and 1:11.78. The final video was published shortly before its accepted submission. Undated previous best 1:11.93 does not establish an extra dated reign." : "Astre and NHSpeedy carried in a 1:03.39 tie, corroborated by the opening leaderboard, before kNo2’s final 1:03.36. The original video-linked submission was at 03:11:08 UTC before rollover; video publication metadata is 07:30:44 UTC after rollover. Exact achievement time is unknown. Previous tour best 1:03.44 is slower than the carried-in WR.", practicalReviewComplete: a.tourReviews?.["tour-87"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      space2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return (r.id === "curated-1067685825845927996-winter2023-proof-reviewed" || (day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-01-11T06:00:00Z") && Date.parse(day) < Date.parse("2023-01-25T06:00:00Z") : day >= "2023-01-11" && day < "2023-01-25"))) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2023-01-11"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2023-01-11")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2023-01-11") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-88") ? {
      winter2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-88", "2023-01-25", "2023-02-08");
        const targetTime = data.id === "singapore-speedway-r" ? 7075 : data.id === "tokyo-blur-4" ? 4594 : 0;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        const reportedRecording = data.id === "bangkok-rush-2" ? [...data.records, ...data.submissions].find(r => r.timeCs === 9239 && r.videoBackup?.status === "available") : null;
        return {...comparison, reportedRecording: reportedRecording ? displayRecord(reportedRecording) : null, dateBoundaryNote: data.id === "bangkok-rush-2" ? "Opening day retains Wins at 1:32.91. The recovered progression includes spartacurtYT tying 1:32.76 before improving to 1:32.68. Final 1:32.39 was submitted February 4; its video was published and shared February 8 after rollover. Those later clocks do not replace the result date. New original video preservation has no fresh visual certification." : data.id === "singapore-speedway-r" ? "Opening day retains N at 1:11.23. Sucha’s accepted 1:10.82 had no video. The final WR is 8978 at 1:10.44 without a recovered recording; Sucha’s later 1:10.75 is the fastest surviving recorded run. The 1:10.83 video shows an earlier 1:10.82 best and is not another WR." : "The organizer confirms a carried-in 0:46.31 threshold but names Kaguya, while the older archived announcement names Nu11. That identity discrepancy remains qualified; no extra tie or account merge is inferred. Recovered progression is 0:46.17, 0:46.16, 0:46.08 and 0:45.94. The 0:46.16 original video remains unavailable. Earlier opening-day results are slower than the standing threshold.", practicalReviewComplete: a.tourReviews?.["tour-88"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      winter2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return (["curated-1072775979979772015-winter2023-final-original-reviewed","curated-1072789612063375391-winter2023-final-original-reviewed","curated-1072789878678507592-winter2023-final-original-reviewed"].includes(r.id) || (day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-01-25T06:00:00Z") && Date.parse(day) < Date.parse("2023-02-08T06:00:00Z") : day >= "2023-01-25" && day < "2023-02-08"))) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2023-01-25"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2023-01-25")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2023-01-25") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-89") ? {
      exploration2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-89", "2023-02-08", "2023-02-22");
        const targetTime = data.id === "piranha-plant-cove-2" ? 8981 : 0;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        const reportedRecording = data.id === "piranha-plant-cove" ? [...data.records, ...data.submissions].find(r => r.timeCs === 6846 && r.videoBackup?.status === "available") : null;
        return {...comparison, reportedRecording: reportedRecording ? displayRecord(reportedRecording) : null, dateBoundaryNote: data.id === "piranha-plant-cove" ? "The earliest recovered opening video is Phillish’s 1:09.38, shared February 8. It is a runner video report, not a recovered bot submission. Later slower February 10 results receive no WR credit. Chris95’s 1:09.25 and Sucha’s 1:08.93 precede the existing progression to Wins’s 1:08.46. Undated previous best 1:09.30 does not establish another dated reign. The final video was published February 20 after the February 19 result; newly preserved rendition differs from the old sampled file, so no fresh visual certification is claimed." : "Opening day retains Wins at 1:30.41, followed by 1:30.28 the next day and the recovered exchange to DIT’s 1:29.38. The mistaken 1:09.95 input was corrected to Phillish’s 1:29.95 with 44.90/45.05. DIT’s final video remains unavailable; Phillish’s 1:29.81 is the fastest surviving prior-reviewed recording. Its February 12 video publication/share occurred after the original result submission. Partial clips and individual laps are separate evidence.", practicalReviewComplete: a.tourReviews?.["tour-89"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      exploration2023PartialRecordings: data.id === "piranha-plant-cove-2" ? [{"id": "1073368367777468497", "video": "https://twitter.com/winsmkt/status/1623809386865999874", "videoPublishedAt": "2023-02-09T22:21:41Z", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/exploration2023-partial-1073368367777468497-526360826508.mp4", "status": "available"}, "videoSharedAt": "2023-02-09T22:22:41.098Z", "videoShareEvents": [{"sharedAt": "2023-02-09T22:22:41.098Z", "source": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1073368367777468497"}}], "evidenceNote": "First lap 44.90 only; recording ends after the lap transition. No completed two-lap result."}, {"id": "1074089038232948846", "video": "https://discord.com/channels/629221606064914442/636461740162416640/1074089038232948846", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/exploration2023-partial-1074089038232948846-3f09af3f4282.mov", "status": "available"}, "videoSharedAt": "2023-02-11T22:06:22.324000Z", "videoShareEvents": [{"sharedAt": "2023-02-11T22:06:22.324000Z", "source": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1074089038232948846"}}], "evidenceNote": "Failed finish attempt, 3.8 seconds; kart misses the line and timer continues. No completed record."}]: [],
      exploration2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return ((day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-02-08T06:00:00Z") && Date.parse(day) < Date.parse("2023-02-22T06:00:00Z") : day >= "2023-02-08" && day < "2023-02-22"))) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2023-02-08"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2023-02-08")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2023-02-08") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-90") ? {
      doctor2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-90", "2023-02-22", "2023-03-08");
        const targetTime = data.id === "ds-peach-gardens-r" ? 8721 : data.id === "gba-sky-garden" ? 6409 : 0;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, reportedRecording: null, dateBoundaryNote: data.id === "ds-peach-gardens-r" ? "Opening day retains Sucha’s final fastest recovered 1:27.41, followed by Wins’s 1:27.33 and 1:27.26, then Sucha’s 1:27.21. Nearby lap discussion names no exact faster rival. The final movie was uploaded March 7 and the recovered result submitted March 8; these clocks do not establish the private achievement instant. Edited receipts leave first video-share times unknown. Single-lap recordings remain separate." : "Nu11’s 1:04.13 carries into this tour before NR’s 1:04.09. Their surviving original movies are preserved. Video publication dates are separate from submission dates; NR’s edited receipt does not establish the first video-share time.", practicalReviewComplete: a.tourReviews?.["tour-90"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      doctor2023PartialRecordings: data.id === "ds-peach-gardens-r" ? [{"id": "1079109484644933784", "video": "https://www.youtube.com/watch?v=0dwXSSyp_30", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/doctor2023-partial-1079109484644933784-5a4d17fb120a.mp4", "status": "available"}, "videoPublishedAt": "2023-02-25T18:28:14Z", "videoSharedAt": "2023-02-25T18:35:50.024000Z", "videoShareEvents": [{"sharedAt": "2023-02-25T18:35:50.024000Z", "source": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1079109484644933784"}}], "evidenceNote": "Sucha lap 1 43.47; single-lap strategy source, not a completed two-lap record."}, {"id": "1078043924905594890", "video": "https://discord.com/channels/629221606064914442/636461740162416640/1078043924905594890", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/doctor2023-partial-1078043924905594890-7339dbedaa9e.mov", "status": "available"}, "videoPublishedAt": null, "videoSharedAt": "2023-02-22T20:01:40.785000Z", "videoShareEvents": [{"sharedAt": "2023-02-22T20:01:40.785000Z", "source": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1078043924905594890"}}], "evidenceNote": "Wins drift-button lap 1 43.71; single-lap source, not a completed two-lap record."}]: [],
      doctor2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return ((day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-02-22T06:00:00Z") && Date.parse(day) < Date.parse("2023-03-08T06:00:00Z") : day >= "2023-02-22" && day < "2023-03-08"))) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2023-02-22"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2023-02-22")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2023-02-22") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-91") ? {
      mario2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-91", "2023-03-08", "2023-03-22");
        const targetTime = data.id === "snes-donut-plains-3r" ? 5713 : data.id === "n64-luigi-raceway" ? 7243 : 0;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        return {...comparison, reportedRecording: null, dateBoundaryNote: data.id === "snes-donut-plains-3r" ? "Opening day retains Tankian’s final fastest recovered 59.59. The later recovered exchange runs through Retro, Phillish, K, Saki and Sucha to 57.13. Original accepted receipts supply source dates; unknown private race instants and unresolved discussion images remain qualified. The final original video is preserved, with its upload date separate from submission." : "Opening day retains DIT’s 1:12.33, followed by 1:12.27, 1:12.25 and 1:12.20. The final WR has surviving result proof but no recovered movie. Wins’s 1:12.43 is the fastest surviving prior-reviewed finish recording; it contains only the lap-two ending and finish. Its 2023 social publication is separate from the 2024 repost.", practicalReviewComplete: a.tourReviews?.["tour-91"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      mario2023PartialRecordings: data.id === "n64-luigi-raceway" ? [{"id": "1083121950097936504", "video": "https://discord.com/channels/629221606064914442/636461740162416640/1083121950097936504", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/mario2023-partial-1083121950097936504-2ae9c698765b.mov", "status": "available"}, "videoSharedAt": "2023-03-08T20:19:56.336000Z", "videoShareEvents": [{"sharedAt": "2023-03-08T20:19:56.336000Z", "source": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1083121950097936504"}}], "evidenceNote": "Wins source caption: 1:12.51 failed shortcut and ending. Preserved separately; no WR credit or fresh full-race certification."}]: [],
      mario2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return ((day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-03-08T06:00:00Z") && Date.parse(day) < Date.parse("2023-03-22T06:00:00Z") : day >= "2023-03-08" && day < "2023-03-22"))) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2023-03-08"));
        const best = Math.min(...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2023-03-08")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2023-03-08") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-92") ? {
      ninja2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-92", "2023-03-22", "2023-04-05");
        const targetTime = data.id === "wii-rainbow-road" ? 7583 : data.id === "3ds-wario-shipyard" ? 9359 : 0;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === targetTime && (r.submittedAt || r.evidencePublishedAt) && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {
            assessmentCarriedForward: true, startToFinishContinuityVerified: false
          }};
        }
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r =>
          !r.videoVerified && r.timeCs < targetTime);
        const reported = [...data.records, ...data.submissions].find(r => r.timeCs === (data.id === "wii-rainbow-road" ? 7560 : 9345) && r.videoBackup?.status === "available");
        return {...comparison, reportedRecording: reported ? displayRecord(reported) : null, dateBoundaryNote: data.id === "wii-rainbow-road" ? "Opening day retains Wins’s final fastest recovered 1:16.76. The later recovered progression ends with Fireball’s 1:15.60. Wins’s accepted 1:15.83 has 44.82/31.01; the later same-total recording has 44.81/31.02 and is a separate performance. The March28 1:15.50 discussion estimates a hypothetical perfect run. Seven surviving tour movies are preserved; new title/source recordings have no fresh visual certification." : "Nu11’s 1:33.59 carries into this tour until N’s 1:33.45. The final original video is preserved and reported separately from the prior-reviewed carried recording. Its April4 repost is not a new performance or the April3 original submission. Slower opening-day PBs receive no WR credit.", practicalReviewComplete: a.tourReviews?.["tour-92"]?.practicalReviewComplete === true, worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      ninja2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt || r.resultReportEvents?.find(event => event.reviewAudit)?.reportedAt;
          return ((day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-03-22T06:00:00Z") && Date.parse(day) < Date.parse("2023-04-05T06:00:00Z") : day >= "2023-03-22" && day < "2023-04-05"))) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input"].includes(r.status) && !data.records.some(record => record.id === r.id ||
              (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2023-03-22"));
        const best = Math.min(data.id === "3ds-wario-shipyard" ? 9359 : Infinity, ...opening.map(r => r.timeCs), ...data.records.filter(r => isReviewedOpeningDay(r, "2023-03-22")).map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2023-03-22") || r.timeCs === best)
          .map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-93") ? {
      yoshi2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-93", "2023-04-05", "2023-04-19");
        const finalTime = data.id === "gcn-yoshi-circuit" ? 9146 : 6008;
        const preserved = [...data.records, ...data.submissions].find(r => r.timeCs === finalTime && r.videoVerified && r.videoBackup?.status === "available");
        if (preserved) {
          comparison.documentedRecording = preserved;
          comparison.recording = {...preserved, videoScopeReview: {assessmentCarriedForward: true, startToFinishContinuityVerified: false}};
        }
        const reported = [...data.records, ...data.submissions].find(r => r.timeCs === finalTime && r.videoBackup?.status === "available");
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r => !r.videoVerified && r.timeCs <= finalTime);
        return {...comparison, reportedRecording: reported ? displayRecord(reported) : null,
          dateBoundaryNote: data.id === "gcn-yoshi-circuit" ? "Nu11’s 1:31.79 carries into this tour. Wins improves it through 1:31.73, 1:31.66 and 1:31.59 to 1:31.46. The final result was submitted April7; its movie was published April10 and shared on Discord later that day. The preserved bytes match the prior sampled review; no fresh uninterrupted-race certification. Slower opening-day results receive no WR credit." : "N’s 1:00.40 carries into this tour. N improves it through 1:00.39, 1:00.33 and 1:00.26 to 1:00.08. The final result was submitted April18 at 17:03 UTC; video publication was 17:45 UTC. The receipt was edited later, so its original creation time is not an exact video-share clock. The final movie is preserved with source and uploader evidence, without fresh visual certification. Slower opening-day results receive no WR credit.",
          practicalReviewComplete: a.tourReviews?.["tour-93"]?.practicalReviewComplete === true,
          worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      yoshi2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-04-05T06:00:00Z") && Date.parse(day) < Date.parse("2023-04-19T06:00:00Z") : day >= "2023-04-05" && day < "2023-04-19") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2023-04-05"));
        const best = Math.min(data.id === "gcn-yoshi-circuit" ? 9179 : 6040, ...opening.map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2023-04-05") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-94") ? {
      spring2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-94", "2023-04-19", "2023-05-03");
        const prior = [...data.records, ...data.submissions].find(r => r.timeCs === 7441 && r.videoVerified && r.videoBackup?.status === "available");
        if (data.id === "berlin-byways" && prior) {
          comparison.documentedRecording = prior;
          comparison.recording = {...prior, videoScopeReview: {assessmentCarriedForward: true, startToFinishContinuityVerified: false}};
        }
        const reference = data.id === "athens-dash-2" ? [...data.records, ...data.submissions].find(r => r.timeCs === 9391 && r.videoAvailability === "unavailable") : null;
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r => !r.videoVerified && r.timeCs <= (data.id === "berlin-byways" ? 7441 : 9349) && r.id !== reference?.id);
        return {...comparison,
          dateBoundaryNote: data.id === "athens-dash-2" ? "Athens Dash 2 debuts here. DIT’s final recovered opening-day result is 1:34.41. Sucha 1:34.25, DIT 1:34.01 and 1:33.91, then SuperFX 1:33.75, 1:33.62 and 1:33.49 form the surviving progression. No movie for the final WR was established. DIT’s linked 1:33.91 recording is unavailable; the preserved 46.61 clip is a single lap. Four recovered image-only leads retain unreviewed totals." : "SuperFX’s Metropolitan 1:14.54 carries into this tour, followed by 1:14.53, 1:14.48 and 1:14.41. The final movie matches the prior sampled assessment, with uninterrupted race coverage still uncertified. Uploader titles say Berlin Byways 2R; accepted challenge submissions are catalogued as Berlin Byways. Submission and movie publication clocks remain separate.",
          practicalReviewComplete: a.tourReviews?.["tour-94"]?.practicalReviewComplete === true,
          worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          referenceRecording: reference ? displayRecord(reference) : null,
          lapDemonstration: data.id === "athens-dash-2" ? {"playerId":"phillish","time":"46.61","video":"https://youtu.be/2Q1HZtAnu3Y","videoBackup":{"url":"https://media.mktwrs.com/assets/video/spring2023-f638fbbeff4fc1192121.mp4"},"videoPublishedAt":"2023-05-01T12:54:05Z","videoSharedAt":"2023-05-01T13:21:35.120Z","videoShareEvents":[{"sharedAt":"2023-05-01T13:21:35.120Z","source":{"url":"https://discord.com/channels/629221606064914442/636461740162416640/1102585612709658704"}}]} : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      spring2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-04-19T06:00:00Z") && Date.parse(day) < Date.parse("2023-05-03T06:00:00Z") : day >= "2023-04-19" && day < "2023-05-03") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2023-04-19"));
        const best = Math.min(data.id === "berlin-byways" ? 7454 : 9441, ...opening.map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2023-04-19") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-95") ? {
      bowser2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-95", "2023-05-03", "2023-05-17");
        const carry = data.id === "n64-kalimari-desert-2r" ? data.records.find(r => r.id === "896334182928760863") : null;
        if (carry) {
          comparison.worldRecord = carry;
          comparison.documentedRecording = carry;
          comparison.recording = {...carry, videoScopeReview: {assessmentCarriedForward: true, startToFinishContinuityVerified: false}};
        }
        const completed = data.id === "gba-bowser-s-castle-4" ? data.submissions.find(r=>r.id==="discord-1106178965829320746" && r.videoVerified && r.videoBackup?.url) : null;
        if (completed) comparison.documentedRecording = completed;
        const reported = data.id === "gba-bowser-s-castle-4" ? [...data.records, ...data.submissions].find(r => r.timeCs === 7086 && r.videoBackup?.status === "available" && r.videoAssociationReview?.status === "provisional") : null;
        const reference = data.id === "gba-bowser-s-castle-4" ? data.records.find(r => r.timeCs === 7080 && r.videoReference) : null;
        comparison.pendingRecordings = comparison.pendingRecordings.filter(r => !r.videoVerified && r.id !== reference?.id && r.timeCs < (reported?.timeCs || carry?.timeCs || Infinity));
        return {...comparison,
          dateBoundaryNote: data.id === "gba-bowser-s-castle-4" ? "Bowser’s Castle 4 debuts here. DIT’s final recovered opening-day result is 1:11.12. DIT improves to 1:11.05 on May4, N ties it later that day, then N improves to 1:10.97 on May9 and DIT to 1:10.80 on May10. Slower opening results receive no WR credit. The final tweet reference is unavailable. N’s later 1:10.86 movie now has a visually verified completed result matching the adjacent original screenshot; the two image-only tail leads retain unreviewed totals." : "Kazuo’s 1:04.30 from May2021 carries through this tour. Every recovered dated Kalimari result is slower, so no new WR is added. The carried original movie is preserved and matches the prior sampled assessment; uninterrupted coverage has not been freshly certified. Its 2021 publication and share clocks remain separate from the 2023 tour.",
          practicalReviewComplete: a.tourReviews?.["tour-95"]?.practicalReviewComplete === true,
          worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          reportedRecording: reported ? displayRecord(reported) : null,
          reportedRecordingLabel: "Available recording with a provisionally matched result: ",
          referenceRecording: reference ? displayRecord(reference) : null,
          referenceRecordingLabel: "Unavailable result/movie reference: ",
          strategyReference: data.id === "gba-bowser-s-castle-4" ? {"playerId":"rubix","video":"https://cdn.discordapp.com/attachments/636461740162416640/1103703254984040458/RPReplay_Final1683212591.mov","videoBackup":{"url":"https://media.mktwrs.com/assets/video/bowser2023-6436ed64ec13766ac76b.mp4","kind":"r2-lossless-mp4-playback-remux","preservedOriginalUrl":"https://media.mktwrs.com/assets/video/bowser2023-d6cd93b515ad635c4f8c.mov","playbackPreservationAudit":"archive/bowser2023-mp4-playback-original-preservation-check-20261014.json"},"videoSharedAt":"2023-05-04T15:22:41.960Z","videoShareEvents":[{"sharedAt":"2023-05-04T15:22:41.960Z","source":{"url":"https://discord.com/channels/629221606064914442/636461740162416640/1103703255642554499"}}]} : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      bowser2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-05-03T06:00:00Z") && Date.parse(day) < Date.parse("2023-05-17T06:00:00Z") : day >= "2023-05-03" && day < "2023-05-17") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2023-05-03"));
        const best = Math.min(data.id === "n64-kalimari-desert-2r" ? 6430 : 7112, ...opening.map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2023-05-03") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-96") ? {
      mii2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-96", "2023-05-17", "2023-05-31");
        const carry = data.id === "wii-maple-treeway-r" ? data.records.find(r => r.id === "1022593479790043236") : null;
        if (carry) comparison.worldRecord = carry;
        return {...comparison,
          dateBoundaryNote: data.id === "gcn-mushroom-bridge" ? "Mushroom Bridge debuts here. N’s final recovered opening-day result is 1:10.98. N improves to 1:10.71 on May18 and 1:10.69 on May19, NewYork to 1:10.64 on May20, N to 1:10.46 on May21, then kNo2 to 1:10.37 before the May31 reset. kNo2’s previous personal best 1:10.42 has no independently dated original here. The final movie matches its prior sampled assessment; uninterrupted race coverage has not been freshly certified. Lap examples and technique films remain separate." : "NewYork’s 1:49.29 from September2022 carries through this tour. All recovered dated results are slower; DIT’s final 1:49.30 is 0.01 behind. No available completed Maple Treeway R recording with a qualified total was established in these bounded sources. The preserved Wins clip is a lap example. A discussion image labelled world record shows an automated reading of a slower tour leaderboard, so it does not replace the carried WR.",
          practicalReviewComplete: a.tourReviews?.["tour-96"]?.practicalReviewComplete === true,
          worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          strategyReferences: data.id === "gcn-mushroom-bridge" ? [{"playerId":"n","video":"https://youtu.be/M1PzJ4dmQRE","videoBackup":{"url":"https://media.mktwrs.com/assets/video/mii2023-b9662ee7627082c3631e.mp4"},"videoPublishedAt":"2023-05-17T08:45:56Z","videoSharedAt":"2023-05-17T08:46:32.012Z","videoShareEvents":[{"sharedAt":"2023-05-17T08:46:32.012Z","source":{"url":"https://discord.com/channels/629221606064914442/636461740162416640/1108314599507382314"}}]},{"playerId":"floyd","video":"https://cdn.discordapp.com/attachments/636461740162416640/1109422633306566676/VID_20230520_120826_235.mp4","videoBackup":{"url":"https://media.mktwrs.com/assets/video/mii2023-5759331e407d86bb380f.mp4"},"videoSharedAt":"2023-05-20T10:09:27.928Z","videoShareEvents":[{"sharedAt":"2023-05-20T10:09:27.928Z","source":{"url":"https://discord.com/channels/629221606064914442/636461740162416640/1109422633608560770"}}]}] : [{"playerId":"wins","video":"https://cdn.discordapp.com/attachments/636461740162416640/1109260766395236493/RPReplay_Final1684538421.mov","videoBackup":{"url":"https://media.mktwrs.com/assets/video/mii2023-e2a45632d8a154a4b846.mp4"},"videoSharedAt":"2023-05-19T23:26:15.845Z","videoShareEvents":[{"sharedAt":"2023-05-19T23:26:15.845Z","source":{"url":"https://discord.com/channels/629221606064914442/636461740162416640/1109260766680453221"}}]}],
          lapDemonstrations: data.id === "gcn-mushroom-bridge" ? [{"playerId":"phillish","video":"https://youtu.be/7tEb8N-8--8","videoBackup":{"url":"https://media.mktwrs.com/assets/video/mii2023-12733281c887f79f6ec2.mp4"},"time":"35.45","videoPublishedAt":"2023-05-17T19:48:09Z","videoSharedAt":"2023-05-17T19:51:04.814Z","videoShareEvents":[{"sharedAt":"2023-05-17T19:51:04.814Z","source":{"url":"https://discord.com/channels/629221606064914442/636461740162416640/1108481838160302233"}}]},{"playerId":"n","video":"https://cdn.discordapp.com/attachments/636461740162416640/1109446591946969149/RPReplay_Final1684494932.mov","videoBackup":{"url":"https://media.mktwrs.com/assets/video/mii2023-29d2ce371ddf418ea0e1.mp4"},"time":"35.00","videoSharedAt":"2023-05-20T11:44:40.091Z","videoShareEvents":[{"sharedAt":"2023-05-20T11:44:40.091Z","source":{"url":"https://discord.com/channels/629221606064914442/636461740162416640/1109446592156667916"}}]}] : [],
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      mii2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-05-17T06:00:00Z") && Date.parse(day) < Date.parse("2023-05-31T06:00:00Z") : day >= "2023-05-17" && day < "2023-05-31") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const opening = rows.filter(r => isReviewedOpeningDay(r, "2023-05-17"));
        const best = Math.min(data.id === "wii-maple-treeway-r" ? 10929 : 7098, ...opening.map(r => r.timeCs));
        return rows.filter(r => !isReviewedOpeningDay(r, "2023-05-17") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-97") ? {
      princess2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-97", "2023-05-31", "2023-06-14");
        const carry = data.id === "wii-coconut-mall" ? data.records.find(r => r.id === "1000615548633227364") : null;
        const priorMovie = data.id === "wii-coconut-mall" ? data.submissions.find(r => r.id === "curated-995562829224615946-995562829291716668-bangkok2022-image-reviewed") : null;
        if (carry) comparison.worldRecord = carry;
        if (priorMovie) comparison.documentedRecording = {...priorMovie, videoScopeReview:{assessmentCarriedForward:true,startToFinishContinuityVerified:false}};
        return {...comparison,
          dateBoundaryNote: data.id === "gba-snow-land-r" ? "The dated source progression is reconstructed as N 1:09.56 on May 31, NR 1:09.39 on June 1, Malermarkus 1:09.38 on June 6, then NR 1:09.09 on June 7. Opening day retains only N’s final fastest recovered result. The undated 1:09.21 predecessor remains separate. The final movie was published before the accepted result repost; its edited receipt does not establish the first video-share time." : "DIT’s 1:13.93 carries into Princess Tour. The fastest recovered Princess submission, Floyd’s 1:14.14, is slower, so no new WR is added. The available Y146 1:14.36 movie is earlier Bangkok Tour footage; the matching 1:13.93 WR video is unavailable.",
          practicalReviewComplete: a.tourReviews?.["tour-97"]?.practicalReviewComplete === true,
          worldRecord: comparison.worldRecord ? displayRecord(comparison.worldRecord) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          referenceRecording: carry ? displayRecord(carry) : null,
          referenceRecordingLabel: "Unavailable carried-WR recording: ",
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      princess2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-05-31T06:00:00Z") && Date.parse(day) < Date.parse("2023-06-14T06:00:00Z") : day >= "2023-05-31" && day < "2023-06-14") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.chronologyDate || row.submittedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-05-31"));
        const best = Math.min(data.id === "wii-coconut-mall" ? 7393 : 6956, ...opening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-05-31") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-98") ? {
      marioLuigi2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-98", "2023-06-14", "2023-06-28");
        const wr = data.records.find(r => r.id === "1124183833839939655");
        const reference = data.submissions.find(r => r.id === "curated-1119207840767295591-marioluigi2023-original-result-reviewed");
        return {...comparison,
          dateBoundaryNote: "Seven recovered entries follow the original submission dates, from Louis’s opening-day 1:12.47 to nekozuki’s 1:11.96 on June 22. The WR announcement identifies DIT’s 1:12.15 as the closest recorded time; YouTube currently says the uploader removed that video.",
          practicalReviewComplete: a.tourReviews?.["tour-98"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          referenceRecording: reference ? displayRecord(reference) : null,
          referenceRecordingLabel: "Closest recorded time reported by the WR announcement (video unavailable): ",
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      marioLuigi2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.chronologyDate || r.submittedAt;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-06-14T06:00:00Z") && Date.parse(day) < Date.parse("2023-06-28T06:00:00Z") : day >= "2023-06-14" && day < "2023-06-28") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.chronologyDate || row.submittedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-06-14"));
        const best = Math.min(7247, ...opening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-06-14") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-99") ? {
      night2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-99", "2023-06-28", "2023-07-12");
        const finalId = {"rome-avanti-2": "1130210516791464016", "singapore-speedway": "935931716575559721", "singapore-speedway-2r": "1130210018206171236"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: data.id === "rome-avanti-2" ? "Five recovered leaders follow surviving source dates. Sucha’s 1:18.96 video was published July 4, before the July 9 Discord post; slower July 9 submissions receive no WR credit. Nu11’s 1:18.87 movie was published July 11. No opening-day Rome result was recovered." : data.id === "singapore-speedway-2r" ? "Five recovered leaders include Rubix’s final fastest recovered opening-day run, posted June 29 at 05:51 UTC. mb3’s final 1:24.98 was submitted July 12 at 05:58:26 UTC, before the 06:00 tour reset. Phillish’s available 1:25.08 footage is the fastest recovered recording for this tour." : "Sucha’s 1:09.43 WR and recording are carried from Singapore Tour 2022. Night Tour’s recovered results are slower; its fastest recovered submission is POACOL’s 1:10.75. The carried video is earlier-tour footage.",
          practicalReviewComplete: a.tourReviews?.["tour-99"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      night2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-06-28T06:00:00Z") && Date.parse(day) < Date.parse("2023-07-12T06:00:00Z") : day >= "2023-06-28" && day < "2023-07-12") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-06-28")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-06-28"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-06-28"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-06-28") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-100") ? {
      pipe2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-100", "2023-07-12", "2023-07-26");
        const finalId = {"wii-dry-dry-ruins": "1136096968901398628", "piranha-plant-cove-2r": "1136090192722264194"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: data.id === "wii-dry-dry-ruins" ? "Six recovered leaders begin with Tankian’s final fastest first-day result, 1:19.40. newyork’s final 1:17.90 video was published July 17 at 14:35 UTC, before its 14:47 submission. The first screenshot is unavailable; a matching later resubmission original and the movie are preserved." : "Eight recovered leaders include the 1:31.64 tie by nekozuki and Phillish. kuRi’s 1:32.62 is the final fastest recovered first-day result. Phillish’s final 1:31.41 screenshot and matching original movie are preserved. Source posting dates supply submission dates; video publication clocks are shown separately.",
          practicalReviewComplete: a.tourReviews?.["tour-100"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      pipe2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-07-12T06:00:00Z") && Date.parse(day) < Date.parse("2023-07-26T06:00:00Z") : day >= "2023-07-12" && day < "2023-07-26") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-07-12")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-07-12"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-07-12"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-07-12") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-101") ? {
      sunshine2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-101", "2023-07-26", "2023-08-09");
        const finalId = {"wii-daisy-circuit": "1139362445480177824", "snes-koopa-troopa-beach-2r": "1139362790906265772"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: data.id === "wii-daisy-circuit" ? "Four recovered leaders start with kuRi’s final fastest first-day result, 1:18.60. saki7’s final 1:18.30 has a preserved original result. Sucha’s available 1:18.31 movie is slower and shown as the recording reference. Its original submission was August 5 at 12:09 UTC, video publication at 12:36, and corrected receipt at 12:51; the earlier bot course label was wrong." : "Six recovered leaders start with Phillish’s 0:57.93 on July 27; no first-day original was recovered. nekozuki’s final 0:57.55 result is preserved. No same-tour movie was found in the bounded saved sources. The mislabeled 1:18.31 receipt belongs to Daisy Circuit and is excluded from these results.",
          practicalReviewComplete: a.tourReviews?.["tour-101"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      sunshine2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-07-26T06:00:00Z") && Date.parse(day) < Date.parse("2023-08-09T06:00:00Z") : day >= "2023-07-26" && day < "2023-08-09") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-07-26")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-07-26"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-07-26"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-07-26") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-102") ? {
      vacation2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-102", "2023-08-09", "2023-08-23");
        const finalId = {"athens-dash": "1147355757961031690", "athens-dash-2r": "1147355556978364506", "squeaky-clean-sprint": "1147355273481175120-phillish"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"athens-dash": "Nine recovered leaders start with Sucha’s final fastest first-day 1:18.85. newyork’s final 1:17.75 movie was published August 22 at 12:04:13 UTC, before the 12:04:56 submission. kuRi’s earlier 1:18.09 movie is also preserved.", "athens-dash-2r": "Seven recovered leaders start with kuRi’s final fastest first-day 1:22.86 and end with Phillish’s 1:22.29. No same-tour movie was found in the bounded saved sources.", "squeaky-clean-sprint": "Nine recovered leaders and ties start with Sucha’s final fastest first-day 1:22.76. Phillish submitted the final 1:21.62 on August 17; Litchi’s independently proved tie was submitted August 22 under the name sasakikojiro3. Phillish’s original movie and newyork’s earlier 1:21.87 movie are preserved. Litchi’s linked post is image-only."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-102"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      vacation2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-08-09T06:00:00Z") && Date.parse(day) < Date.parse("2023-08-23T06:00:00Z") : day >= "2023-08-09" && day < "2023-08-23") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-08-09")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-08-09"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-08-09"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-08-09") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-103") ? {
      summer2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-103", "2023-08-23", "2023-09-06");
        const finalId = {"berlin-byways-2": "1152023809864503306", "madrid-drive": "1152024419473047663", "piranha-plant-cove-3": "1152015541180051578"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"berlin-byways-2": "Six recovered leaders start with Rόmάίή’s final fastest first-day 1:23.86 and end with Sucha’s 1:23.38. NR’s 1:23.41 and Sucha’s earlier 1:23.43 original movies are preserved; NR has the fastest documented available recording.", "madrid-drive": "Eleven recovered leaders and ties start with Starin and REMON at 1:18.56. kuRi’s 1:17.78 movie and kNo2’s final 1:17.31 movie are preserved. kNo2 submitted the final result September 6 at 06:08:57 UTC, after reset; the actual posting date supplies the archive date, with the later video publication clock shown separately.", "piranha-plant-cove-3": "Four recovered leaders start with nekozuki’s final fastest first-day 1:16.56 and end with MB3’s 1:16.28. No eligible result recording was found in the bounded sources. 0celot’s slower practice movie is preserved as limited supporting evidence; it does not verify a faster leaderboard result."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-103"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      summer2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-08-23T06:00:00Z") && Date.parse(day) < Date.parse("2023-09-06T06:00:00Z") : day >= "2023-08-23" && day < "2023-09-06") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-08-23")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-08-23"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-08-23"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-08-23") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-104") ? {
      sundae2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-104", "2023-09-06", "2023-09-20");
        const finalId = {"gba-luigi-circuit": "1157161238137163826", "snes-vanilla-lake-2r": "1157160735848267859"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"gba-luigi-circuit": "Four recovered leaders start with Fireball’s final fastest first-day 0:49.69 video and end with his 0:49.27 WR and original movie. His independently readable 0:49.44 image is retained with its cancelled receipt note; the next 0:49.27 image corroborates 0:49.44 as his previous best.", "snes-vanilla-lake-2r": "Six recovered leaders and ties start with nekozuki’s final fastest first-day 0:31.77 and end with 0:31.48. kuRi’s faster 0:31.71 movie reference is private. SimonF’s original 0:31.82 movie is the fastest documented available recording; its separate first known video share and publication clocks are shown."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-104"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      sundae2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-09-06T06:00:00Z") && Date.parse(day) < Date.parse("2023-09-20T06:00:00Z") : day >= "2023-09-06" && day < "2023-09-20") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-09-06")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-09-06"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-09-06"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-09-06") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-105") ? {
      anniversary2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-105", "2023-09-20", "2023-10-04");
        const finalId = {"athens-dash-3": "1162597423470878732", "madrid-drive-3": "1162598591001546913", "rome-avanti-3": "1162598789530538094"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"athens-dash-3": "Six recovered leaders and ties start with DIT’s final fastest first-day 1:11.95 and end with his 1:11.73 WR. His final video is unavailable; Sucha’s preserved 1:11.77 is the fastest documented available recording.", "madrid-drive-3": "Six recovered leaders start with Tankian’s final fastest first-day 1:20.71 and end with kuRi’s 1:19.45 WR and preserved original video. Remon’s supporting video finishes at 1:20.29 despite its 1:20.28 title; its movie splits and the screenshot caption are preserved separately.", "rome-avanti-3": "Three recovered leaders start with kuRi’s earliest surviving September 21 result and video, 1:17.69, and end with Fireball’s 1:17.27 WR. No opening-day September 20 result survives in the reviewed sources. kuRi’s 1:17.69 is the fastest documented available recording."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-105"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      anniversary2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-09-20T06:00:00Z") && Date.parse(day) < Date.parse("2023-10-04T06:00:00Z") : day >= "2023-09-20" && day < "2023-10-04") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-09-20")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-09-20"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-09-20"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-09-20") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-106") ? {
      battle2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-106", "2023-10-04", "2023-10-18");
        const finalId = {"snes-donut-plains-1r": "1032525641465200660", "snes-donut-plains-2": "1168941274380914769"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"snes-donut-plains-1r": "Hilton’s 2022 0:49.15 remained the WR throughout this returning tour. The best reviewed 2023 result, kuRi’s 0:49.62, is slower. Nu11’s preserved 2022 0:49.31 is the fastest dated documented available recording by this tour; no Hilton 0:49.15 footage survives in the reviewed sources.", "snes-donut-plains-2": "Shine improved the carried 2022 1:00.61 WR to 1:00.60 on October 9 and 1:00.50 on October 10. Both posting dates, images and original movies are preserved. No October 4 opening-day result survives in the reviewed bounded sources."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-106"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      battle2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-10-04T06:00:00Z") && Date.parse(day) < Date.parse("2023-10-18T06:00:00Z") : day >= "2023-10-04" && day < "2023-10-18") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-10-04")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-10-04"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-10-04"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-10-04") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-107") ? {
      halloween2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-107", "2023-10-18", "2023-11-01");
        const finalId = {"snes-donut-plains-3": "1039950316147322890"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"snes-donut-plains-3": "Troy’s 2022 0:56.42 remained the WR throughout this returning tour, with its original movie preserved. The best reviewed 2023 result, Retro’s 0:56.79, is slower. No October 18 opening-day result survives in the bounded sources."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-107"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          strategyReference: {"playerId": "rubix", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1164981706063876317/RPReplay_Final1697823670.mov", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/halloween2023-rubix-partial-1164981706420408473-1a0c99e2623552d48728.mov", "originalUrl": "https://cdn.discordapp.com/attachments/636461740162416640/1164981706063876317/RPReplay_Final1697823670.mov", "status": "preserved", "kind": "original", "sha256": "1a0c99e2623552d48728b589cc5d7e24a25b59126b397abec6098955c5ea6f01", "bytes": 3783406, "credit": "Rubix", "preservedOriginalFile": "archive/video-backup-files/halloween2023-rubix-discussion/original.mov", "uploadedAt": "2026-10-14", "reviewAudit": "archive/halloween2023-complete-original-preservation-and-source-audit-20261014.json", "evidenceScope": "partial-technique-footage-no-completed-result"}, "videoSubmittedAt": "2023-10-20T17:41:23.124Z", "submittedAt": "2023-10-20T17:41:23.124Z", "evidenceNote": "Partial technique clip; no completed total or lap boundary. Does not establish a WR.", "source": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1164981706420408473", "channel": "tt-discussion", "messageId": "1164981706420408473"}},
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      halloween2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-10-18T06:00:00Z") && Date.parse(day) < Date.parse("2023-11-01T06:00:00Z") : day >= "2023-10-18" && day < "2023-11-01") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-10-18")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-10-18"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-10-18"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-10-18") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-108") ? {
      autumn2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-108", "2023-11-01", "2023-11-15");
        const finalId = {"los-angeles-laps-2": "1178887189124370537", "los-angeles-laps-3": "1042970214414950400"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"los-angeles-laps-2": "kuRi improved the carried Wins 1:13.46 WR to 1:13.41, posted November 3, with the original result and movie preserved. Sucha’s recovered screenshot and movie show 1:13.42; the 1:13.41 receipt input does not establish a tie. The final fastest reviewed first-day result is kuRi’s 1:13.54, slower than the carried WR.", "los-angeles-laps-3": "Sucha’s 2022 1:18.78 WR remained fastest throughout this returning tour, with its movie preserved. The best reviewed 2023 result is Sucha’s 1:18.80, which is slower. No opening-day LA3 result survives in the bounded sources."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-108"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      autumn2023InputCorrection: data.id === "los-angeles-laps-2" ? {"id": "discord-1173790873612472350", "courseId": "los-angeles-laps-2", "playerId": "player-e38199e38184e3819df09f90ba", "time": "1:13.41", "timeCs": 7341, "laps": ["36.70", "36.71"], "mushrooms": null, "achievedAt": null, "datePrecision": "unknown", "status": "erroneous-reported-input", "notes": ["Listed submission matching or improving the best record documented before its evidence date. This is a reconstructed contender; incomplete chronology may change its WR status."], "submittedAt": "2023-11-14T01:05:52.249Z", "proofUploadedAt": "2023-11-14T01:05:59.648Z", "video": "https://youtu.be/IhK-cKRpTrQ?feature=shared", "proofImage": "https://media.mktwrs.com/assets/proof/autumn2023-1173790904646111262-f513a7c101a05a775659.png", "source": {"url": "https://discord.com/channels/629221606064914442/875784780573184010/1173790873612472350", "channel": "tt-submission", "messageId": "1173790873612472350"}, "announcedAt": "2023-11-14T01:05:52.249Z", "tourLabel": "Reconstructed from submission evidence", "includeInProgression": false, "reportedTime": "1:13.41", "verifiedTime": "1:13.42", "verifiedLaps": ["36.70", "36.72"], "recordDate": "2023-11-14", "dateBasis": "original-post-submission-date", "dateUnresolved": false, "chronologyUnresolved": false, "proofImageLocal": "https://media.mktwrs.com/assets/proof/autumn2023-1173790904646111262-f513a7c101a05a775659.png", "proofImageVerified": true, "originalImageLocal": "archive/autumn2023-preserved-original-images/1173790904646111262.png", "originalImageSHA256": "f513a7c101a05a7756599cc88a41abd8e333d36766b4f8fe5c27b4c36c18eb9d", "originalImageReviewAudit": "archive/autumn2023-complete-original-preservation-and-source-audit-20261014.json", "evidenceNote": "Recovered original screenshot and linked movie show1:13.42. Receipt1:13.41 and36.70/36.71 are erroneous input; no WR tie credit.", "inputCorrectionReview": "archive/autumn2023-complete-original-preservation-and-source-audit-20261014.json", "videoVerified": false, "videoAvailability": "available", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/autumn2023-IhK-cKRpTrQ-27b8eb3fba8429e5d793.mp4", "originalUrl": "https://www.youtube.com/watch?v=IhK-cKRpTrQ", "status": "preserved", "kind": "original", "sha256": "27b8eb3fba8429e5d7938bb6ee978c9845651d3e6903a78d0f6643bbffd68e7a", "bytes": 23711524, "credit": "すいそ🐺", "preservedOriginalFile": "archive/video-backup-files/autumn2023-sucha7341/original.mp4", "uploadedAt": "2026-10-14", "reviewAudit": "archive/autumn2023-complete-original-preservation-and-source-audit-20261014.json"}} : null,
      autumn2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-11-01T06:00:00Z") && Date.parse(day) < Date.parse("2023-11-15T06:00:00Z") : day >= "2023-11-01" && day < "2023-11-15") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-11-01")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-11-01"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-11-01"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-11-01") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-109") ? {
      animal2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-109", "2023-11-15", "2023-11-29");
        const finalId = {"n64-choco-mountain": "curated-animal2022-1044131789247098930-choco-11837-leaderboard", "n64-yoshi-valley-r": "1053521178179932180"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"n64-choco-mountain": "Nu11’s documentary 1:18.37 carries into this tour. The best recovered current result is Retro and SYUN’s 1:18.74. No matching WR movie is available; earlier preserved 1:18.93 footage is shown separately. Source post dates supply submission dates.", "n64-yoshi-valley-r": "Nu11’s documentary 1:30.47 carries into this tour. The best recovered current result is nekozuki’s 1:30.87. Earlier result-reviewed 1:30.67 footage and Nu11’s distinct uploader-reported 1:30.62 movie are shown separately. Neither is footage of 1:30.47."}[data.id],
          strategyReference: {"n64-choco-mountain": {"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1175741123612909689/ScreenRecording_11-19-2023_18-50-10_1.mov?ex=6ad0a7c0&is=6acf5640&hm=2215721ac59595ffa8193c6365b38eb58b2dee8ba1ed8dfb8fc7d0974b4ccb8e&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/animal2023-1175741124137209956-546770bbe7fec22282f1.mov", "originalUrl": "https://cdn.discordapp.com/attachments/636461740162416640/1175741123612909689/ScreenRecording_11-19-2023_18-50-10_1.mov?ex=6ad0a7c0&is=6acf5640&hm=2215721ac59595ffa8193c6365b38eb58b2dee8ba1ed8dfb8fc7d0974b4ccb8e&", "kind": "r2-preserved-original", "status": "available", "sha256": "546770bbe7fec22282f10e9bd0ebfba40d89ed262b95ef4ef9d0cddf1186519d", "bytes": 2811173, "credit": "Sucha", "preservedOriginalFile": "archive/video-backup-files/animal2023-sucha-discussion/original.mov", "evidenceScope": "partial-lap-strategy-no-completed-run"}, "submittedAt": "2023-11-19T10:15:28.208Z", "videoSharedAt": "2023-11-19T10:15:28.208Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1175741124137209956"}, "source": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1175741124137209956"}, "evidenceNote": "Partial strategy footage; no completed run result. Source post date shown; no WR or completed-lap credit."}, "n64-yoshi-valley-r": {"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://youtube.com/shorts/3TFdx30jokQ?feature=shared", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/animal2023-1178814463919525939-36207a0d524cc6328b07.mp4", "originalUrl": "https://youtube.com/shorts/3TFdx30jokQ?feature=shared", "kind": "r2-preserved-original", "status": "available", "sha256": "36207a0d524cc6328b07d4ed28cb97a4479ec83e4d2cdc8966b987091fe1d1b4", "bytes": 6949196, "credit": "Sucha", "preservedOriginalFile": "archive/video-backup-files/animal2023-sucha-yvr-strategy/original.mp4", "evidenceScope": "partial-lap-strategy-no-completed-run"}, "submittedAt": "2023-11-27T21:47:49.512Z", "videoSharedAt": "2023-11-27T21:47:49.512Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1178814463919525939"}, "source": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1178814463919525939"}, "evidenceNote": "Partial strategy footage; no completed run result. Source post date shown; no WR or completed-lap credit."}}[data.id],
          reportedRecording: data.id === "n64-yoshi-valley-r" ? displayRecord(data.submissions.find(r => r.id === "curated-animal2022-nu11-M011AAJ6zGg-distinct-recording") || {}) : null,
          practicalReviewComplete: a.tourReviews?.["tour-109"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      animal2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (day.includes("T") ? Date.parse(day) >= Date.parse("2023-11-15T06:00:00Z") && Date.parse(day) < Date.parse("2023-11-29T06:00:00Z") : day >= "2023-11-15" && day < "2023-11-29") &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-11-15")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-11-15"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-11-15"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-11-15") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-110") ? {
      peachbowser2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-110", "2023-11-29", "2023-12-13");
        const finalId = {"3ds-bowser-s-castle-r": "966559082955821056", "ds-peach-gardens": "1189361589913124894", "n64-royal-raceway": "1189361686306619392"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"3ds-bowser-s-castle-r": "Nu11’s 1:38.39 carries into this tour with earlier preserved footage. Goten’s current best posted 1:38.61 does not replace that WR. Current 1:38.76 and 1:38.62 movies are preserved as supporting recordings.", "ds-peach-gardens": "Sucha’s 1:26.58 improves the carried 1:26.60. The original screenshot was posted December 6 at 10:45 UTC; the movie was published at 10:52 UTC. The December 13 closing post retains its actual late submission date.", "n64-royal-raceway": "Sucha’s dated progression is 1:33.76 on November 30, then 1:33.66 on December 1. The original 1:33.66 screenshot was posted at 08:52 UTC and the movie shared at 11:19 UTC. The undated previous-best 1:33.86 is retained as a lead."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-110"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: wr?.videoBackup?.url && wr.videoVerified ? displayRecord(wr) : comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      peachbowser2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Peach vs. Bowser Tour (2023)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2023-11-29T06:00:00Z") && Date.parse(day) < Date.parse("2023-12-13T06:00:00Z") : day >= "2023-11-29" && day < "2023-12-13")) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-11-29")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-11-29"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-11-29"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-11-29") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-111") ? {
      holiday2023Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-111", "2023-12-13", "2023-12-27");
        const finalId = {"gba-snow-land":"1058253597781000283","vancouver-velocity-3":"1192533972043964436"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"gba-snow-land": "Nu11’s carried 1:08.42 remains faster than this tour’s best posted 1:08.66. Its preserved movie is available with the uploader’s stated time; a completed video result has not been independently verified. Closing posts retain their actual December 27 submission dates.", "vancouver-velocity-3": "Phillish’s 1:15.96 screenshot was submitted December 17 at 17:43 UTC. The movie was published December 20 at 11:25 UTC and shared at 12:28 UTC. Sucha’s 1:17.80 no-items movie and Phillish’s 37.94 lap clip are preserved separately from standard WR progression."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-111"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: wr?.videoBackup?.url && wr.videoVerified ? displayRecord(wr) : comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null,
          reportedRecording: data.id === "gba-snow-land" && wr?.videoBackup?.url ? displayRecord(wr) : null,
          lapDemonstration: data.id === "vancouver-velocity-3" ? {"playerId": "phillish", "time": "37.94", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1184891121843830864/RPReplay_Final1702498437.mov?ex=6ad1a499&is=6ad05319&hm=3975d83df90ebd3f67e805b95619f8af0a4a47ccc6214d9ab9171c5d4b0df4a7&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/holiday2023-1184891122208755772-08a940bf9e017799b7ac.mov"}, "videoSharedAt": "2023-12-14T16:14:17.747Z", "videoSubmittedAt": "2023-12-14T16:14:17.747Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1184891122208755772"}, "videoScope": "single-lap", "completedRaceTime": null} : null,
          sourceImages: data.id === "vancouver-velocity-3" ? [{"playerId": "phillish", "url": "https://media.mktwrs.com/assets/proof/holiday2023-1185660361400131634-0cb554456332635e557d.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1185660361542729830", "postedAt": "2023-12-16T19:10:58.696Z", "note": "Discussion image retained. No completed race total has been established from this source."}] : [],
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      holiday2023SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Holiday Tour (2023)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2023-12-13T06:00:00Z") && Date.parse(day) < Date.parse("2023-12-27T06:00:00Z") : day >= "2023-12-13" && day < "2023-12-27")) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-12-13")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-12-13"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-12-13"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-12-13") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-112") ? {
      newyear2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-112", "2023-12-27", "2024-01-10");
        const finalId = {"wii-koopa-cape":"1197596670645518491","3ds-piranha-plant-slide":"1197596509772984370"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"wii-koopa-cape": "nekozuki improves the carried 1:35.85 through 1:35.77 and 1:35.70 on December 29, then 1:35.65 on January 2. The fastest documented available movie in this tour is 1:35.77. The later deleted tweet does not establish an available 1:35.65 recording. Closing results retain their actual January 10 posting dates.", "3ds-piranha-plant-slide": "Sucha improves the carried 1:28.43 through 1:28.37 and 1:28.33, REMON posts 1:28.29, then Sucha posts 1:28.21, 1:28.18 and 1:28.03. Original screenshots and later video submission receipts keep separate posting clocks. Two lap clips and the previous-best fields do not establish additional completed WRs."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-112"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: (() => {const r = data.id === "wii-koopa-cape" ? data.records.find(r => r.id === "curated-1190203978185703514-newyear2024-image-reviewed") : wr;return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null;})(),
          lapDemonstrations: data.id === "3ds-piranha-plant-slide" ? [{"playerId": "player-e38199e38184e3819df09f90ba", "time": "44.23", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1191381334250238033/ScreenRecording_01-01-2024_22-43-05_1.mov?ex=6ad18614&is=6ad03494&hm=c891952f9de67cdb36b1ce4c2db28a0732ee7dd4ec0a8a8a18e404976e395a89&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/newyear2024-1191381334250238033-a6089a1682c9fff0c925.mov"}, "videoSharedAt": "2024-01-01T14:04:04.951Z", "videoScope": "single-lap", "completedRaceTime": null}, {"playerId": "player-e38199e38184e3819df09f90ba", "time": "44.10", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1192474090699755601/RPReplay_Final1704361774.mov?ex=6ad18b4a&is=6ad039ca&hm=d129b057bdde9ba8415d31bfad12702bb72899171cf6b52805f2047240403afd&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/newyear2024-1192474090699755601-e4e66f84f96e394b2bc1.mov"}, "videoSharedAt": "2024-01-04T14:26:18.401Z", "videoScope": "single-lap", "completedRaceTime": null}] : [],
          sourceImages: data.id === "3ds-piranha-plant-slide" ? [{"playerId": "player-e38199e38184e3819df09f90ba", "url": "https://media.mktwrs.com/assets/proof/newyear2024-1191557958316859482-f1abc539135aaf29c544.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1191557958623035503", "postedAt": "2024-01-02T01:45:55.412Z", "note": "Strategy or lap-boundary image retained; this source does not establish a completed total."}, {"playerId": "wins", "url": "https://media.mktwrs.com/assets/proof/newyear2024-1192395051511324753-b078375988bd5aaa666b.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1192395051821707284", "postedAt": "2024-01-04T09:12:13.983Z", "note": "Strategy or lap-boundary image retained; this source does not establish a completed total."}, {"url": "https://media.mktwrs.com/assets/proof/newyear2024-1194644411603243038-1ac2476f2485d4b49ed8.png", "sourceUrl": "https://discord.com/channels/629221606064914442/875784780573184010/1194644411825537134", "postedAt": "2024-01-10T14:10:23.199Z", "note": "Closing-day image retained without a certified completed result. No extra WR or profile credit."}, {"url": "https://media.mktwrs.com/assets/proof/newyear2024-1194574410154258473-40b2bfa0bd641035c931.png", "sourceUrl": "https://discord.com/channels/629221606064914442/875784780573184010/1194574410636607619", "postedAt": "2024-01-10T09:32:13.615Z", "note": "Closing-day image retained without a certified completed result. No extra WR or profile credit."}, {"url": "https://media.mktwrs.com/assets/proof/newyear2024-1194559346303058000-939c1e164454fe7f6038.jpg", "sourceUrl": "https://discord.com/channels/629221606064914442/875784780573184010/1194559346521145466", "postedAt": "2024-01-10T08:32:22.050Z", "note": "Closing-day image retained without a certified completed result. No extra WR or profile credit."}] : [],
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      newyear2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "New Year's Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2023-12-27T06:00:00Z") && Date.parse(day) < Date.parse("2024-01-10T06:00:00Z") : day >= "2023-12-27" && day < "2024-01-10")) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2023-12-27")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2023-12-27"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2023-12-27"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2023-12-27") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-113") ? {
      space2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-113", "2024-01-10", "2024-01-24");
        const finalId = {"gba-cheep-cheep-island-r":"1068224700599255101","n64-kalimari-desert-2":"1204260087687024680"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"gba-cheep-cheep-island-r": "Sucha’s carried 1:11.78 remains the tour WR and has preserved footage. The current submissions reviewed do not improve it. Closing submissions retain their actual January 24 posting dates.", "n64-kalimari-desert-2": "kNo2 improves the carried 1:03.36 to 1:03.32. Its screenshot was posted January 24 at 06:03 UTC, after the tour’s 06:00 UTC close; the WR announcement assigns it to this tour. The fastest documented available recording for this tour is the carried 1:03.36. A 1:03.30 result crop has no confirmed course and does not establish another WR."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-113"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording ? displayRecord(comparison.recording) : null,
          documentedRecording: (() => {const r = data.id === "n64-kalimari-desert-2" ? data.records.find(r => r.id === "1068224230715559956") : wr;return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : comparison.documentedRecording ? displayRecord(comparison.documentedRecording) : null;})(),
          sourceImages: data.id === "n64-kalimari-desert-2" ? [{"url": "https://media.mktwrs.com/assets/proof/space2024-1748208422670180649-054263dca60e814d8cf6.jpg", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1197829775578906694", "postedAt": "2024-01-19T09:07:53.099Z", "note": "Result crop reads 1:03.30; course unconfirmed. Retained as a source lead."}] : [],
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      space2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.achievedAt || r.submittedAt || r.chronologyDate;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Space Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-01-10T06:00:00Z") && Date.parse(day) < Date.parse("2024-01-24T06:00:00Z") : day >= "2024-01-10" && day < "2024-01-24")) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-01-10")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.achievedAt || row.submittedAt || row.chronologyDate).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day;
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-01-10"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-01-10"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-01-10") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-114") ? {
      winter2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-114", "2024-01-24", "2024-02-07");
        const finalId = {"bangkok-rush-2":"1074903912617869332","singapore-speedway-r":"1074903599689248788","tokyo-blur-4":"1209624145000792084"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"bangkok-rush-2": "Wins’s carried 1:32.39 remains the WR. Its available movie is uploader-reported; the fastest documented standard recording is Shine’s 1:32.68. Sucha’s 1:34.71 NITA movie is a separate no-items result. Late submissions retain their February 7 posting dates.", "singapore-speedway-r": "8978’s carried 1:10.44 remains the WR. The fastest documented available recording is Sucha’s carried 1:10.88. Current reviewed submissions do not improve the WR; late submissions retain their February 7 posting dates.", "tokyo-blur-4": "mb3. improves the carried 0:45.94 to 0:45.90, submitted February 6. The fastest documented available recording is kNo2’s carried 0:45.94."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-114"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording?.videoVerified ? displayRecord(comparison.recording) : null,
          reportedRecording: data.id === "bangkok-rush-2" && wr?.videoBackup?.url ? displayRecord(wr) : null,
          documentedRecording: (() => {const id = {"bangkok-rush-2":"curated-1202588979275235438-winter2024-image-reviewed","singapore-speedway-r":"curated-1070619816957853726-winter2023-contender-source-reviewed","tokyo-blur-4":"1074903169542389840"}[data.id];const r = [...data.records,...(data.submissions || [])].find(r => r.id === id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      winter2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Winter Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-01-24T06:00:00Z") && Date.parse(day) < Date.parse("2024-02-07T06:00:00Z") : day >= "2024-01-24" && day < "2024-02-07")) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-01-24")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-01-24"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-01-24"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-01-24") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-115") ? {
      exploration2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-115", "2024-02-07", "2024-02-21");
        const finalId = {"piranha-plant-cove":"1078514612225441792","piranha-plant-cove-2":"1215068996248936541"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"piranha-plant-cove": "Wins’s carried 1:08.46 remains the WR. Its available movie uses the uploader’s stated result. Current reviewed submissions do not improve it. Closing submissions and Mish’s later screenshot retain their actual February 21 posting dates.", "piranha-plant-cove-2": "mb3. improves the carried 1:29.38 to 1:29.34, submitted February 12. The fastest documented available recording is Phillish’s carried 1:29.81. The discussion strategy clip ends during lap one and establishes no completed result."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-115"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: comparison.recording?.videoVerified ? displayRecord(comparison.recording) : null,
          reportedRecording: data.id === "piranha-plant-cove" && wr?.videoBackup?.url ? displayRecord(wr) : null,
          documentedRecording: (() => {const r = data.id === "piranha-plant-cove-2" ? [...data.records,...(data.submissions || [])].find(r => r.id === "curated-1074269225121763338-exploration2023-original-result-reviewed") : null;return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          strategyReference: data.id === "piranha-plant-cove-2" ? {"playerId": "deleted-user", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1208857477266018344/TRIM_20240218_202446.mp4?ex=6ac3fa42&is=6ac2a8c2&hm=c80f5d8d176d621748d0181594a000b4a1b29083f4214382cdd0e9d19b71fabb&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/exploration2024-1208857477266018344-5d58e71d1b794737cf49.mp4"}, "submittedAt": "2024-02-18T19:28:02.148Z", "evidenceNote": "Partial lap-one strategy clip, ending at a 0:17.85 timer with lap 1/2 visible. It establishes no completed lap or whole-race total."} : null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.map(displayRecord)};
      })(),
      exploration2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Exploration Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-02-07T06:00:00Z") && Date.parse(day) < Date.parse("2024-02-21T06:00:00Z") : day >= "2024-02-07" && day < "2024-02-21")) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-02-07")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-02-07"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-02-07"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-02-07") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-116") ? {
      doctor2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-116", "2024-02-21", "2024-03-06");
        const finalId = {"ds-peach-gardens-r":"1219694565657804833","gba-sky-garden":"1219694774953443399"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"ds-peach-gardens-r": "kNo2’s 1:27.16 final result was submitted March 6 at 06:02 UTC, shortly after tour rollover; its actual posting date and documented Doctor Tour attribution are retained. The fastest documented available recording is Sucha’s carried 1:27.21.", "gba-sky-garden": "Litchi’s 1:03.97 was submitted March 1. The fastest documented available recording for this tour is NR’s carried 1:04.09. Later March 6 submissions retain their actual dates. A faster 1:03.85 record posted February 26, 2026 ends this 2024 record’s reign and belongs to a later tour."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-116"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id = {"ds-peach-gardens-r":"1084274701741862943","gba-sky-garden":"1084274769643454484"}[data.id];const r=data.records.find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          strategyReferences: data.id === "ds-peach-gardens-r" ? [{"playerId": "phillish", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1209880740783849533/RPReplay_Final1708528220.mov?ex=6ac3bebf&is=6ac26d3f&hm=75f431fcd9439fe2ed0016d0fa09c1e8c25b28060995d1e9e56bde13d18095c4&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/doctor2024-1209880741098426378-9e1a5d0d7138eb3976a5.mov"}, "submittedAt": "2024-02-21T15:14:07.175Z", "evidenceNote": "Partial mid-lap Peach Gardens R strategy clip; no completed lap or race result."}, {"playerId": "remon", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1214612574868611204/vcompress_63.mov?ex=6ac3d21c&is=6ac2809c&hm=2b6023175ef7d4fe8c2e85b69c7ac6e992d8fb5e691ea8b6abfe34cd8ed454c2&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/doctor2024-1214612575178854410-db767dbe3c0d831995ea.mov"}, "submittedAt": "2024-03-05T16:36:44.333Z", "evidenceNote": "Partial mid-lap Peach Gardens R strategy clip; no completed lap or race result."}] : [],
          sourceImages: [{"playerId": "litchi", "url": "https://media.mktwrs.com/assets/proof/doctor2024-1212147728834895973-3ed2a5708eb1004e611f.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1212147729330085898", "postedAt": "2024-02-27T21:22:19.288Z", "note": "Discussion context image: lap boundary image no completed total. It does not establish a completed race result."}, {"playerId": "litchi", "url": "https://media.mktwrs.com/assets/proof/doctor2024-1212517371965603950-43a6ee51a1d81ec1b13f.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1212517372481642506", "postedAt": "2024-02-28T21:51:09.083Z", "note": "Discussion context image: control settings image no completed total. It does not establish a completed race result."}],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-03-07" && !r.videoVerified).map(displayRecord)};
      })(),
      doctor2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Doctor Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-02-21T06:00:00Z") && Date.parse(day) < Date.parse("2024-03-06T06:00:00Z") : day >= "2024-02-21" && day < "2024-03-06")) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-02-21")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-02-21"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-02-21"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-02-21") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-117") ? {
      mario2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-117", "2024-03-06", "2024-03-20");
        const finalId = {"n64-luigi-raceway":"1224448025263345876","snes-donut-plains-3r":"1089608065063596185"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"n64-luigi-raceway": "REMON ties the carried 1:12.20 with an earlier March 9 discussion screenshot. nekozuki submits 1:12.17 on March 10, then the final 1:12.13 on March 12. The fastest documented available race recording for this tour is nekozuki’s 1:12.32. Accepted repost receipts retain their later submission clocks.", "snes-donut-plains-3r": "Sucha’s carried 0:57.13 remains both the archived tour WR and fastest documented available recording. Current source images do not improve that result. Late March 20 posts retain their actual submission dates."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-117"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"n64-luigi-raceway":"curated-1215219574576783420-mario2024-discussion-video-reviewed","snes-donut-plains-3r":"1089608065063596185"}[data.id];const r=[...data.records,...(data.submissions || [])].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: data.id === "n64-luigi-raceway" ? [{"playerId": "remon", "time": "0:35.04", "video": "https://www.youtube.com/watch?v=JetIPsxU7cQ", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/mario2024-1215350104014192660-e86789f97d267fe3a483.mp4"}, "submittedAt": "2024-03-07T17:27:24.910Z", "evidenceNote": "One lap only; no completed whole-race time."}] : [],
          lateStartRecording: data.id === "n64-luigi-raceway" ? displayRecord((data.submissions || []).find(r=>r.messageId === "wins-1633594163777220608-original-finish-reviewed") || {id:"wins-2023-reference",playerId:"wins",time:"1:12.43",video:"https://x.com/winsmkt/status/1633594163777220608",videoBackup:{url:"https://media.mktwrs.com/assets/video/mario2024-1633594163777220608-b18c38d834d20a9da52f.mp4"},submittedAt:"2023-03-08T22:22:54.013Z",videoSharedAt:"2024-03-07T13:11:47.359Z"}) : null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-03-21" && !r.videoVerified).map(displayRecord)};
      })(),
      mario2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Mario Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-03-06T06:00:00Z") && Date.parse(day) < Date.parse("2024-03-20T06:00:00Z") : day >= "2024-03-06" && day < "2024-03-20")) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-03-06")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-03-06"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-03-06"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-03-06") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-118") ? {
      ninja2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-118", "2024-03-20", "2024-04-03");
        const finalId = {"wii-rainbow-road":"1229525362023858277","3ds-wario-shipyard":"1229525504084934686"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"wii-rainbow-road": "kuRi posts the final 1:13.83 on March 22 with a result screenshot and linked recording. The prior original movie review shows countdown, lap transition and finish. Opening-day publication retains the final fastest result; earlier source submissions remain archived.", "3ds-wario-shipyard": "nekozuki ties the carried 1:33.45 on March 24 and posts 1:33.36 on March 25. No available movie is documented for the final WR; N’s carried 1:33.45 is the fastest available uploader-reported recording; its original movie has not been visually certified. Zabby’s late April 3 screenshot retains its actual posting date and Ninja Tour attribution."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-118"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: data.id === "3ds-wario-shipyard" ? displayRecord(data.records.find(r=>r.id==="1093745717182472272")) : null,
          documentedRecording: (() => {const id={"wii-rainbow-road":"1229525362023858277","3ds-wario-shipyard":"1093745717182472272"}[data.id];const r=data.records.find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: data.id === "wii-rainbow-road" ? [{"playerId": "remon", "time": "0:43.19", "video": "https://www.youtube.com/watch?v=iC33U9FX_n4", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/ninja2024-1220267404102467634-660cddc886afffee4e13.mp4"}, "submittedAt": "2024-03-21T07:07:00.610Z", "evidenceNote": "One lap only; no completed whole-race time."}] : [],
          lateStartRecording: data.id === "wii-rainbow-road" ? displayRecord((data.submissions || []).find(r=>r.messageId === "1220302884282040320-ninja2024-discussion-finish-reviewed") || (data.candidates || []).find(r=>r.messageId === "1220302884282040320-ninja2024-discussion-finish-reviewed")) : null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-04-04" && !r.videoVerified).map(displayRecord)};
      })(),
      ninja2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Ninja Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-03-20T06:00:00Z") && Date.parse(day) < Date.parse("2024-04-03T06:00:00Z") : day >= "2024-03-20" && day < "2024-04-03")) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-03-20")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-03-20"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-03-20"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-03-20") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-119") ? {
      yoshi2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-119", "2024-04-03", "2024-04-17");
        const finalId = {"gcn-yoshi-circuit":"1232480525512343592","snes-donut-plains-2r":"1099917584113090641"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"gcn-yoshi-circuit": "Wins ties the carried 1:31.46, then posts 1:31.41, 1:31.34 and 1:31.26 on April 16. mb3’s final 1:31.19 was submitted April 17 at 06:00:40 UTC, just after rollover; the actual submission date and documented Yoshi Tour attribution are retained. Wins’s 1:31.26 is the fastest documented available recording for this tour. Phillish’s 1:31.60 has corrected 45.81/45.79 splits and separate April 10 result / April 11 video-share dates.", "snes-donut-plains-2r": "N’s carried 1:00.08 remains the archived tour WR. Its available original recording uses the uploader’s stated time and has no fresh visual certification. Current documented results do not improve that WR."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-119"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: data.id === "snes-donut-plains-2r" ? displayRecord(data.records.find(r=>r.id==="1099917584113090641")) : null,
          documentedRecording: data.id === "gcn-yoshi-circuit" ? (() => {const r=data.records.find(r=>r.id==="curated-1229804749059260496-yoshi2024-image-reviewed");return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})() : null,
          lapDemonstrations: data.id === "gcn-yoshi-circuit" ? [{"playerId": "phillish", "time": "0:45.77", "video": "https://www.youtube.com/shorts/ksjB_rSQd6Q", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/yoshi2024-ksjB_rSQd6Q-684cc8f81567a0f32081.mp4"}, "submittedAt": "2024-04-03T18:57:08.386Z"}] : [],
          strategyReferences: data.id === "gcn-yoshi-circuit" ? [{"playerId": "wins", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1229478015851823244/RPReplay_Final1713200626.mov?ex=6ac3d921&is=6ac287a1&hm=1ff0abec0f7f963e327c6da03042921db90e3dcef0fef95d10fd20df00ffb8f6&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/yoshi2024-1229478016229572628-2b934081f55b668771ed.mov"}, "submittedAt": "2024-04-15T17:06:41.666Z"}, {"playerId": "wins", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1229485375471358062/RPReplay_Final1713202406.mov?ex=6ac3dffc&is=6ac28e7c&hm=a76658ce68c61a5c09bdc0059b30d7881415186b231b573750447b794b858b9c&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/yoshi2024-1229485375802576956-afe54e4b0d78dce9fee3.mov"}, "submittedAt": "2024-04-15T17:35:56.325Z"}] : [],
          lateStartRecording: null,
          sourceImages: data.id === "gcn-yoshi-circuit" ? [{"playerId": "wins", "url": "https://media.mktwrs.com/assets/proof/yoshi2024-1225211250418520125-cfa90a63cfc13b89af06.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1225211250724569289", "postedAt": "2024-04-03T22:32:05.497Z", "note": "Lap boundary 45.62 only; no completed total."}, {"playerId": "wins", "url": "https://media.mktwrs.com/assets/proof/yoshi2024-1229471475443040286-04b29698027e34668311.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1229471476000755802", "postedAt": "2024-04-15T16:40:42.354Z", "note": "Course selection only; no completed race or total."}, {"playerId": "wins", "url": "https://media.mktwrs.com/assets/proof/yoshi2024-1229477692756332585-7198755a3c54dc9c6de9.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1229477693070774304", "postedAt": "2024-04-15T17:05:24.619Z", "note": "Lap boundary 45.59 only; no completed total."}] : [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-04-18" && !r.videoVerified).map(displayRecord)};
      })(),
      yoshi2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Yoshi Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-04-03T06:00:00Z") && Date.parse(day) < Date.parse("2024-04-17T06:00:00Z") : day >= "2024-04-03" && day < "2024-04-17")) &&
            !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-04-03")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-04-03"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-04-03"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-04-03") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-120") ? {
      spring2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-120", "2024-04-17", "2024-05-01");
        const finalId = {"athens-dash-2":"1241780457365049465","berlin-byways":"1104263697943240844"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"athens-dash-2": "The carried 1:33.49 improves to nekozuki’s 1:33.46 on April 24 and 1:33.42 on May 1 at 05:55:40 UTC, before the 06 UTC rollover. An identical repost corrects the canceled 1:33.00 input at 05:56:36 UTC; no 1:33.00 WR is credited. The unavailable social link was shared April 30, but its contents do not establish an earlier result date. No available completed-run recording is documented for this tour. Saved lap and technique clips remain separate: nekozuki’s clip shows 46.72 while its caption reports a separate best .56; those values are not merged.", "berlin-byways": "SuperFX’s carried 1:14.41 remains the tour WR and fastest documented available recording. Its original 2023 result submission, video publication and Spring 2024 attribution remain separate. Current submissions do not improve it. The saved 37.20 lap-boundary clip establishes no completed whole-race total."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-120"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: data.id === "berlin-byways" ? (() => {const r=data.records.find(r=>r.id==="1104263697943240844");return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})() : null,
          lapDemonstrations: [],
          strategyReferences: {"athens-dash-2": [{"playerId": "nekozuki", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1232842671522054164/Screen_Recording_20240425_085350_Mario_Kart.mp4?ex=6ac39076&is=6ac23ef6&hm=e0139dda00f6f2f450e2c6c9785b5ef36bc5c3a25ddec125700b0ff24ccaef97&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/spring2024-1232842672268644452-fac3ddab4ed509e3c839.mp4"}, "submittedAt": "2024-04-24T23:56:38.178Z"}, {"playerId": "wins", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1234153686863974450/ScreenRecording_04-28-2024_15-51-04_1.mov?ex=6ac3b830&is=6ac266b0&hm=acbba07826e3266fd998ccdeaf7eaadc1c899e883401e9d148a863e8055e1ff7&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/spring2024-1234153687199387690-895c860f659aaf8072dc.mov"}, "submittedAt": "2024-04-28T14:46:08.495Z"}, {"playerId": "fireball", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1234153690617614368/Screenrecorder-2024-04-28-16-41-19-530.mp4?ex=6ac3b831&is=6ac266b1&hm=50310c297b9f44266abd4edb896148a21d3be6b9f8dd1d58c2a3b41ab1a62f3e&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/spring2024-1234153690953289919-6a555dd23e17f387582e.mp4"}, "submittedAt": "2024-04-28T14:46:09.390Z"}, {"playerId": "wins", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1234154776137175051/ScreenRecording_04-28-2024_15-51-04_1.mov?ex=6ac3b934&is=6ac267b4&hm=a931c2930842c57b10955b0ea3b7a970bd3fa4d6b631617f2c206a09309b4032&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/spring2024-1234154776430772274-5f2ef91ed5fb9ae3b227.mov"}, "submittedAt": "2024-04-28T14:50:28.188Z"}, {"playerId": "wins", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1234210729293385848/RPReplay_Final1714327393.mov?ex=6ac3ed50&is=6ac29bd0&hm=06301d7fe174cd62068db244c09c63d9564333078c512ef1a0c4d7e7167d7e91&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/spring2024-1234210729650028584-9a9a989102fe89ac1675.mov"}, "submittedAt": "2024-04-28T18:32:48.475Z"}, {"playerId": null, "video": "https://cdn.discordapp.com/attachments/636461740162416640/1234278709565853747/RPReplay_Final1714320063.mov?ex=6ac42ca0&is=6ac2db20&hm=d75875edd3bdb4a9999cef7673b1ffa747806417e6bf35ce5ac7291115ce2d45&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/spring2024-1234278710031548536-ef38e8d028ae9160fe01.mov"}, "submittedAt": "2024-04-28T23:02:56.261Z"}], "berlin-byways": [{"playerId": null, "video": "https://cdn.discordapp.com/attachments/636461740162416640/1231180702112940132/ScreenRecording_04-20-2024_18-40-07_1.mov?ex=6ac41c21&is=6ac2caa1&hm=39ae1c8046bdfaedde8be74608d228aba85d13fae89f22b07b8d6610e8f3cf97&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/spring2024-1231180702565929011-e6423c098b8fa57772c4.mov"}, "submittedAt": "2024-04-20T09:52:33.723Z"}]}[data.id] || [],
          lateStartRecording: null,
          sourceImages: data.id === "athens-dash-2" ? [{"playerId": null, "url": "https://media.mktwrs.com/assets/proof/spring2024-1234904899125248112-72c78ad1f5b7bb3896a7.jpg", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1234904899410464820", "postedAt": "2024-04-30T16:31:11.443Z", "note": "Control settings in ordinary race; no TT result."}, {"playerId": "fireball", "url": "https://media.mktwrs.com/assets/proof/spring2024-1234905678317883473-b884072a34fb31eac45c.jpg", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1234905678586314923", "postedAt": "2024-04-30T16:34:17.213Z", "note": "Fireball’s control settings; no completed Time Trial result."}] : [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-05-02" && !r.videoVerified).map(displayRecord)};
      })(),
      spring2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Spring Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-04-17T06:00:00Z") && Date.parse(day) < Date.parse("2024-05-01T06:00:00Z") : day >= "2024-04-17" && day < "2024-05-01")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-04-17")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-04-17"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-04-17"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-04-17") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-121") ? {
      bowser2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-121", "2024-05-01", "2024-05-15");
        const finalId = {"gba-bowser-s-castle-4":"1109324308658004028","n64-kalimari-desert-2r":"896334182928760863"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"gba-bowser-s-castle-4": "DIT’s carried 1:10.80 remains the tour WR. N’s earlier 1:10.86 recording now has a visually verified completed result and is the fastest documented available recording carried into this tour. Fireball’s 1:11.45 remains preserved as a slower recording. Current preserved submissions do not improve DIT’s WR. Wins’s 38.16 lap-boundary clip ends during lap two and establishes no completed total.", "n64-kalimari-desert-2r": "Kazuo’s carried 1:04.30 remains the tour WR, tied by Hilton, and has an available reviewed recording. Sephiroth’s 1:05.03 recording preserves its May 7 result submission and later video-sharing time. Sucha’s 1:05.57 is a no-item supporting run; its matching-result repost and later video share retain separate clocks and receive no main-category WR credit."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-121"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id=data.id==="gba-bowser-s-castle-4" ? "discord-1106178965829320746" : "896334182928760863";const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {"gba-bowser-s-castle-4": [{"playerId": "wins", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1235953435409387551/RPReplay_Final1714744476.mov?ex=6ac3acd5&is=6ac25b55&hm=cf1c3c4c23d12ae5254bf16d3d02517731b63090ddba74bea93839b2db740982&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/bowser2024-1235953435724091403-08796d4f38020d3c3cac.mov"}, "submittedAt": "2024-05-03T13:57:41.981Z"}], "n64-kalimari-desert-2r": [{"playerId": null, "video": "https://cdn.discordapp.com/attachments/636461740162416640/1237007837608280174/RPReplay_Final1714995992.mov?ex=6ac43712&is=6ac2e592&hm=c77a29f3772b6a404a19ee5aa00964fa7b7f3fe138e74aa08ad28966909bb7e9&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/bowser2024-1237007838006480998-baaa389da63ff90c3424.mov"}, "submittedAt": "2024-05-06T11:47:31.075Z"}]}[data.id] || [],
          lateStartRecording: null,
          sourceImages: data.id === "gba-bowser-s-castle-4" ? [{"playerId": null, "url": "https://media.mktwrs.com/assets/proof/bowser2024-1236420815335985152-0e87601013d690c17664.png", "sourceUrl": "https://discord.com/channels/629221606064914442/875784780573184010/1236420815516602462", "postedAt": "2024-05-04T20:54:54.007Z", "note": "Historical bot leaderboard lists DIT\u2019s 1:10.80. This is secondary context; displayed positions and malformed lap values establish no new WR chronology."}] : [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-05-16" && !r.videoVerified).map(displayRecord)};
      })(),
      bowser2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Bowser Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-05-01T06:00:00Z") && Date.parse(day) < Date.parse("2024-05-15T06:00:00Z") : day >= "2024-05-01" && day < "2024-05-15")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-05-01")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-05-01"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-05-01"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-05-01") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-122") ? {
      mii2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-122", "2024-05-15", "2024-05-29");
        const finalId = {"wii-maple-treeway-r":"1022593479790043236","gcn-mushroom-bridge":"1114964088326471821"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"wii-maple-treeway-r": "newyork’s carried 1:49.29 remains the tour WR. kuRi’s reviewed 1:49.78 is the fastest available recording from this tour, now preserved with separate May 25 publication and submission times. louis_mk’s 1:50.55 was submitted nine seconds after close and keeps its actual May 29 posting time.", "gcn-mushroom-bridge": "kno2’s carried 1:10.37 remains the tour WR and has a preserved recording. No current preserved submission improves it. The stored course-panel best 1:10.84 is context, not a completed finish or a newly dated WR."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-122"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id=data.id==="wii-maple-treeway-r" ? "curated-1243922539676307547-mii2024-image-reviewed" : "1114964088326471821";const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          lateStartRecording: null,
          sourceImages: data.id === "gcn-mushroom-bridge" ? [{"playerId": "mb3", "url": "https://media.mktwrs.com/assets/proof/mii2024-1245105224620703895-ccd60fca0bff4921b1a5.jpg", "sourceUrl": "https://discord.com/channels/629221606064914442/875784780573184010/1245105224838811688", "postedAt": "2024-05-28T20:03:38.538Z", "note": "Stored course-panel best 1:10.84; not a completed finish or a newly dated WR."}] : [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-05-30" && !r.videoVerified).map(displayRecord)};
      })(),
      mii2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Mii Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-05-15T06:00:00Z") && Date.parse(day) < Date.parse("2024-05-29T06:00:00Z") : day >= "2024-05-15" && day < "2024-05-29")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-05-15")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-05-15"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-05-15"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-05-15") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-123") ? {
      princess2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-123", "2024-05-29", "2024-06-12");
        const finalId = {"wii-coconut-mall":"1252349131188469841","gba-snow-land-r":"1124182218407944233"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"wii-coconut-mall": "The tour progression ends with mb3’s 1:13.51 on June 11. Shine’s preserved 1:13.64 is the fastest available recording identified by the prior video review. Screenshot submission, captured edited receipt, video publication and video sharing retain separate clocks; receipt splits are reported, not independently video verified. The anonymous 1:13.92 tie retains its unresolved identity.", "gba-snow-land-r": "NR’s carried 1:09.09 remains the tour WR and has a preserved recording. Sephiroth’s 1:09.97 movie supports the June 11 result; 34.85 lap one comes from the prior movie review and 35.12 lap two is derived. Litchi’s stored course-panel 1:09.95 is context, not a completed finish or a new WR."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-123"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id=data.id==="wii-coconut-mall" ? "curated-1249676586463264841-princess2024-image-reviewed" : "1124182218407944233";const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: data.id === "wii-coconut-mall" ? [{"playerId": null, "video": "https://cdn.discordapp.com/attachments/636461740162416640/1248278609836118057/ScreenRecording_06-06-2024_20-24-25_1.mov?ex=6ac3b08c&is=6ac25f0c&hm=7f003ec907bae10a79774eae61b03bf18ebb1313247ed6292d4e4446be0261ec&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/princess2024-1248278610226446369-2644c48abeeb2fe7d565.mov"}, "submittedAt": "2024-06-06T14:13:32.573Z"}, {"playerId": null, "video": "https://cdn.discordapp.com/attachments/636461740162416640/1246231791900164147/RPReplay_Final1717070866.mov?ex=6ac4274d&is=6ac2d5cd&hm=58d11be3b4ac29c2c4b82dd06d96b05933d9190d0d8e13147a4948c808d9fa13&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/princess2024-1246231792231649291-ecb276751750e02ee491.mov"}, "submittedAt": "2024-05-31T22:40:13.135Z"}] : [],
          lateStartRecording: null,
          sourceImages: data.id === "gba-snow-land-r" ? [{"playerId": "litchi", "url": "https://media.mktwrs.com/assets/proof/princess2024-1250328461613207673-6199e10c3d2fc9869b01.png", "sourceUrl": "https://discord.com/channels/629221606064914442/875784780573184010/1250328461877317705", "postedAt": "2024-06-12T05:58:55.291Z", "note": "Stored Snow Land R course-panel best 1:09.95; not a completed finish or newly dated WR."}] : [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-06-13" && !r.videoVerified).map(displayRecord)};
      })(),
      princess2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Princess Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-05-29T06:00:00Z") && Date.parse(day) < Date.parse("2024-06-12T06:00:00Z") : day >= "2024-05-29" && day < "2024-06-12")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-05-29")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-05-29"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-05-29"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-05-29") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-124") ? {
      marioluigi2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-124", "2024-06-12", "2024-06-26");
        const finalId = "1264386099934003281";
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: "Sucha’s final WR is 1:11.86, submitted June 25. His preserved 1:11.87 recording is the fastest available recording identified by the prior hash-matching review. Screenshot submission, video publication and later 2025 sharing retain separate clocks. Litchi’s 1:11.95 uses the replacement-image human post; the earlier edited receipt remains separate. Partial laps and nekozuki’s .87 lap shorthand do not establish completed totals.",
          practicalReviewComplete: a.tourReviews?.["tour-124"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const r=data.records.find(r=>r.id==="curated-sucha-supplied-16vI7eIWw-4");return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [{"playerId": "litchi", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1251942643622215740/RPReplay_Final1718555414.mov?ex=6ac3d5f2&is=6ac28472&hm=17fb6559e19baa9d5af4a485b4590b18114098163be12c44819b86adf50f409a&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/marioluigi2024-1251942643915821067-de50ed83d23fa6024ab0.mov"}, "submittedAt": "2024-06-16T16:53:06.279Z"}, {"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1253642050880933908/RPReplay_Final1718961818.mov?ex=6ac415e4&is=6ac2c464&hm=7ed46e27eee6cc0b4754de86b869deef348dda4c148856298fa8112acfebb9e8&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/marioluigi2024-1253642050973204492-879fe8650a4f82635476.mov"}, "submittedAt": "2024-06-21T09:25:56.495Z"}],
          lateStartRecording: null,
          sourceImages: [{"playerId": "player-e38199e38184e3819df09f90ba", "url": "https://media.mktwrs.com/assets/proof/marioluigi2024-1253969985466794014-345fc5b105a5758a15eb.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1253969985898938428", "postedAt": "2024-06-22T07:09:02.274Z", "note": "Single lap-boundary screenshot 34.82; no completed total or same-run proof linking it to the 1:11.90 finish."}],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-06-27" && !r.videoVerified).map(displayRecord)};
      })(),
      marioluigi2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Mario vs. Luigi Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-06-12T06:00:00Z") && Date.parse(day) < Date.parse("2024-06-26T06:00:00Z") : day >= "2024-06-12" && day < "2024-06-26")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-06-12")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-06-12"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-06-12"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-06-12") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-125") ? {
      night2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-125", "2024-06-26", "2024-07-10");
        const finalId = {"rome-avanti-2":"1264395735814635612","singapore-speedway":"935931716575559721","singapore-speedway-2r":"1264395851904585738"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"rome-avanti-2": "mb3’s final WR is 1:18.84, submitted July 2. Nu11’s carried 1:18.87 video is the fastest preserved recording identified before this tour closed. Lap-boundary images and strategy clips do not establish completed totals; unresolved author images receive no inferred identity.", "singapore-speedway": "Sucha’s archived WR and preserved recording remain 1:09.43 from 2022. The Night 2024 sources discuss the patched shortcut and preserve his conventional-route 1:10.97 recording as a supporting result. No separate route-category WR or replacement baseline is inferred.", "singapore-speedway-2r": "REMON’s final WR is 1:24.28, submitted July 9. His complete 1:24.54 recording is the fastest available recording identified for this tour. The separate lap-two-only clip has a different split claim and does not amend the complete run’s 42.17/42.37. The July 8 image-caption mismatch retains its own date and source disposition."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-125"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"rome-avanti-2":"1130210516791464016","singapore-speedway":"935931716575559721","singapore-speedway-2r":"curated-1257277274265354242-night2024-image-reviewed"}[data.id];const r=data.records.find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {"rome-avanti-2": [{"playerId": "phillish", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1256160867993522226/09733AB4-F037-4A6A-BDFC-FB5A51E14C31.mov?ex=6ac40539&is=6ac2b3b9&hm=9d37e09f1ce62526699da68fd4f2601faba3212f071de14efa130ddd4d433769&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/night2024-1256160867993522226-480f7ea70b25662ae18c.mov"}, "submittedAt": "2024-06-28T08:14:49.253Z", "videoSharedAt": "2024-06-28T08:14:49.253Z", "videoPublishedAt": null}], "singapore-speedway-2r": [{"playerId": "remon", "video": "https://www.youtube.com/watch?v=x-_eti6CroQ", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/night2024-x-_eti6CroQ-fe2bbad64ffce7748129.mp4"}, "submittedAt": "2024-07-01T11:27:56.574Z", "videoSharedAt": "2024-07-01T11:27:56.574Z", "videoPublishedAt": "2024-07-01T08:05:26Z"}]}[data.id] || [],
          lateStartRecording: null,
          sourceImages: {"rome-avanti-2": [{"playerId": "phillish", "url": "https://media.mktwrs.com/assets/proof/night2024-1255518817061306388-0f9d3f66e98670699726.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1255518817363431484", "postedAt": "2024-06-26T13:43:32.471Z", "note": "RomeAvanti2 lap1 reads39.31; no final total or matching full run."}], "singapore-speedway-2r": [{"playerId": "remon", "url": "https://media.mktwrs.com/assets/proof/night2024-1257206090672767008-dfa794b887a6d99521e9.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1257206090656124941", "postedAt": "2024-07-01T05:28:09.772Z", "note": "SingaporeSpeedway2R lap1 reads42.17. Matches stated lap for later1:24.54 but no final total; not earlier full-run evidence."}]}[data.id] || [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-07-11" && !r.videoVerified).map(displayRecord)};
      })(),
      night2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Night Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-06-26T06:00:00Z") && Date.parse(day) < Date.parse("2024-07-10T06:00:00Z") : day >= "2024-06-26" && day < "2024-07-10")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-06-26")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-06-26"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-06-26"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-06-26") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-126") ? {
      pipe2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-126", "2024-07-10", "2024-07-24");
        const finalId = {"wii-dry-dry-ruins": "1136096968901398628", "piranha-plant-cove-2r": "1274824870248845414"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"wii-dry-dry-ruins": "newyork’s 1:17.90 WR and preserved recording carry into this tour from July 2023. The current tour’s best posted result is his 1:17.98; it does not replace the carried WR. Later 2025 records are outside this comparison.", "piranha-plant-cove-2r": "Litchi’s final WR is 1:31.28, submitted July 21. His earlier 1:31.31 is the fastest available completed-result recording identified for this tour: image submitted July 16 at 14:30 UTC, video published at 14:33 UTC and shared at 14:40 UTC. Repeat screenshots do not create new performances or change the first submission date. Partial clips supply no completed two-lap total. Phillish’s lap clip was published in July 2023 and reshared during this tour."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-126"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"wii-dry-dry-ruins":"1136096968901398628","piranha-plant-cove-2r":"curated-1262778386078502922-pipe2024-image-reviewed"}[data.id];const r=data.records.find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: data.id === "piranha-plant-cove-2r" ? [{"playerId": "litchi", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1262414246763827303/RPReplay_Final1721053359.mov?ex=6ac3b2e2&is=6ac26162&hm=8c92200e4946decc732f115db25bb90600e9c5be166cbb4f2ab4531c0bed195b&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/pipe2024-1262414246763827303-ca1c57d8797bd2c4678e.mov"}, "submittedAt": "2024-07-15T14:23:31.031Z", "videoSharedAt": "2024-07-15T14:23:31.031Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1262414247099367475"}, "videoPublishedAt": null, "evidenceNote": "A 4.3-second stair and camera clip from Piranha Plant Cove 2R; no completed race result."}, {"playerId": "litchi", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1262652719584252006/RPReplay_Final1721050713.mov?ex=6ac3e83b&is=6ac296bb&hm=ef5a5edbc4048bb233f3c3164e406e94a6c4e3dadf271884e3878f2ba2ff249a&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/pipe2024-1262652719584252006-ba207d8f745a58bde533.mov"}, "submittedAt": "2024-07-16T06:11:07.416Z", "videoSharedAt": "2024-07-16T06:11:07.416Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1262652720062398484"}, "videoPublishedAt": null, "evidenceNote": "The first lap ends at 45.56 when lap two starts. The caption separately states a personal best of 45.46; the footage does not show that time or a completed race total."}, {"playerId": "hatemato", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1262674031992373280/PXL_20240716_073408016.mp4?ex=6ac3fc14&is=6ac2aa94&hm=e61e9aa6041038134666910e9ba9d150477ec37c78a996fa604cbb0478aba1d9&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/pipe2024-1262674031992373280-80dae34a3af0c45797d1.mp4"}, "submittedAt": "2024-07-16T07:35:48.671Z", "videoSharedAt": "2024-07-16T07:35:48.671Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1262674032390836245"}, "videoPublishedAt": null, "evidenceNote": "Hatemato’s filmed first lap ends around 54 seconds into the clip. The exact split is unreadable, and the clip does not show a completed two-lap race."}, {"playerId": "phillish", "video": "https://www.youtube.com/watch?v=iJk4_7UILM0", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/pipe2024-iJk4_7UILM0-11a6e13ee0a119639511.mp4"}, "submittedAt": "2024-07-15T13:30:10.016Z", "videoSharedAt": "2024-07-15T13:30:10.016Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1262400821069611128"}, "videoPublishedAt": "2023-07-25T20:36:26Z", "evidenceNote": "The footage freezes at 45.34 after lap two starts. This is a lap demonstration with no completed two-lap result."}] : [],
          lateStartRecording: null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-07-25" && !r.videoVerified).map(displayRecord)};
      })(),
      pipe2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Pipe Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-07-10T06:00:00Z") && Date.parse(day) < Date.parse("2024-07-24T06:00:00Z") : day >= "2024-07-10" && day < "2024-07-24")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-07-10")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-07-10"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-07-10"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-07-10") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-127") ? {
      sunshine2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-127", "2024-07-24", "2024-08-07");
        const finalId = {"wii-daisy-circuit": "1274825087542890606", "snes-koopa-troopa-beach-2r": "1274825400567992371"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"wii-daisy-circuit": "The carried WR was Saki7’s 1:18.30. Sucha posted 1:18.20 on July 26 and p_en tied it on July 29. Sucha’s 1:18.15 image and recording were submitted August 7 at 13:26 UTC, after the tour closed at 06 UTC; its August 7 posting date is retained. The fastest recording posted before closing is 1:18.23 in Sucha’s edited strategy explanation.", "snes-koopa-troopa-beach-2r": "The carried WR was nekozuki’s 57.55. Shine posted 57.48 on July 29, nekozuki 57.38 on August 2, then 57.17 on August 3. The fastest available completed-result recording is Sucha’s 57.42: image submitted August 5 at 09:44 UTC, video published at 15:10 UTC and shared at 23:09 UTC. The 57.17 WR has no completed recording; nekozuki’s 28.72 first-lap clip does not supply its total or lap splits."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-127"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: data.id === "wii-daisy-circuit" ? (()=>{const r=data.submissions.find(r=>r.id==="curated-1266679397537157130-sunshine2024-strategy-video-reviewed");return r ? displayRecord(r) : null;})() : null,
          reportedRecordingLabel: "Fastest documented recording posted before tour close: ",
          documentedRecording: (() => {const id={"wii-daisy-circuit":"1274825087542890606","snes-koopa-troopa-beach-2r":"curated-1269954170991935508-sunshine2024-image-reviewed"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {"wii-daisy-circuit": [{"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1266581374266118184/RPReplay_Final1722046829.mov?ex=6ac3b293&is=6ac26113&hm=f5ce7afb30a0e9913f9c4febf06f406e6c27b11b3f3ec4484554182a3807a587&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/sunshine2024-1266581374266118184-2ab143ec56ad5e5dd6a5.mov"}, "submittedAt": "2024-07-27T02:22:12.880Z", "videoSharedAt": "2024-07-27T02:22:12.880Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1266581379764977664"}, "videoPublishedAt": null, "evidenceNote": "Sucha\u2019s Daisy Circuit clip shows a 39.10 first lap. It does not show a completed total or establish footage for the July 26 full run."}, {"playerId": "litchi", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1267057334933520394/RPReplay_Final1722154001.mov?ex=6ac41c59&is=6ac2cad9&hm=b7594525b0ab19c2797de8077b923481990ed8ef48770589616b5c8dc0db62f2&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/sunshine2024-1267057334933520394-d2f42e06f644ffe42c98.mov"}, "submittedAt": "2024-07-28T09:53:29.548Z", "videoSharedAt": "2024-07-28T09:53:29.548Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1267057335407349790"}, "videoPublishedAt": null, "evidenceNote": "An 11.73-second Daisy Circuit opening strategy clip, with no completed finish."}], "snes-koopa-troopa-beach-2r": [{"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1269654947843280946/RPReplay_Final1722779607.mov?ex=6ac3ac50&is=6ac25ad0&hm=cdd0434a062ae084fc8d0e57e648abf125b6c34682189c28937abecd5e73eb2a&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/sunshine2024-1269654947843280946-1c48c7fbb8bd8c31913c.mov"}, "submittedAt": "2024-08-04T13:55:28.686Z", "videoSharedAt": "2024-08-04T13:55:28.686Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1269654948145004645"}, "videoPublishedAt": null, "evidenceNote": "Sucha\u2019s Koopa Troopa Beach 2R first lap is 28.75. No completed total is shown; this split is not assigned to the separate 57.60 run."}, {"playerId": "nekozuki", "video": "https://www.youtube.com/watch?v=FmgTUfHaa1I", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/sunshine2024-FmgTUfHaa1I-eb1727e0f79f5cfad87e.mp4"}, "submittedAt": "2024-08-03T06:14:56.963Z", "videoSharedAt": "2024-08-03T06:14:56.963Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1269176664433233993"}, "videoPublishedAt": "2024-08-03T06:09:59Z", "evidenceNote": "nekozuki\u2019s clip shows a 28.72 first lap. It does not show the 57.17 completed total or establish that run\u2019s lap splits."}]}[data.id] || [],
          lateStartRecording: null,
          sourceImages: {"wii-daisy-circuit": [{"url": "https://media.mktwrs.com/assets/proof/sunshine2024-1265625890847457351-3181b88b3316de0526d5.png", "playerId": "shine", "sourceUrl": "https://discord.com/channels/629221606064914442/875784780573184010/1265625891166486549", "postedAt": "2024-07-24T11:05:26.646Z", "note": "Previous Pipe Tour context: Shine’s Piranha Plant Cove 2R 1:32.04 was posted July 24 at 11:05UTC after Pipe closed. It is preserved here as adjacent source context and is not a Sunshine course result."}, {"url": "https://media.mktwrs.com/assets/proof/sunshine2024-1266466797008453754-4faea01182ce29efe9c9.png", "playerId": "player-e38199e38184e3819df09f90ba", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1266466797289340958", "postedAt": "2024-07-26T18:46:54.289Z", "note": "iOS failed to save the recording. This image contains no race result."}, {"url": "https://media.mktwrs.com/assets/proof/sunshine2024-1266649643102638140-7b68cb43ecf4b5b61e67.png", "playerId": "player-e38199e38184e3819df09f90ba", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1266649643631116338", "postedAt": "2024-07-27T06:53:28.254Z", "note": "Sucha’s Daisy Circuit first lap is 39.05. No completed total is shown; this is separate from the July 26 result with 39.10/39.10 splits."}, {"url": "https://media.mktwrs.com/assets/proof/sunshine2024-1270376213034307664-777e0c391e7409571205.png", "playerId": "player-e38199e38184e3819df09f90ba", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1270376213134835775", "postedAt": "2024-08-06T13:41:31.660Z", "note": "The leaderboard shows Sucha and p_en tied at 1:18.20 on Daisy Circuit. It contains no 1:18.15 result. The posting date is August 6; the July 30 device header does not establish an exact run date."}], "snes-koopa-troopa-beach-2r": [{"url": "https://media.mktwrs.com/assets/proof/sunshine2024-1268950979240267957-b12af28cdf4c84f6e173.jpg", "playerId": "manfredi", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1268950979487862804", "postedAt": "2024-08-02T15:18:09.479Z", "note": "Nintendo announces Sunshine Tour bonus high-score reporting. This is general tour context, with no individual time-trial result."}, {"url": "https://media.mktwrs.com/assets/proof/sunshine2024-1269651221900431391-6278357681678b30dd32.png", "playerId": "player-e38199e38184e3819df09f90ba", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1269651222596554842", "postedAt": "2024-08-04T13:40:40.446Z", "note": "Sucha’s Koopa Troopa Beach 2R finish is 58.82, slower than nekozuki’s 57.17 WR."}, {"url": "https://media.mktwrs.com/assets/proof/sunshine2024-1269963335823003728-8ab511fa3524562d8daa.png", "playerId": "player-e38199e38184e3819df09f90ba", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1269963336183840819", "postedAt": "2024-08-05T10:20:54.124Z", "note": "Sucha’s Koopa Troopa Beach 2R finish and previous best both show 57.42. The first submission date, August 5 at 09:44 UTC, is retained; this repeat creates no new WR."}]}[data.id] || [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-08-08" && !r.videoVerified).map(displayRecord)};
      })(),
      sunshine2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Sunshine Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-07-24T06:00:00Z") && Date.parse(day) < Date.parse("2024-08-07T06:00:00Z") : day >= "2024-07-24" && day < "2024-08-07")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-07-24")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-07-24"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-07-24"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-07-24") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-128") ? {
      vacation2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-128", "2024-08-07", "2024-08-21");
        const finalId = {"athens-dash": "1279827290620035093", "athens-dash-2r": "1279827479288086618", "squeaky-clean-sprint": "1279827694330187799"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"athens-dash": "mb3.’s final WR is 1:17.72, submitted August 10 at 19:55 UTC. The fastest identified available recording is newyork’s carried 1:17.75 from August 2023. The late 1:18.27 screenshot is Athens Dash and was posted August 21 at 06:07 UTC, after the tour closed; its actual posting date and unresolved runner identity are retained.", "athens-dash-2r": "The carried WR was Phillish’s 1:22.29. Rui posted 1:22.24, followed by mb3.’s 1:22.22, 1:22.10, 1:22.04 and final 1:21.95 on August 12. No completed recording has been established for these results. Two lap clips remain separate from completed totals.", "squeaky-clean-sprint": "Litchi improved the carried 1:21.62 tie to 1:21.58, then 1:21.57 and final 1:21.48, submitted August 12 at 07:03 UTC. The fastest identified available recording is Phillish’s carried 1:21.62 from August 2023. A separate 1:21.62 video was published September 23, 2023, and reshared August 12, 2024; its runner is not identified. Slow-challenge finishes are preserved in the source audit without fastest-WR credit."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-128"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: data.id === "squeaky-clean-sprint" ? {"id": "vacation2024-historical-B-video-reference", "courseId": "squeaky-clean-sprint", "playerId": "unknown", "time": "1:21.62", "timeCs": 8162, "video": "https://www.youtube.com/watch?v=LqEWB8bjffU", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/vacation2024-LqEWB8bjffU-57b0a9c15bf09028de45.mp4"}, "submittedAt": "2024-08-12T11:58:11.485Z", "videoSubmittedAt": "2024-08-12T11:58:11.485Z", "videoSharedAt": "2024-08-12T11:58:11.485Z", "videoPublishedAt": "2023-09-23T14:04:21Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1272524534909767752"}, "evidenceNote": "The original video was published September 23, 2023, and reshared August 12, 2024. Its 1:21.62 finish is documented, but uploader B is not attributed to Phillish or Litchi."} : null,
          reportedRecordingLabel: "Additional historical recording with unresolved runner attribution: ",
          documentedRecording: (() => {const id={"athens-dash":"1147355757961031690","squeaky-clean-sprint":"1147355273481175120-phillish"}[data.id];const r=data.records.find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {"athens-dash-2r": [{"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1272174712793075714/ScreenRecording_08-11-2024_21-26-43_1.mov?ex=6ac44547&is=6ac2f3c7&hm=6a8ba873e3ff515104760de9122e1b7186847860c261f39fb9dd1596e1fc5326&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/vacation2024-1272174712793075714-f3508551432f0ec13672.mov"}, "submittedAt": "2024-08-11T12:48:07.447Z", "videoSharedAt": "2024-08-11T12:48:07.447Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1272174713019301919"}, "evidenceNote": "Athens Dash 2R footage reaches the second-lap transition. It does not show a completed two-lap total; no exact split is inferred from the subsequent running clock."}, {"playerId": "player-e3828be38184", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1271699086344585216/RPReplay_Final1723254452.mov?ex=6ac3dbd1&is=6ac28a51&hm=524fccb19ee6525b50e7d9a00526c66877f5053143cb656743676e91168480dc&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/vacation2024-1271699086344585216-8e71188d64f37af18bc6.mov"}, "submittedAt": "2024-08-10T05:18:09.276Z", "videoSharedAt": "2024-08-10T05:18:09.276Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1271699086617346048"}, "evidenceNote": "This 2.8-second clip approaches the first-lap line. The running clock is 40.72; it does not establish the boundary split or a completed total."}]}[data.id] || [],
          lateStartRecording: null,
          sourceImages: data.id === "squeaky-clean-sprint" ? [{"url": "https://media.mktwrs.com/assets/proof/vacation2024-1270655354375507989-56b14c059506dcdeb8a8.jpg", "playerId": "tankian", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1270655354551926806", "postedAt": "2024-08-07T08:10:44.160Z", "note": "Squeaky Clean Sprint’s starting line is shown, with no completed result."}, {"url": "https://media.mktwrs.com/assets/proof/vacation2024-1270672593560666125-12c224c554daec011b42.png", "playerId": "phillish", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1270672593875243093", "postedAt": "2024-08-07T09:19:14.335Z", "note": "Phillish reshared his August 2023 1:21.62 recording. The 2024 repost does not change its original publication date."}, {"url": "https://media.mktwrs.com/assets/proof/vacation2024-1273541277442510908-a0a878df6a04299e59df.jpg", "playerId": "unknown", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1273541277689970759", "postedAt": "2024-08-15T07:18:21.854Z", "note": "Official recap of the preceding Sunshine Tour lists Daisy Circuit 1:18.15 and Koopa Troopa Beach 2R 57.17. This corroborates the totals without changing their original submission dates."}] : [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-08-22" && !r.videoVerified).map(displayRecord)};
      })(),
      vacation2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Vacation Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-08-07T06:00:00Z") && Date.parse(day) < Date.parse("2024-08-21T06:00:00Z") : day >= "2024-08-07" && day < "2024-08-21")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-08-07")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-08-07"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-08-07"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-08-07") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-129") ? {
      summer2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-129", "2024-08-21", "2024-09-04");
        const finalId = {"berlin-byways-2": "1152023809864503306", "madrid-drive": "1152024419473047663", "piranha-plant-cove-3": "1290731431890255945"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"berlin-byways-2": "The archived WR remains the carried 1:23.38 tie. Summer 2024 submissions do not establish a faster WR. Astre’s available 1:23.38 recording was published in October 2021; Sucha’s tied September 2023 screenshot has no completed movie.", "madrid-drive": "The archived WR and fastest established available recording remain kNo2’s carried 1:17.31, submitted September 6, 2023, at 06:08 UTC and published on video at 06:11 UTC. Summer 2024 supporting results reach nekozuki’s 1:17.38 on September 3.", "piranha-plant-cove-3": "The carried WR was mb3.’s 1:16.28. An unidentified runner posted 1:16.27, followed seconds later by Sucha’s 1:16.23 on August 23. Sucha improved to 1:16.17 on August 27, and REMON posted the final 1:16.06 on August 30 at 12:10 UTC. Three partial lap clips are preserved without a complete-total claim. No established competitive completed recording is available for this comparison."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-129"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"berlin-byways-2": "897020683991793685", "madrid-drive": "1152024419473047663"}[data.id];const r=data.records.find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {"piranha-plant-cove-3": [{"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1276234363092209818/RPReplay_Final1724345920.mov?ex=6ac3e0df&is=6ac28f5f&hm=4481fadf11dea70a296db1f26a66fcd6cf98c0228648636978c4263e2ae6c70f&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/summer2024-1276234363092209818-cbe27aef8fadac290b72.mov"}, "submittedAt": "2024-08-22T17:39:43.523Z", "videoSharedAt": "2024-08-22T17:39:43.523Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1276234363402453046"}, "evidenceNote": "Piranha Plant Cove3 first lap ending shortly after lap2 transition. At video40.47sec running total38.07 with2/2 shown. No two-lap finish; do not merge with a complete record. The subsequent running clock does not establish an exact lap split or full two-lap total."}, {"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1276907113582563379/RPReplay_Final1724508219.mov?ex=6ac3b06b&is=6ac25eeb&hm=22308704dd86672a9b0e93814e511a498add56f66bd11018674967909e31903d&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/summer2024-1276907113582563379-6a16c11410121a8dffaa.mov"}, "submittedAt": "2024-08-24T14:12:59.767Z", "videoSharedAt": "2024-08-24T14:12:59.767Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1276907114010513521"}, "evidenceNote": "Piranha Plant Cove3 partial lap2 strategy, running clock36.95 to54seconds. No finish total. The subsequent running clock does not establish an exact lap split or full two-lap total."}, {"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1278344583503155285/RPReplay_Final1724851004.mov?ex=6ac3a52b&is=6ac253ab&hm=16565223a23b7263914be1eefd37111c551ebdc4899d0729e4d9f836c4a16537&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/summer2024-1278344583503155285-5ed887a8d16baae7aa9d.mov"}, "submittedAt": "2024-08-28T13:24:59.296Z", "videoSharedAt": "2024-08-28T13:24:59.296Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1278344583901741089"}, "evidenceNote": "Piranha Plant Cove3 first lap only. At46.97sec running clock37.95 with2/2 shown. No full total; successful strategy clip is not proof of1:16.17. The subsequent running clock does not establish an exact lap split or full two-lap total."}]}[data.id] || [],
          lateStartRecording: null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-09-05" && !r.videoVerified).map(displayRecord)};
      })(),
      summer2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Summer Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-08-21T06:00:00Z") && Date.parse(day) < Date.parse("2024-09-04T06:00:00Z") : day >= "2024-08-21" && day < "2024-09-04")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-08-21")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-08-21"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-08-21"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-08-21") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-130") ? {
      sundae2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-130", "2024-09-04", "2024-09-18");
        const finalId = {"gba-luigi-circuit": "1290731539428016141", "snes-vanilla-lake-2r": "1157160735848267859"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"gba-luigi-circuit": "kuRi submitted the final 49.13 on September 15 at 03:10 UTC. Its 24.64/24.49 caption splits match the screenshot. The matching movie was published October 4 at 09:00:58 UTC, after the September 18 tour close; this later publication is retained separately. Fireball’s carried 49.27 movie was already available before the tour. Sucha’s clip shows only a first lap, not a complete 49.47 run.", "snes-vanilla-lake-2r": "The archived WR remains nekozuki’s carried 31.48 from September 2023. No faster WR is established in the preserved current submissions. The fastest identified available recording for this comparison is SimonF’s 31.82 from September 2023; the unavailable 31.71 reference is not verified footage."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-130"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"gba-luigi-circuit":"1290731539428016141","snes-vanilla-lake-2r":"discord-1153813378867941447"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {"gba-luigi-circuit": [{"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1284701439339270194/RPReplay_Final1726366588.mov?ex=6ac3b333&is=6ac261b3&hm=72d9c6576974fc847392fc19149b4ca2d2a6fee45adc63fcb78af5fe0344a34a&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/sundae2024-1284701439339270194-91645867c644bcd97927.mov"}, "submittedAt": "2024-09-15T02:24:51.842Z", "videoSharedAt": "2024-09-15T02:24:51.842Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1284701439779799162"}, "evidenceNote": "Sucha LuigiCircuit first-lap strategy recording30.566667seconds. At27sec clock24.07stilllap1/2; later lap2transition present. No complete two-lap finish, so not attached as footage of49.47or another total. The subsequent running clock does not establish an exact lap split or full two-lap total."}]}[data.id] || [],
          lateStartRecording: null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-09-19" && !r.videoVerified).map(displayRecord)};
      })(),
      sundae2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Sundae Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-09-04T06:00:00Z") && Date.parse(day) < Date.parse("2024-09-18T06:00:00Z") : day >= "2024-09-04" && day < "2024-09-18")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-09-04")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-09-04"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-09-04"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-09-04") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-131") ? {
      anniversary2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-131", "2024-09-18", "2024-10-02");
        const finalId = {"athens-dash-3": "1162597423470878732", "madrid-drive-3": "1162598591001546913", "rome-avanti-3": "1308276465279959090"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"athens-dash-3": "The archived WR remains DIT’s carried 1:11.73 from September 2023. Current preserved submissions do not establish an improvement. The fastest established available recording for this tour is Sucha’s carried 1:11.88; DIT’s 1:11.73 reference is unavailable.", "madrid-drive-3": "The archived WR and fastest established available recording remain kuRi’s carried 1:19.45. Shine’s 1:19.86 was posted October 2 at 06:05 UTC, just after the tour closed, and retains that submission date.", "rome-avanti-3": "Sucha improved the carried 1:17.27 WR to 1:17.10 on September 22, then 1:16.96 on September 23. Both matching movies are preserved. The first 1:16.96 screenshot was posted at 12:17:46 UTC; the byte-identical 12:21 repost supplies 38.52/38.44 splits. The cancelled wrong-course receipt creates no additional record. Shine’s 1:17.26 arrived October 2 at 06:06 UTC, after the tour closed."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-131"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"athens-dash-3": "discord-1155446902016462959", "madrid-drive-3": "1162598591001546913", "rome-avanti-3": "1308276465279959090"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {"rome-avanti-3": [{"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1287455825425731584/RPReplay_Final1727021108.mov?ex=6ac3d52c&is=6ac283ac&hm=2f0ac815f6b39fb3bf91dc758189a84520960912ab10343c218a3e13f074f360&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/anniversary2024-1287455825425731584-3bcf4ac5e063f624db1c.mov"}, "submittedAt": "2024-09-22T16:49:48.647Z", "videoSharedAt": "2024-09-22T16:49:48.647Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1287455825815933141"}, "evidenceNote": "RomeAvanti3 Sucha first-lap recording through lap2 start; at44.17sec clock41.70lap2/2. No full finish; exact lap-boundary split not inferred from later running clock. This clip does not establish a completed race time."}, {"playerId": "fireball", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1287657140865073182/Screenrecorder-2024-09-23-08-06-22-6880.mp4?ex=6ac3e7e9&is=6ac29669&hm=2605d3fefeb9b29f32ab24b58339ac24660860b49665df9daeefe041599c2adc&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/anniversary2024-1287657140865073182-a5f5f479086c94a03453.mp4"}, "submittedAt": "2024-09-23T06:09:46.023Z", "videoSharedAt": "2024-09-23T06:09:46.023Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1287657141401948262"}, "evidenceNote": "Fireball RomeAvanti3 route strategy segment13.02→20.02running clock, lap1/2. Not a completed run. This clip does not establish a completed race time."}]}[data.id] || [],
          lateStartRecording: null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-10-03" && !r.videoVerified).map(displayRecord)};
      })(),
      anniversary2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Anniversary Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-09-18T06:00:00Z") && Date.parse(day) < Date.parse("2024-10-02T06:00:00Z") : day >= "2024-09-18" && day < "2024-10-02")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-09-18")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-09-18"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-09-18"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-09-18") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-132") ? {
      battle2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-132", "2024-10-02", "2024-10-16");
        const finalId = {"snes-donut-plains-1r": "1032525641465200660", "snes-donut-plains-2": "1308276800647991408"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"snes-donut-plains-1r": "The carried WR remains Hilton’s 49.15 from October 2022. No current Donut Plains 1R performance is established in the preserved submissions. The fastest established available recording for this tour remains Nu11’s 49.31; the WR and recording are shown separately.", "snes-donut-plains-2": "Shine improved the carried 1:00.50 WR to 1:00.46, submitted October 15 at 13:36:46 UTC. The matching movie and 30.26/30.20 caption splits are preserved. p_en’s repeated 1:00.72 screenshot is one performance, dated to its first 17:24:21 UTC post; the later repost supplies 30.54/30.18 splits."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-132"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"snes-donut-plains-1r": "curated-1030520974854078604-1030520974598221945-august2022-image-reviewed", "snes-donut-plains-2": "1308276800647991408"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {}[data.id] || [],
          lateStartRecording: null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-10-17" && !r.videoVerified).map(displayRecord)};
      })(),
      battle2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Battle Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-10-02T06:00:00Z") && Date.parse(day) < Date.parse("2024-10-16T06:00:00Z") : day >= "2024-10-02" && day < "2024-10-16")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-10-02")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-10-02"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-10-02"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-10-02") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-133") ? {
      halloween2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-133", "2024-10-16", "2024-10-30");
        const finalId = {"snes-donut-plains-3": "1039950316147322890"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"snes-donut-plains-3": "The archived WR remains Troy’s carried 56.42 from October 2022, with its matching original recording preserved. The current screenshots establish no faster WR. Opening-day results end with keron’s 59.01 at 13:02 UTC; the slower 59.78 and 59.39 images remain preserved as sources. The last 57.00 submission was posted October 30 at 03:30 UTC, before the 06:00 tour close, and retains that posting date."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-133"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"snes-donut-plains-3": "1039950316147322890"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {}[data.id] || [],
          lateStartRecording: null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-10-31" && !r.videoVerified).map(displayRecord)};
      })(),
      halloween2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Halloween Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-10-16T06:00:00Z") && Date.parse(day) < Date.parse("2024-10-30T06:00:00Z") : day >= "2024-10-16" && day < "2024-10-30")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-10-16")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-10-16"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-10-16"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-10-16") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-134") ? {
      autumn2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-134", "2024-10-30", "2024-11-13");
        const finalId = {"los-angeles-laps-2": "1178887189124370537", "los-angeles-laps-3": "1042970214414950400"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"los-angeles-laps-2": "kuRi’s carried 1:13.41 from November 2023 remains the WR for this tour, with its matching original movie preserved. All nine current screenshots are slower. The opening-day 1:14.93 and October31 deleted-author 1:13.62 retain their actual source posting dates. Later2025WRs are not predecessors.", "los-angeles-laps-3": "Sucha’s carried 1:18.78 from November 2022 remains the WR for this tour, with its matching original movie preserved. All three current screenshots are slower; no opening-day result survives in the preserved sources. Later2025WRs are not predecessors."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-134"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"los-angeles-laps-2": "1178887189124370537", "los-angeles-laps-3": "1042970214414950400"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {}[data.id] || [],
          lateStartRecording: null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-11-14" && !r.videoVerified).map(displayRecord)};
      })(),
      autumn2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Autumn Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-10-30T06:00:00Z") && Date.parse(day) < Date.parse("2024-11-13T06:00:00Z") : day >= "2024-10-30" && day < "2024-11-13")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-10-30")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-10-30"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-10-30"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-10-30") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-135") ? {
      animal2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-135", "2024-11-13", "2024-11-27");
        const finalId = {"n64-choco-mountain": "curated-animal2022-1044131789247098930-choco-11837-leaderboard", "n64-yoshi-valley-r": "1053521178179932180"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"n64-choco-mountain": "Nu11’s documentary 1:18.37 WR carries into this tour. Sucha’s screenshot was posted November 19 at 12:08 UTC, its 1:18.47 video was published at 12:23 UTC and shared at 13:19 UTC. These are the same slower performance, with separate source clocks. kuRi’s 1:18.50 is a cup-panel PB; no matching WR movie is available.", "n64-yoshi-valley-r": "Nu11’s announced 1:30.47 WR carries into this tour without matching footage. Sucha’s current completed 1:30.65 video is shown separately from Nu11’s earlier uploader-reported 1:30.62. The opening-day final fastest 1:30.73 is displayed; the slower 1:32.82 image remains preserved as a source. The November 14 clip is a partial lap and establishes no completed time."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-135"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: data.id === "n64-yoshi-valley-r" ? displayRecord(data.submissions.find(r=>r.id==="curated-animal2022-nu11-M011AAJ6zGg-distinct-recording") || {}) : null,
          documentedRecording: (() => {const id={"n64-choco-mountain": "curated-1308403636057018389-animal2024-image-reviewed", "n64-yoshi-valley-r": "curated-1307812971824549939-animal2024-video-reviewed"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {"n64-yoshi-valley-r": [{"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1306652811542528125/RPReplay_Final1731600554.mov?ex=6ac3cc42&is=6ac27ac2&hm=e1c6f5953588bd7618fad3eb6230dec5811d2e4562fc544ab81704c994eeef45&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/animal2024-1306652811542528125-ad734bce338811ee8987.mov"}, "submittedAt": "2024-11-14T16:11:46.816Z", "videoSharedAt": "2024-11-14T16:11:46.816Z", "videoShareSource": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1306652811999711334"}, "evidenceNote": "SuchaYoshiValleyRfirstlap recording. At44secclock41.23lap1/2; at48secclock45.23stilllap1/2approaching line. No completed lap boundary or full run total established. This clip does not establish a completed race time."}]}[data.id] || [],
          lateStartRecording: null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-11-28" && !r.videoVerified).map(displayRecord)};
      })(),
      animal2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Animal Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-11-13T06:00:00Z") && Date.parse(day) < Date.parse("2024-11-27T06:00:00Z") : day >= "2024-11-13" && day < "2024-11-27")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-11-13")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-11-13"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-11-13"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-11-13") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-136") ? {
      peachbowser2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-136", "2024-11-27", "2024-12-11");
        const finalId = {"3ds-bowser-s-castle-r": "1332590475806511144", "ds-peach-gardens": "1189361589913124894", "n64-royal-raceway": "1189361686306619392"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"3ds-bowser-s-castle-r": "Shine’s 1:38.28 screenshot was posted November 28 at 03:03 UTC. Shine explicitly said that WR run was not recorded; the separately posted 1:38.33 video remains a slower result. The final 1:38.27 screenshot was posted December 8 at 09:02 UTC; its video was published at 09:00 UTC. Video references in edited bot receipts do not establish an exact human share time.", "ds-peach-gardens": "Sucha’s 1:26.58 WR and matching recording carry from 2023. The video was reshared November 29, 2024 at 14:24 UTC; this does not create another WR or change its original submission date. Shine’s current 1:26.87 video remains a separate slower result.", "n64-royal-raceway": "Sucha’s 1:33.66 WR and matching recording carry from 2023. The video was reshared November 29, 2024 at 14:24 UTC without creating a new WR. The final fastest opening-day result is Sucha’s 1:33.86; earlier and slower opening-day images remain preserved as sources. Shine’s current 1:34.07 movie is a separate slower result."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-136"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"3ds-bowser-s-castle-r": "1332590475806511144", "ds-peach-gardens": "1189361589913124894", "n64-royal-raceway": "1189361686306619392"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          lateStartRecording: null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-12-12" && !r.videoVerified).map(displayRecord)};
      })(),
      peachbowser2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Peach vs. Bowser Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-11-27T06:00:00Z") && Date.parse(day) < Date.parse("2024-12-11T06:00:00Z") : day >= "2024-11-27" && day < "2024-12-11")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-11-27")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-11-27"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-11-27"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-11-27") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-137") ? {
      holiday2024Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-137", "2024-12-11", "2024-12-25");
        const finalId = {"gba-snow-land": "1058253597781000283", "vancouver-velocity-3": "1332590932134072341"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"gba-snow-land": "Nu11’s 1:08.42 WR and matching recording carry from 2022. Sucha’s December15 screenshots show an earlier 1:08.58, an unrecorded 1:08.57 and a later 1:08.58 rerun. Only the later rerun matches the preserved video; both equal-time performances retain their own images and the common source posting clock.", "vancouver-velocity-3": "nekozuki’s 1:15.95 screenshot was submitted December20,2024 at20:30UTC with laps37.89/38.06. Its delayed January25,2025 announcement has an erroneous Winter2025 footer; the original post establishes Holiday2024. No matching WR video survives here. Phillish’s carried 1:15.96 recording is shown separately."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-137"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"gba-snow-land": "1058253597781000283", "vancouver-velocity-3": "1192533972043964436"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          lateStartRecording: null,
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2024-12-26" && !r.videoVerified).map(displayRecord)};
      })(),
      holiday2024SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Holiday Tour (2024)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-12-11T06:00:00Z") && Date.parse(day) < Date.parse("2024-12-25T06:00:00Z") : day >= "2024-12-11" && day < "2024-12-25")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-12-11")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-12-11"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-12-11"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-12-11") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-138") ? {
      newyear2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-138", "2024-12-25", "2025-01-08");
        const finalId = {"wii-koopa-cape": "1332591349102547007", "3ds-piranha-plant-slide": "1197596509772984370"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"wii-koopa-cape": "Koopa Cape improved from nekozuki’s carried 1:35.65 to Sucha’s 1:35.61 and 1:35.55 on January 4, then nekozuki’s 1:35.51 on January 6. The final result was first posted at 10:59:52 UTC; the identical accepted repost at 11:00:25 UTC corroborates 47.69/47.82. No matching final-WR movie survives here. Sucha’s 1:35.55 video is shown separately.", "3ds-piranha-plant-slide": "Sucha’s 1:28.03 WR and matching recording carry from January 2024. Current 1:28.53 runs by Sucha and Shine are separate performances; Shine’s video belongs only to Shine. Its broadcast overlay date remains separate from video publication and the January 7 submission."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-138"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"wii-koopa-cape": "curated-1325128116334497855-newyear2025-image-reviewed", "3ds-piranha-plant-slide": "1197596509772984370"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {"wii-koopa-cape": [{"playerId": "sucha", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1324396807249461288/RPReplay_Final1735831037.mov?ex=6ac3c024&is=6ac26ea4&hm=ae9fd38081b5ff6d8f1fc002b32f90735cbc95a69c13de00f029436087ca30db&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/newyear2025-1324396807249461288-07c84157a519acb93dcd.mov", "key": "assets/video/newyear2025-1324396807249461288-07c84157a519acb93dcd.mov", "sha256": "07c84157a519acb93dcdbde79480be856adf19d9dc7aeb5e0f6416bf5e2dc056", "md5": "3b3e017d9d3b5238bd637a2c611b4d77", "bytes": 20047642, "shaMetadataMd5AndLengthVerified": true, "publicRangeMatchesOriginal": true}, "submittedAt": "2025-01-02T15:20:05.168Z", "videoSharedAt": "2025-01-02T15:20:05.168Z", "evidenceNote": "First-lap technique clip. It reaches lap two but does not show a completed race result."}], "3ds-piranha-plant-slide": [{"playerId": "fireball", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1321569300472926329/Screenrecorder-2024-12-25-20-37-44-5380.mp4?ex=6ac402d2&is=6ac2b152&hm=863f45ba80945905239af2a064eda912f1cd9b90d365783c50562b365d19b12a&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/newyear2025-1321569300472926329-b1a5ea568a3288c8a573.mp4", "key": "assets/video/newyear2025-1321569300472926329-b1a5ea568a3288c8a573.mp4", "sha256": "b1a5ea568a3288c8a5734bde1a8e6d40988dd5b7f4aa2140e4f7228df8c54dff", "md5": "a86a9bc45134b29f985836c310fb93fe", "bytes": 4238509, "shaMetadataMd5AndLengthVerified": true, "publicRangeMatchesOriginal": true}, "submittedAt": "2024-12-25T20:04:34.981Z", "videoSharedAt": "2024-12-25T20:04:34.981Z", "evidenceNote": "Short first-lap technique clip; no completed lap or full-race result is visible."}, {"playerId": "sucha", "video": "https://cdn.discordapp.com/attachments/636461740162416640/1323658156831801455/ScreenRecording_12-31-2024_22-34-49_1.mov?ex=6ac3b338&is=6ac261b8&hm=c50206c4d0851077130b72274e46eba84f94bbe1d07a618089d2b93b3c52f6ad&", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/newyear2025-1323658156831801455-fabd12f325200c32e5c9.mov", "key": "assets/video/newyear2025-1323658156831801455-fabd12f325200c32e5c9.mov", "sha256": "fabd12f325200c32e5c9d627c06439055ff626b5046d183359e14a1a6399adda", "md5": "7ce58130248fac1ebaaeb305a786f273", "bytes": 8342965, "shaMetadataMd5AndLengthVerified": true, "publicRangeMatchesOriginal": true}, "submittedAt": "2024-12-31T14:24:57.106Z", "videoSharedAt": "2024-12-31T14:24:57.106Z", "evidenceNote": "Short first-lap technique clip; no completed lap or full-race result is visible."}]}[data.id],
          sourceImages: {"wii-koopa-cape": [{"playerId": "sucha", "url": "https://media.mktwrs.com/assets/proof/newyear2025-1324365936777629766-a18aec0a4f80eb58aa20.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1324365937528279050", "postedAt": "2025-01-02T13:17:25.036Z", "note": "Lap-boundary screenshot showing 47.95 on lap two. It does not establish a final race time."}], "3ds-piranha-plant-slide": []}[data.id],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-01-09" && !r.videoVerified).map(displayRecord)};
      })(),
      newyear2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "New Year Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2024-12-25T06:00:00Z") && Date.parse(day) < Date.parse("2025-01-08T06:00:00Z") : day >= "2024-12-25" && day < "2025-01-08")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2024-12-25")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2024-12-25"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2024-12-25"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2024-12-25") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-139") ? {
      space2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-139", "2025-01-08", "2025-01-22");
        const finalId = {"gba-cheep-cheep-island-r": "1332604220695904306", "n64-kalimari-desert-2": "1204260087687024680"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"gba-cheep-cheep-island-r": "kuRi improves Sucha’s carried 1:11.78 to 1:11.77, submitted January 14, 2025 with 35.87/35.90 splits. The matching original screenshot and recording are preserved. The video was shared January 21; current platform publication metadata reports a later date, retained separately.", "n64-kalimari-desert-2": "kNo2’s carried 1:03.32 remains the WR. No matching recording survives in the reviewed sources; kNo2’s preserved 1:03.36 is the fastest identified available completed recording. The January 19 and January 21 caption splits do not sum to their screenshot totals and remain archived without normalized splits."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-139"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"gba-cheep-cheep-island-r": "1332604220695904306", "n64-kalimari-desert-2": "1068224230715559956"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-01-23" && !r.videoVerified).map(displayRecord)};
      })(),
      space2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Space Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-01-08T06:00:00Z") && Date.parse(day) < Date.parse("2025-01-22T06:00:00Z") : day >= "2025-01-08" && day < "2025-01-22")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-01-08")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-01-08"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-01-08"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-01-08") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-140") ? {
      winter2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-140", "2025-01-22", "2025-02-05");
        const finalId = {"bangkok-rush-2": "1074903912617869332", "singapore-speedway-r": "1074903599689248788", "tokyo-blur-4": "1209624145000792084"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"bangkok-rush-2": "Wins’s carried 1:32.39 remains the WR. Its available recording uses the uploader’s stated result. Shine’s carried 1:32.68 is the fastest result-verified recording available by this tour. Current screenshots are slower than the WR; the faster 2026 results belong to later tours.", "singapore-speedway-r": "8978’s carried 1:10.44 remains the WR. kuRi’s January 23 screenshot and matching 1:10.62 recording are preserved, with video publication at 12:43 UTC and submission/share at 12:45 UTC. The 1:10.67 image is a repost of an existing February 2023 result. No-item results remain separate from standard WRs.", "tokyo-blur-4": "mb3.’s carried 45.90 remains the WR; kNo2’s preserved 45.94 is the fastest identified available completed recording. Current screenshots establish no improvement. The final 46.06 was posted February 5 at 03:19 UTC, before the tour closed at 06:00 UTC."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-140"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: data.id === "bangkok-rush-2" && wr?.videoBackup?.url ? displayRecord(wr) : null,
          documentedRecording: (() => {const id={"bangkok-rush-2": "curated-1202588979275235438-winter2024-image-reviewed", "singapore-speedway-r": "curated-1331968171363799121-winter2025-image-reviewed", "tokyo-blur-4": "1074903169542389840"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: {"singapore-speedway-r": [{"playerId": "player-e38199e38184e3819df09f90ba", "video": "https://www.youtube.com/watch?v=zE3BpYT8qew", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/winter2025-zE3BpYT8qew-99d419c4fb053cc73a36.mp4", "key": "assets/video/winter2025-zE3BpYT8qew-99d419c4fb053cc73a36.mp4", "sha256": "99d419c4fb053cc73a36cf70ad3c2b2a8d4afb3154f74253732b00541134d2b3", "md5": "395ef7efa465daaeb8e17d4fbd9236c3", "bytes": 52784167, "shaMetadataMd5AndLengthVerified": true, "publicRangeMatchesOriginal": true}, "submittedAt": "2024-01-27T04:59:38Z", "videoPublishedAt": "2024-01-27T04:59:38Z", "videoSharedAt": "2025-02-04T22:33:17.392Z", "referenceLabel": "Historical no-item recording", "evidenceNote": "Historical no-item recording shows 1:12.12. Published January 27, 2024 UTC and reshared February 4, 2025; it is separate from standard WR progression."}]}[data.id] || [],
          sourceImages: {"singapore-speedway-r": [{"playerId": "8978", "url": "https://media.mktwrs.com/assets/proof/winter2025-1331987281330044948-a891391369c0d195cb85.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1331987281585766410", "postedAt": "2025-01-23T14:01:55.057Z", "note": "Repost of 8978’s February 4, 2023 result: 1:10.67 with 35.42/35.25 splits. It creates no new 2025 WR."}, {"playerId": "nekozuki", "url": "https://media.mktwrs.com/assets/proof/winter2025-1333809217538363482-fde3fe2a79e87caf1f32.png", "sourceUrl": "https://discord.com/channels/629221606064914442/636461740162416640/1333809218050064535", "postedAt": "2025-01-28T14:41:38.560Z", "note": "Annotated Singapore Speedway R first-lap frame at 28.87. The linked social video is unavailable; this frame establishes no completed race time."}]}[data.id] || [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-02-06" && !r.videoVerified).map(displayRecord)};
      })(),
      winter2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Winter Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-01-22T06:00:00Z") && Date.parse(day) < Date.parse("2025-02-05T06:00:00Z") : day >= "2025-01-22" && day < "2025-02-05")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-01-22")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-01-22"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-01-22"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-01-22") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-141") ? {
      exploration2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-141", "2025-02-05", "2025-02-19");
        const finalId = {"piranha-plant-cove": "1078514612225441792", "piranha-plant-cove-2": "1215068996248936541"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"piranha-plant-cove": "Wins’s carried 1:08.46 remains the WR. Its preserved recording uses the uploader’s stated result. Current screenshots establish no improvement. Ryo’s final 1:10.15 was submitted February 19 at 06:06 UTC, six minutes after closing; its actual submission date is retained.", "piranha-plant-cove-2": "mb3.’s carried 1:29.34 remains the WR. Phillish’s preserved 1:29.81 is the fastest result-verified available recording. The corrected p_en caption is 44.97/44.75, totaling 1:29.72; the first posting time is retained and both images are preserved. The later 2026 tie remains separate."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-141"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: data.id === "piranha-plant-cove" && wr?.videoBackup?.url ? displayRecord(wr) : null,
          documentedRecording: (() => {const r=data.id === "piranha-plant-cove-2" ? [...data.records,...data.submissions].find(r=>r.id==="curated-1074269225121763338-exploration2023-original-result-reviewed") : null; return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-02-20" && !r.videoVerified).map(displayRecord)};
      })(),
      exploration2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Exploration Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-02-05T06:00:00Z") && Date.parse(day) < Date.parse("2025-02-19T06:00:00Z") : day >= "2025-02-05" && day < "2025-02-19")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-02-05")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-02-05"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-02-05"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-02-05") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-142") ? {
      doctor2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-142", "2025-02-19", "2025-03-05");
        const finalId = {"ds-peach-gardens-r": "1219694565657804833", "gba-sky-garden": "1219694774953443399"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"ds-peach-gardens-r": "kNo2’s carried 1:27.16 remains the WR. Sucha’s preserved 1:27.21 is the fastest identified available recording by this tour. Current screenshots do not improve the WR; their original posting dates are retained.", "gba-sky-garden": "Litchi’s carried 1:03.97 remains the WR. NR’s preserved 1:04.09 is the fastest identified available recording by this tour. Current screenshots establish no improvement. kuRi’s faster 1:03.85 belongs to February 2026 and is retained in later history."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-142"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"ds-peach-gardens-r": "1084274701741862943", "gba-sky-garden": "1084274769643454484"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-03-06" && !r.videoVerified).map(displayRecord)};
      })(),
      doctor2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Doctor Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-02-19T06:00:00Z") && Date.parse(day) < Date.parse("2025-03-05T06:00:00Z") : day >= "2025-02-19" && day < "2025-03-05")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-02-19")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-02-19"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-02-19"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-02-19") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-143") ? {
      mario2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-143", "2025-03-05", "2025-03-19");
        const finalId = {"snes-donut-plains-3r": "1089608065063596185", "n64-luigi-raceway": "1353222746787676162"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"snes-donut-plains-3r": "Sucha’s carried 0:57.13 remains the WR and has preserved footage. Current screenshots are slower; original posting dates are retained.", "n64-luigi-raceway": "REMON’s 1:12.08 WR was submitted March 10, 2025. Its recovered movie was published August 4; its first Discord sharing timestamp is unresolved. The faster 1:12.03 is a 2026 successor retained in later history."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-143"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"snes-donut-plains-3r": "1089608065063596185", "n64-luigi-raceway": "1353222746787676162"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-03-20" && !r.videoVerified).map(displayRecord)};
      })(),
      mario2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Mario Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-03-05T06:00:00Z") && Date.parse(day) < Date.parse("2025-03-19T06:00:00Z") : day >= "2025-03-05" && day < "2025-03-19")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-03-05")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-03-05"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-03-05"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-03-05") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-144") ? {
      ninja2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-144", "2025-03-19", "2025-04-02");
        const finalId = {"wii-rainbow-road": "1229525362023858277", "3ds-wario-shipyard": "1229525504084934686"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"wii-rainbow-road": "kuRi’s carried 1:13.83 remains the WR and has preserved footage. The two current screenshots are slower; their original posting dates are retained.", "3ds-wario-shipyard": "nekozuki’s carried 1:33.36 remains the WR. N’s preserved 1:33.45 is the fastest identified available recording by this tour; its finish was freshly checked. The faster 1:33.34 belongs to March 2026 and remains in later history."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-144"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"wii-rainbow-road": "1229525362023858277", "3ds-wario-shipyard": "1093745717182472272"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-04-03" && !r.videoVerified).map(displayRecord)};
      })(),
      ninja2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Ninja Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-03-19T06:00:00Z") && Date.parse(day) < Date.parse("2025-04-02T06:00:00Z") : day >= "2025-03-19" && day < "2025-04-02")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-03-19")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-03-19"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-03-19"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-03-19") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-145") ? {
      yoshi2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-145", "2025-04-02", "2025-04-16");
        const finalId = {"gcn-yoshi-circuit": "curated-2025-kod-yoshi-NjqUdL5prbs", "snes-donut-plains-2r": "1099917584113090641"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"gcn-yoshi-circuit": "kod’s 1:31.17 WR was posted April 15, 2025. Its recovered movie finish and 45.56 first lap were freshly checked. The October 2026 submission is a repost; no duplicate WR is created. The timeout screen is context only.", "snes-donut-plains-2r": "N’s carried 1:00.08 remains the WR and now has a freshly checked preserved recording. The 30.07 first lap is visible and 30.01 second lap is derived. Original 2023 submission and upload dates remain separate."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-145"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"gcn-yoshi-circuit": "curated-2025-kod-yoshi-NjqUdL5prbs", "snes-donut-plains-2r": "1099917584113090641"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-04-17" && !r.videoVerified).map(displayRecord)};
      })(),
      yoshi2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Yoshi Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-04-02T06:00:00Z") && Date.parse(day) < Date.parse("2025-04-16T06:00:00Z") : day >= "2025-04-02" && day < "2025-04-16")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-04-02")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-04-02"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-04-02"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-04-02") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-146") ? {
      spring2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-146", "2025-04-16", "2025-04-30");
        const finalId = {"athens-dash-2": "1371156949529264180", "berlin-byways": "1104263697943240844"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"athens-dash-2": "Sucha’s 1:30.90 is supported by the April 22 original screenshot and preserved movie. The later identical receipt does not change the first submission date. Opening day retains only kuRi’s latest fastest 1:31.57.", "berlin-byways": "The carried 1:14.41 WR has a preserved recording. Spring’s reviewed 1:14.71 screenshot is slower. Original 2023 submission and movie dates remain separate."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-146"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"athens-dash-2": "1371156949529264180", "berlin-byways": "1104263697943240844"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: data.id === "athens-dash-2" ? [{"playerId": "phillish", "video": "https://discord.com/channels/629221606064914442/636461740162416640/1363552683591733429", "videoBackup": {"url": "https://media.mktwrs.com/assets/video/spring2025-1363552683352522862-f7cb014059b27a9a39eb.mov"}, "referenceLabel": "Rolling-boulder technique clip", "evidenceNote": "This 3.37-second clip shows part of lap 1 at 0:26.02–0:26.39; it does not establish a completed race or lap split.", "submittedAt": "2025-04-20T16:31:33.352Z", "source": {"url": "https://discord.com/channels/629221606064914442/636461740162416640/1363552683591733429", "channel": "tt-discussion", "messageId": "1363552683591733429"}}] : [],
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-05-01" && !r.videoVerified).map(displayRecord)};
      })(),
      spring2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Spring Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-04-16T06:00:00Z") && Date.parse(day) < Date.parse("2025-04-30T06:00:00Z") : day >= "2025-04-16" && day < "2025-04-30")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-04-16")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-04-16"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-04-16"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-04-16") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-147") ? {
      bowser2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-147", "2025-04-30", "2025-05-14");
        const finalId = {"gba-bowser-s-castle-4": "1109324308658004028", "n64-kalimari-desert-2r": "966540176568512563"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"gba-bowser-s-castle-4": "The carried 1:10.80 WR has no recovered movie. N’s preserved 2023 recording shows 1:10.86, faster than the verified 2025 videos. Sucha’s 1:10.88 video was uploaded May 2 and submitted May 15 after closure; both clocks are retained.", "n64-kalimari-desert-2r": "The carried 1:04.30 WR tie has Kazuo’s preserved 2021 recording at the same time. All reviewed 2025 screenshots are slower."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-147"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"gba-bowser-s-castle-4": "discord-1106178965829320746", "n64-kalimari-desert-2r": "896334182928760863"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-05-15" && !r.videoVerified).map(displayRecord)};
      })(),
      bowser2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Bowser Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-04-30T06:00:00Z") && Date.parse(day) < Date.parse("2025-05-14T06:00:00Z") : day >= "2025-04-30" && day < "2025-05-14")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-04-30")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-04-30"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-04-30"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-04-30") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-148") ? {
      mii2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-148", "2025-05-14", "2025-05-28");
        const finalId = {"wii-maple-treeway-r": "1407195549043654749", "gcn-mushroom-bridge": "1114964088326471821"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"wii-maple-treeway-r": "DIT’s original May 21 screenshot shows the 1:48.93 WR and enriches the existing later August 19 announcement. Its movie is unavailable. Sucha’s preserved 1:49.68 video was uploaded May 17 before the original screenshot submission; these dates remain separate.", "gcn-mushroom-bridge": "The carried 1:10.37 WR has preserved original and playback video files. The reviewed 1:10.88 screenshot is slower. A menu showing a tour personal best of 1:10.89 is retained as context and creates no separate completed run."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-148"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"wii-maple-treeway-r": "curated-1373158670845608007-mii2025-image-reviewed", "gcn-mushroom-bridge": "1114964088326471821"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          sourceImages: data.id === "gcn-mushroom-bridge" ? [{"playerId": "player-e381ad", "url": "https://media.mktwrs.com/assets/proof/mii2025-1374886964410449960-5df4a271eed82c72432b.png", "sourceUrl": "https://discord.com/channels/629221606064914442/875784780573184010/1374886964574294040", "postedAt": "2025-05-21T23:09:56.519Z", "note": "Tour personal-best menu shows1:10.89. The adjacent post reports35.12/35.77; this source establishes no separate completed run or private achievement date."}] : [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-05-29" && !r.videoVerified).map(displayRecord)};
      })(),
      mii2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Mii Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-05-14T06:00:00Z") && Date.parse(day) < Date.parse("2025-05-28T06:00:00Z") : day >= "2025-05-14" && day < "2025-05-28")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-05-14")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || row.id === "curated-1373158670845608007-mii2025-image-reviewed" || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-05-14"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-05-14"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-05-14") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-149") ? {
      princess2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-149", "2025-05-28", "2025-06-11");
        const finalId = {"wii-coconut-mall": "1252349131188469841", "gba-snow-land-r": "1124182218407944233"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"wii-coconut-mall": "MB3’s carried 1:13.51 remains the tour WR; no recovered recording matches it. Shine’s preserved 1:13.64 recording is shown separately. These saved sources contain no new Coconut Mall result from this tour.", "gba-snow-land-r": "NR’s carried 1:09.09 WR has preserved footage. Four completed screenshots are slower supporting results. The 1:11.70 and 1:11.30 personal-best menu images remain source context and do not establish separate completed runs or private race dates."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-149"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const id={"wii-coconut-mall": "curated-1249676586463264841-princess2024-image-reviewed", "gba-snow-land-r": "1124182218407944233"}[data.id];const r=[...data.records,...data.submissions].find(r=>r.id===id);return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          sourceImages: data.id === "gba-snow-land-r" ? [{"playerId": "leannoop4", "url": "https://media.mktwrs.com/assets/proof/princess2025-1378008007283183748-4a67148e5046e2776f9c.jpg", "sourceUrl": "https://discord.com/channels/629221606064914442/875784780573184010/1378008007530512414", "postedAt": "2025-05-30T13:51:51.146Z", "note": "Personal-best menu reports 1:11.70; posting is the evidence publication date, not a separate completed-race date."}, {"playerId": "haruru", "url": "https://media.mktwrs.com/assets/proof/princess2025-1378583320564338709-dda23ea8d1403c9213e5.png", "sourceUrl": "https://discord.com/channels/629221606064914442/875784780573184010/1378583320710877275", "postedAt": "2025-06-01T03:57:56.497Z", "note": "Personal-best menu reports 1:11.30; posting is the evidence publication date, not a separate completed-race date."}] : [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-06-12" && !r.videoVerified).map(displayRecord)};
      })(),
      princess2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Princess Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-05-28T06:00:00Z") && Date.parse(day) < Date.parse("2025-06-11T06:00:00Z") : day >= "2025-05-28" && day < "2025-06-11")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source", "tour-personal-best-menu-source-only"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-05-28")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-05-28"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-05-28"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-05-28") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-150") ? {
      marioluigi2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-150", "2025-06-11", "2025-06-25");
        const finalId = "1264386099934003281";
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: "Sucha’s carried 1:11.86 WR has preserved image proof. The fastest recovered recording is 1:11.87: its screenshot and video were published June 24, 2024, and its June 12, 2025 Discord sharing explicitly says one year ago. This repost creates no new 2025 run. The two current screenshots are slower supporting results.",
          practicalReviewComplete: a.tourReviews?.["tour-150"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const r=[...data.records,...data.submissions].find(r=>r.id==="curated-sucha-supplied-16vI7eIWw-4");return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-06-26" && !r.videoVerified).map(displayRecord)};
      })(),
      marioluigi2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Mario vs. Luigi Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-06-11T06:00:00Z") && Date.parse(day) < Date.parse("2025-06-25T06:00:00Z") : day >= "2025-06-11" && day < "2025-06-25")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source", "tour-personal-best-menu-source-only"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-06-11")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-06-11"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-06-11"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-06-11") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    ...(data.appearances.some(a => a.tourId === "tour-151") ? {
      night2025Recording: (() => {
        const comparison = tourRecordingComparison(data, "tour-151", "2025-06-25", "2025-07-09");
        const finalId = {"rome-avanti-2":"1264395735814635612","singapore-speedway":"935931716575559721","singapore-speedway-2r":"1264395851904585738"}[data.id];
        const wr = data.records.find(r => r.id === finalId);
        return {...comparison,
          dateBoundaryNote: {"rome-avanti-2":"The carried 1:18.84 WR has preserved image proof; the fastest recovered recording is Nu11’s 1:18.87, published July 11, 2023. Two current screenshots show slower supporting results.", "singapore-speedway":"The carried 1:09.43 WR has its original screenshot and recording preserved. The screenshot was submitted January 25, 2022; the video was published later that day. Seven current screenshots show slower supporting results.", "singapore-speedway-2r":"The carried 1:24.28 WR has preserved image proof. REMON’s 1:24.54 is the fastest recovered recording; its July 1, 2024 video publication, screenshot posting and video sharing clocks remain separate. The current screenshot shows a slower supporting result."}[data.id],
          practicalReviewComplete: a.tourReviews?.["tour-151"]?.practicalReviewComplete === true,
          worldRecord: wr ? displayRecord(wr) : null,
          recording: null,
          reportedRecording: null,
          documentedRecording: (() => {const r=[...data.records,...data.submissions].find(r=>r.id===({"rome-avanti-2":"1130210516791464016","singapore-speedway":"935931716575559721","singapore-speedway-2r":"curated-1257277274265354242-night2024-image-reviewed"}[data.id]));return r?.videoBackup?.url && r.videoVerified ? displayRecord(r) : null;})(),
          lapDemonstrations: [],
          strategyReferences: [],
          sourceImages: [],
          pendingRecordings: comparison.pendingRecordings.filter(r => (r.submittedAt || r.recordDate || "") < "2025-07-10" && !r.videoVerified).map(displayRecord)};
      })(),
      night2025SupportingResults: (() => {
        const rows = (data.submissions || []).filter(r => {
          const day = r.submittedAt || r.chronologyDate || r.achievedAt;
          return day && (r.lateTourSubmission === true && r.courseAppearance === "Night Tour (2025)" || (day.includes("T") ? Date.parse(day) >= Date.parse("2025-06-25T06:00:00Z") && Date.parse(day) < Date.parse("2025-07-09T06:00:00Z") : day >= "2025-06-25" && day < "2025-07-09")) &&
            r.performanceCategory !== "noncompetitive-timer-limit" && !["rejected-claim", "rejected-submission", "erroneous-reported-input", "cancelled-submission", "edited-receipt-time-unverified", "matched-existing-documented-result-receipt", "source-image-caption-conflict", "matched-existing-performance-source", "tour-personal-best-menu-source-only"].includes(r.status) && !data.records.some(record => record.id === r.id || (record.playerId === r.playerId && record.timeCs === r.timeCs && (record.tourDateRange?.start === "2025-06-25")));
        });
        const grouped = new Map();
        for (const row of rows) {
          const day = (row.submittedAt || row.chronologyDate || row.achievedAt).slice(0, 10);
          const key = row.playerId + "|" + row.time + "|" + day + "|" + (row.performanceCategory || "standard") + "|" + (row.distinctPerformanceId || "");
          const previous = grouped.get(key);
          if (!previous || (!previous.proofImageLocal && row.proofImageLocal)) grouped.set(key, row);
        }
        const uniqueRows = [...grouped.values()];
        const opening = uniqueRows.filter(r => isReviewedOpeningDay(r, "2025-06-25"));
        const recordOpening = data.records.filter(r => isReviewedOpeningDay(r, "2025-06-25"));
        const best = Math.min(...opening.map(r => r.timeCs), ...recordOpening.map(r => r.timeCs));
        return uniqueRows.filter(r => !isReviewedOpeningDay(r, "2025-06-25") || r.timeCs === best).map(displayRecord).sort(recordChronology);
      })(),
    } : {}),
    currentHolders: data.currentHolders.map(displayRecord),
    fastestVideo: (() => {
      const qualified = fastestVideo(data);
      const documented = data.appearances.some(a => a.tourId === "tour-151") && ["rome-avanti-2","singapore-speedway","singapore-speedway-2r"].includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"rome-avanti-2":"1130210516791464016","singapore-speedway":"935931716575559721","singapore-speedway-2r":"curated-1257277274265354242-night2024-image-reviewed"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-150") && data.id === "n64-luigi-raceway-r"
        ? [...data.records,...data.submissions].find(r=>r.id==="curated-sucha-supplied-16vI7eIWw-4" && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-149") && ["wii-coconut-mall", "gba-snow-land-r"].includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"wii-coconut-mall":"curated-1249676586463264841-princess2024-image-reviewed", "gba-snow-land-r":"1124182218407944233"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-148") && ["wii-maple-treeway-r", "gcn-mushroom-bridge"].includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"wii-maple-treeway-r":"curated-1373158670845608007-mii2025-image-reviewed", "gcn-mushroom-bridge":"1114964088326471821"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-146") && ["athens-dash-2", "berlin-byways"].includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"athens-dash-2":"1371156949529264180", "berlin-byways":"1104263697943240844"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-145") && ["gcn-yoshi-circuit", "snes-donut-plains-2r"].includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"gcn-yoshi-circuit":"curated-2025-kod-yoshi-NjqUdL5prbs", "snes-donut-plains-2r":"1099917584113090641"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-144") && ["wii-rainbow-road", "3ds-wario-shipyard"].includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"wii-rainbow-road":"1229525362023858277", "3ds-wario-shipyard":"1093745717182472272"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-140") && ["bangkok-rush-2", "singapore-speedway-r", "tokyo-blur-4"] .includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"bangkok-rush-2": "curated-1202588979275235438-winter2024-image-reviewed", "singapore-speedway-r": "curated-1331968171363799121-winter2025-image-reviewed", "tokyo-blur-4": "1074903169542389840"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-139") && ["gba-cheep-cheep-island-r", "n64-kalimari-desert-2"] .includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"gba-cheep-cheep-island-r": "1332604220695904306", "n64-kalimari-desert-2": "1068224230715559956"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-138") && ["wii-koopa-cape", "3ds-piranha-plant-slide"] .includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"wii-koopa-cape": "curated-1325128116334497855-newyear2025-image-reviewed", "3ds-piranha-plant-slide": "1197596509772984370"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-137") && ["gba-snow-land", "vancouver-velocity-3"] .includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"gba-snow-land": "1058253597781000283", "vancouver-velocity-3": "1192533972043964436"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-136") && ["3ds-bowser-s-castle-r", "ds-peach-gardens", "n64-royal-raceway"] .includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"3ds-bowser-s-castle-r": "1332590475806511144", "ds-peach-gardens": "1189361589913124894", "n64-royal-raceway": "1189361686306619392"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-135") && ["n64-choco-mountain", "n64-yoshi-valley-r"] .includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"n64-choco-mountain": "curated-1308403636057018389-animal2024-image-reviewed", "n64-yoshi-valley-r": "curated-1307812971824549939-animal2024-video-reviewed"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-134") && ["los-angeles-laps-2", "los-angeles-laps-3"] .includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"los-angeles-laps-2": "1178887189124370537", "los-angeles-laps-3": "1042970214414950400"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-133") && ["snes-donut-plains-3"] .includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"snes-donut-plains-3": "1039950316147322890"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-132") && ["snes-donut-plains-1r", "snes-donut-plains-2"] .includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"snes-donut-plains-1r": "curated-1030520974854078604-1030520974598221945-august2022-image-reviewed", "snes-donut-plains-2": "1308276800647991408"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-131") && ["athens-dash-3", "madrid-drive-3", "rome-avanti-3"] .includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"athens-dash-3": "discord-1155446902016462959", "madrid-drive-3": "1162598591001546913", "rome-avanti-3": "1308276465279959090"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-130") && ["gba-luigi-circuit", "snes-vanilla-lake-2r"].includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"gba-luigi-circuit":"1290731539428016141","snes-vanilla-lake-2r":"discord-1153813378867941447"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-129") && ["madrid-drive", "berlin-byways-2"].includes(data.id)
        ? data.records.find(r=>r.id===({"madrid-drive":"1152024419473047663","berlin-byways-2":"897020683991793685"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-128") && ["athens-dash", "squeaky-clean-sprint"].includes(data.id)
        ? data.records.find(r=>r.id===({"athens-dash":"1147355757961031690","squeaky-clean-sprint":"1147355273481175120-phillish"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-127") && ["wii-daisy-circuit", "snes-koopa-troopa-beach-2r"].includes(data.id)
        ? [...data.records,...data.submissions].find(r=>r.id===({"wii-daisy-circuit":"1274825087542890606","snes-koopa-troopa-beach-2r":"curated-1269954170991935508-sunshine2024-image-reviewed"}[data.id]) && r.videoVerified && r.videoBackup?.url)
        : data.id === "piranha-plant-cove-2r" && data.appearances.some(a => a.tourId === "tour-126")
        ? data.records.find(r => r.id === "curated-1262778386078502922-pipe2024-image-reviewed" && r.videoVerified && r.videoBackup?.url)
        : data.id === "wii-rainbow-road" && data.appearances.some(a => a.tourId === "tour-118")
        ? data.records.find(r => r.id === "1229525362023858277" && r.videoVerified && r.videoBackup?.url)
        : data.appearances.some(a => a.tourId === "tour-14")
        ? tourRecordingComparison(data, "tour-14", "2020-03-25", "2020-04-08").documentedRecording
        : data.id === "gba-snow-land-r" && data.appearances.some(a => a.tourId === "tour-97")
          ? tourRecordingComparison(data, "tour-97", "2023-05-31", "2023-06-14").documentedRecording
          : data.id === "vancouver-velocity-3" && data.appearances.some(a => a.tourId === "tour-111")
            ? data.records.find(r => r.id === "1192533972043964436" && r.videoVerified && r.videoBackup?.url)
            : data.appearances.some(a => a.tourId === "tour-116")
              ? data.records.find(r => r.id === ({"ds-peach-gardens-r":"1084274701741862943","gba-sky-garden":"1084274769643454484"}[data.id]) && r.videoVerified && r.videoBackup?.url)
            : data.appearances.some(a => a.tourId === "tour-112")
              ? data.records.find(r => r.id === ({"wii-koopa-cape":"curated-1190203978185703514-newyear2024-image-reviewed","3ds-piranha-plant-slide":"1197596509772984370"}[data.id]) && r.videoVerified && r.videoBackup?.url) : null;
      return documented && (!qualified || documented.timeCs < qualified.timeCs)
        ? {...displayRecord(documented), documentedRecordingSelection: true}
        : qualified ? displayRecord(qualified) : null;
    })(),
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
  if (view === "course") for (const r of [...(data.hammerSupportingResults || []), ...(data.hammerRecoveredProgression || []), data.hammer2020Recording?.recording, data.hammer2020Recording?.documentedRecording, ...(data.hammer2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
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
  if (view === "course") for (const r of [...(data.yoshi2022SupportingResults || []), data.yoshi2022Recording?.recording, data.yoshi2022Recording?.documentedRecording, ...(data.yoshi2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.amsterdam2022SupportingResults || []), data.amsterdam2022Recording?.recording, data.amsterdam2022Recording?.documentedRecording, ...(data.amsterdam2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.doctor2022SupportingResults || []), data.doctor2022Recording?.recording, data.doctor2022Recording?.documentedRecording, ...(data.doctor2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.peachbowsermay2022SupportingResults || []), data.peachbowsermay2022Recording?.recording, data.peachbowsermay2022Recording?.documentedRecording, ...(data.peachbowsermay2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.cat2022SupportingResults || []), data.cat2022Recording?.recording, data.cat2022Recording?.documentedRecording, ...(data.cat2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.metropolitan2022SupportingResults || []), data.metropolitan2022Recording?.recording, data.metropolitan2022Recording?.documentedRecording, ...(data.metropolitan2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.bangkok2022SupportingResults || []), data.bangkok2022Recording?.recording, data.bangkok2022Recording?.documentedRecording, ...(data.bangkok2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.piranha2022SupportingResults || []), data.piranha2022Recording?.recording, data.piranha2022Recording?.documentedRecording, ...(data.piranha2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.ocean2022SupportingResults || []), data.ocean2022Recording?.recording, data.ocean2022Recording?.documentedRecording, ...(data.ocean2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.sundae2022SupportingResults || []), data.sundae2022Recording?.recording, data.sundae2022Recording?.documentedRecording, ...(data.sundae2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.bowser2022SupportingResults || []), data.bowser2022Recording?.recording, data.bowser2022Recording?.documentedRecording, ...(data.bowser2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.marioluigi2022SupportingResults || []), data.marioluigi2022Recording?.recording, data.marioluigi2022Recording?.documentedRecording, ...(data.marioluigi2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.anniversary2022SupportingResults || []), data.anniversary2022Recording?.recording, data.anniversary2022Recording?.documentedRecording, ...(data.anniversary2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.battle2022SupportingResults || []), data.battle2022Recording?.recording, data.battle2022Recording?.documentedRecording, ...(data.battle2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.halloween2022SupportingResults || []), data.halloween2022Recording?.recording, data.halloween2022Recording?.documentedRecording, ...(data.halloween2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.autumn2022SupportingResults || []), data.autumn2022Recording?.recording, data.autumn2022Recording?.documentedRecording, ...(data.autumn2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.animal2022SupportingResults || []), data.animal2022Recording?.recording, data.animal2022Recording?.documentedRecording, data.animal2022Recording?.reportedRecording, ...(data.animal2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.holiday2022SupportingResults || []), data.holiday2022Recording?.recording, data.holiday2022Recording?.documentedRecording, data.holiday2022Recording?.reportedRecording, ...(data.holiday2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.newyear2023SupportingResults || []), data.newyear2023Recording?.recording, data.newyear2023Recording?.documentedRecording, data.newyear2023Recording?.reportedRecording, ...(data.newyear2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.space2023SupportingResults || []), data.space2023Recording?.recording, data.space2023Recording?.documentedRecording, data.space2023Recording?.reportedRecording, ...(data.space2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.winter2023SupportingResults || []), data.winter2023Recording?.recording, data.winter2023Recording?.documentedRecording, data.winter2023Recording?.reportedRecording, ...(data.winter2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.exploration2023SupportingResults || []), data.exploration2023Recording?.recording, data.exploration2023Recording?.documentedRecording, data.exploration2023Recording?.reportedRecording, ...(data.exploration2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.doctor2023SupportingResults || []), data.doctor2023Recording?.recording, data.doctor2023Recording?.documentedRecording, data.doctor2023Recording?.reportedRecording, ...(data.doctor2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.mario2023SupportingResults || []), data.mario2023Recording?.recording, data.mario2023Recording?.documentedRecording, data.mario2023Recording?.reportedRecording, ...(data.mario2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.ninja2023SupportingResults || []), data.ninja2023Recording?.recording, data.ninja2023Recording?.documentedRecording, data.ninja2023Recording?.reportedRecording, ...(data.ninja2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.yoshi2023SupportingResults || []), data.yoshi2023Recording?.recording, data.yoshi2023Recording?.documentedRecording, data.yoshi2023Recording?.reportedRecording, ...(data.yoshi2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.spring2023SupportingResults || []), data.spring2023Recording?.recording, data.spring2023Recording?.documentedRecording, data.spring2023Recording?.reportedRecording, data.spring2023Recording?.referenceRecording, data.spring2023Recording?.lapDemonstration, ...(data.spring2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.bowser2023SupportingResults || []), data.bowser2023Recording?.recording, data.bowser2023Recording?.documentedRecording, data.bowser2023Recording?.reportedRecording, data.bowser2023Recording?.referenceRecording, data.bowser2023Recording?.strategyReference, ...(data.bowser2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.night2023SupportingResults || []), data.night2023Recording?.worldRecord, data.night2023Recording?.recording, data.night2023Recording?.documentedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.pipe2023SupportingResults || []), data.pipe2023Recording?.worldRecord, data.pipe2023Recording?.recording, data.pipe2023Recording?.documentedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.sunshine2023SupportingResults || []), data.sunshine2023Recording?.worldRecord, data.sunshine2023Recording?.recording, data.sunshine2023Recording?.documentedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.vacation2023SupportingResults || []), data.vacation2023Recording?.worldRecord, data.vacation2023Recording?.recording, data.vacation2023Recording?.documentedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.summer2023SupportingResults || []), data.summer2023Recording?.worldRecord, data.summer2023Recording?.recording, data.summer2023Recording?.documentedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.sundae2023SupportingResults || []), data.sundae2023Recording?.worldRecord, data.sundae2023Recording?.recording, data.sundae2023Recording?.documentedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.anniversary2023SupportingResults || []), data.anniversary2023Recording?.worldRecord, data.anniversary2023Recording?.recording, data.anniversary2023Recording?.documentedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.battle2023SupportingResults || []), data.battle2023Recording?.worldRecord, data.battle2023Recording?.recording, data.battle2023Recording?.documentedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.halloween2023SupportingResults || []), data.halloween2023Recording?.worldRecord, data.halloween2023Recording?.recording, data.halloween2023Recording?.documentedRecording, data.halloween2023Recording?.strategyReference].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.autumn2023SupportingResults || []), data.autumn2023Recording?.worldRecord, data.autumn2023Recording?.recording, data.autumn2023Recording?.documentedRecording, data.autumn2023InputCorrection].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.marioLuigi2023SupportingResults || []), data.marioLuigi2023Recording?.referenceRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.princess2023SupportingResults || []), data.princess2023Recording?.recording, data.princess2023Recording?.documentedRecording, data.princess2023Recording?.referenceRecording, ...(data.princess2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.mii2023SupportingResults || []), data.mii2023Recording?.recording, data.mii2023Recording?.documentedRecording, ...(data.mii2023Recording?.strategyReferences || []), ...(data.mii2023Recording?.lapDemonstrations || []), ...(data.mii2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.peachbowser2022SupportingResults || []), data.peachbowser2022Recording?.recording, data.peachbowser2022Recording?.documentedRecording, data.peachbowser2022Recording?.reportedRecording, ...(data.peachbowser2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.samurai2022SupportingResults || []), data.samurai2022Recording?.recording, data.samurai2022Recording?.documentedRecording, ...(data.samurai2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.mii2022SupportingResults || []), data.mii2022Recording?.recording, data.mii2022Recording?.documentedRecording, ...(data.mii2022Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.supermarioSupportingResults || []), data.supermario2020Recording?.recording, data.supermario2020Recording?.documentedRecording, ...(data.supermario2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.summerfestSupportingResults || []), data.summerfest2020Recording?.recording, data.summerfest2020Recording?.documentedRecording, ...(data.summerfest2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.pirateSupportingResults || []), data.pirate2020Recording?.recording, data.pirate2020Recording?.documentedRecording, ...(data.pirate2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.wildwestSupportingResults || []), data.wildwest2020Recording?.recording, data.wildwest2020Recording?.documentedRecording, ...(data.wildwest2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.explorationSupportingResults || []), data.exploration2020Recording?.recording, data.exploration2020Recording?.documentedRecording, ...(data.exploration2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.marineSupportingResults || []), data.marine2020Recording?.recording, data.marine2020Recording?.documentedRecording, ...(data.marine2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.peachSupportingResults || []), data.peach2020Recording?.recording, data.peach2020Recording?.documentedRecording, ...(data.peach2020Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course" && data?.halloween2019Recording?.recording) visiblePlayerIds.add(data.halloween2019Recording.recording.playerId);
  if (view === "course") for (const r of data?.halloween2019Recording?.pendingRecordings || []) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.animal2023SupportingResults || []), data.animal2023Recording?.worldRecord, data.animal2023Recording?.recording, data.animal2023Recording?.documentedRecording, data.animal2023Recording?.reportedRecording, data.animal2023Recording?.strategyReference, ...(data.animal2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.peachbowser2023SupportingResults || []), data.peachbowser2023Recording?.worldRecord, data.peachbowser2023Recording?.recording, data.peachbowser2023Recording?.documentedRecording, data.peachbowser2023Recording?.reportedRecording, data.peachbowser2023Recording?.strategyReference, ...(data.peachbowser2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.newyear2024SupportingResults || []), data.newyear2024Recording?.worldRecord, data.newyear2024Recording?.recording, ...(data.newyear2024Recording?.lapDemonstrations || []), data.newyear2024Recording?.documentedRecording, data.newyear2024Recording?.reportedRecording, data.newyear2024Recording?.strategyReference, ...(data.newyear2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.space2024SupportingResults || []), data.space2024Recording?.worldRecord, data.space2024Recording?.recording, ...(data.space2024Recording?.lapDemonstrations || []), data.space2024Recording?.documentedRecording, data.space2024Recording?.reportedRecording, data.space2024Recording?.strategyReference, ...(data.space2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.winter2024SupportingResults || []), data.winter2024Recording?.worldRecord, data.winter2024Recording?.recording, ...(data.winter2024Recording?.lapDemonstrations || []), data.winter2024Recording?.documentedRecording, data.winter2024Recording?.reportedRecording, data.winter2024Recording?.strategyReference, ...(data.winter2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.exploration2024SupportingResults || []), data.exploration2024Recording?.worldRecord, data.exploration2024Recording?.recording, ...(data.exploration2024Recording?.lapDemonstrations || []), data.exploration2024Recording?.documentedRecording, data.exploration2024Recording?.reportedRecording, data.exploration2024Recording?.strategyReference, ...(data.exploration2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.doctor2024SupportingResults || []), data.doctor2024Recording?.worldRecord, data.doctor2024Recording?.recording, ...(data.doctor2024Recording?.lapDemonstrations || []), data.doctor2024Recording?.documentedRecording, data.doctor2024Recording?.reportedRecording, ...(data.doctor2024Recording?.strategyReferences || []), ...(data.doctor2024Recording?.sourceImages || []), ...(data.doctor2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.mario2024SupportingResults || []), data.mario2024Recording?.worldRecord, data.mario2024Recording?.recording, ...(data.mario2024Recording?.lapDemonstrations || []), data.mario2024Recording?.documentedRecording, data.mario2024Recording?.reportedRecording, data.mario2024Recording?.lateStartRecording, ...(data.mario2024Recording?.strategyReferences || []), ...(data.mario2024Recording?.sourceImages || []), ...(data.mario2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.ninja2024SupportingResults || []), data.ninja2024Recording?.worldRecord, data.ninja2024Recording?.recording, ...(data.ninja2024Recording?.lapDemonstrations || []), data.ninja2024Recording?.documentedRecording, data.ninja2024Recording?.reportedRecording, data.ninja2024Recording?.lateStartRecording, ...(data.ninja2024Recording?.strategyReferences || []), ...(data.ninja2024Recording?.sourceImages || []), ...(data.ninja2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.yoshi2024SupportingResults || []), data.yoshi2024Recording?.worldRecord, data.yoshi2024Recording?.recording, ...(data.yoshi2024Recording?.lapDemonstrations || []), data.yoshi2024Recording?.documentedRecording, data.yoshi2024Recording?.reportedRecording, data.yoshi2024Recording?.lateStartRecording, ...(data.yoshi2024Recording?.strategyReferences || []), ...(data.yoshi2024Recording?.sourceImages || []), ...(data.yoshi2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.spring2024SupportingResults || []), data.spring2024Recording?.worldRecord, data.spring2024Recording?.recording, ...(data.spring2024Recording?.lapDemonstrations || []), data.spring2024Recording?.documentedRecording, data.spring2024Recording?.reportedRecording, data.spring2024Recording?.lateStartRecording, ...(data.spring2024Recording?.strategyReferences || []), ...(data.spring2024Recording?.sourceImages || []), ...(data.spring2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.bowser2024SupportingResults || []), data.bowser2024Recording?.worldRecord, data.bowser2024Recording?.recording, ...(data.bowser2024Recording?.lapDemonstrations || []), data.bowser2024Recording?.documentedRecording, data.bowser2024Recording?.reportedRecording, data.bowser2024Recording?.lateStartRecording, ...(data.bowser2024Recording?.strategyReferences || []), ...(data.bowser2024Recording?.sourceImages || []), ...(data.bowser2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.mii2024SupportingResults || []), data.mii2024Recording?.worldRecord, data.mii2024Recording?.recording, ...(data.mii2024Recording?.lapDemonstrations || []), data.mii2024Recording?.documentedRecording, data.mii2024Recording?.reportedRecording, data.mii2024Recording?.lateStartRecording, ...(data.mii2024Recording?.strategyReferences || []), ...(data.mii2024Recording?.sourceImages || []), ...(data.mii2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.princess2024SupportingResults || []), data.princess2024Recording?.worldRecord, data.princess2024Recording?.recording, ...(data.princess2024Recording?.lapDemonstrations || []), data.princess2024Recording?.documentedRecording, data.princess2024Recording?.reportedRecording, data.princess2024Recording?.lateStartRecording, ...(data.princess2024Recording?.strategyReferences || []), ...(data.princess2024Recording?.sourceImages || []), ...(data.princess2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.marioluigi2024SupportingResults || []), data.marioluigi2024Recording?.worldRecord, data.marioluigi2024Recording?.recording, ...(data.marioluigi2024Recording?.lapDemonstrations || []), data.marioluigi2024Recording?.documentedRecording, data.marioluigi2024Recording?.reportedRecording, data.marioluigi2024Recording?.lateStartRecording, ...(data.marioluigi2024Recording?.strategyReferences || []), ...(data.marioluigi2024Recording?.sourceImages || []), ...(data.marioluigi2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.night2024SupportingResults || []), data.night2024Recording?.worldRecord, data.night2024Recording?.recording, ...(data.night2024Recording?.lapDemonstrations || []), data.night2024Recording?.documentedRecording, data.night2024Recording?.reportedRecording, data.night2024Recording?.lateStartRecording, ...(data.night2024Recording?.strategyReferences || []), ...(data.night2024Recording?.sourceImages || []), ...(data.night2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.pipe2024SupportingResults || []), data.pipe2024Recording?.worldRecord, data.pipe2024Recording?.recording, ...(data.pipe2024Recording?.lapDemonstrations || []), data.pipe2024Recording?.documentedRecording, data.pipe2024Recording?.reportedRecording, data.pipe2024Recording?.lateStartRecording, ...(data.pipe2024Recording?.strategyReferences || []), ...(data.pipe2024Recording?.sourceImages || []), ...(data.pipe2024Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.sunshine2024SupportingResults || []), data.sunshine2024Recording?.worldRecord, data.sunshine2024Recording?.recording, ...(data.sunshine2024Recording?.lapDemonstrations || []), data.sunshine2024Recording?.documentedRecording, data.sunshine2024Recording?.reportedRecording, data.sunshine2024Recording?.lateStartRecording, ...(data.sunshine2024Recording?.strategyReferences || []), ...(data.sunshine2024Recording?.sourceImages || []), ...(data.sunshine2024Recording?.pendingRecordings || []), ...(data.sunshine2024Recording?.sourceImages || []), data.sunshine2024Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.vacation2024SupportingResults || []), data.vacation2024Recording?.worldRecord, data.vacation2024Recording?.recording, ...(data.vacation2024Recording?.lapDemonstrations || []), data.vacation2024Recording?.documentedRecording, data.vacation2024Recording?.reportedRecording, data.vacation2024Recording?.lateStartRecording, ...(data.vacation2024Recording?.strategyReferences || []), ...(data.vacation2024Recording?.sourceImages || []), ...(data.vacation2024Recording?.pendingRecordings || []), ...(data.vacation2024Recording?.sourceImages || []), data.vacation2024Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.summer2024SupportingResults || []), data.summer2024Recording?.worldRecord, data.summer2024Recording?.recording, ...(data.summer2024Recording?.lapDemonstrations || []), data.summer2024Recording?.documentedRecording, data.summer2024Recording?.reportedRecording, data.summer2024Recording?.lateStartRecording, ...(data.summer2024Recording?.strategyReferences || []), ...(data.summer2024Recording?.sourceImages || []), ...(data.summer2024Recording?.pendingRecordings || []), ...(data.summer2024Recording?.sourceImages || []), data.summer2024Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.sundae2024SupportingResults || []), data.sundae2024Recording?.worldRecord, data.sundae2024Recording?.recording, ...(data.sundae2024Recording?.lapDemonstrations || []), data.sundae2024Recording?.documentedRecording, data.sundae2024Recording?.reportedRecording, data.sundae2024Recording?.lateStartRecording, ...(data.sundae2024Recording?.strategyReferences || []), ...(data.sundae2024Recording?.sourceImages || []), ...(data.sundae2024Recording?.pendingRecordings || []), ...(data.sundae2024Recording?.sourceImages || []), data.sundae2024Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.anniversary2024SupportingResults || []), data.anniversary2024Recording?.worldRecord, data.anniversary2024Recording?.recording, ...(data.anniversary2024Recording?.lapDemonstrations || []), data.anniversary2024Recording?.documentedRecording, data.anniversary2024Recording?.reportedRecording, data.anniversary2024Recording?.lateStartRecording, ...(data.anniversary2024Recording?.strategyReferences || []), ...(data.anniversary2024Recording?.sourceImages || []), ...(data.anniversary2024Recording?.pendingRecordings || []), ...(data.anniversary2024Recording?.sourceImages || []), data.anniversary2024Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.battle2024SupportingResults || []), data.battle2024Recording?.worldRecord, data.battle2024Recording?.recording, ...(data.battle2024Recording?.lapDemonstrations || []), data.battle2024Recording?.documentedRecording, data.battle2024Recording?.reportedRecording, data.battle2024Recording?.lateStartRecording, ...(data.battle2024Recording?.strategyReferences || []), ...(data.battle2024Recording?.sourceImages || []), ...(data.battle2024Recording?.pendingRecordings || []), ...(data.battle2024Recording?.sourceImages || []), data.battle2024Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.halloween2024SupportingResults || []), data.halloween2024Recording?.worldRecord, data.halloween2024Recording?.recording, ...(data.halloween2024Recording?.lapDemonstrations || []), data.halloween2024Recording?.documentedRecording, data.halloween2024Recording?.reportedRecording, data.halloween2024Recording?.lateStartRecording, ...(data.halloween2024Recording?.strategyReferences || []), ...(data.halloween2024Recording?.sourceImages || []), ...(data.halloween2024Recording?.pendingRecordings || []), ...(data.halloween2024Recording?.sourceImages || []), data.halloween2024Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.autumn2024SupportingResults || []), data.autumn2024Recording?.worldRecord, data.autumn2024Recording?.recording, ...(data.autumn2024Recording?.lapDemonstrations || []), data.autumn2024Recording?.documentedRecording, data.autumn2024Recording?.reportedRecording, data.autumn2024Recording?.lateStartRecording, ...(data.autumn2024Recording?.strategyReferences || []), ...(data.autumn2024Recording?.sourceImages || []), ...(data.autumn2024Recording?.pendingRecordings || []), ...(data.autumn2024Recording?.sourceImages || []), data.autumn2024Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.animal2024SupportingResults || []), data.animal2024Recording?.worldRecord, data.animal2024Recording?.recording, ...(data.animal2024Recording?.lapDemonstrations || []), data.animal2024Recording?.documentedRecording, data.animal2024Recording?.reportedRecording, data.animal2024Recording?.lateStartRecording, ...(data.animal2024Recording?.strategyReferences || []), ...(data.animal2024Recording?.sourceImages || []), ...(data.animal2024Recording?.pendingRecordings || []), ...(data.animal2024Recording?.sourceImages || []), data.animal2024Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.peachbowser2024SupportingResults || []), data.peachbowser2024Recording?.worldRecord, data.peachbowser2024Recording?.recording, ...(data.peachbowser2024Recording?.lapDemonstrations || []), data.peachbowser2024Recording?.documentedRecording, data.peachbowser2024Recording?.reportedRecording, data.peachbowser2024Recording?.lateStartRecording, ...(data.peachbowser2024Recording?.strategyReferences || []), ...(data.peachbowser2024Recording?.sourceImages || []), ...(data.peachbowser2024Recording?.pendingRecordings || []), ...(data.peachbowser2024Recording?.sourceImages || []), data.peachbowser2024Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.holiday2024SupportingResults || []), data.holiday2024Recording?.worldRecord, data.holiday2024Recording?.recording, ...(data.holiday2024Recording?.lapDemonstrations || []), data.holiday2024Recording?.documentedRecording, data.holiday2024Recording?.reportedRecording, data.holiday2024Recording?.lateStartRecording, ...(data.holiday2024Recording?.strategyReferences || []), ...(data.holiday2024Recording?.sourceImages || []), ...(data.holiday2024Recording?.pendingRecordings || []), ...(data.holiday2024Recording?.sourceImages || []), data.holiday2024Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.newyear2025SupportingResults || []), data.newyear2025Recording?.worldRecord, data.newyear2025Recording?.recording, ...(data.newyear2025Recording?.lapDemonstrations || []), data.newyear2025Recording?.documentedRecording, data.newyear2025Recording?.reportedRecording, data.newyear2025Recording?.lateStartRecording, ...(data.newyear2025Recording?.strategyReferences || []), ...(data.newyear2025Recording?.sourceImages || []), ...(data.newyear2025Recording?.pendingRecordings || []), ...(data.newyear2025Recording?.sourceImages || []), data.newyear2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.space2025SupportingResults || []), data.space2025Recording?.worldRecord, data.space2025Recording?.recording, ...(data.space2025Recording?.lapDemonstrations || []), data.space2025Recording?.documentedRecording, data.space2025Recording?.reportedRecording, data.space2025Recording?.lateStartRecording, ...(data.space2025Recording?.strategyReferences || []), ...(data.space2025Recording?.sourceImages || []), ...(data.space2025Recording?.pendingRecordings || []), ...(data.space2025Recording?.sourceImages || []), data.space2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.winter2025SupportingResults || []), data.winter2025Recording?.worldRecord, data.winter2025Recording?.recording, ...(data.winter2025Recording?.lapDemonstrations || []), data.winter2025Recording?.documentedRecording, data.winter2025Recording?.reportedRecording, data.winter2025Recording?.lateStartRecording, ...(data.winter2025Recording?.strategyReferences || []), ...(data.winter2025Recording?.sourceImages || []), ...(data.winter2025Recording?.pendingRecordings || []), ...(data.winter2025Recording?.sourceImages || []), data.winter2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.exploration2025SupportingResults || []), data.exploration2025Recording?.worldRecord, data.exploration2025Recording?.recording, ...(data.exploration2025Recording?.lapDemonstrations || []), data.exploration2025Recording?.documentedRecording, data.exploration2025Recording?.reportedRecording, data.exploration2025Recording?.lateStartRecording, ...(data.exploration2025Recording?.strategyReferences || []), ...(data.exploration2025Recording?.sourceImages || []), ...(data.exploration2025Recording?.pendingRecordings || []), ...(data.exploration2025Recording?.sourceImages || []), data.exploration2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.doctor2025SupportingResults || []), data.doctor2025Recording?.worldRecord, data.doctor2025Recording?.recording, ...(data.doctor2025Recording?.lapDemonstrations || []), data.doctor2025Recording?.documentedRecording, data.doctor2025Recording?.reportedRecording, data.doctor2025Recording?.lateStartRecording, ...(data.doctor2025Recording?.strategyReferences || []), ...(data.doctor2025Recording?.sourceImages || []), ...(data.doctor2025Recording?.pendingRecordings || []), ...(data.doctor2025Recording?.sourceImages || []), data.doctor2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.mario2025SupportingResults || []), data.mario2025Recording?.worldRecord, data.mario2025Recording?.recording, ...(data.mario2025Recording?.lapDemonstrations || []), data.mario2025Recording?.documentedRecording, data.mario2025Recording?.reportedRecording, data.mario2025Recording?.lateStartRecording, ...(data.mario2025Recording?.strategyReferences || []), ...(data.mario2025Recording?.sourceImages || []), ...(data.mario2025Recording?.pendingRecordings || []), ...(data.mario2025Recording?.sourceImages || []), data.mario2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.ninja2025SupportingResults || []), data.ninja2025Recording?.worldRecord, data.ninja2025Recording?.recording, ...(data.ninja2025Recording?.lapDemonstrations || []), data.ninja2025Recording?.documentedRecording, data.ninja2025Recording?.reportedRecording, data.ninja2025Recording?.lateStartRecording, ...(data.ninja2025Recording?.strategyReferences || []), ...(data.ninja2025Recording?.sourceImages || []), ...(data.ninja2025Recording?.pendingRecordings || []), ...(data.ninja2025Recording?.sourceImages || []), data.ninja2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.yoshi2025SupportingResults || []), data.yoshi2025Recording?.worldRecord, data.yoshi2025Recording?.recording, ...(data.yoshi2025Recording?.lapDemonstrations || []), data.yoshi2025Recording?.documentedRecording, data.yoshi2025Recording?.reportedRecording, data.yoshi2025Recording?.lateStartRecording, ...(data.yoshi2025Recording?.strategyReferences || []), ...(data.yoshi2025Recording?.sourceImages || []), ...(data.yoshi2025Recording?.pendingRecordings || []), ...(data.yoshi2025Recording?.sourceImages || []), data.yoshi2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.spring2025SupportingResults || []), data.spring2025Recording?.worldRecord, data.spring2025Recording?.recording, ...(data.spring2025Recording?.lapDemonstrations || []), data.spring2025Recording?.documentedRecording, data.spring2025Recording?.reportedRecording, data.spring2025Recording?.lateStartRecording, ...(data.spring2025Recording?.strategyReferences || []), ...(data.spring2025Recording?.sourceImages || []), ...(data.spring2025Recording?.pendingRecordings || []), ...(data.spring2025Recording?.sourceImages || []), data.spring2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.bowser2025SupportingResults || []), data.bowser2025Recording?.worldRecord, data.bowser2025Recording?.recording, ...(data.bowser2025Recording?.lapDemonstrations || []), data.bowser2025Recording?.documentedRecording, data.bowser2025Recording?.reportedRecording, data.bowser2025Recording?.lateStartRecording, ...(data.bowser2025Recording?.strategyReferences || []), ...(data.bowser2025Recording?.sourceImages || []), ...(data.bowser2025Recording?.pendingRecordings || []), ...(data.bowser2025Recording?.sourceImages || []), data.bowser2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.mii2025SupportingResults || []), data.mii2025Recording?.worldRecord, data.mii2025Recording?.recording, ...(data.mii2025Recording?.lapDemonstrations || []), data.mii2025Recording?.documentedRecording, data.mii2025Recording?.reportedRecording, data.mii2025Recording?.lateStartRecording, ...(data.mii2025Recording?.strategyReferences || []), ...(data.mii2025Recording?.sourceImages || []), ...(data.mii2025Recording?.pendingRecordings || []), ...(data.mii2025Recording?.sourceImages || []), data.mii2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.princess2025SupportingResults || []), data.princess2025Recording?.worldRecord, data.princess2025Recording?.recording, ...(data.princess2025Recording?.lapDemonstrations || []), data.princess2025Recording?.documentedRecording, data.princess2025Recording?.reportedRecording, data.princess2025Recording?.lateStartRecording, ...(data.princess2025Recording?.strategyReferences || []), ...(data.princess2025Recording?.sourceImages || []), ...(data.princess2025Recording?.pendingRecordings || []), ...(data.princess2025Recording?.sourceImages || []), data.princess2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.marioluigi2025SupportingResults || []), data.marioluigi2025Recording?.worldRecord, data.marioluigi2025Recording?.recording, ...(data.marioluigi2025Recording?.lapDemonstrations || []), data.marioluigi2025Recording?.documentedRecording, data.marioluigi2025Recording?.reportedRecording, data.marioluigi2025Recording?.lateStartRecording, ...(data.marioluigi2025Recording?.strategyReferences || []), ...(data.marioluigi2025Recording?.sourceImages || []), ...(data.marioluigi2025Recording?.pendingRecordings || []), ...(data.marioluigi2025Recording?.sourceImages || []), data.marioluigi2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.night2025SupportingResults || []), data.night2025Recording?.worldRecord, data.night2025Recording?.recording, ...(data.night2025Recording?.lapDemonstrations || []), data.night2025Recording?.documentedRecording, data.night2025Recording?.reportedRecording, data.night2025Recording?.lateStartRecording, ...(data.night2025Recording?.strategyReferences || []), ...(data.night2025Recording?.sourceImages || []), ...(data.night2025Recording?.pendingRecordings || []), ...(data.night2025Recording?.sourceImages || []), data.night2025Recording?.reportedRecording].filter(Boolean)) visiblePlayerIds.add(r.playerId);
  if (view === "course") for (const r of [...(data.holiday2023SupportingResults || []), data.holiday2023Recording?.worldRecord, data.holiday2023Recording?.recording, data.holiday2023Recording?.reportedRecording, data.holiday2023Recording?.lapDemonstration, data.holiday2023Recording?.documentedRecording, data.holiday2023Recording?.reportedRecording, data.holiday2023Recording?.strategyReference, ...(data.holiday2023Recording?.pendingRecordings || [])].filter(Boolean)) visiblePlayerIds.add(r.playerId);
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
