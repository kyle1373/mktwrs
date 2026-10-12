export function enrichOriginalProofReviews(record, evidence) {
  if (record.playerId !== evidence.playerId || record.courseId !== evidence.courseId ||
      record.timeCs !== evidence.timeCs || !record.proofImageLocal ||
      record.proofImageLocal !== evidence.proofImageLocal || !evidence.proofImageVerified) return false;
  // Preserve the original post and later repost clocks of this exact proof.
  // Neither clock resolves an undated previous-best race.
  for (const key of ["originalPostSourceReview", "laterOriginalScreenshotRepostReview"])
    if (evidence[key] !== undefined && record[key] === undefined) record[key] = evidence[key];
  return true;
}

export function applySubmissionSourceEvidence(submission, reviews) {
  const review = reviews[submission.id];
  if (!review) return false;
  if (submission.courseId !== review.courseId || submission.playerId !== review.playerId ||
      submission.time !== review.time || submission.video !== review.video ||
      (review.sourceUrl && submission.source?.url !== review.sourceUrl))
    throw Error("Submission source evidence mismatch: " + submission.id);
  const allowed = new Set(["videoPublishedAt", "videoPublicationSource", "videoReferenceReview",
    "videoShareEvents", "resultReportEvents", "additionalSources"]);
  for (const [key, value] of Object.entries(review.evidence)) {
    if (!allowed.has(key)) throw Error("Unsupported submission evidence field: " + key);
    submission[key] = value;
  }
  return true;
}

function recordingIdentity(value) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (["twitter.com", "www.twitter.com", "x.com", "www.x.com"].includes(url.hostname)) {
      const id = url.pathname.match(/^\/[^/]+\/status\/(\d+)(?:\/|$)/)?.[1];
      return id ? "twitter:" + id : null;
    }
    if (url.hostname === "youtu.be") return "youtube:" + url.pathname.slice(1);
    if (["youtube.com", "www.youtube.com"].includes(url.hostname) && url.pathname === "/watch")
      return url.searchParams.get("v") ? "youtube:" + url.searchParams.get("v") : null;
    if (/\.(mp4|mov|webm)$/i.test(url.pathname)) return url.origin + url.pathname;
  } catch {}
  return null;
}

export function enrichRecordingEvidence(record, matches) {
  const identity = recordingIdentity(record.video);
  if (!identity) return false;
  const evidence = matches.find(row => row.playerId === record.playerId &&
    row.courseId === record.courseId && row.timeCs === record.timeCs &&
    recordingIdentity(row.video) === identity &&
    (row.videoPublicationSource || row.videoScopeReview || row.videoShareEvents || row.videoPreservation));
  if (!evidence) return false;
  // These fields describe this exact recording, independently from the race
  // date or a later submission. Pending continuity reviews remain pending.
  for (const key of ["videoPublishedAt", "videoPublicationSource", "videoShareEvents",
    "videoPreservation", "videoScopeReview", "videoDecodeIntegrity", "videoScope",
    "fullRaceVideoVerified", "videoVerified", "videoAvailability", "videoSharedAt",
    "videoShareSource", "videoShareClockAudit"])
    if (record[key] === undefined && evidence[key] !== undefined) record[key] = evidence[key];
  return true;
}

export function exactReviewedRecordSubmission(record, matches) {
  return matches.find(submission => submission.id === record.id &&
    submission.playerId === record.playerId && submission.timeCs === record.timeCs &&
    submission.courseId === record.courseId && submission.submittedAt &&
    submission.submissionSourceReview?.originalTextAndClockReviewed === true &&
    submission.submissionSourceReview?.reviewAudit);
}

export function reviewedPlayer(entry, players, resolveName) {
  if (!entry.playerId) return resolveName(entry.player);
  const existing = players.get(entry.playerId);
  if (existing) {
    if (existing.discordId && entry.discordAccountId &&
        existing.discordId !== entry.discordAccountId)
      throw Error("Reviewed player account mismatch: " + entry.playerId);
    return existing;
  }
  const player = {id: entry.playerId, name: entry.player,
    discordId: entry.discordAccountId || null, country: null, avatar: null,
    records: [], socials: {}, aliases: []};
  players.set(player.id, player);
  return player;
}

