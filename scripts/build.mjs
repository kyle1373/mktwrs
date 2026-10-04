import fs from "node:fs";
import { screenshotPublicationDate } from "./record-date.mjs";
import { videoKey } from "../lib/video.mjs";
import {
  importSources,
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
    r.recordDate = screenshotDate || (r.dateUnresolved ? null : submissionDate || r.achievedAt || uploadDate || null);
    r.dateBasis = screenshotDate ? "first-screenshot-publication" : r.dateUnresolved ? null : submissionDate
      ? "submission-date"
      : r.achievedAt
        ? "source-date"
        : uploadDate
          ? "proof-upload-date"
          : null;
  }
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
    r.durationEnd =
      nextRecords
        .map((n) => n.recordDate)
        .filter(Boolean)
        .sort()[0] || new Date().toISOString().slice(0, 10);
    r.durationDays =
      r.recordDate && !r.dateUnresolved && !r.delayedSubmission && nextRecords.every((n) => n.recordDate && !n.dateUnresolved && !n.delayedSubmission)
        ? playableDays(
            r.recordDate,
            nextRecords.map((n) => n.recordDate).sort()[0] ||
              new Date().toISOString().slice(0, 10),
            c.appearances.map((a) => ({ start: a.startDate, end: a.endDate })),
          )
        : null;
    r.durationBasis =
      r.durationDays === null
        ? (r.delayedSubmission || nextRecords.some((n) => n.delayedSubmission)
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
