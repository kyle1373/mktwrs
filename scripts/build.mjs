import { applyFinalSourceFidelity } from "./final-source-fidelity.mjs";
import { applyFinalDates } from "../lib/final-dates.mjs";
import {applyReviewedPublicationPatches} from "./reviewed-publication-patches.mjs";
import fs from "node:fs";
import {attachReviewedVideoShares} from "./reviewed-video-shares.mjs";
import { screenshotPublicationDate } from "./record-date.mjs";
import { videoKey } from "../lib/video.mjs";
import {
  importSources,
  mergeRecordingShareEvents,
  norm,
  findCourse,
  centiseconds,
  formatTime,
  mediaKind,
  attachmentDate,
} from "./import-sources.mjs";
import { playableDays, timestampWithinTour } from "../public/history.mjs";
import * as cheerio from "cheerio";
const root = "archive/raw";
const out = "public/data";
fs.mkdirSync(out, { recursive: true });
const clean = (s) =>
  (s || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const slug = (s) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function grid($, table) {
  const rows = [],
    spans = [];
  $(table)
    .children("tbody")
    .children("tr")
    .each((_, tr) => {
      let row = [];
      for (let i = 0; i < spans.length; i++)
        if (spans[i]?.left) {
          row[i] = spans[i].el;
          spans[i].left--;
        }
      let x = 0;
      $(tr)
        .children("td,th")
        .each((_, td) => {
          while (row[x]) x++;
          let col = Number($(td).attr("colspan") || 1);
          let n = Number($(td).attr("rowspan") || 1);
          for (let j = 0; j < col; j++) {
            row[x] = td;
            spans[x] = { el: td, left: n - 1 };
            x++;
          }
        });
      rows.push(row);
    });
  return rows;
}
let $ = cheerio.load(fs.readFileSync(root + "/wiki-tours.html", "utf8"));
let tours = [];
for (const row of grid($, $("table").first())) {
  const number = Number(clean($(row[0]).text()));
  if (!number) continue;
  let name = clean($(row[1]).text());
  let dates = clean($(row[2]).text()).split(" - ");
  if (dates.length !== 2) throw Error("Bad tour dates " + name);
  let start = new Date(dates[0] + " UTC"),
    last = new Date(dates[1] + " UTC");
  if (!Number.isFinite(+start)) throw Error("Bad date");
  tours.push({
    id: "tour-" + number,
    number,
    name,
    startDate: start.toISOString().slice(0, 10),
    endDate: new Date(+last + 86400000).toISOString().slice(0, 10),
    source:
      "https://www.mariowiki.com" + $(row[1]).find("a").first().attr("href"),
  });
}
$ = cheerio.load(fs.readFileSync(root + "/wiki-time-trial.html", "utf8"));
const courses = [];
const courseMap = new Map();
for (const table of $("table").slice(0, 9).toArray())
  for (const row of grid($, table).slice(1)) {
    let name = clean($(row[1]).text());
    if (!name) continue;
    let course = courseMap.get(name);
    if (!course) {
      course = {
        id: slug(name),
        name,
        sortName: name.replace(/^(SNES|N64|GBA|GCN|DS|Wii|3DS) /, ""),
        image: $(row[0]).find("img").attr("src"),
        fallbackImage: $(row[0]).find("img").attr("src"),
        wiki:
          "https://www.mariowiki.com" +
          $(row[1]).find("a").first().attr("href"),
        driver: clean($(row[2]).text()),
        driverImage: $(row[2]).find("img").attr("src"),
        kart: clean($(row[3]).text()),
        glider: clean($(row[4]).text()),
        appearances: [],
        records: [],
        coverage: {
          status: "in-progress",
          notes: [
            "Individual submissions and earlier record changes are still being reconciled.",
          ],
        },
      };
      courseMap.set(name, course);
      courses.push(course);
    }
    let tourName = clean($(row[6]).text());
    let found = tours.filter((t) => t.name === tourName);
    if (!found.length) console.error("Unmatched tour", tourName);
    for (const tour of found) {
      course.appearances.push({
        tourId: tour.id,
        cup: clean($(row[7]).text()),
        startDate: tour.startDate,
        endDate: tour.endDate,
        source: "https://www.mariowiki.com/Time_Trial_(Mario_Kart_Tour)",
      });
    }
  }
const sourceMessages = new Map();
for (const file of fs
  .readdirSync(root)
  .filter((f) => /^wr-history-page-.*\.json$/.test(f))) {
  const data = JSON.parse(fs.readFileSync(root + "/" + file));
  for (const m of data.messages || []) {
    if (!sourceMessages.has(m.id) || m.title) sourceMessages.set(m.id, m);
  }
}
const players = new Map(),
  unmatched = [];
for (const m of sourceMessages.values()) {
  if (!m.title || !m.description) {
    unmatched.push({
      id: m.id,
      reason: "Unstructured announcement",
      text: m.text,
    });
    continue;
  }
  let title = clean(m.title);
  let course = findCourse(courses, title);
  if (!course) {
    unmatched.push({ id: m.id, title, reason: "Course name not mapped" });
    continue;
  }
  let time = m.description.match(/((?:\d+:)?\d{2}[.:]\d{2})/);
  if (time) {
    time[1] = time[1].replace(/:(\d{2})$/, ".$1");
    if (!time[1].includes(":")) time[1] = "0:" + time[1];
  }
  if (!time) {
    unmatched.push({ id: m.id, title, reason: "No WR time" });
    continue;
  }
  let playerNames = clean(m.description.split("\n")[0]).split(
    /\s+&\s+|\s*\/\s*/,
  );
  for (let playerName of playerNames) {
    if (playerName.toLowerCase() === "nekozuki") playerName = "nekozuki";
    const pid = slug(playerName) || "unresolved-" + m.id.split("-").at(-1);
    let p = players.get(pid);
    if (!p) {
      p = {
        id: pid,
        name: playerName,
        country: m.images
          ?.find((i) => /^:flag_/.test(i.alt))
          ?.alt.replace(/:flag_|:/g, ""),
        avatar: null,
        records: [],
      };
      players.set(pid, p);
    }
    const sourceId = m.id.split("-").at(-1);
    const video = m.links.find((l) => clean(l.text) === "Video")?.href || null;
    const proofImage =
      m.links.find((l) => clean(l.text) === "Image")?.href || null;
    const r = {
      id: sourceId + (playerNames.length > 1 ? "-" + pid : ""),
      courseId: course.id,
      playerId: pid,
      time: time[1].replace(/^0(?=\d:)/, ""),
      timeCs:
        Number(time[1].split(":")[0]) * 6000 +
        Math.round(Number(time[1].split(":")[1]) * 100),
      achievedAt: null,
      datePrecision: "unknown",
      announcedAt: m.datetime,
      laps: null,
      mushrooms: null,
      video,
      proofImage,
      source: {
        url:
          "https://discord.com/channels/629221606064914442/896050730216095765/" +
          sourceId,
        channel: "wr-history",
        messageId: sourceId,
      },
      tourLabel: clean(m.footer),
      status: "announced",
      notes: [
        "Achievement date and intermediate progression require submission reconciliation.",
      ],
    };
    course.records.push(r);
    p.records.push(r.id);
    let trackImage = m.links.find(
      (l) => l.href.includes("mario.wiki.gallery") && l.href.includes("Icon_"),
    )?.href;
    if (trackImage) course.image = trackImage;
    const avatar = m.links.find(
      (l) =>
        /\/785146046216667146\/|\/961399464529125436\//.test(l.href) && !l.text,
    )?.href;
    if (avatar && !p.avatar) p.avatar = avatar;
  }
}
const imported = importSources(courses, players);
const reviewedVideoShares = fs.existsSync("archive/reviewed-video-share-events.json")
  ? JSON.parse(fs.readFileSync("archive/reviewed-video-share-events.json", "utf8")) : [];
const videoBackups = JSON.parse(fs.readFileSync("archive/video-backups.json", "utf8"));
const videoAttribution = JSON.parse(fs.readFileSync("archive/video-attribution.json", "utf8"));
const videoAvailability = fs.existsSync("archive/video-availability.json")
  ? JSON.parse(fs.readFileSync("archive/video-availability.json", "utf8")) : {};
const visuallyVerifiedVideos = new Set(JSON.parse(fs.readFileSync("archive/curated-runs.json", "utf8"))
  .filter(r => r.videoVerified && r.video)
  .map(r => `${r.courseId}:${centiseconds(r.time)}:${videoKey(r.video)}`));
const videoMetadata = fs.existsSync("archive/video-metadata.json")
  ? JSON.parse(fs.readFileSync("archive/video-metadata.json"))
  : {};
let videoTitleMismatches = 0;
for (const c of courses) {
  c.candidates = c.records.filter(
    (r) => !["announced", "community-wr", "leaderboard-wr"].includes(r.status),
  );
  c.records = c.records.filter((r) =>
    ["announced", "community-wr", "leaderboard-wr"].includes(r.status),
  );
  const distinct = new Map();
  for (const r of c.records.sort((a, b) =>
    (a.announcedAt || a.achievedAt || a.submittedAt || "9999").localeCompare(b.announcedAt || b.achievedAt || b.submittedAt || "9999"),
  )) {
    const key = `${r.playerId}:${r.timeCs}`;
    const previous = distinct.get(key);
    if (previous)
      previous.additionalSources = [
        ...(previous.additionalSources || []),
        r.source,
        ...(r.additionalSources || []),
      ];
    else distinct.set(key, r);
  }
  c.records = [...distinct.values()];
  for (const r of [...c.records, ...c.submissions]) {
    mergeRecordingShareEvents(r, c.submissions);
    attachReviewedVideoShares(c, r, reviewedVideoShares);
    const attribution = videoAttribution[videoKey(r.video)];
    if (attribution && !attribution.playerIds.includes(r.playerId)) {
      r.videoReference = r.video;
      r.videoRejection = { url: r.video, reason: attribution.reason, source: attribution.source };
      r.video = null;
      delete r.videoVerified;
      delete r.videoBackup;
      r.notes = [...(r.notes || []), attribution.reason];
    }
    if (visuallyVerifiedVideos.has(`${c.id}:${r.timeCs}:${videoKey(r.video)}`)) r.videoVerified = true;
    const backup = videoBackups[videoKey(r.video)];
    if (backup?.status === "available") r.videoBackup = backup;
    const availability = videoAvailability[videoKey(r.video)];
    if (availability) r.videoAvailability = availability.status;
    const metadata = videoMetadata[r.video];
    if (!metadata) continue;
    const times = [
      ...(metadata.title || "").matchAll(
        /(?<!\d)(\d{1,2}[:'’]\d{2}[.,:]\d{2})(?!\d)/g,
      ),
    ].map((m) => centiseconds(m[1].replace(/['’]/g, ":").replace(",", ".")));
    r.videoAudit = {
      title: metadata.title || null,
      status: metadata.error
        ? "metadata-unavailable"
        : times.length
          ? times.includes(r.timeCs)
            ? "title-time-matches"
            : "title-time-mismatch"
          : "title-has-no-time",
    };
    if (r.videoAudit.status === "title-time-mismatch") {
      r.videoReference = r.video;
      r.video = null;
      r.notes.push(
        "Linked video title gives a different time: " +
          metadata.title +
          ". Link withheld pending visual verification.",
      );
      videoTitleMismatches++;
    }
  }
  c.records.sort((a, b) => (a.announcedAt || a.achievedAt || a.submittedAt || "9999").localeCompare(b.announcedAt || b.achievedAt || b.submittedAt || "9999"));
  c.appearances.sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const r of c.records) {
    if (r.video && mediaKind(r.video) !== "video") {
      if (mediaKind(r.video) === "image") r.proofImage ||= r.video;
      else r.mediaReference = r.video;
      r.video = null;
    }
    r.proofUploadedAt ||= attachmentDate(r.proofImage);
    const range = r.tourLabel?.match(
      /(\d{1,2})\/(\d{1,2})\/(\d{2})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{2})/,
    );
    r.tourDateRange = range
      ? {
          start: `20${range[3]}-${range[2].padStart(2, "0")}-${range[1].padStart(2, "0")}`,
          end: `20${range[6]}-${range[5].padStart(2, "0")}-${range[4].padStart(2, "0")}`,
        }
      : r.tourDateRange || null;
    const inRecordTour = (value) => timestampWithinTour(value, r.tourDateRange);
    const submissionDate = inRecordTour(r.submittedAt)
      ? r.submittedAt?.slice(0, 10)
      : null;
    const uploadDate = inRecordTour(r.proofUploadedAt)
      ? r.proofUploadedAt?.slice(0, 10)
      : null;
    const screenshotDate = r.dateUnresolved ? screenshotPublicationDate(r) : null;
    r.recordDate = r.dateOverride?.date || screenshotDate || (r.dateUnresolved ? null : submissionDate || r.achievedAt || uploadDate || null);
    r.dateBasis = r.dateOverride?.date ? "documented-date-override" : screenshotDate ? "first-screenshot-publication" : r.dateUnresolved ? null : submissionDate
      ? "submission-date"
      : r.achievedAt
        ? "source-date"
        : uploadDate
          ? "proof-upload-date"
          : null;
  }
  recomputeRecordDurations(c);
  c.current = c.records.length
    ? c.records.reduce((a, b) => (a.timeCs <= b.timeCs ? a : b))
    : null;
  c.currentHolders = c.records.filter(
    (r, i, all) =>
      r.timeCs === c.current?.timeCs &&
      all.findIndex(
        (n) => n.timeCs === r.timeCs && n.playerId === r.playerId,
      ) === i,
  );
  c.records.sort(
    (a, b) =>
      (a.recordDate || a.chronologyDate || a.tourDateRange?.end || a.announcedAt).slice(0, 10).localeCompare(
        (b.recordDate || b.chronologyDate || b.tourDateRange?.end || b.announcedAt).slice(0, 10),
      ) || b.timeCs - a.timeCs,
  );
}
for (const p of players.values())
  p.records = courses.flatMap((c) =>
    c.records.filter((r) => r.playerId === p.id).map((r) => r.id),
  );
courses.sort((a, b) =>
  a.sortName.localeCompare(b.sortName, "en", { numeric: true }),
);
const manifest = {
  schemaVersion: 1,
  ...imported,
  videoTitleMismatches,
  updatedAt: new Date().toISOString(),
  status: "in-progress",
  courseCount: courses.length,
  announcementCount: courses.reduce((s, c) => s + c.records.length, 0),
  playerCount: players.size,
  sourceMessageCount: sourceMessages.size,
  unmatchedCount: unmatched.length,
  coverageNote:
    "Research in progress. WR announcements are preserved; dates, lap splits and intermediate records are still being reconciled against submissions. These are best archived times, not a claim of complete history.",
  sources: [
    {
      name: "Mario Kart Tour Course Leaderboard workbook",
      url: "https://docs.google.com/spreadsheets/d/1fTkcCluvL4frXvvFw4qBvkHBpj7mVtw7sCgDs6TGGno/edit#gid=876753249",
    },
    {
      name: "MKCentral Discord",
      url: "https://discord.com/channels/629221606064914442/896050730216095765",
    },
    {
      name: "Super Mario Wiki — Time Trial",
      url: "https://www.mariowiki.com/Time_Trial_(Mario_Kart_Tour)",
    },
    {
      name: "Super Mario Wiki — Tours",
      url: "https://www.mariowiki.com/List_of_tours_in_Mario_Kart_Tour",
    },
  ],
};
const assetMap = fs.existsSync("archive/assets-manifest.json")
  ? JSON.parse(fs.readFileSync("archive/assets-manifest.json"))
  : {};
// Discord rotates signed query parameters. A preserved original attachment is
// still the same proof when a different capture has a renewed download URL.
const attachmentKey = (url) => {
  try {
    const parsed = new URL(url);
    return ["cdn.discordapp.com", "media.discordapp.net"].includes(parsed.hostname)
      ? parsed.pathname.match(/^\/attachments\/\d+\/(\d+)\//)?.[1]
      : null;
  } catch { return null; }
};
const attachmentAssets = new Map(Object.entries(assetMap)
  .filter(([url, asset]) => attachmentKey(url) && asset.path)
  .map(([url, asset]) => [attachmentKey(url), asset.path]));
for (const c of courses) {
  if (assetMap[c.image]?.error && c.fallbackImage) c.image = c.fallbackImage;
  if (assetMap[c.image]?.path) {
    c.imageSource = c.image;
    c.image = assetMap[c.image].path;
  }
  for (const r of [...c.records, ...c.submissions]) {
    const path = assetMap[r.proofImage]?.path || attachmentAssets.get(attachmentKey(r.proofImage));
    if (path) r.proofImageLocal = path;
    if (!path && assetMap[r.proofImage]?.availability === "unavailable") r.proofImageAvailability = "unavailable";
  }
}
const portraits = fs.existsSync("archive/player-portraits.json")
  ? JSON.parse(fs.readFileSync("archive/player-portraits.json")) : {};
for (const p of players.values()) {
  const portrait = portraits[p.id];
  if (portrait?.path && portrait.discordId === p.discordId) {
    p.avatarSource = portrait.url;
    p.avatar = portrait.path;
  } else if (p.avatar && p.discordId && !p.avatar.includes(`/avatars/${p.discordId}/`)) {
    // An alias alone cannot establish ownership of a different Discord account.
    p.avatar = null;
  }
}
for (const p of players.values())
  if (assetMap[p.avatar]?.path) {
    p.avatarSource = p.avatar;
    p.avatar = assetMap[p.avatar].path;
  }
for (const p of players.values()) {
  if (p.avatar && !p.avatar.startsWith("/assets/players/")) {
    p.avatarSource = p.avatar;
    p.avatar = null;
  }
}
function recomputeRecordDurations(c) {
  for (const r of c.records) {
    const later = c.records.filter((n) => n.timeCs < r.timeCs);
    // Position an undated intermediate WR before its dated successor in the
    // same tour. This is an ordering anchor, never an achievement date.
    delete r.chronologyDate;
    if (!r.recordDate && r.tourDateRange) {
      const nextDate = later.filter(n => n.recordDate && timestampWithinTour(
        n.submittedAt || `${n.recordDate}T12:00:00Z`, r.tourDateRange,
      )).map(n => n.recordDate).sort()[0];
      if (nextDate) r.chronologyDate = nextDate;
    }
    const nextTime = Math.max(...later.map((n) => n.timeCs));
    const nextRecords = later.filter((n) => n.timeCs === nextTime);
    // An undated successor does end the reign, but its date remains unknown.
    r.durationEnd = nextRecords.length
      ? (nextRecords.every(n => n.recordDate && !n.dateUnresolved && !n.delayedSubmission)
        ? nextRecords.map(n => n.recordDate).sort()[0]
        : null)
      : new Date().toISOString().slice(0, 10);
    r.durationDays =
      r.recordDate && !r.dateUnresolved && !r.delayedSubmission && !r.reignUnresolved && nextRecords.every((n) => n.recordDate && !n.dateUnresolved && !n.delayedSubmission)
        ? playableDays(
            r.recordDate,
            nextRecords.map((n) => n.recordDate).sort()[0] ||
              new Date().toISOString().slice(0, 10),
            c.appearances.map((a) => ({ start: a.startDate, end: a.endDate })),
          )
        : null;
    r.durationBasis =
      r.durationDays === null
        ? (r.reignUnresolved
          ? "Faster preserved evidence disputes the end of this reign; duration is unresolved."
          : r.delayedSubmission || nextRecords.some((n) => n.delayedSubmission)
          ? "Achievement date is unknown for a delayed submission; reign duration is unresolved."
          : null)
        : "documented dates; chronology incomplete";
    r.durationIntervals =
      r.durationDays === null
        ? null
        : c.appearances
            .map((a) => ({
              start: a.startDate > r.recordDate ? a.startDate : r.recordDate,
              end: a.endDate < r.durationEnd ? a.endDate : r.durationEnd,
            }))
            .filter((a) => a.start < a.end);
  }
}
// This review identifies accepted replacement/repeated receipts for already archived performances.
const newYear2024Receipts = {"discord-1191563961179590837": {"wrId": "curated-1191562870442446970-newyear2024-image-reviewed", "time": "1:28.37"}, "discord-1192472098942226492": {"wrId": "curated-1192472083419115580-newyear2024-image-reviewed", "time": "1:28.33"}, "discord-1192481107824889856": {"wrId": "curated-1192481093878824960-newyear2024-image-reviewed", "time": "1:28.29"}, "discord-1192771775981961276": {"wrId": "curated-1192770551832383549-newyear2024-image-reviewed", "time": "1:28.18"}};
const newYear2024Pps = courses.find(c => c.id === "3ds-piranha-plant-slide");
for (const [id, match] of Object.entries(newYear2024Receipts)) {
  const receipt = [...newYear2024Pps.candidates, ...newYear2024Pps.submissions].find(r => r.id === id);
  if (!receipt) continue;
  const wr = newYear2024Pps.records.find(r => r.id === match.wrId);
  if (!wr || receipt.time !== match.time || receipt.timeCs !== wr.timeCs || receipt.playerId !== wr.playerId) throw Error("Reviewed receipt mismatch: " + id);
  newYear2024Pps.candidates = newYear2024Pps.candidates.filter(r => r.id !== id);
  newYear2024Pps.submissions = newYear2024Pps.submissions.filter(r => r.id !== id);
  newYear2024Pps.submissions.push({...receipt, status: "matched-existing-wr-receipt", includeInProgression: false,
    recordDate: receipt.submittedAt.slice(0,10), dateBasis: "original-post-submission-date", dateUnresolved: false,
    matchedExistingWrId: match.wrId, receiptReviewAudit: "archive/newyear2024-posted-results-and-video-receipt-reconciliation-20261015.json",
    evidenceNote: "Accepted receipt for an already archived result. Preserved as source evidence, without a separate WR or performance."});
}
const mario2024Receipts={"discord-1215953595531526174":"curated-1215953583866908763-mario2024-image-reviewed","discord-1216384297141932064":"curated-1216384287402889268-mario2024-image-reviewed"};
const mario2024Luigi=courses.find(c=>c.id==="n64-luigi-raceway");
for(const [id,wrId] of Object.entries(mario2024Receipts)) {
 const receipt=[...mario2024Luigi.candidates,...mario2024Luigi.submissions].find(r=>r.id===id),wr=mario2024Luigi.records.find(r=>r.id===wrId);
 if(!receipt) continue;
 if(!wr || receipt.timeCs!==wr.timeCs || receipt.playerId!==wr.playerId) throw Error("Mario 2024 receipt mismatch: "+id);
 mario2024Luigi.candidates=mario2024Luigi.candidates.filter(r=>r.id!==id);mario2024Luigi.submissions=mario2024Luigi.submissions.filter(r=>r.id!==id);
 mario2024Luigi.submissions.push({...receipt,status:"matched-existing-wr-receipt",includeInProgression:false,recordDate:receipt.submittedAt.slice(0,10),dateBasis:"original-post-submission-date",dateUnresolved:false,matchedWrId:wrId});
}

const ninja2024Rainbow=courses.find(c=>c.id==="wii-rainbow-road");
const ninja2024ReceiptId="discord-1223547992510955562";
const ninja2024Receipt=[...ninja2024Rainbow.candidates,...ninja2024Rainbow.submissions].find(r=>r.id===ninja2024ReceiptId);
const ninja2024Result=ninja2024Rainbow.submissions.find(r=>r.id==="curated-1223547981308104745-ninja2024-image-reviewed");
if(ninja2024Receipt) {
 if(!ninja2024Result || ninja2024Receipt.timeCs!==ninja2024Result.timeCs || ninja2024Receipt.playerId!==ninja2024Result.playerId) throw Error("Ninja 2024 receipt mismatch");
 ninja2024Rainbow.candidates=ninja2024Rainbow.candidates.filter(r=>r.id!==ninja2024ReceiptId);ninja2024Rainbow.submissions=ninja2024Rainbow.submissions.filter(r=>r.id!==ninja2024ReceiptId);
 ninja2024Rainbow.submissions.push({...ninja2024Receipt,status:"matched-existing-documented-result-receipt",includeInProgression:false,recordDate:ninja2024Receipt.submittedAt.slice(0,10),dateBasis:"original-post-submission-date",dateUnresolved:false,matchedSubmissionId:ninja2024Result.id});
}

const spring2024Rainbow=courses.find(c=>c.id==="athens-dash-2");
const spring2024ReceiptId="discord-1232671283821412372";
const spring2024Receipt=[...spring2024Rainbow.candidates,...spring2024Rainbow.submissions].find(r=>r.id===spring2024ReceiptId);
const spring2024Result=spring2024Rainbow.records.find(r=>r.id==="curated-1232671276146098277-spring2024-image-reviewed");
if(spring2024Receipt) {
 if(!spring2024Result || spring2024Receipt.timeCs!==spring2024Result.timeCs || spring2024Receipt.playerId!==spring2024Result.playerId) throw Error("Spring 2024 receipt mismatch");
 spring2024Rainbow.candidates=spring2024Rainbow.candidates.filter(r=>r.id!==spring2024ReceiptId);spring2024Rainbow.submissions=spring2024Rainbow.submissions.filter(r=>r.id!==spring2024ReceiptId);
 spring2024Rainbow.submissions.push({...spring2024Receipt,status:"matched-existing-wr-receipt",includeInProgression:false,recordDate:spring2024Receipt.submittedAt.slice(0,10),dateBasis:"original-post-submission-date",dateUnresolved:false,matchedWrId:spring2024Result.id});
}

const bowser2024Kd2r=courses.find(c=>c.id==="n64-kalimari-desert-2r");
const bowser2024Receipt=bowser2024Kd2r.submissions.find(r=>r.id==="discord-1237159533692981328");
const bowser2024Result=bowser2024Kd2r.submissions.find(r=>r.id==="curated-1237060040289161246-bowser2024-image-reviewed");
if(bowser2024Receipt) {
 if(!bowser2024Result || bowser2024Receipt.timeCs!==bowser2024Result.timeCs || bowser2024Receipt.playerId!==bowser2024Result.playerId) throw Error("Bowser 2024 no-item receipt mismatch");
 Object.assign(bowser2024Receipt,{status:"matched-existing-documented-result-receipt",includeInProgression:false,recordDate:bowser2024Receipt.submittedAt.slice(0,10),dateBasis:"original-post-submission-date",dateUnresolved:false,matchedSubmissionId:bowser2024Result.id});
}
const publicationPatches = JSON.parse(fs.readFileSync("scripts/reviewed-publication-field-patches.json", "utf8"));
for (const preserved of publicationPatches.preservedRows || []) {
  const rows = courses.find(c => c.id === preserved.courseId)?.[preserved.collection];
  if (!rows) throw Error("Preserved collection missing: " + preserved.courseId);
  if (!rows.some(r => r.id === preserved.row.id)) rows.push({...preserved.row});
}
const spring2024PublicationPreservation=JSON.parse(fs.readFileSync("scripts/spring2024-publication-preservation.json","utf8"));
const spring2024PreservedCourse=courses.find(c=>c.id===spring2024PublicationPreservation.courseId);
const spring2024DeferredIds=new Set(spring2024PublicationPreservation.deferredNewFutureRows);
for(const collection of ["records","submissions","candidates"]) spring2024PreservedCourse[collection]=spring2024PreservedCourse[collection].filter(r=>!spring2024DeferredIds.has(r.id));
for(const original of spring2024PublicationPreservation.preservedFutureCandidates) {
 for(const collection of ["records","submissions","candidates"]) spring2024PreservedCourse[collection]=spring2024PreservedCourse[collection].filter(r=>r.id!==original.id);
 spring2024PreservedCourse.candidates.push({...original});
}
const bowser2024PublicationPreservation=JSON.parse(fs.readFileSync("scripts/bowser2024-publication-preservation.json","utf8"));
const bowser2024PreservedCourse=courses.find(c=>c.id===bowser2024PublicationPreservation.courseId);
const bowser2024DeferredIds=new Set(bowser2024PublicationPreservation.deferredNewFutureRows);
for(const collection of ["records","submissions","candidates"]) bowser2024PreservedCourse[collection]=bowser2024PreservedCourse[collection].filter(r=>!bowser2024DeferredIds.has(r.id));
for(const original of bowser2024PublicationPreservation.preservedFutureCandidates) {
 for(const collection of ["records","submissions","candidates"]) bowser2024PreservedCourse[collection]=bowser2024PreservedCourse[collection].filter(r=>r.id!==original.id);
 bowser2024PreservedCourse.candidates.push({...original});
}
const mii2024PublicationPreservation=JSON.parse(fs.readFileSync("scripts/mii2024-publication-preservation.json","utf8"));
const mii2024DeferredIds=new Set(mii2024PublicationPreservation.deferredNewRows);
for(const c of courses) for(const collection of ["records","submissions","candidates"]) c[collection]=(c[collection]||[]).filter(r=>!mii2024DeferredIds.has(r.id));
for(const p of mii2024PublicationPreservation.preservedRows) {
 const c=courses.find(c=>c.id===p.courseId);
 for(const collection of ["records","submissions","candidates"]) c[collection]=c[collection].filter(r=>r.id!==p.row.id);
 c[p.collection].push(structuredClone(p.row));
}
// Keep reviewed Spring 2025 sources after older future-row deferrals.
for (const preserved of publicationPatches.preservedRows || []) {
  if (preserved.row.canonicalSourceReviewAudit !== "archive/spring2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/bowser2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/mii2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/princess2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/marioluigi2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/night2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/pipe2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/sunshine2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/vacation2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/summer2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/sundae2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/anniversary2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/summer2026-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/sundae2026-posted-results-and-source-clock-reconciliation-20261016.json" && preserved.row.receiptSourceReviewAudit !== "archive/spring2025-edited-receipt-source-dispositions-20261015.json") continue;
  const rows = courses.find(c=>c.id===preserved.courseId)?.[preserved.collection];
  if (rows && !rows.some(r=>r.id===preserved.row.id)) rows.push(structuredClone(preserved.row));
}
applyReviewedPublicationPatches(courses, publicationPatches);
// Account corrections run after source import; keep the stable WR ID credited to its reviewed owner.
for (const patch of publicationPatches.rows || []) {
  if (patch.collection !== "records" || !patch.set?.playerId || patch.set.playerId === patch.playerId) continue;
  const row = courses.find(c => c.id === patch.courseId)?.records.find(r => r.id === patch.id);
  if (row?.playerId !== patch.set.playerId) throw Error("Reviewed record owner mismatch: " + patch.id);
  const previous = players.get(patch.playerId), owner = players.get(row.playerId);
  if (!owner) throw Error("Reviewed record owner missing: " + row.playerId);
  if (previous) previous.records = previous.records.filter(id => id !== row.id);
  owner.records = [...new Set([...owner.records, row.id])];
}
for (const courseId of new Set((publicationPatches.rows || []).filter(p => p.collection === "records" && p.set?.playerId && p.set.playerId !== p.playerId).map(p => p.courseId))) {
  recomputeRecordDurations(courses.find(c => c.id === courseId));
}
// Keep reviewed submission clocks after the historical Squeaky Clean Sprint owner correction.
const vacation2024Sprint = courses.find(c => c.id === "squeaky-clean-sprint");
for (const id of ["curated-1271070148345856111-vacation2024-image-reviewed", "curated-1272179508409012254-vacation2024-image-reviewed", "1279827694330187799"]) {
  const row = vacation2024Sprint.records.find(r => r.id === id);
  if (!row?.submittedAt || row.recordDate !== row.submittedAt.slice(0, 10)) throw Error("Vacation 2024 submission-clock mismatch: " + id);
  row.chronologyDate = row.submittedAt;
}
// The reviewed closing submission fixes the successor date for these two reigns.
const space2024Kd2 = courses.find(c => c.id === "n64-kalimari-desert-2");
const space2024DurationRows = ["1068224230715559956", "1204260087687024680"].map(id => space2024Kd2.records.find(r => r.id === id));
if (space2024DurationRows.some(r => !r) || space2024DurationRows[0].timeCs !== 6336 || space2024DurationRows[1].recordDate !== "2024-01-24") throw Error("Space 2024 duration source mismatch");
recomputeRecordDurations({records: space2024DurationRows, appearances: space2024Kd2.appearances});
space2024DurationRows[1].chronologyDate = space2024DurationRows[1].submittedAt;
const winter2024Tokyo = courses.find(c => c.id === "tokyo-blur-4");
const winter2024DurationRows = ["1074903169542389840", "1209624145000792084"].map(id => winter2024Tokyo.records.find(r => r.id === id));
if (winter2024DurationRows.some(r => !r) || winter2024DurationRows[0].timeCs !== 4594 || winter2024DurationRows[1].recordDate !== "2024-02-06") throw Error("Winter 2024 duration source mismatch");
recomputeRecordDurations({records: winter2024DurationRows, appearances: winter2024Tokyo.appearances});
winter2024DurationRows[1].chronologyDate = winter2024DurationRows[1].submittedAt;
const exploration2024Cove = courses.find(c => c.id === "piranha-plant-cove"), exploration2024Cove2 = courses.find(c => c.id === "piranha-plant-cove-2");
const exploration2024Carried = exploration2024Cove.records.find(r => r.id === "1078514612225441792");
const exploration2024DurationRows = ["1078515335923257476", "1215068996248936541"].map(id => exploration2024Cove2.records.find(r => r.id === id));
if (!exploration2024Carried || exploration2024Carried.timeCs !== 6846 || exploration2024DurationRows.some(r => !r) || exploration2024DurationRows[1].recordDate !== "2024-02-12") throw Error("Exploration 2024 duration source mismatch");
recomputeRecordDurations({records:[exploration2024Carried], appearances:exploration2024Cove.appearances});
recomputeRecordDurations({records:exploration2024DurationRows, appearances:exploration2024Cove2.appearances});
exploration2024DurationRows[1].chronologyDate = exploration2024DurationRows[1].submittedAt;

const doctor2024Pgr = courses.find(c => c.id === "ds-peach-gardens-r"), doctor2024Sky = courses.find(c => c.id === "gba-sky-garden");
const doctor2024PgrRows = ["1084274701741862943", "1219694565657804833"].map(id => doctor2024Pgr.records.find(r => r.id === id));
const doctor2024SkyRows = ["1084274769643454484", "1219694774953443399"].map(id => doctor2024Sky.records.find(r => r.id === id));
const doctor2024Successor = doctor2024Sky.records.find(r => r.id === "1480018610201301063");
if (doctor2024PgrRows.some(r => !r) || doctor2024PgrRows[1].recordDate !== "2024-03-06" || doctor2024SkyRows.some(r => !r) || doctor2024SkyRows[1].recordDate !== "2024-03-01" || doctor2024Successor?.recordDate !== "2026-02-26" || doctor2024Successor?.timeCs !== 6385) throw Error("Doctor 2024 duration source mismatch");
recomputeRecordDurations({records:doctor2024PgrRows, appearances:doctor2024Pgr.appearances});
// The later record supplies only the known reign boundary; its evidence stays unchanged.
recomputeRecordDurations({records:[...doctor2024SkyRows, {...doctor2024Successor}], appearances:doctor2024Sky.appearances});
for (const r of [...doctor2024PgrRows, ...doctor2024SkyRows]) r.chronologyDate = r.submittedAt;

// The recurring wiki entry reuses a 2022 page title; label this reviewed appearance by its actual year.
const peachBowser2023 = tours.find(t => t.id === "tour-110" && t.startDate === "2023-11-29");
if (peachBowser2023) peachBowser2023.name = "Peach vs. Bowser Tour (2023)";
const holiday2023 = tours.find(t => t.id === "tour-111" && t.startDate === "2023-12-13");
if (holiday2023) holiday2023.name = "Holiday Tour (2023)";
const newYear2024 = tours.find(t => t.id === "tour-112" && t.startDate === "2023-12-27");
if (newYear2024) newYear2024.name = "New Year's Tour (2024)";
const space2024 = tours.find(t => t.id === "tour-113" && t.startDate === "2024-01-10");
if (space2024) space2024.name = "Space Tour (2024)";
const winter2024 = tours.find(t => t.id === "tour-114" && t.startDate === "2024-01-24");
if (winter2024) winter2024.name = "Winter Tour (2024)";
const exploration2024 = tours.find(t => t.id === "tour-115" && t.startDate === "2024-02-07");
if (exploration2024) exploration2024.name = "Exploration Tour (2024)";
const doctor2024 = tours.find(t => t.id === "tour-116" && t.startDate === "2024-02-21");
if (doctor2024) doctor2024.name = "Doctor Tour (2024)";
const mario2024=tours.find(t=>t.id==="tour-117" && t.startDate==="2024-03-06");
if(mario2024) mario2024.name="Mario Tour (2024)";
const ninja2024=tours.find(t=>t.id==="tour-118" && t.startDate==="2024-03-20");
if(ninja2024) ninja2024.name="Ninja Tour (2024)";
const yoshi2024=tours.find(t=>t.id==="tour-119" && t.startDate==="2024-04-03");
if(yoshi2024) yoshi2024.name="Yoshi Tour (2024)";
const spring2024=tours.find(t=>t.id==="tour-120" && t.startDate==="2024-04-17");
if(spring2024) spring2024.name="Spring Tour (2024)";
const bowser2024=tours.find(t=>t.id==="tour-121" && t.startDate==="2024-05-01");
if(bowser2024) bowser2024.name="Bowser Tour (2024)";
const mii2024=tours.find(t=>t.id==="tour-122" && t.startDate==="2024-05-15");
if(mii2024) mii2024.name="Mii Tour (2024)";
const princess2024=tours.find(t=>t.id==="tour-123" && t.startDate==="2024-05-29");
if(princess2024) princess2024.name="Princess Tour (2024)";
const marioluigi2024=tours.find(t=>t.id==="tour-124" && t.startDate==="2024-06-12");
if(marioluigi2024) marioluigi2024.name="Mario vs. Luigi Tour (2024)";
const night2024=tours.find(t=>t.id==="tour-125" && t.startDate==="2024-06-26");
if(night2024) night2024.name="Night Tour (2024)";
const pipe2024=tours.find(t=>t.id==="tour-126" && t.startDate==="2024-07-10");
if(pipe2024) pipe2024.name="Pipe Tour (2024)";
const sunshine2024=tours.find(t=>t.id==="tour-127" && t.startDate==="2024-07-24");
if(sunshine2024) sunshine2024.name="Sunshine Tour (2024)";
const vacation2024=tours.find(t=>t.id==="tour-128" && t.startDate==="2024-08-07");
if(vacation2024) vacation2024.name="Vacation Tour (2024)";
const summer2024=tours.find(t=>t.id==="tour-129" && t.startDate==="2024-08-21");
if(summer2024) summer2024.name="Summer Tour (2024)";
const sundae2024=tours.find(t=>t.id==="tour-130" && t.startDate==="2024-09-04");
if(sundae2024) sundae2024.name="Sundae Tour (2024)";
const anniversary2024=tours.find(t=>t.id==="tour-131" && t.startDate==="2024-09-18");
if(anniversary2024) anniversary2024.name="Anniversary Tour (2024)";
const battle2024=tours.find(t=>t.id==="tour-132" && t.startDate==="2024-10-02");
if(battle2024) battle2024.name="Battle Tour (2024)";
const halloween2024=tours.find(t=>t.id==="tour-133" && t.startDate==="2024-10-16");
if(halloween2024) halloween2024.name="Halloween Tour (2024)";
const autumn2024=tours.find(t=>t.id==="tour-134" && t.startDate==="2024-10-30");
if(autumn2024) autumn2024.name="Autumn Tour (2024)";
const animal2024=tours.find(t=>t.id==="tour-135" && t.startDate==="2024-11-13");
if(animal2024) animal2024.name="Animal Tour (2024)";
const peachbowser2024=tours.find(t=>t.id==="tour-136" && t.startDate==="2024-11-27");
if(peachbowser2024) peachbowser2024.name="Peach vs. Bowser Tour (2024)";
const holiday2024=tours.find(t=>t.id==="tour-137" && t.startDate==="2024-12-11");
if(holiday2024) holiday2024.name="Holiday Tour (2024)";
const newyear2025=tours.find(t=>t.id==="tour-138" && t.startDate==="2024-12-25");
if(newyear2025) newyear2025.name="New Year Tour (2025)";
const space2025=tours.find(t=>t.id==="tour-139" && t.startDate==="2025-01-08");
if(space2025) space2025.name="Space Tour (2025)";
const winter2025=tours.find(t=>t.id==="tour-140" && t.startDate==="2025-01-22");
if(winter2025) winter2025.name="Winter Tour (2025)";
const exploration2025=tours.find(t=>t.id==="tour-141" && t.startDate==="2025-02-05");
if(exploration2025) exploration2025.name="Exploration Tour (2025)";
const doctor2025=tours.find(t=>t.id==="tour-142" && t.startDate==="2025-02-19");
if(doctor2025) doctor2025.name="Doctor Tour (2025)";
const mario2025=tours.find(t=>t.id==="tour-143" && t.startDate==="2025-03-05");
if(mario2025) mario2025.name="Mario Tour (2025)";
const ninja2025=tours.find(t=>t.id==="tour-144" && t.startDate==="2025-03-19");
if(ninja2025) ninja2025.name="Ninja Tour (2025)";
const yoshi2025=tours.find(t=>t.id==="tour-145" && t.startDate==="2025-04-02");
if(yoshi2025) yoshi2025.name="Yoshi Tour (2025)";
const spring2025=tours.find(t=>t.id==="tour-146" && t.startDate==="2025-04-16");
if(spring2025) spring2025.name="Spring Tour (2025)";
const bowser2025=tours.find(t=>t.id==="tour-147" && t.startDate==="2025-04-30");
if(bowser2025) bowser2025.name="Bowser Tour (2025)";
const mii2025=tours.find(t=>t.id==="tour-148" && t.startDate==="2025-05-14");
if(mii2025) mii2025.name="Mii Tour (2025)";
const princess2025=tours.find(t=>t.id==="tour-149" && t.startDate==="2025-05-28");
if(princess2025) princess2025.name="Princess Tour (2025)";
const marioluigi2025=tours.find(t=>t.id==="tour-150" && t.startDate==="2025-06-11");
if(marioluigi2025) marioluigi2025.name="Mario vs. Luigi Tour (2025)";
const night2025=tours.find(t=>t.id==="tour-151" && t.startDate==="2025-06-25");
if(night2025) night2025.name="Night Tour (2025)";
const pipe2025=tours.find(t=>t.id==="tour-152" && t.startDate==="2025-07-09");
if(pipe2025) pipe2025.name="Pipe Tour (2025)";
const sunshine2025=tours.find(t=>t.id==="tour-153" && t.startDate==="2025-07-23");
if(sunshine2025) sunshine2025.name="Sunshine Tour (2025)";
const vacation2025=tours.find(t=>t.id==="tour-154" && t.startDate==="2025-08-06");
if(vacation2025) vacation2025.name="Vacation Tour (2025)";
for (const c of courses) for (const r of c.records) {
  if (r.canonicalSourceReviewAudit === "archive/vacation2025-posted-results-and-source-clock-reconciliation-20261015.json" && r.submittedAt) r.chronologyDate = r.submittedAt;
}
const summer2025=tours.find(t=>t.id==="tour-155" && t.startDate==="2025-08-20");
if(summer2025) summer2025.name="Summer Tour (2025)";
for (const c of courses) for (const r of c.records) {
  if (r.canonicalSourceReviewAudit === "archive/summer2025-posted-results-and-source-clock-reconciliation-20261015.json" && r.submittedAt) r.chronologyDate = r.submittedAt;
}
const sundae2025=tours.find(t=>t.id==="tour-156" && t.startDate==="2025-09-03");
if(sundae2025) sundae2025.name="Sundae Tour (2025)";
for (const c of courses) for (const r of c.records) {
  if (r.canonicalSourceReviewAudit === "archive/sundae2025-posted-results-and-source-clock-reconciliation-20261015.json" && r.submittedAt) r.chronologyDate = r.submittedAt;
}
const anniversary2025=tours.find(t=>t.id==="tour-157" && t.startDate==="2025-09-17");
if(anniversary2025) anniversary2025.name="Anniversary Tour (2025)";
for (const c of courses) for (const r of c.records) {
  if (r.canonicalSourceReviewAudit === "archive/anniversary2025-posted-results-and-source-clock-reconciliation-20261015.json" && r.submittedAt) r.chronologyDate = r.submittedAt;
}
const battle2025=tours.find(t=>t.id==="tour-158" && t.startDate==="2025-10-01");
if(battle2025) battle2025.name="Battle Tour (2025)";
const halloween2025=tours.find(t=>t.id==="tour-159" && t.startDate==="2025-10-15");
if(halloween2025) halloween2025.name="Halloween Tour (2025)";
const autumn2025=tours.find(t=>t.id==="tour-160" && t.startDate==="2025-10-29");
if(autumn2025) autumn2025.name="Autumn Tour (2025)";
const animal2025=tours.find(t=>t.id==="tour-161" && t.startDate==="2025-11-12");
if(animal2025) animal2025.name="Animal Tour (2025)";
const peachbowser2025=tours.find(t=>t.id==="tour-162" && t.startDate==="2025-11-26");
if(peachbowser2025) peachbowser2025.name="Peach vs. Bowser Tour (2025)";
const holiday2025=tours.find(t=>t.id==="tour-163" && t.startDate==="2025-12-10");
if(holiday2025) holiday2025.name="Holiday Tour (2025)";
const newyear2026=tours.find(t=>t.id==="tour-164" && t.startDate==="2025-12-24");
if(newyear2026) newyear2026.name="New Year’s Tour (2026)";
const space2026=tours.find(t=>t.id==="tour-165" && t.startDate==="2026-01-07");
if(space2026) space2026.name="Space Tour (2026)";
// Keep this review’s complete source fields after legacy duration recomputation.
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>["1204260087687024680", "curated-1461938624667848734-space2026-image-reviewed", "curated-1462287115944726570-space2026-image-reviewed", "896340675723923526", "sheet-DJ10", "sheet-DJ11", "sheet-DJ31", "sheet-UJ13"].includes(p.id) && !p.remove)});
const winter2026=tours.find(t=>t.id==="tour-166" && t.startDate==="2026-01-21");
if(winter2026) winter2026.name="Winter Tour (2026)";
// Preserve the exact reviewed fields after legacy derived-field passes.
const winter2026ProtectedFields = new Set(["bangkok-rush-2|records|curated-1467422368933875793-winter2026-image-reviewed", "bangkok-rush-2|records|1472656439699968041", "bangkok-rush-2|submissions|curated-1465895461897506898-winter2026-image-reviewed", "bangkok-rush-2|submissions|curated-1467020861746712789-winter2026-image-reviewed", "bangkok-rush-2|submissions|curated-1467422368933875793-winter2026-image-reviewed", "bangkok-rush-2|submissions|curated-1467867212634394739-winter2026-image-reviewed", "bangkok-rush-2|submissions|curated-1468040071088181447-winter2026-image-reviewed", "bangkok-rush-2|submissions|curated-1468265343758635070-winter2026-image-reviewed", "bangkok-rush-2|submissions|curated-1468366545372844215-winter2026-image-reviewed", "singapore-speedway-r|submissions|curated-1464510154484613192-winter2026-image-reviewed", "singapore-speedway-r|submissions|curated-1464954551873437769-winter2026-image-reviewed", "singapore-speedway-r|submissions|curated-1465041780058624213-winter2026-image-reviewed", "singapore-speedway-r|submissions|curated-1465385372531036395-winter2026-image-reviewed", "singapore-speedway-r|submissions|curated-1465752215892267243-winter2026-image-reviewed", "singapore-speedway-r|submissions|curated-1468258651088359436-winter2026-image-reviewed", "tokyo-blur-4|records|1209624145000792084", "tokyo-blur-4|submissions|curated-1464492889190174740-winter2026-image-reviewed", "tokyo-blur-4|submissions|curated-1465385381485613178-winter2026-image-reviewed", "rmx-choco-island-1|submissions|curated-1463429780954415196-winter2026-image-reviewed"]);
applyReviewedPublicationPatches(courses, {rows:publicationPatches.rows.filter(p => !p.remove && winter2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const exploration2026=tours.find(t=>t.id==="tour-167" && t.startDate==="2026-02-04");
if(exploration2026) exploration2026.name="Exploration Tour (2026)";
// Retain exact reviewed source fields after legacy derived-field passes.
const exploration2026ProtectedFields = new Set(["piranha-plant-cove|records|1078514612225441792", "piranha-plant-cove|submissions|curated-1469546403041644556-exploration2026-image-reviewed", "piranha-plant-cove|submissions|curated-1472966097438511106-exploration2026-image-reviewed", "piranha-plant-cove|submissions|curated-1473470280402735145-exploration2026-image-reviewed", "piranha-plant-cove-2|records|1215068996248936541", "piranha-plant-cove-2|records|1480018371192819864-nekozuki", "piranha-plant-cove-2|submissions|curated-1470481005554040934-exploration2026-tie-image-reviewed", "piranha-plant-cove-2|submissions|curated-1470481005554040934-exploration2026-image-reviewed", "piranha-plant-cove-2|submissions|curated-1471421482243723387-exploration2026-image-reviewed", "piranha-plant-cove-2|submissions|curated-1472221889635160248-exploration2026-image-reviewed"]);
applyReviewedPublicationPatches(courses, {rows:publicationPatches.rows.filter(p => !p.remove && exploration2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const doctor2026ProtectedFields = new Set(["ds-peach-gardens-r|records|1219694565657804833", "ds-peach-gardens-r|submissions|curated-1473686562884812821-doctor2026-image-reviewed", "ds-peach-gardens-r|submissions|curated-1473997126982959357-doctor2026-image-reviewed", "ds-peach-gardens-r|submissions|curated-1474041552346288353-doctor2026-image-reviewed", "ds-peach-gardens-r|submissions|curated-1477063576102633563-doctor2026-image-reviewed", "ds-peach-gardens-r|submissions|curated-1477891221161775164-doctor2026-image-reviewed", "gba-sky-garden|records|1480018610201301063", "gba-sky-garden|submissions|curated-1473627473420877945-doctor2026-image-reviewed", "gba-sky-garden|submissions|curated-1476150467934556160-doctor2026-image-reviewed", "gba-sky-garden|submissions|curated-1476564112166355084-doctor2026-image-reviewed", "gba-sky-garden|submissions|curated-1476959828315345179-doctor2026-image-reviewed", "piranha-plant-cove|submissions|curated-1473627316004585494-doctor2026-image-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && doctor2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const doctor2026=tours.find(t=>t.id==="tour-168" && t.startDate==="2026-02-18");
if(doctor2026) doctor2026.name="Doctor Tour (2026)";
const mario2026ProtectedFields = new Set(["n64-luigi-raceway|records|1353222746787676162", "n64-luigi-raceway|records|1493428638119362741", "n64-luigi-raceway|submissions|curated-1479797483877044244-mario2026-1479797483491037386-image-reviewed", "n64-luigi-raceway|submissions|curated-1480097368333357238-mario2026-1480097367851274414-image-reviewed", "n64-luigi-raceway|submissions|curated-1480140171943874690-mario2026-1480140171520381070-image-reviewed", "n64-luigi-raceway|submissions|curated-1480143799844868226-mario2026-1480143799563845735-image-reviewed", "n64-luigi-raceway|submissions|curated-1480570165044445345-mario2026-1480570164679278693-image-reviewed", "n64-luigi-raceway|submissions|curated-1481272664902336666-mario2026-1481272664633905233-image-reviewed", "n64-luigi-raceway|submissions|curated-1481301078925639751-mario2026-1481301078606745670-image-reviewed", "n64-luigi-raceway|submissions|curated-1482205799873773742-mario2026-1482205799710330920-image-reviewed", "n64-luigi-raceway|submissions|curated-1482377782485844142-mario2026-1482377782175731904-image-reviewed", "n64-luigi-raceway|submissions|curated-1482632090955681923-mario2026-1482632090448039936-image-reviewed", "n64-luigi-raceway|submissions|curated-1483391842031763578-mario2026-1483391841809207397-image-reviewed", "n64-luigi-raceway|submissions|curated-1483457881432002640-mario2026-1483457881171824804-image-reviewed", "n64-luigi-raceway|submissions|curated-1483472471117004860-mario2026-1483472471473651914-image-reviewed", "n64-luigi-raceway|submissions|discord-1480570182207275215", "n64-luigi-raceway|submissions|discord-1481272681285550220", "n64-luigi-raceway|submissions|discord-1481301090074099753", "n64-luigi-raceway|submissions|discord-1482205813954052229", "n64-luigi-raceway|submissions|discord-1482377811393253556", "n64-luigi-raceway|submissions|discord-1482632107564994792", "n64-luigi-raceway|submissions|discord-1483457896942534746", "n64-luigi-raceway|submissions|discord-1483472491266441237", "n64-luigi-raceway|submissions|sheet-CWB18", "snes-donut-plains-3r|submissions|curated-1480804354020872302-mario2026-1480804353596981288-image-reviewed", "snes-donut-plains-3r|submissions|curated-1482643009647673364-mario2026-1482643009437827272-image-reviewed", "snes-donut-plains-3r|submissions|curated-1483391842031763578-mario2026-1483391841289371800-image-reviewed", "snes-donut-plains-3r|submissions|discord-1480804369124425768", "snes-donut-plains-3r|submissions|discord-1482643030954737735"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && mario2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const mario2026=tours.find(t=>t.id==="tour-169" && t.startDate==="2026-03-04");
if(mario2026) mario2026.name="Mario Tour (2026)";
const ninja2026ProtectedFields = new Set(["3ds-wario-shipyard|records|1493433079774052406", "3ds-wario-shipyard|submissions|curated-1487414970994917479-ninja2026-image-reviewed", "3ds-wario-shipyard|submissions|curated-1487425314769338459-ninja2026-image-reviewed", "3ds-wario-shipyard|submissions|curated-1488415940789014549-ninja2026-image-reviewed", "wii-rainbow-road|records|1229525362023858277", "wii-rainbow-road|submissions|curated-1487452068749901994-ninja2026-image-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && ninja2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const ninja2026=tours.find(t=>t.id==="tour-170" && t.startDate==="2026-03-18");
if(ninja2026) ninja2026.name="Ninja Tour (2026)";
const yoshi2026ProtectedFields = new Set(["gcn-yoshi-circuit|submissions|curated-1488861858445131796-yoshi2026-image-reviewed", "gcn-yoshi-circuit|submissions|curated-1488865392096182422-yoshi2026-image-reviewed", "gcn-yoshi-circuit|submissions|curated-1489282930818682880-yoshi2026-image-reviewed", "gcn-yoshi-circuit|submissions|curated-1490542768185933885-yoshi2026-image-reviewed", "gcn-yoshi-circuit|submissions|curated-1492189997510688958-yoshi2026-image-reviewed", "gcn-yoshi-circuit|submissions|curated-1493291319928422481-yoshi2026-image-reviewed", "gcn-yoshi-circuit|submissions|curated-1493958919754748016-spring2026-image-reviewed", "gcn-yoshi-circuit|submissions|discord-1493958935449702571", "snes-donut-plains-2r|submissions|curated-1489786404136554736-yoshi2026-image-reviewed", "snes-donut-plains-2r|submissions|curated-1490192630724956210-yoshi2026-image-reviewed", "snes-donut-plains-2r|submissions|curated-1491558923499470858-yoshi2026-image-reviewed", "snes-donut-plains-2r|submissions|curated-1492188968974815472-yoshi2026-image-reviewed", "snes-donut-plains-2r|submissions|curated-1493027134434971658-yoshi2026-image-reviewed", "snes-donut-plains-2r|submissions|curated-1493365973057671228-yoshi2026-image-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && yoshi2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const yoshi2026=tours.find(t=>t.id==="tour-171" && t.startDate==="2026-04-01");
if(yoshi2026) yoshi2026.name="Yoshi Tour (2026)";
const spring2026ProtectedFields = new Set(["athens-dash-2|records|1499955452476395591", "athens-dash-2|records|curated-1497616981036110044-spring2026-image-reviewed", "athens-dash-2|submissions|curated-1497616981036110044-spring2026-image-reviewed", "berlin-byways|submissions|curated-1493922855933448283-spring2026-image-reviewed", "berlin-byways|submissions|curated-1494874270839341159-spring2026-image-reviewed", "berlin-byways|submissions|curated-1495315927175135293-spring2026-image-reviewed", "berlin-byways|submissions|curated-1496111929247137953-spring2026-image-reviewed", "berlin-byways|submissions|curated-1498607954956652615-spring2026-image-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && spring2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const bowser2026ProtectedFields = new Set(["gba-bowser-s-castle-4|records|curated-1499045425800286360-bowser2026-kuri-video-reviewed", "gba-bowser-s-castle-4|records|1504286714137546803", "gba-bowser-s-castle-4|submissions|sheet-CYN11", "gba-bowser-s-castle-4|submissions|sheet-CYN12", "gba-bowser-s-castle-4|submissions|sheet-CYN13", "gba-bowser-s-castle-4|submissions|sheet-CYN15", "gba-bowser-s-castle-4|submissions|sheet-CYN16", "gba-bowser-s-castle-4|submissions|sheet-CYN18", "gba-bowser-s-castle-4|submissions|sheet-CYN19", "gba-bowser-s-castle-4|submissions|discord-1500107740151025674", "gba-bowser-s-castle-4|submissions|discord-1106178965829320746", "gba-bowser-s-castle-4|submissions|curated-1499045425800286360-bowser2026-kuri-video-reviewed", "gba-bowser-s-castle-4|candidates|sheet-CYN14", "gba-bowser-s-castle-4|candidates|sheet-CYN10", "n64-kalimari-desert-2r|records|896334182928760863", "n64-kalimari-desert-2r|submissions|sheet-CYV10", "n64-kalimari-desert-2r|submissions|sheet-CYV11", "n64-kalimari-desert-2r|submissions|sheet-CYV12", "n64-kalimari-desert-2r|submissions|curated-1502076731862028309-bowser2026-image-reviewed", "n64-kalimari-desert-2r|submissions|curated-1503518313274146938-bowser2026-image-reviewed", "n64-kalimari-desert-2r|submissions|curated-1503865862028001290-bowser2026-image-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && bowser2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const spring2026=tours.find(t=>t.id==="tour-172" && t.startDate==="2026-04-15");
if(spring2026) spring2026.name="Spring Tour (2026)";
const bowser2026=tours.find(t=>t.id==="tour-173" && t.startDate==="2026-04-29");
if(bowser2026) bowser2026.name="Bowser Tour (2026)";
const mii2026ProtectedFields = new Set(["gcn-mushroom-bridge|submissions|discord-1507666595500003419", "wii-maple-treeway-r|records|1407195549043654749", "wii-maple-treeway-r|submissions|sheet-CZL10", "wii-maple-treeway-r|submissions|sheet-CZL11", "wii-maple-treeway-r|submissions|sheet-CZL12", "wii-maple-treeway-r|submissions|sheet-CZL13", "wii-maple-treeway-r|submissions|curated-1373158670845608007-mii2025-image-reviewed", "gcn-mushroom-bridge|records|1114964088326471821", "gcn-mushroom-bridge|submissions|sheet-CZD10", "gcn-mushroom-bridge|submissions|sheet-CZD11", "gcn-mushroom-bridge|submissions|sheet-CZD12", "gcn-mushroom-bridge|submissions|sheet-CZD13", "gcn-mushroom-bridge|submissions|sheet-CZD14", "gcn-mushroom-bridge|submissions|sheet-CZD15"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && mii2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const mii2026=tours.find(t=>t.id==="tour-174" && t.startDate==="2026-05-13");
if(mii2026) mii2026.name="Mii Tour (2026)";
const princess2026ProtectedFields = new Set(["wii-coconut-mall|records|curated-1249676586463264841-princess2024-image-reviewed", "wii-coconut-mall|records|1252349131188469841", "wii-coconut-mall|submissions|sheet-CZT10", "wii-coconut-mall|submissions|sheet-CZT11", "wii-coconut-mall|submissions|sheet-CZT12", "wii-coconut-mall|submissions|sheet-CZT13", "gba-snow-land-r|records|1124182218407944233", "gba-snow-land-r|submissions|sheet-DAB10", "gba-snow-land-r|submissions|sheet-DAB11", "gba-snow-land-r|submissions|sheet-DAB12", "gba-snow-land-r|submissions|sheet-DAB13", "gba-snow-land-r|submissions|sheet-DAB14", "gba-snow-land-r|submissions|sheet-DAB15", "gba-snow-land-r|submissions|sheet-DAB16", "gba-snow-land-r|submissions|sheet-DAB17", "gba-snow-land-r|submissions|sheet-DAB18", "gba-snow-land-r|submissions|sheet-DAB19", "gba-snow-land-r|submissions|sheet-DAB20", "gba-snow-land-r|submissions|sheet-DAB21", "gba-snow-land-r|submissions|sheet-DAB22", "gba-snow-land-r|submissions|sheet-DAB23", "gba-snow-land-r|submissions|sheet-DAB24", "gba-snow-land-r|submissions|sheet-DAB25", "gba-snow-land-r|submissions|sheet-DAB26", "gba-snow-land-r|submissions|discord-1510588811837571103", "gba-snow-land-r|submissions|curated-1509341855009996892-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1509680395527000205-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1510312202089926788-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1510327143098351848-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1510588677565452381-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1511008662083207219-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1511152257771769866-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1511737993197785280-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513377801049477313-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513557216882331799-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513584148327960756-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513605447565705237-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513659651693084743-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513682145015759018-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513702712481677423-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513824395007627324-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513830945302777946-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513887465931411537-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513930061886128322-princess2026-image-reviewed", "gba-snow-land-r|submissions|curated-1513959192749412452-princess2026-image-reviewed", "wii-coconut-mall|submissions|curated-1510602847539167324-princess2026-image-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && princess2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const princess2026=tours.find(t=>t.id==="tour-175" && t.startDate==="2026-05-27");
if(princess2026) princess2026.name="Princess Tour (2026)";
const marioluigi2026ProtectedFields = new Set(["n64-luigi-raceway-r|records|curated-sucha-supplied-16vI7eIWw-4", "n64-luigi-raceway-r|records|1519703207725498580", "n64-luigi-raceway-r|submissions|sheet-DAJ10", "n64-luigi-raceway-r|submissions|sheet-DAJ11", "n64-luigi-raceway-r|submissions|sheet-DAJ12", "n64-luigi-raceway-r|submissions|sheet-DAJ13", "n64-luigi-raceway-r|submissions|sheet-DAJ14", "n64-luigi-raceway-r|submissions|sheet-DAJ15", "n64-luigi-raceway-r|submissions|sheet-DAJ16", "n64-luigi-raceway-r|submissions|sheet-DAJ17", "n64-luigi-raceway-r|submissions|discord-1514720092905275412", "n64-luigi-raceway-r|submissions|curated-1514720071665320096-mario-luigi2026-image-reviewed", "n64-luigi-raceway-r|submissions|curated-1515260632759533638-mario-luigi2026-image-reviewed", "n64-luigi-raceway-r|submissions|curated-1515502084273864754-mario-luigi2026-image-reviewed", "n64-luigi-raceway-r|submissions|curated-1515505475523711068-mario-luigi2026-image-reviewed", "n64-luigi-raceway-r|submissions|curated-1516248581634396300-mario-luigi2026-image-reviewed", "n64-luigi-raceway-r|submissions|curated-1516952861290795108-mario-luigi2026-image-reviewed", "n64-luigi-raceway-r|submissions|curated-1517491546805637172-mario-luigi2026-image-reviewed", "n64-luigi-raceway-r|submissions|curated-1518375701429092433-mario-luigi2026-image-reviewed", "n64-luigi-raceway-r|submissions|curated-1519122856150175794-mario-luigi2026-image-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && marioluigi2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const marioluigi2026=tours.find(t=>t.id==="tour-176" && t.startDate==="2026-06-10");
if(marioluigi2026) marioluigi2026.name="Mario vs. Luigi Tour (2026)";
const night2026ProtectedFields=new Set(["rome-avanti-2|submissions|sheet-BBP36", "rome-avanti-2|submissions|sheet-DBH10", "rome-avanti-2|submissions|sheet-DBH13", "singapore-speedway|submissions|curated-singapore-2022-935569331826348112", "singapore-speedway-2r|submissions|sheet-BSN17","rome-avanti-2|records|1130210516791464016", "rome-avanti-2|records|1264395735814635612", "rome-avanti-2|records|curated-1519289094734352494-night2026-image-reviewed", "rome-avanti-2|records|1524570791293751339", "rome-avanti-2|submissions|sheet-DBH11", "rome-avanti-2|submissions|sheet-DBH12", "rome-avanti-2|submissions|sheet-DBH14", "rome-avanti-2|submissions|sheet-DBH15", "rome-avanti-2|submissions|sheet-DBH16", "rome-avanti-2|submissions|discord-1520792723773325412", "rome-avanti-2|submissions|discord-1519289094734352494", "rome-avanti-2|submissions|curated-1519289094734352494-night2026-image-reviewed", "rome-avanti-2|submissions|curated-1519551629475578067-night2026-image-reviewed", "rome-avanti-2|submissions|curated-1519946136771760219-night2026-image-reviewed", "rome-avanti-2|submissions|curated-1520792723773325412-night2026-image-reviewed", "rome-avanti-2|submissions|curated-1521249962246275214-night2026-image-reviewed", "rome-avanti-2|submissions|curated-1522162938239258686-night2026-image-reviewed", "rome-avanti-2|submissions|curated-1524253489109270528-night2026-image-reviewed", "singapore-speedway|records|935931716575559721", "singapore-speedway|submissions|sheet-DAR10", "singapore-speedway|submissions|curated-1520168040766111765-night2026-image-reviewed", "singapore-speedway-2r|records|curated-1257277274265354242-night2024-image-reviewed", "singapore-speedway-2r|records|1264395851904585738", "singapore-speedway-2r|submissions|sheet-DAZ10", "singapore-speedway-2r|submissions|sheet-DAZ11", "singapore-speedway-2r|submissions|sheet-DAZ12", "singapore-speedway-2r|submissions|sheet-DAZ13", "singapore-speedway-2r|submissions|sheet-DAZ14", "singapore-speedway-2r|submissions|sheet-DAZ15", "singapore-speedway-2r|submissions|sheet-DAZ16", "singapore-speedway-2r|submissions|sheet-DAZ17", "singapore-speedway-2r|submissions|sheet-DAZ18", "singapore-speedway-2r|submissions|sheet-DAZ19", "singapore-speedway-2r|submissions|sheet-DAZ20", "singapore-speedway-2r|submissions|sheet-DAZ21", "singapore-speedway-2r|submissions|sheet-DAZ22", "singapore-speedway-2r|submissions|sheet-DAZ23", "singapore-speedway-2r|submissions|sheet-DAZ24", "singapore-speedway-2r|submissions|curated-1257277274265354242-night2024-image-reviewed", "singapore-speedway-2r|submissions|curated-1519275549229580389-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1519330955704275046-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1519333179536838787-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1519354298721374330-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1519433644245123254-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1519551460113907914-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1520023991899783168-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1520448223712383026-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1520562320948985868-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1521637387862540298-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1522207173478842398-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1522384693524168784-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1522586805093011536-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1523635246447198230-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1524132906065461438-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1524170790654840832-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-1524190773841625211-night2026-image-reviewed", "singapore-speedway-2r|submissions|curated-youtube-v-Nlgk0Oel0-singapore2r-original-video-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && night2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const night2026=tours.find(t=>t.id==="tour-177" && t.startDate==="2026-06-24");
if(night2026) night2026.name="Night Tour (2026)";
const pipe2026ProtectedFields=new Set(["wii-dry-dry-ruins|submissions|sheet-CKJ10", "wii-dry-dry-ruins|submissions|curated-1424767912450723910-battle2025-image-reviewed", "piranha-plant-cove-2r|records|curated-1524467417055494335-pipe2026-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1424767613367484472-battle2025-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1525926791217283244-pipe2026-discussion-image-reviewed","wii-dry-dry-ruins|submissions|sheet-DBP10", "wii-dry-dry-ruins|submissions|sheet-DBP12", "wii-dry-dry-ruins|submissions|sheet-DBP13", "wii-dry-dry-ruins|submissions|sheet-DBP14", "wii-dry-dry-ruins|submissions|sheet-DBP15", "wii-dry-dry-ruins|submissions|sheet-DBP16", "wii-dry-dry-ruins|submissions|sheet-DBP17", "wii-dry-dry-ruins|submissions|sheet-DBP18", "wii-dry-dry-ruins|submissions|sheet-DBP19", "wii-dry-dry-ruins|submissions|sheet-DBP20", "wii-dry-dry-ruins|submissions|sheet-DBP21", "wii-dry-dry-ruins|submissions|sheet-DBP22", "wii-dry-dry-ruins|submissions|sheet-DBP23", "wii-dry-dry-ruins|submissions|sheet-DBP24", "wii-dry-dry-ruins|submissions|discord-1525949924737417417", "wii-dry-dry-ruins|submissions|curated-1525836830052716666-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1525949924737417417-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1526209804417368064-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1526224553343193089-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1526274406161056016-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1526535483100762154-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1526537944436047904-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1526665002935914556-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1526884833370832966-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1526889123627925565-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1526913847850434700-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1527094334304817152-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1527303966310797362-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1527688624517415084-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1528005929935568936-pipe2026-image-reviewed", "wii-dry-dry-ruins|submissions|curated-1529129338665177098-pipe2026-image-reviewed", "piranha-plant-cove-2r|records|curated-1524467417055494335-pipe2026-image-reviewed", "piranha-plant-cove-2r|records|1529533406021423128", "piranha-plant-cove-2r|submissions|sheet-DBX11", "piranha-plant-cove-2r|submissions|sheet-DBX12", "piranha-plant-cove-2r|submissions|sheet-DBX13", "piranha-plant-cove-2r|submissions|sheet-DBX14", "piranha-plant-cove-2r|submissions|sheet-DBX15", "piranha-plant-cove-2r|submissions|sheet-DBX16", "piranha-plant-cove-2r|submissions|sheet-DBX18", "piranha-plant-cove-2r|submissions|discord-1528293201230692445", "piranha-plant-cove-2r|submissions|discord-1524467434679959625", "piranha-plant-cove-2r|submissions|curated-1524467417055494335-pipe2026-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1524523746889695294-pipe2026-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1524897572118855804-pipe2026-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1525780180348702812-pipe2026-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1526122580640137227-pipe2026-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1526142332074725529-pipe2026-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1526307728815816765-pipe2026-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1526332867007742012-pipe2026-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1528293184684298260-pipe2026-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1529217689082527855-pipe2026-image-reviewed", "piranha-plant-cove-2r|submissions|curated-1529252818148659351-pipe2026-image-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && pipe2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const pipe2026=tours.find(t=>t.id==="tour-178" && t.startDate==="2026-07-08");
if(pipe2026) pipe2026.name="Pipe Tour (2026)";
const sunshine2026ProtectedFields=new Set(["wii-daisy-circuit|records|1534634409582526485-kuri", "wii-daisy-circuit|records|1534634409582526485-p-en", "wii-daisy-circuit|submissions|sheet-DCF10", "wii-daisy-circuit|submissions|sheet-DCF11", "wii-daisy-circuit|submissions|sheet-DCF12", "wii-daisy-circuit|submissions|sheet-DCF13", "wii-daisy-circuit|submissions|sheet-DCF14", "wii-daisy-circuit|submissions|sheet-DCF15", "wii-daisy-circuit|submissions|sheet-DCF16", "wii-daisy-circuit|submissions|sheet-DCF17", "wii-daisy-circuit|submissions|sheet-DCF18", "wii-daisy-circuit|submissions|sheet-DCF19", "wii-daisy-circuit|submissions|sheet-DCF20", "wii-daisy-circuit|submissions|sheet-DCF21", "wii-daisy-circuit|submissions|sheet-DCF22", "wii-daisy-circuit|submissions|sheet-DCF23", "wii-daisy-circuit|submissions|sheet-DCF24", "wii-daisy-circuit|submissions|sheet-DCF25", "wii-daisy-circuit|submissions|sheet-DCF26", "wii-daisy-circuit|submissions|sheet-DCF27", "wii-daisy-circuit|submissions|sheet-DCF28", "wii-daisy-circuit|submissions|sheet-DCF29", "wii-daisy-circuit|submissions|sheet-DCF30", "wii-daisy-circuit|submissions|discord-1534189208481042472", "wii-daisy-circuit|submissions|discord-1534410727945932830", "wii-daisy-circuit|submissions|curated-1529464432583774408-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1529484917258453175-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1529812153153097969-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1529833187331801198-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1530016403959320706-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1530218485144096839-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1530433675890524210-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1530956484899246170-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1531070227889131540-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1531301556136448100-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1531328794881818775-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1531617952774750349-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1531674525601628231-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1533031652895490179-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1533222484558610593-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1533387462469226556-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1533803472800055368-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1533838311607763084-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1534093277102604308-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1534189208481042472-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1534215501809586266-sunshine2026-image-reviewed", "wii-daisy-circuit|submissions|curated-1534410727945932830-sunshine2026-image-reviewed", "wii-daisy-circuit|candidates|discord-1534410727945932830", "snes-koopa-troopa-beach-2r|records|curated-1529539941497835704-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|records|curated-1532205868618219663-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|records|1534634414670348411", "snes-koopa-troopa-beach-2r|submissions|sheet-DCN10", "snes-koopa-troopa-beach-2r|submissions|sheet-DCN12", "snes-koopa-troopa-beach-2r|submissions|sheet-DCN13", "snes-koopa-troopa-beach-2r|submissions|sheet-DCN14", "snes-koopa-troopa-beach-2r|submissions|sheet-DCN15", "snes-koopa-troopa-beach-2r|submissions|sheet-DCN16", "snes-koopa-troopa-beach-2r|submissions|sheet-DCN18", "snes-koopa-troopa-beach-2r|submissions|sheet-DCN20", "snes-koopa-troopa-beach-2r|submissions|sheet-DCN21", "snes-koopa-troopa-beach-2r|submissions|sheet-DCN22", "snes-koopa-troopa-beach-2r|submissions|discord-1532794771922354408", "snes-koopa-troopa-beach-2r|submissions|discord-1529539963664859277", "snes-koopa-troopa-beach-2r|submissions|curated-nhspeedy-restored-89eM6nSzjDE", "snes-koopa-troopa-beach-2r|submissions|curated-1556709936443031654-troy-recovered-ktb2r-video", "snes-koopa-troopa-beach-2r|submissions|curated-1529379649426161714-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1529539941497835704-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1530016525656789207-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1530211399064748112-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1530399104746786856-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1530574871451537448-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1532088476403499111-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1532205868618219663-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1532448803519729756-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1532794755531014284-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1532801635569373365-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1533221115110097088-sunshine2026-image-reviewed", "snes-koopa-troopa-beach-2r|submissions|curated-1533444556165615818-sunshine2026-image-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && sunshine2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const sunshine2026=tours.find(t=>t.id==="tour-179" && t.startDate==="2026-07-22");
if(sunshine2026) sunshine2026.name="Sunshine Tour (2026)";
const vacation2026ProtectedFields=new Set(["athens-dash|submissions|sheet-DDL10", "athens-dash|submissions|sheet-DDL11", "athens-dash|submissions|sheet-DDL12", "athens-dash|submissions|sheet-DDL13", "athens-dash|submissions|sheet-DDL15", "athens-dash|submissions|sheet-DDL16", "athens-dash|submissions|sheet-DDL17", "athens-dash|submissions|sheet-DDL18", "athens-dash|submissions|sheet-DDL19", "athens-dash|submissions|sheet-DDL20", "athens-dash|submissions|discord-1538160724206162090", "athens-dash|submissions|curated-1535990527298904134-sundae2026-image-reviewed", "athens-dash|submissions|curated-1535993179881611355-sundae2026-image-reviewed", "athens-dash|submissions|curated-1537203497638957057-sundae2026-image-reviewed", "athens-dash|submissions|curated-1538083332837875735-sundae2026-image-reviewed", "athens-dash|submissions|curated-1538091620879044719-sundae2026-image-reviewed", "athens-dash|submissions|curated-1538160724206162090-sundae2026-image-reviewed", "athens-dash|submissions|curated-1538181313079681104-sundae2026-image-reviewed", "athens-dash|submissions|curated-1538403329783111731-sundae2026-image-reviewed", "athens-dash|submissions|curated-1538548860543307789-sundae2026-image-reviewed", "athens-dash|submissions|curated-1538721355514515567-sundae2026-image-reviewed", "athens-dash|submissions|curated-1538804694019743795-sundae2026-image-reviewed", "athens-dash|submissions|curated-1538918696053907467-sundae2026-image-reviewed", "athens-dash-2r|submissions|sheet-DDD10", "athens-dash-2r|submissions|sheet-DDD11", "athens-dash-2r|submissions|sheet-DDD12", "athens-dash-2r|submissions|sheet-DDD13", "athens-dash-2r|submissions|sheet-DDD14", "athens-dash-2r|submissions|sheet-DDD15", "athens-dash-2r|submissions|sheet-DDD16", "athens-dash-2r|submissions|curated-1534633326898319383-sundae2026-image-reviewed", "athens-dash-2r|submissions|curated-1534636911711354900-sundae2026-image-reviewed", "athens-dash-2r|submissions|curated-1534771333546774698-sundae2026-image-reviewed", "athens-dash-2r|submissions|curated-1536345009895251988-sundae2026-image-reviewed", "athens-dash-2r|submissions|curated-1536369387001618472-sundae2026-image-reviewed", "athens-dash-2r|submissions|curated-1537289651533119548-sundae2026-image-reviewed", "athens-dash-2r|submissions|curated-1538736080868606045-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|sheet-DCV10", "squeaky-clean-sprint|submissions|sheet-DCV11", "squeaky-clean-sprint|submissions|sheet-DCV12", "squeaky-clean-sprint|submissions|sheet-DCV13", "squeaky-clean-sprint|submissions|sheet-DCV14", "squeaky-clean-sprint|submissions|sheet-DCV15", "squeaky-clean-sprint|submissions|sheet-DCV16", "squeaky-clean-sprint|submissions|sheet-DCV17", "squeaky-clean-sprint|submissions|sheet-DCV18", "squeaky-clean-sprint|submissions|sheet-DCV19", "squeaky-clean-sprint|submissions|sheet-DCV20", "squeaky-clean-sprint|submissions|sheet-DCV21", "squeaky-clean-sprint|submissions|sheet-DCV22", "squeaky-clean-sprint|submissions|sheet-DCV23", "squeaky-clean-sprint|submissions|sheet-DCV24", "squeaky-clean-sprint|submissions|curated-nhspeedy-restored-KeIytQNI5qM", "squeaky-clean-sprint|submissions|curated-1534650311841550579-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1534851798962143423-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1535081210353553509-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1535182737470652450-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1536233781499793438-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1536485207132348437-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1536816957217833172-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1536849001595543692-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1537362627653673062-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1537399047365730375-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1538381611236720742-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1538864275030810634-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1539063624931352688-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1539449816835432518-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1539461798284107818-sundae2026-image-reviewed", "squeaky-clean-sprint|submissions|curated-1539474245917343804-sundae2026-image-reviewed", "athens-dash|submissions|sheet-DDL14", "athens-dash|records|1279827290620035093", "squeaky-clean-sprint|records|1424247778175090801"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && vacation2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const vacation2026=tours.find(t=>t.id==="tour-180" && t.startDate==="2026-08-05");
if(vacation2026) vacation2026.name="Vacation Tour (2026)";
const summer2026ProtectedFields=new Set(["berlin-byways-2|candidates|discord-1540911016441938052", "berlin-byways-2|records|1544898185032372253", "berlin-byways-2|records|curated-1540910990231736432-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1539587496739078154-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1539918978045059093-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1539920524329877504-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1540267958599942194-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1540488295669047378-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1540624938942079036-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1540910990231736432-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1540912331519954985-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1541101047701962762-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1541474041536188547-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1542495427864043561-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1543058816432738337-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1543226301933035590-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1543319535992438915-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1543447287441653811-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1543954752449290240-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1544173412530782218-summer2026-image-reviewed", "berlin-byways-2|submissions|curated-1544554434804187167-summer2026-image-reviewed", "berlin-byways-2|submissions|discord-1539920524329877504", "berlin-byways-2|submissions|discord-1540911016441938052", "berlin-byways-2|submissions|discord-1541474057814413419", "berlin-byways-2|submissions|sheet-DEB10", "berlin-byways-2|submissions|sheet-DEB11", "berlin-byways-2|submissions|sheet-DEB13", "berlin-byways-2|submissions|sheet-DEB14", "berlin-byways-2|submissions|sheet-DEB15", "berlin-byways-2|submissions|sheet-DEB17", "berlin-byways-2|submissions|sheet-DEB18", "berlin-byways-2|submissions|sheet-DEB20", "berlin-byways-2|submissions|sheet-DEB21", "berlin-byways-2|submissions|sheet-DEB22", "berlin-byways-2|submissions|sheet-DEB23", "berlin-byways-2|submissions|sheet-DEB24", "berlin-byways-2|submissions|sheet-DEB25", "berlin-byways-2|submissions|sheet-DEB26", "berlin-byways-2|submissions|sheet-DEB27", "madrid-drive|records|1544898209174790236", "madrid-drive|submissions|curated-1539522505721774201-summer2026-image-reviewed", "madrid-drive|submissions|curated-1539920303839248414-summer2026-image-reviewed", "madrid-drive|submissions|curated-1539973736252440667-summer2026-image-reviewed", "madrid-drive|submissions|curated-1540000243720912946-summer2026-image-reviewed", "madrid-drive|submissions|curated-1540920737991237726-summer2026-image-reviewed", "madrid-drive|submissions|curated-1540955822425907210-summer2026-image-reviewed", "madrid-drive|submissions|curated-1540997402536837170-summer2026-image-reviewed", "madrid-drive|submissions|curated-1541643737732481104-summer2026-image-reviewed", "madrid-drive|submissions|curated-1541726701997006981-summer2026-image-reviewed", "madrid-drive|submissions|curated-1541753070357192706-summer2026-image-reviewed", "madrid-drive|submissions|curated-1541847093784617070-summer2026-image-reviewed", "madrid-drive|submissions|discord-1540920763027038220", "madrid-drive|submissions|sheet-DEJ10", "madrid-drive|submissions|sheet-DEJ11", "madrid-drive|submissions|sheet-DEJ12", "madrid-drive|submissions|sheet-DEJ14", "madrid-drive|submissions|sheet-DEJ15", "madrid-drive|submissions|sheet-DEJ16", "madrid-drive|submissions|sheet-DEJ17", "madrid-drive|submissions|sheet-DEJ18", "piranha-plant-cove-3|records|1290731431890255945", "piranha-plant-cove-3|submissions|curated-1539662161939402772-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1539723397515321425-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1539937823233286175-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1540493209166151782-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1540536476574687392-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1540959981250158713-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1541003398621700147-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1541019994119475270-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1541041564460130324-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1541053435997065347-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1542374347174318160-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1542475478735257613-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1542808859452768329-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1543803074735247470-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1544135597625712780-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|curated-1544553116807069736-summer2026-image-reviewed", "piranha-plant-cove-3|submissions|sheet-DDT10", "piranha-plant-cove-3|submissions|sheet-DDT11", "piranha-plant-cove-3|submissions|sheet-DDT12", "piranha-plant-cove-3|submissions|sheet-DDT13", "piranha-plant-cove-3|submissions|sheet-DDT14", "piranha-plant-cove-3|submissions|sheet-DDT15", "piranha-plant-cove-3|submissions|sheet-DDT16", "piranha-plant-cove-3|submissions|sheet-DDT17", "piranha-plant-cove-3|submissions|sheet-DDT18", "piranha-plant-cove-3|submissions|sheet-DDT19", "piranha-plant-cove-3|submissions|sheet-DDT20", "piranha-plant-cove-3|submissions|sheet-DDT21", "piranha-plant-cove-3|submissions|sheet-DDT22", "piranha-plant-cove-3|submissions|sheet-DDT23", "piranha-plant-cove-3|submissions|sheet-DDT24", "piranha-plant-cove-3|submissions|sheet-DDT25", "berlin-byways-2|submissions|sheet-DEB19", "piranha-plant-cove-3|submissions|curated-rediscovered-VYfZYRWf0NM-original-video-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && summer2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const summer2026=tours.find(t=>t.id==="tour-181" && t.startDate==="2026-08-19");
if(summer2026) summer2026.name="Summer Tour (2026)";
const sundae2026ProtectedFields=new Set(["gba-luigi-circuit|records|1549814477594038325", "gba-luigi-circuit|submissions|curated-1544642053256904775-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1544658503648677988-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1545125504712056972-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1545139957289586718-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1545141813856305222-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1545166073773695168-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1545317525452103680-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1545662873605242961-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1546705515093037158-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1547082350612185180-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1547344883814236241-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1547365009619947612-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1547688384082874429-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1547728341765853184-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1547902893837783120-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1547937988372340789-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1548082272601640970-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1548149963433840661-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1548839740915322961-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1549249422565711903-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1549378394263789598-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|curated-1549630581615370332-sundae-september2026-image-reviewed", "gba-luigi-circuit|submissions|discord-1547688410842538095", "gba-luigi-circuit|submissions|sheet-DEZ10", "gba-luigi-circuit|submissions|sheet-DEZ11", "gba-luigi-circuit|submissions|sheet-DEZ12", "gba-luigi-circuit|submissions|sheet-DEZ13", "gba-luigi-circuit|submissions|sheet-DEZ14", "gba-luigi-circuit|submissions|sheet-DEZ15", "gba-luigi-circuit|submissions|sheet-DEZ16", "gba-luigi-circuit|submissions|sheet-DEZ17", "gba-luigi-circuit|submissions|sheet-DEZ18", "gba-luigi-circuit|submissions|sheet-DEZ19", "gba-luigi-circuit|submissions|sheet-DEZ20", "gba-luigi-circuit|submissions|sheet-DEZ22", "gba-luigi-circuit|submissions|sheet-DEZ23", "gba-luigi-circuit|submissions|sheet-DEZ24", "gba-luigi-circuit|submissions|sheet-DEZ25", "gba-luigi-circuit|submissions|sheet-DEZ26", "gba-luigi-circuit|submissions|sheet-DEZ27", "gba-luigi-circuit|submissions|sheet-DEZ28", "gba-luigi-circuit|submissions|sheet-DEZ29", "snes-vanilla-lake-2r|candidates|discord-1548334006658007111", "snes-vanilla-lake-2r|candidates|sheet-DER32", "snes-vanilla-lake-2r|records|1549814453367873608", "snes-vanilla-lake-2r|records|curated-1548333982888755250-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|records|curated-1549411103690465392-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1544610481271087125-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1544656012185837578-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1544694381846462494-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1544791585517211670-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1544935013110390865-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1544938364405424139-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1544969148923383918-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1545139064632512572-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1545238833157771335-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1545304033462456320-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1545509537686225037-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1545520806120005792-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1545522379671736361-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1545547909821366342-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1547033101425967115-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1547051305443401728-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1547779540758307008-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1547937939944644658-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1548041236374364170-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1548333982888755250-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1548488297557524653-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1548526055932043344-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1549017583292907590-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1549048948717654119-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1549122137531482112-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1549411103690465392-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|curated-1549530771717627934-sundae-september2026-image-reviewed", "snes-vanilla-lake-2r|submissions|discord-1548334006658007111", "snes-vanilla-lake-2r|submissions|discord-1549530787798323342", "snes-vanilla-lake-2r|submissions|sheet-DER10", "snes-vanilla-lake-2r|submissions|sheet-DER11", "snes-vanilla-lake-2r|submissions|sheet-DER12", "snes-vanilla-lake-2r|submissions|sheet-DER13", "snes-vanilla-lake-2r|submissions|sheet-DER14", "snes-vanilla-lake-2r|submissions|sheet-DER15", "snes-vanilla-lake-2r|submissions|sheet-DER16", "snes-vanilla-lake-2r|submissions|sheet-DER17", "snes-vanilla-lake-2r|submissions|sheet-DER18", "snes-vanilla-lake-2r|submissions|sheet-DER19", "snes-vanilla-lake-2r|submissions|sheet-DER20", "snes-vanilla-lake-2r|submissions|sheet-DER21", "snes-vanilla-lake-2r|submissions|sheet-DER22", "snes-vanilla-lake-2r|submissions|sheet-DER23", "snes-vanilla-lake-2r|submissions|sheet-DER24", "snes-vanilla-lake-2r|submissions|sheet-DER25", "snes-vanilla-lake-2r|submissions|sheet-DER27", "snes-vanilla-lake-2r|submissions|sheet-DER28", "snes-vanilla-lake-2r|submissions|sheet-DER29", "snes-vanilla-lake-2r|submissions|sheet-DER30", "snes-vanilla-lake-2r|submissions|sheet-DER31", "snes-vanilla-lake-2r|submissions|sheet-DER32", "gba-luigi-circuit|submissions|sheet-DEZ30", "gba-luigi-circuit|submissions|curated-1549662488960831619-anniversary2026-video-repost-reviewed", "snes-vanilla-lake-2r|submissions|sheet-DER35", "snes-vanilla-lake-2r|submissions|sheet-DER36", "snes-vanilla-lake-2r|submissions|curated-1549662655332221041-anniversary2026-video-repost-reviewed", "snes-vanilla-lake-2r|submissions|curated-1549673144384487466-anniversary2026-image-reviewed"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && sundae2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const sundae2026=tours.find(t=>t.id==="tour-182" && t.startDate==="2026-09-02");
if(sundae2026) sundae2026.name="Sundae Tour (2026)";
const anniversary2026ProtectedFields=new Set(["athens-dash-3|records|curated-1549661130962767973-dit", "athens-dash-3|records|curated-1549661130962767973-nekozuki", "athens-dash-3|submissions|curated-1549661130962767973-dit", "athens-dash-3|submissions|curated-1549661130962767973-nekozuki", "athens-dash-3|submissions|curated-1549729664279248900-anniversary2026-image-reviewed", "athens-dash-3|submissions|curated-1549755128167530616-anniversary2026-image-reviewed", "athens-dash-3|submissions|curated-1550240567642955886-anniversary2026-image-reviewed", "athens-dash-3|submissions|curated-1550740929122668616-anniversary2026-image-reviewed", "athens-dash-3|submissions|curated-1551093615017590804-anniversary2026-image-reviewed", "athens-dash-3|submissions|curated-1551285603004317806-anniversary2026-image-reviewed", "athens-dash-3|submissions|curated-1551494739809927240-anniversary2026-image-reviewed", "athens-dash-3|submissions|curated-1552177105197072496-anniversary2026-image-reviewed", "athens-dash-3|submissions|curated-1552866266635706480-anniversary2026-image-reviewed", "athens-dash-3|submissions|curated-1552964742623268946-anniversary2026-image-reviewed", "athens-dash-3|submissions|curated-1553752265683378206-anniversary2026-image-reviewed", "athens-dash-3|submissions|discord-1549834411502211183", "athens-dash-3|submissions|sheet-DFH10", "athens-dash-3|submissions|sheet-DFH12", "athens-dash-3|submissions|sheet-DFH13", "athens-dash-3|submissions|sheet-DFH14", "athens-dash-3|submissions|sheet-DFH15", "athens-dash-3|submissions|sheet-DFH16", "athens-dash-3|submissions|sheet-DFH17", "athens-dash-3|submissions|sheet-DFH18", "athens-dash-3|submissions|sheet-DFH19", "athens-dash-3|submissions|sheet-DFH20", "madrid-drive-3|records|curated-1549661153158893643-troy", "madrid-drive-3|records|curated-1551267933341089954", "madrid-drive-3|records|curated-1553748131122782298", "madrid-drive-3|submissions|curated-1549661153158893643-troy", "madrid-drive-3|submissions|curated-1549888221616541787-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1550121399233028217-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1550168756817232005-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1550178761310208121-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1550231768735686716-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1550237434502193154-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1550267418495029374-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1550320758276759686-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1550367082548437024-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1550373991745851412-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1550479180502798446-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1550884056940417115-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1551237821212135456-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1551249247494606880-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1551267933341089954", "madrid-drive-3|submissions|curated-1551267933341089954-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1551488369878376459-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1553748131122782298", "madrid-drive-3|submissions|curated-1553748131122782298-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1553757258641449070-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1554031743730712628-anniversary2026-image-reviewed", "madrid-drive-3|submissions|curated-1554729961229783042-anniversary2026-image-reviewed", "madrid-drive-3|submissions|discord-1551267957294760087", "madrid-drive-3|submissions|discord-1553748154036527165", "madrid-drive-3|submissions|discord-1553757282066763862", "madrid-drive-3|submissions|sheet-DFP10", "madrid-drive-3|submissions|sheet-DFP11", "madrid-drive-3|submissions|sheet-DFP13", "madrid-drive-3|submissions|sheet-DFP14", "madrid-drive-3|submissions|sheet-DFP15", "madrid-drive-3|submissions|sheet-DFP16", "madrid-drive-3|submissions|sheet-DFP17", "madrid-drive-3|submissions|sheet-DFP18", "madrid-drive-3|submissions|sheet-DFP19", "madrid-drive-3|submissions|sheet-DFP20", "madrid-drive-3|submissions|sheet-DFP21", "madrid-drive-3|submissions|sheet-DFP22", "madrid-drive-3|submissions|sheet-DFP23", "madrid-drive-3|submissions|sheet-DFP25", "madrid-drive-3|submissions|sheet-DFP28", "rome-avanti-3|records|curated-1549661160335478915-nekozuki", "rome-avanti-3|records|curated-1553025348780695634", "rome-avanti-3|submissions|curated-1549661160335478915-nekozuki", "rome-avanti-3|submissions|curated-1550013390662013001-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1550022298356949144-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1550060202441572452-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1551093677898727557-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1551498155772870666-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1552223857299947550-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1552490539289681942-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1552494870705479681-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1552501390201458719-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1552534118204710952-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1552888564004425738-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1553025348780695634", "rome-avanti-3|submissions|curated-1553025348780695634-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1553027949157023819-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1553215281864777758-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1553620588663410768-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1553680179631755264-anniversary2026-image-reviewed", "rome-avanti-3|submissions|curated-1554584194380734485-anniversary2026-image-reviewed", "rome-avanti-3|submissions|discord-1553025369567928423", "rome-avanti-3|submissions|discord-1553620606895792169", "rome-avanti-3|submissions|sheet-DFX10", "rome-avanti-3|submissions|sheet-DFX11", "rome-avanti-3|submissions|sheet-DFX12", "rome-avanti-3|submissions|sheet-DFX13", "rome-avanti-3|submissions|sheet-DFX14", "rome-avanti-3|submissions|sheet-DFX15", "rome-avanti-3|submissions|sheet-DFX16", "rome-avanti-3|submissions|sheet-DFX17", "rome-avanti-3|submissions|sheet-DFX18", "rome-avanti-3|submissions|sheet-DFX19", "rome-avanti-3|submissions|sheet-DFX20", "rome-avanti-3|submissions|sheet-DFX22", "rome-avanti-3|submissions|sheet-DFX23", "rome-avanti-3|submissions|sheet-DFX25", "rome-avanti-3|submissions|sheet-DFX26"]);
applyReviewedPublicationPatches(courses,{rows:publicationPatches.rows.filter(p=>!p.remove && anniversary2026ProtectedFields.has(p.courseId+"|"+p.collection+"|"+p.id))});
const anniversary2026=tours.find(t=>t.id==="tour-183" && t.startDate==="2026-09-16");
if(anniversary2026) anniversary2026.name="Anniversary Tour (2026)";
// Preserve reviewed Halloween course source fields after legacy derived-field passes.
const halloween2020ReviewedCourses = new Set(["gba-bowser-s-castle-2r"]);
applyReviewedPublicationPatches(courses, {rows: publicationPatches.rows.filter(p => !p.remove && halloween2020ReviewedCourses.has(p.courseId))});
for (const course of courses.filter(c => halloween2020ReviewedCourses.has(c.id))) {
  if (course.current) course.current = structuredClone(course.records.find(r => r.id === course.current.id) || course.current);
  course.currentHolders = course.currentHolders.map(holder => structuredClone(course.records.find(r => r.id === holder.id) || holder));
}
applyFinalSourceFidelity(courses, JSON.parse(fs.readFileSync("scripts/final-source-fidelity-patches.json", "utf8")));
const finalDateAudit = applyFinalDates(courses);
fs.writeFileSync(out + "/final-date-audit.json", JSON.stringify(finalDateAudit));
for (const [name, data] of Object.entries({
  manifest,
  courses,
  players: [...players.values()].sort((a, b) => a.name.localeCompare(b.name)),
  tours,
  unmatched,
}))
  fs.writeFileSync(out + "/" + name + ".json", JSON.stringify(data));
fs.mkdirSync(out + "/courses", { recursive: true });
for (const course of courses)
  fs.writeFileSync(
    out + "/courses/" + course.id + ".json",
    JSON.stringify(course),
  );
console.log(JSON.stringify(manifest, null, 2));