export function reconcileReviewedSubmission(course, submission) {
  const targetId = submission.publicSubmissionReconciliation?.canonicalId;
  if (!targetId) {
    course.submissions.push(submission);
    return submission;
  }
  const target = course.submissions.find(row => row.id === targetId);
  if (!target || target.playerId !== submission.playerId ||
      target.timeCs !== submission.timeCs || target.courseId !== submission.courseId)
    throw Error("Reviewed submission reconciliation mismatch: " + targetId);
  const sources = [target.source, ...(target.additionalSources || []),
    ...(submission.additionalSources || [])].filter(Boolean);
  const additionalSources = [...new Map(sources.map(source =>
    [JSON.stringify(source), source])).values()];
  Object.assign(target, submission, {id: targetId, additionalSources});
  return target;
}

export function rejectReviewedVideo(course, submission, reviews) {
  const review = reviews[submission.id];
  if (!review) return false;
  if (course.id !== review.courseId || submission.playerId !== review.playerId ||
      submission.time !== review.reportedTime || submission.video !== review.video)
    throw Error("Reviewed video rejection mismatch: " + submission.id);
  submission.disputedVideoReference = submission.video;
  submission.video = null;
  submission.videoVerified = false;
  submission.videoSourceMismatch = review.videoSourceMismatch;
  return true;
}

