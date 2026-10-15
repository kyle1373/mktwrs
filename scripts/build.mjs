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
  if (preserved.row.canonicalSourceReviewAudit !== "archive/spring2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/bowser2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/mii2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/princess2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/marioluigi2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/night2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/pipe2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/sunshine2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/vacation2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/summer2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.canonicalSourceReviewAudit !== "archive/sundae2025-posted-results-and-source-clock-reconciliation-20261015.json" && preserved.row.receiptSourceReviewAudit !== "archive/spring2025-edited-receipt-source-dispositions-20261015.json") continue;
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