import fs from "node:fs";
export const slug = (s) =>
  String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const norm = (s) =>
  String(s)
    .replace(/ Reverse$/, " R")
    .replace(/Wario's Shipyard/, "Wario Shipyard")
    .replace(/^(SNES|N64|GBA|GCN|DS|Wii|3DS) /, "")
    .replace(/[’'\s-]/g, "")
    .toLowerCase();
export function findCourse(courses, title) {
  const platform = String(title).match(/^(SNES|N64|GBA|GCN|DS|Wii|3DS) /)?.[1];
  const matches = courses.filter(
    (c) =>
      norm(c.name) === norm(title) &&
      (!platform || c.name.startsWith(platform + " ")),
  );
  return matches.length === 1 ? matches[0] : null;
}
export function centiseconds(v) {
  if (typeof v === "number") return Math.round(v * 100);
  let s = String(v ?? "").trim();
  if (/^\d{1,2}[.;:]\d{2}[.:]\d{2}$/.test(s)) {
    const p = s.split(/[.;:]/);
    return +p[0] * 6000 + +p[1] * 100 + +p[2];
  }
  if (/^\d{1,3}\.\d{1,2}$/.test(s)) return Math.round(+s * 100);
  return null;
}
export const formatTime = (cs) =>
  `${Math.floor(cs / 6000)}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
export function completeTwoLapSplit(totalCs, laps) {
  if (!Number.isInteger(totalCs) || !Array.isArray(laps) || laps.length !== 2) return null;
  const values = laps.map(centiseconds);
  if (values.filter(v => v === null).length !== 1) return null;
  const index = values[0] === null ? 0 : 1;
  const missing = totalCs - values[1 - index];
  if (values[1 - index] <= 0 || missing <= 0) return null;
  const completed = [...laps];
  completed[index] = (missing / 100).toFixed(2);
  return { laps: completed, derivedLap: index + 1 };
}
export function verifiedSplitEvidence(record, selected, matches) {
  const sources = (entry) => [entry.source?.url, ...(entry.additionalSources || []).map(s => s?.url)].filter(Boolean);
  const imageIdentity = (entry) => {
    try {
      const url = new URL(entry.proofImage);
      if (/(^|\.)(discordapp\.com|discordapp\.net)$/.test(url.hostname))
        return url.pathname.match(/\/attachments\/\d+\/\d+\/[^/]+$/)?.[0];
    } catch {}
    return null;
  };
  const selectedSources = sources(selected);
  const selectedImage = imageIdentity(selected);
  return matches.find(entry => {
    if (!(entry.videoVerified || entry.proofImageVerified)) return false;
    const sharedSource = sources(entry).some(url => selectedSources.includes(url));
    const sharedImage = selectedImage && imageIdentity(entry) === selectedImage;
    if (!sharedSource && !sharedImage) return false;
    const laps = entry.laps?.map(centiseconds);
    return laps?.length === 2 && laps.every(lap => lap > 0) &&
      laps[0] + laps[1] === record.timeCs &&
      !entry.notes?.some(note => note.includes("do not sum"));
  }) || selected;
}
export function recordAppearance(record, appearances = []) {
  const range = record.tourLabel?.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{2})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{2})/,
  );
  const tourStart = range
    ? `20${range[3]}-${range[2].padStart(2, "0")}-${range[1].padStart(2, "0")}`
    : record.tourDateRange?.start;
  // Historical WR announcements can be posted months after the playable tour.
  // Their explicit tour takes precedence over the announcement timestamp.
  if (tourStart) return appearances.find(a => a.startDate === tourStart);
  const dates = [record.achievedAt, record.submittedAt, record.observedAt,
    record.announcedAt].filter(Boolean);
  return appearances.find(a => dates.some(date =>
    date.slice(0, 10) >= a.startDate && date.slice(0, 10) < a.endDate));
}
export function mediaKind(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    return "reference";
  }
  if (!/^https?:$/.test(u.protocol)) return "reference";
  if (
    /\.(png|jpe?g|webp|gif)$/i.test(u.pathname) ||
    u.hostname === "pbs.twimg.com"
  )
    return "image";
  if (/\.(mp4|mov|webm)$/i.test(u.pathname)) return "video";
  if (
    /(^|\.)(youtube\.com|youtu\.be|twitch\.tv|twitter\.com|x\.com|reddit\.com)$/.test(
      u.hostname,
    )
  )
    return "video";
  return "reference";
}
export function attachmentDate(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (!/(^|\.)(discordapp\.com|discordapp\.net)$/.test(u.hostname)) return null;
  const id = u.pathname.match(/^\/attachments\/\d+\/(\d+)\//)?.[1];
  if (!id) return null;
  const date = new Date(Number((BigInt(id) >> 22n) + 1420070400000n));
  return date >= new Date("2019-09-25") && date <= new Date()
    ? date.toISOString()
    : null;
}
export function importSources(courses, players) {
  const file = "archive/raw/workbook-extracted.json";
  if (!fs.existsSync(file)) return { submissionCount: 0 };
  const w = JSON.parse(fs.readFileSync(file));
  const aliases = new Map(),
    profiles = new Map();
  for (const row of w.sheets["Player Names"]) {
    const names = row.filter((v) => v !== null && String(v).trim()).map(String);
    for (const a of names) aliases.set(a.toLowerCase(), names[0]);
  }
  for (const row of w.sheets["Player Profiles"].slice(1)) {
    if (row[0])
      profiles.set(String(row[0]).toLowerCase(), {
        name: String(row[0]),
        country: row[1],
        discordId: row[2] || null,
        socials: {
          twitter: row[3] || null,
          youtube: row[4] || null,
          twitch: row[5] || null,
        },
      });
  }
  for (const row of w.sheets["Player Flags"])
    if (row[0]) {
      const name = aliases.get(String(row[0]).toLowerCase()) || String(row[0]);
      if (!profiles.has(name.toLowerCase()))
        profiles.set(name.toLowerCase(), { name, country: row[1] });
    }
  // Identity links require reviewed source context, not matching display names.
  if (fs.existsSync("archive/player-identities.json")) {
    for (const identity of Object.values(JSON.parse(fs.readFileSync("archive/player-identities.json")))) {
      const key = identity.name.toLowerCase();
      const previous = profiles.get(key) || {};
      profiles.set(key, {
        ...previous,
        ...identity,
        socials: { ...previous.socials, ...identity.socials },
      });
      for (const alias of [identity.name, ...(identity.aliases || [])])
        aliases.set(alias.toLowerCase(), identity.name);
    }
  }
  for (const profile of profiles.values()) {
    if (!profile.socials) continue;
    const root = aliases.get(profile.name.toLowerCase());
    if (root) {
      for (const [key, value] of aliases)
        if (value === root) aliases.set(key, profile.name);
    }
  }
  function person(name) {
    name = String(name).trim();
    name = aliases.get(name.toLowerCase()) || name;
    const profile = profiles.get(name.toLowerCase());
    if (profile) name = profile.name;
    let id = slug(name);
    if (!id) id = "player-" + Buffer.from(name).toString("hex");
    let p = players.get(id);
    if (!p) {
      p = {
        id,
        name,
        country: profile?.country || null,
        discordId: profile?.discordId || null,
        avatar: null,
        records: [],
        socials: profile?.socials || {},
        aliases: profile?.aliases || [],
      };
      players.set(id, p);
    } else if (profile)
      Object.assign(p, {
        country: profile.country || p.country,
        discordId: profile.discordId || p.discordId,
        socials: profile.socials || {},
        aliases: profile.aliases || p.aliases || [],
      });
    return p;
  }
  for (const p of [...players.values()]) {
    const canonical = person(p.name);
    if (canonical.id !== p.id) {
      for (const c of courses)
        for (const r of c.records)
          if (r.playerId === p.id) r.playerId = canonical.id;
      canonical.avatar ||= p.avatar;
      canonical.records.push(...p.records);
      players.delete(p.id);
    }
  }
  const championFile = "archive/raw/champion-profile-embeds.json";
  if (fs.existsSync(championFile)) {
    for (const profile of JSON.parse(fs.readFileSync(championFile)).profiles) {
      const p = person(profile.title);
      const avatar = profile.links.find((l) =>
        /cdn\.discordapp\.com\/avatars\//.test(l.href),
      )?.href;
      if (avatar) {
        p.avatar = avatar;
        p.discordId = avatar.match(/\/avatars\/(\d+)\//)?.[1] || p.discordId;
      }
      p.profileSource = {
        channel: "world-champions-profiles",
        messageId: profile.messageId.split("-").at(-1),
      };
      for (const link of profile.links) {
        if (["Twitter", "YouTube", "Twitch"].includes(link.text))
          p.socials[link.text.toLowerCase()] = link.href;
      }
    }
  }
  const errors = [];
  let count = 0;
  for (const course of courses) course.submissions = [];
  for (const b of w.blocks) {
    let title = b.course;
    if (!title && b.column === 3) title = "Kalimari Desert";
    if (!title && b.column === 11) title = "Daisy Hills R";
    let c = findCourse(courses, title);
    if (!c) {
      if (b.rows.length)
        errors.push({
          type: "unmapped-course",
          course: title,
          column: b.column,
          rows: b.rows.length,
        });
      continue;
    }
    for (const row of b.rows) {
      const get = (label) => row.cells[b.labels.indexOf(label)]?.value;
      let timeCs = centiseconds(get("Time:"));
      if (!timeCs || timeCs < 1000 || timeCs > 60000) {
        errors.push({
          type: "invalid-time",
          course: title,
          cell: row.cells[0].cell,
          value: get("Time:"),
        });
        continue;
      }
      const p = person(get("Player:"));
      const lapCells = ["Lap 1", "Lap 2", "Lap 3"]
        .filter((x) => b.labels.includes(x))
        .map(get);
      let splits = lapCells.map((v) => centiseconds(v));
      const notes = [];
      if (
        splits.every((x) => x !== null) &&
        splits.reduce((a, b) => a + b, 0) !== timeCs
      ) {
        notes.push("Source lap splits do not sum to the total.");
      }
      const rawDate = get("Date:");
      const explicitDate =
        typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}T/.test(rawDate)
          ? rawDate.slice(0, 10)
          : null;
      const media = get("Media:");
      const mediaIsImage = mediaKind(media) === "image";
      const video = mediaKind(media) === "video" ? media : null;
      const rawImage =
        get("Screenshot") ||
        (mediaIsImage ? media : null) ||
        (typeof rawDate === "string" && /^https?:\/\//.test(rawDate)
          ? rawDate
          : null);
      const id = "sheet-" + row.cells[0].cell;
      const r = {
        id,
        courseId: c.id,
        playerId: p.id,
        time: formatTime(timeCs),
        timeCs,
        laps: splits.map((x) => (x === null ? null : (x / 100).toFixed(2))),
        mushrooms: null,
        achievedAt: explicitDate,
        datePrecision: explicitDate ? "day" : "unknown",
        dateBasis: explicitDate ? "spreadsheet-date" : null,
        submittedAt: null,
        video,
        proofImage: rawImage || null,
        proofUploadedAt: attachmentDate(rawImage),
        mediaReference:
          mediaKind(media) === "reference" && /^https?:\/\//.test(media || "")
            ? media
            : null,
        source: {
          url: w.source + "#gid=876753249&range=" + row.cells[0].cell,
          sheet: "Admin Panel",
          range: row.cells[0].cell + ":" + row.cells.at(-1).cell,
        },
        status: "sheet-submission",
        notes,
      };
      c.submissions.push(r);
      count++;
    }
  }
  const messages = new Map();
  for (const file of fs
    .readdirSync("archive/raw")
    .filter((x) => /^tt-submission-\d+\.json$/.test(x)))
    for (const m of JSON.parse(fs.readFileSync("archive/raw/" + file))
      .messages) {
      const previous = messages.get(m.id);
      if (previous) {
        m.links = [
          ...new Map(
            [...previous.links, ...m.links].map((l) => [l.href, l]),
          ).values(),
        ];
        m.images = [
          ...new Map(
            [...previous.images, ...m.images].map((i) => [i.src, i]),
          ).values(),
        ];
      }
      messages.set(m.id, m);
    }
  const attachmentKey = (url) =>
    String(url || "").match(/\/attachments\/(\d+\/\d+)\//)?.[1];
  const attachments = new Map();
  for (const m of [...messages.values()].sort((a, b) =>
    a.datetime.localeCompare(b.datetime),
  )) {
    for (const link of m.links) {
      const key = attachmentKey(link.href);
      if (key && !attachments.has(key))
        attachments.set(key, { message: m, url: link.href });
    }
  }
  let attachmentMatches = 0;
  for (const c of courses)
    for (const s of c.submissions) {
      const match = attachments.get(attachmentKey(s.proofImage));
      if (!match) continue;
      s.submittedAt = match.message.datetime;
      s.proofImage = match.url;
      s.additionalSources = [s.source];
      const messageId = match.message.id.split("-").at(-1);
      s.source = {
        url:
          "https://discord.com/channels/629221606064914442/875784780573184010/" +
          messageId,
        channel: "tt-submission",
        messageId,
      };
      s.status = "matched-sheet-submission";
      attachmentMatches++;
    }
  const submissionCorrections = fs.existsSync("archive/submission-corrections.json")
    ? JSON.parse(fs.readFileSync("archive/submission-corrections.json", "utf8")) : {};
  // Sheet-only rows can repeat the same transcription error as a bot entry.
  // Apply only explicitly reviewed row identities, retaining the reported value.
  for (const c of courses) for (const r of c.submissions) {
    const correction = submissionCorrections[r.id];
    if (!correction || correction.courseId !== c.id || correction.originalTime !== r.time) continue;
    const correctedCs = centiseconds(correction.time);
    if (!correctedCs) throw Error("Invalid corrected sheet time: " + r.id);
    r.originalReportedTime = r.time;
    r.originalReportedLaps = r.laps;
    r.time = formatTime(correctedCs);
    r.timeCs = correctedCs;
    r.laps = correction.laps;
    r.notes.push(correction.reason);
    r.additionalSources = [...(r.additionalSources || []), ...correction.sources];
  }
  let botCount = 0;
  for (const m of messages.values()) {
    const body = m.embeds?.map((e) => e.text).join("\n") || "";
    if (!/Status: Updated by/.test(body)) continue;
    const line = body
      .split("\n")
      .find((x) => /\|.*\|.*\|/.test(x) && !x.startsWith("Submission"));
    if (!line) continue;
    const parts = line.split("|").map((s) => s.trim());
    if (parts.length < 5) continue;
    const c = findCourse(courses, parts[1]);
    let cs = centiseconds(parts[2]);
    if (!c || !cs) {
      errors.push({ type: "unmapped-bot", messageId: m.id, line });
      continue;
    }
    const p = person(parts[0]);
    const source = m.links.find((l) => l.text === "Submission")?.href;
    const sid = source?.split("/").at(-1);
    let original = messages.get("chat-messages-875784780573184010-" + sid);
    const submittedAt =
      original?.datetime ||
      (sid
        ? new Date(Number((BigInt(sid) >> 22n) + 1420070400000n)).toISOString()
        : m.datetime);
    const avatar = m.links.find((l) => /\/avatars\//.test(l.href))?.href;
    if (avatar) {
      p.avatar = avatar;
      p.discordId = avatar.match(/\/avatars\/(\d+)/)?.[1] || p.discordId;
    }
    const proof = m.links.find((l) => /\/attachments\//.test(l.href))?.href;
    const video = m.links.find((l) => mediaKind(l.href) === "video")?.href;
    let r = c.submissions.find(
      (r) =>
        r.timeCs === cs &&
        r.playerId === p.id &&
        proof &&
        r.proofImage?.split("?")[0] === proof.split("?")[0],
    );
    if (!r) {
      r = {
        id: "discord-" + m.id.split("-").at(-1),
        courseId: c.id,
        playerId: p.id,
        time: formatTime(cs),
        timeCs: cs,
        laps: parts
          .slice(3, -1)
          .map((x) =>
            centiseconds(x) === null
              ? null
              : (centiseconds(x) / 100).toFixed(2),
          ),
        mushrooms: null,
        achievedAt: null,
        datePrecision: "unknown",
        status: "accepted-submission",
        notes: [],
      };
      c.submissions.push(r);
    }
    const lapTimes = r.laps.map(centiseconds);
    if (
      lapTimes.length &&
      lapTimes.every((v) => v !== null) &&
      lapTimes.reduce((a, b) => a + b, 0) !== r.timeCs &&
      !r.notes.some((n) => n.includes("do not sum"))
    ) {
      r.notes.push("Source lap splits do not sum to the total.");
    }
    Object.assign(r, {
      submittedAt,
      proofUploadedAt: attachmentDate(proof || r.proofImage),
      video: video || r.video || null,
      proofImage: proof || r.proofImage || null,
      source: {
        url:
          source ||
          "https://discord.com/channels/629221606064914442/875784780573184010/" +
            m.id.split("-").at(-1),
        channel: "tt-submission",
        messageId: sid || m.id.split("-").at(-1),
      },
      status: "accepted-submission",
    });
    const correction = submissionCorrections[r.source.messageId];
    if (correction && correction.courseId === c.id && correction.originalTime === r.time) {
      const correctedCs = centiseconds(correction.time);
      if (!correctedCs) throw Error("Invalid corrected submission time: " + r.source.messageId);
      r.originalReportedTime = r.time;
      r.originalReportedLaps = r.laps;
      r.time = formatTime(correctedCs);
      r.timeCs = correctedCs;
      r.laps = correction.laps;
      r.notes.push(correction.reason);
      r.additionalSources = [...(r.additionalSources || []), ...correction.sources];
    }
    botCount++;
  }
  const curated = fs.existsSync("archive/curated-runs.json")
    ? JSON.parse(fs.readFileSync("archive/curated-runs.json"))
    : [];
  const reviewed = fs.existsSync("archive/reviewed-submissions.json")
    ? JSON.parse(fs.readFileSync("archive/reviewed-submissions.json")) : [];
  for (const entry of [...curated, ...reviewed]) {
    const c = courses.find((c) => c.id === entry.courseId);
    if (!c) throw Error("Unknown curated course: " + entry.courseId);
    const p = reviewedPlayer(entry, players, person);
    const r = {
      ...entry,
      id: "curated-" + entry.messageId,
      playerId: p.id,
      timeCs: centiseconds(entry.time),
      achievedAt: entry.achievedAt || null,
      datePrecision: entry.achievedAt ? (entry.datePrecision || "day") : "unknown",
      video: entry.video || null,
      proofUploadedAt: attachmentDate(entry.proofImage),
    };
    const published = reconcileReviewedSubmission(c, r);
    if (
      ["community-wr", "leaderboard-wr"].includes(entry.status) &&
      !c.records.some((n) => n.playerId === p.id && n.timeCs === r.timeCs)
    ) {
      c.records.push({
        ...published,
        announcedAt: r.observedAt || r.submittedAt,
        tourLabel:
          entry.status === "leaderboard-wr"
            ? "Current community leaderboard confirmation"
            : "Community WR confirmation",
      });
      p.records.push(published.id);
    }
  }
  const sourceEvidence = fs.existsSync("archive/submission-source-evidence.json")
    ? JSON.parse(fs.readFileSync("archive/submission-source-evidence.json", "utf8")) : {};
  for (const course of courses) for (const submission of course.submissions)
    applySubmissionSourceEvidence(submission, sourceEvidence);
  const videoRejections = fs.existsSync("archive/submission-video-rejections.json")
    ? JSON.parse(fs.readFileSync("archive/submission-video-rejections.json", "utf8")) : {};
  for (const course of courses) for (const submission of course.submissions)
    rejectReviewedVideo(course, submission, videoRejections);
  let enriched = 0;
  const withdrawals = fs.existsSync("archive/submission-withdrawals.json")
    ? JSON.parse(fs.readFileSync("archive/submission-withdrawals.json", "utf8")) : {};
  for (const c of courses) {
    for (const s of c.submissions) {
      const withdrawal = withdrawals[s.source?.messageId] || withdrawals[s.id];
      if (withdrawal && withdrawal.courseId === c.id && withdrawal.originalTime === s.time) {
        s.status = "withdrawn-submission";
        s.includeInProgression = false;
        s.originalReportedTime = s.time;
        s.originalReportedLaps = s.laps;
        s.laps = [null, null];
        s.notes.push(withdrawal.reason);
        s.additionalSources = [...(s.additionalSources || []), ...withdrawal.sources];
        continue;
      }
      const completed = completeTwoLapSplit(s.timeCs, s.laps);
      if (!completed) continue;
      s.laps = completed.laps;
      s.derivedLap = completed.derivedLap;
      s.notes.push(`Lap ${completed.derivedLap} calculated as total minus the other recorded lap.`);
    }
    for (const r of c.records) {
      const appearance = recordAppearance(r, c.appearances);
      const explicitTour = /\d{1,2}\/\d{1,2}\/\d{2}\s*-/.test(r.tourLabel || "") || r.tourDateRange?.start;
      const matches = c.submissions.filter((s) => {
        if (s.playerId !== r.playerId || s.timeCs !== r.timeCs) return false;
        const submissionDate = s.achievedAt || s.submittedAt || s.observedAt;
        // Equal totals can be reruns years apart. Keep their dates and splits
        // inside the same playable tour instead of merging by total alone.
        if (!explicitTour) return !appearance || !submissionDate ||
          (submissionDate.slice(0, 10) >= appearance.startDate &&
           submissionDate.slice(0, 10) < appearance.endDate);
        return !appearance || !submissionDate ||
          (Date.parse(submissionDate) >= Date.parse(`${appearance.startDate}T06:00:00Z`) &&
           Date.parse(submissionDate) < Date.parse(`${appearance.endDate}T06:00:00Z`));
      });
      matches.sort((a, b) =>
        (
          a.achievedAt ||
          a.submittedAt ||
          a.proofUploadedAt ||
          "9999"
        ).localeCompare(
          b.achievedAt || b.submittedAt || b.proofUploadedAt || "9999",
        ),
      );
      let s = exactReviewedRecordSubmission(r, matches) ||
        matches.find(
          (x) => x.achievedAt || x.submittedAt || x.proofUploadedAt,
        ) || matches.find((x) => x.laps.some((l) => l !== null))
          || matches.find((x) => x.proofImageVerified && x.observedAt);
      // A bot may omit splits that were later verified from the same submission.
      // Require the exact source, so an equal-time rerun cannot donate its laps.
      if (s?.source?.url && s.laps?.every((lap) => lap === null)) {
        s = matches.find((x) => {
          if (x.source?.url !== s.source.url ||
              !(x.videoVerified || x.proofImageVerified)) return false;
          const laps = x.laps?.map(centiseconds);
          return laps?.length === 2 && laps.every((lap) => lap > 0) &&
            laps[0] + laps[1] === r.timeCs;
        }) || s;
      }
      if (s) {
        const splitEvidence = s.laps?.every(lap => lap === null)
          ? verifiedSplitEvidence(r, s, matches) : s;
        r.laps = splitEvidence.notes.some((n) => n.includes("do not sum")) ? null : splitEvidence.laps;
        r.lapSource = splitEvidence.lapSource || splitEvidence.source;
        r.lapMatchBasis = splitEvidence.lapMatchBasis || "same player and total time; see linked submission";
        if (splitEvidence.derivedLap) {
          r.derivedLap = splitEvidence.derivedLap;
          r.lapMatchBasis += `; lap ${splitEvidence.derivedLap} calculated from total minus the other lap`;
        }
        r.achievedAt = s.achievedAt;
        r.datePrecision = s.datePrecision;
        if (s.dateOverride) r.dateOverride = s.dateOverride;
        r.submittedAt = s.submittedAt || r.submittedAt || null;
        // Review references describe this exact archived result, not an equal-time rerun.
        if (s.id === r.id && s.courseId === r.courseId && s.playerId === r.playerId && s.timeCs === r.timeCs) {
          for (const key of ["sourceLinkRestorationAudit", "submissionClockRestorationAudit",
            "dateBasisReconciliationAudit", "durationBoundaryReview", "videoMetadataReconciliationAudit"])
            if (s[key] !== undefined) r[key] = s[key];
        }
        if (s.delayedSubmission) r.delayedSubmission = true;
        if (matches.some((m) => m.dateUnresolved &&
            m.source?.url === s.source?.url)) r.dateUnresolved = true;
        // A recovered repost can replace an expired image without moving the
        // earliest surviving evidence of the same run to the repost's date.
        r.proofUploadedAt = s.preserveEarlierProofDate
          ? [s.proofUploadedAt, attachmentDate(r.proofImage)]
              .filter(Boolean).sort()[0] || null
          : s.proofUploadedAt || attachmentDate(r.proofImage);
        // A later verified recording may augment an earlier submission whose
        // bot entry omitted the video. Keep the earlier date and use exact
        // source identity so equal-time reruns cannot donate unrelated proof.
        const verifiedVideo = matches.find((m) =>
          m.videoVerified && m.video && m.source?.url === s.source?.url,
        );
        r.video ||= s.video || verifiedVideo?.video || null;
        enrichRecordingEvidence(r, matches);
        const rejectedVideo = matches
          .flatMap((m) => m.rejectedVideos || [])
          .find((evidence) => evidence.url === r.video ||
            (!r.video && matches.some((m) => m.video === evidence.url)));
        if (rejectedVideo) {
          r.videoReference = rejectedVideo.url;
          r.video = null;
          r.videoRejection = rejectedVideo;
          r.notes.push(rejectedVideo.reason);
        }
        const verifiedProof = matches.find((m) => m.proofImageVerified && (m.proofImage || m.proofImageLocal)) ||
          c.submissions.find(m => m.proofImageVerified && (m.proofImage || m.proofImageLocal) &&
            m.status === "community-wr" && m.dateUnresolved &&
            m.playerId === r.playerId && m.timeCs === r.timeCs &&
            appearance && m.tourDateRange?.start === appearance.startDate);
        if (verifiedProof) {
          r.proofImageVerified = true;
          if (verifiedProof.additionalProofImages?.length) {
            r.additionalProofImages = [...new Set([
              ...(r.additionalProofImages || []), ...verifiedProof.additionalProofImages,
            ])];
          }
          if (verifiedProof.reignUnresolved) r.reignUnresolved = true;
          if (verifiedProof.dateUnresolved) r.dateUnresolved = true;
          if (verifiedProof.delayedSubmission) r.delayedSubmission = true;
          r.evidencePublishedAt = verifiedProof.evidencePublishedAt || verifiedProof.observedAt || verifiedProof.submittedAt || null;
          r.observedAt ||= r.evidencePublishedAt;
          r.additionalSources = [...(r.additionalSources || []), verifiedProof.source].filter(Boolean);
          if (r.proofImage && r.proofImage !== verifiedProof.proofImage) {
            r.additionalProofImages = [...new Set([
              ...(r.additionalProofImages || []), r.proofImage,
            ])];
          }
          r.proofImage = verifiedProof.proofImage || null;
          // Keep the preserved file paired with the verified original image.
          // A WR announcement may reference a different, expired attachment.
          if (verifiedProof.proofImageLocal) {
            r.proofImageLocal = verifiedProof.proofImageLocal;
          }
          enrichOriginalProofReviews(r, verifiedProof);
        } else {
          r.proofImage ||= s.proofImage;
        }
        const rejectedProof = matches.flatMap((m) => m.rejectedProofImages || [])
          .find((proof) => proof.url === r.proofImage);
        if (rejectedProof) {
          r.proofImageReference = r.proofImage;
          r.proofImage = null;
          r.proofImageVerified = false;
          r.evidencePublishedAt = null;
          r.proofUploadedAt = null;
          r.proofImageRejection = rejectedProof;
          r.notes.push(rejectedProof.reason);
        }
        r.additionalSources = [...new Map([
          ...(r.additionalSources || []),
          ...matches.flatMap((m) => [m.source, ...(m.additionalSources || [])]),
        ].filter(Boolean).map((source) => [source.url, source])).values()];
        r.notes = [...new Set([...r.notes, ...s.notes])];
        enriched++;
      }
      if (r.dateOverride) {
        r.achievedAt = r.dateOverride.date;
        r.datePrecision = "day";
      }
    }
    const evidenceDate = (r) =>
      r.achievedAt || r.submittedAt || r.proofUploadedAt;
    const accepted = c.submissions
      .filter((r) => r.includeInProgression !== false && evidenceDate(r))
      .sort((a, b) => evidenceDate(a).localeCompare(evidenceDate(b)));
    for (const s of accepted) {
      const knownBefore = c.records.filter((r) =>
        [r.achievedAt, r.submittedAt, r.proofUploadedAt, r.announcedAt]
          .filter(Boolean)
          .some((date) => date <= evidenceDate(s)),
      );
      const best = Math.min(...knownBefore.map((r) => r.timeCs));
      if (s.timeCs > best) continue;
      if (
        !c.records.some(
          (r) => r.timeCs === s.timeCs && r.playerId === s.playerId,
        )
      ) {
        c.records.push({
          ...s,
          announcedAt: evidenceDate(s),
          tourLabel: "Reconstructed from submission evidence",
          status: "reconstructed-contender",
          notes: [
            "Listed submission matching or improving the best record documented before its evidence date. This is a reconstructed contender; incomplete chronology may change its WR status.",
          ],
        });
        person(players.get(s.playerId).name).records.push(s.id);
      }
    }
  }
  fs.writeFileSync(
    "archive/import-issues.json",
    JSON.stringify(errors, null, 2),
  );
  return {
    submissionCount: count,
    acceptedDiscordSubmissions: botCount,
    submissionMessagesCaptured: messages.size,
    attachmentDateMatches: attachmentMatches,
    enrichedRecords: enriched,
    importIssueCount: errors.length,
  };
}
