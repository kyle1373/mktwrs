import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
function assertPublicationDateOrUnknown(record) {
  if (record.dateBasis === "first-screenshot-publication") {
    const first = [record.evidencePublishedAt, record.observedAt, record.submittedAt].filter(Boolean).sort()[0];
    assert.equal(record.recordDate, first.slice(0, 10));
    assert(record.proofImageVerified);
    assert(record.dateUnresolved, "publication date preserves race date uncertainty");
  } else assert.equal(record.recordDate, null);
}

const read = (name) =>
  JSON.parse(
    fs.readFileSync(
      new URL("../public/data/" + name + ".json", import.meta.url),
    ),
  );
const courses = read("courses"),
  players = read("players"),
  tours = read("tours");
test("tied announcements never attach another player's identified recording", () => {
  for (const [courseId, time, owner, other, videoId] of [
    ["wii-daisy-circuit", "1:18.00", "kuri", "p-en", "dqJkcwUDDKk"],
    ["los-angeles-laps-2", "1:13.30", "kuri", "remon", "BZoBMMbmeiw"],
    ["3ds-neo-bowser-city-r", "1:23.88", "kazuo", "nu11", "KZpAAQrVVYE"],
    ["squeaky-clean-sprint", "1:21.62", "phillish", "sasakikojiro", "JHVX8Yw56X4"],
  ]) {
    const course = courses.find(c => c.id === courseId);
    const recorded = course.records.find(r => r.playerId === owner && r.time === time);
    const tied = course.records.find(r => r.playerId === other && r.time === time);
    assert(recorded.video.includes(videoId));
    assert(!tied.video?.includes(videoId));
    if (courseId === "wii-daisy-circuit") {
      assert(tied.video.includes("g1MXSCnFWO0"));
      assert.equal(tied.lapSource.messageId, "1534410727945932830");
      assert.equal(tied.recordDate, "2026-08-05");
      assert.equal(tied.proofImage, null);
    } else {
      assert.equal(tied.video, null);
    }
    assert(!tied.videoBackup);
    assert(tied.videoReference.includes(videoId));
  }
});
test("Halloween uses original submission chronology and surviving video fallback", async () => {
  const { fastestVideo } = await import("../lib/video.mjs");
  const jungle = courses.find(c => c.id === "gcn-dino-dino-jungle-r");
  assert.deepEqual(jungle.records.filter(r => r.recordDate >= "2021-10-20").map(r => r.time), ["1:39.93", "1:39.72", "1:39.61", "1:39.53", "1:39.36", "1:39.32", "1:39.25"]);
  assert.equal(jungle.current.recordDate, "2021-10-26");
  assert(!jungle.records.some(r => ["1:40.16", "1:39.60", "1:40.32"].includes(r.time)), "unresolved earlier runs must not receive invented WR chronology");
  const ice = courses.find(c => c.id === "3ds-rosalina-s-ice-world");
  assert.deepEqual(ice.records.filter(r => r.recordDate >= "2021-10-20").map(r => [r.time,r.recordDate]), [["1:29.85","2021-11-02"],["1:29.83","2021-11-02"],["1:29.78","2021-11-02"]]);
  const video = fastestVideo(ice);
  assert.equal(video.time, "1:29.78");
  assert.deepEqual(video.laps, ["44.84","44.94"]);
  assert.equal(video.isCurrent, true);
  assert.match(video.video, /1455900270009847813/);
  assert.match(video.videoBackup.url, /cdvRa_5DaFw/);
  assert.equal(video.videoBackup.channel, "DIT");
  assert(!ice.records.some(r => r.time === "1:30.05"));
});
test("Autumn original evidence separates personal bests and tied players' recordings", () => {
  const ghost = courses.find(c => c.id === "rmx-ghost-valley-1");
  assert.deepEqual(ghost.records.map(r => r.time), ["1:02.12", "1:01.87", "1:01.40", "1:01.38", "1:01.37", "1:01.35", "1:01.33", "1:01.33"]);
  const kaguya = ghost.records.find(r => r.time === "1:01.40");
  assert.equal(kaguya.submittedAt, "2021-10-06T09:36:26.000Z");
  const dit = ghost.records.find(r => r.playerId === "dit" && r.time === "1:01.33");
  const seboss = ghost.records.find(r => r.playerId === "seboss" && r.time === "1:01.33");
  assert.equal(dit.recordDate, "2021-10-17");
  assert.equal(dit.video, null, "Seboss's footage is not proof of DIT's tied run");
  assert.deepEqual(dit.laps, ["30.70", "30.63"]);
  assert.equal(seboss.submittedAt, "2021-10-20T05:47:51.251Z");
  assert.deepEqual(seboss.laps, ["30.66", "30.67"]);
  assert.match(seboss.video, /FhZOgmYkANs/);
  assert.equal(seboss.durationDays, 0, "the tie was submitted shortly before reset");
  const sunset = courses.find(c => c.id === "gba-sunset-wilds-r");
  assert.deepEqual(sunset.records.filter(r => r.recordDate >= "2021-10-01").map(r => [r.time, r.recordDate]), [["1:10.50", "2021-10-10"], ["1:10.40", "2021-10-11"], ["1:10.24", "2021-10-17"]]);
  assert(!sunset.records.some(r => ["wins", "nick", "haruru"].includes(r.playerId) && r.time === "1:10.53"), "reposts of the same image are not three WR ties");
});
test("migrated tour labels reject later proof uploads and preserve reviewed tour bounds", () => {
  const records = courses.find(c => c.id === "3ds-toad-circuit-r").records;
  const original = records.find(r => r.playerId === "tomegome" && r.time === "1:03.09");
  assert.deepEqual(original.tourDateRange, { start: "2020-01-29", end: "2020-02-11" });
  assert.equal(original.recordDate, "2020-02-02", "use the recovered original post, not the December migration upload");
  assert.equal(original.submittedAt, "2020-02-02T00:07:59.000Z");
  const beach = courses.find(c => c.id === "n64-koopa-troopa-beach").records.find(r => r.playerId === "tomegome" && r.time === "1:13.83");
  assertPublicationDateOrUnknown(beach);
  const former = records.find(r => r.playerId === "astre" && r.time === "1:02.74");
  assert.deepEqual(former.tourDateRange, { start: "2021-08-11", end: "2021-08-24" });
  assertPublicationDateOrUnknown(former);
  assert.equal(former.recordDate, "2021-08-16", "use earliest verified screenshot publication under the archive date policy");
  const tc = courses.find(c => c.id === "3ds-toad-circuit-r");
  assert(!tc.records.some(r => r.time === "1:03.16"));
  const footage = tc.submissions.find(r => r.id === "curated-valentines-2020-tome-video-10316");
  assert.deepEqual(footage.laps, ["31.56", "31.60"]);
  assert.match(footage.videoBackup.url, /XVFgHPQWQeA/);
});
test("Winter 2019 uses original post dates and keeps unconfirmed runs out of WR history", () => {
  const mountain = courses.find(c => c.id === "3ds-rock-rock-mountain");
  const final = mountain.records.find(r => r.time === "1:47.53");
  assert.equal(final.recordDate, "2019-12-02");
  assert.equal(final.submittedAt, "2019-12-02T10:22:52.000Z");
  assert(final.additionalSources.some(s => s.url.endsWith("1201446628642541569")));
  const mario = courses.find(c => c.id === "snes-mario-circuit-3");
  const record = mario.records.find(r => r.time === "1:07.37");
  assert.equal(record.recordDate, "2019-11-23", "use the original image, not the later video date");
  assert.deepEqual(record.laps, ["33.61", "33.76"]);
  assert.equal(record.video, "https://x.com/tomegome_g/status/1198954478734458880");
  const successor = mario.records.find(r => r.time === "1:07.36");
  assert.equal(successor.recordDate, "2019-11-25");
  assert(successor.additionalSources.some(s => s.url.endsWith("1198950368014585857")), "outgoing holder concedes the record in the original reply");
  assert.equal(record.durationDays, 2, "the recovered successor ends this record on November 25");
  for (const time of ["1:07.98", "1:07.62", "1:07.49"])
    assert(!mario.records.some(r => r.time === time), "a verified run alone does not establish WR status");
  const choco = courses.find(c => c.id === "snes-choco-island-2");
  const candidate = choco.submissions.find(r => r.time === "0:49.72" && r.id.startsWith("curated-winter-2019-original-"));
  assert.equal(candidate.submittedAt, "2019-11-20T10:32:52.000Z");
  assert.deepEqual(candidate.laps, ["25.12", "24.60"]);
  assert.equal(candidate.includeInProgression, false);
  assert(!choco.records.some(r => r.time === "0:49.72"));
});
test("2019 documentary records retain provenance and unknown intermediate dates", () => {
  const toad = courses.find(c => c.id === "3ds-toad-circuit").records;
  const nova = toad.find(r => r.playerId === "nova" && r.time === "1:05.33");
  assert.equal(nova.recordDate, "2019-10-23");
  assert.equal(nova.evidenceBasis, "contemporary-wr-history");
  assert.equal(nova.proofImage, null);
  assert.deepEqual(nova.laps, ["32.92", "32.41"]);
  const kaguya = toad.find(r => r.playerId === "nu11" && r.time === "1:04.54");
  assert(kaguya.additionalSources.some(s => s.messageId === "638150966474178570"));
  const nbc = courses.find(c => c.id === "3ds-neo-bowser-city").records;
  const astre = nbc.find(r => r.time === "1:25.80");
  assert.equal(astre.recordDate, "2019-11-05");
  assert.equal(astre.durationDays, 0);
  assert.deepEqual(astre.laps, ["42.84", "42.96"]);
  assert.equal(astre.source.postId, "1191836098424639489");
  assert(!astre.additionalSources.some(s => s.messageId === "773503398972489728"),
    "equal-time 2020 rerun must not donate its source or laps to the 2019 WR");
  assert.equal(nbc.find(r => r.time === "1:25.70").recordDate, "2019-11-05");
  const jungle = courses.find(c => c.id === "gcn-dino-dino-jungle").records;
  assert.equal(jungle.find(r => r.time === "1:34.43").recordDate, "2019-10-31");
  assert.deepEqual(jungle.find(r => r.time === "1:35.69").laps, ["47.85", "47.84"]);
});
test("Cooking Tour preserves WR exchanges, original splits and verified proof dates", () => {
  const dp = courses.find((c) => c.id === "snes-donut-plains-1");
  const record = (time, player) => dp.records.find((r) => r.time === time && r.playerId === player);
  assert.equal(record("0:51.42", "brandon").video, "https://youtu.be/9Q3Czv54-jo");
  assert.equal(record("0:51.22", "nu11").proofField, "previous-best");
  assert.deepEqual(record("0:50.30", "kazuo").laps, ["25.24", "25.06"]);
  assert.deepEqual(record("0:50.08", "kazuo").laps, ["25.23", "24.85"]);
  assert.equal(record("0:49.77", "kazuo").recordDate, "2020-06-09");
  assert.equal(record("0:49.77", "kazuo").video, null);
  assert(record("0:49.77", "kazuo").videoRejection);
  assert.equal(record("0:50.59", "nu11").durationDays, 0,
    "the recovered June 3 stream-backed 50.53 ends the 50.59 reign the same day");
  assert.equal(record("0:50.53", "nu11").recordDate, "2020-06-03");
  assert.equal(record("0:50.53", "kazuo").recordDate, "2020-06-04");
  assert.equal(record("0:49.77", "kazuo").durationDays, 9,
    "the recovered November 4 successor resolves eight Cooking Tour days plus one return-tour day");
  assert(!record("0:49.97", "nu11"), "a later PB slower than the standing WR is excluded");
  const wp = courses.find((c) => c.id === "ds-waluigi-pinball-r");
  const finish = wp.records.find((r) => r.time === "1:45.91");
  assert.equal(finish.recordDate, "2020-06-17");
  assert.deepEqual(finish.laps, ["52.87", "53.04"]);
  assert.equal(wp.records.find((r) => r.time === "1:46.00").laps, null);
  assert(!wp.records.some((r) => ["1:46.15", "1:46.05"].includes(r.time)));
});
test("Peach Tour preserves WR ties, text-only improvements and evidence-based splits", () => {
  const rmx = courses.find(c => c.id === "rmx-mario-circuit-1").records;
  const at = time => rmx.find(r => r.time === time);
  assert.equal(at("1:32.16").playerId, "access");
  assert.deepEqual(at("1:32.16").laps, ["46.07", "46.09"]);
  assert.equal(at("1:31.42").proofField, "previous-best");
  assert.equal(at("1:31.12").recordDate, "2020-06-17");
  assert.deepEqual(at("1:31.15").laps, ["45.44", "45.71"]);
  assert.deepEqual(rmx.filter(r => r.time === "1:30.79").map(r => r.playerId).sort(), ["nu11", "superfx"]);
  assert.deepEqual(at("1:30.50").laps, ["45.18", "45.32"]);
  assert.equal(at("1:30.38").recordDate, "2020-06-21");
  assert.equal(at("1:30.38").durationDays, 10);
  assert(!rmx.some(r => r.playerId === "tomegome" && r.time === "1:31.04"));
  const frappe = courses.find(c => c.id === "n64-frappe-snowland-r").records;
  assert.deepEqual(frappe.filter(r => r.time === "1:21.92").map(r => r.playerId).sort(), ["phillish", "troy"]);
  assert.deepEqual(frappe.find(r => r.time === "1:21.05").laps, ["40.53", "40.52"]);
  assert.equal(frappe.find(r => r.time === "1:20.85").recordDate, "2020-06-29");
});
test("every course record and submission has valid references and integer time units", () => {
  const ids = new Set(players.map((p) => p.id));
  const tourIds = new Set(tours.map((t) => t.id));
  for (const c of courses) {
    assert(c.name && c.id);
    for (const r of [...c.records, ...c.submissions]) {
      assert.equal(r.courseId, c.id);
      assert(ids.has(r.playerId), r.playerId);
      assert(Number.isInteger(r.timeCs) && r.timeCs > 0);
      assert(/^https:\/\//.test(r.source.url));
      assert(r.mushrooms == null || r.mushrooms.every(Number.isInteger));
    }
    for (const a of c.appearances) {
      assert(tourIds.has(a.tourId));
      assert(a.startDate < a.endDate);
    }
  }
});
test("same-time ties retain independent player identities", () => {
  const c = courses.find((c) => c.id === "snes-vanilla-lake-1");
  const ties = c.records.filter((r) => r.time === "0:34.20");
  assert(ties.some((r) => r.playerId === "dit"));
  assert(ties.some((r) => r.playerId === "nekozuki"));
});

test("Daisy Hills R retains the April 2020 WR tie with each player's own laps", () => {
  const course = courses.find((c) => c.id === "3ds-daisy-hills-r");
  const tied = course.records.filter((r) => r.time === "1:21.28");
  const kaguya = tied.find((r) => r.playerId === "nu11");
  const kazuo = tied.find((r) => r.playerId === "kazuo");
  assert.deepEqual(kaguya.laps, ["40.59", "40.69"]);
  assert.deepEqual(kazuo.laps, ["40.60", "40.68"]);
  assert.equal(kaguya.recordDate, "2020-04-14");
  assert.equal(kazuo.recordDate, "2020-04-14");
  assert.equal(kazuo.video, "https://youtu.be/Z5zwcLad-Fo");
  const next = course.records.find((r) => r.time === "1:20.94");
  assert.equal(next.playerId, "nu11");
  assert.equal(next.recordDate, "2020-04-15");
  assert.deepEqual(next.laps, ["40.46", "40.48"]);
  assert.equal(next.video, null, "the later demonstration video has a corrected title and is a different run");
  for (const r of [kaguya, kazuo, next]) {
    assert(r.proofImageLocal && fs.existsSync(new URL("../public" + r.proofImageLocal, import.meta.url)));
  }
});

test("Trick Tour keeps original WR attempts distinct from later self-ties", () => {
  const nbc = courses.find((c) => c.id === "3ds-neo-bowser-city-r");
  const first = nbc.records.find((r) => r.time === "1:24.18");
  assert.deepEqual(first.laps, ["42.08", "42.10"]);
  assert.equal(nbc.records.filter((r) => r.time === "1:24.18").length, 1);
  const tied = nbc.records.filter((r) => r.time === "1:23.88");
  assert.equal(tied.find((r) => r.playerId === "nu11").recordDate, "2020-05-01");
  assert.equal(tied.find((r) => r.playerId === "kazuo").recordDate, "2020-05-03");
  const vl = courses.find((c) => c.id === "snes-vanilla-lake-1");
  assert.deepEqual(vl.records.find((r) => r.time === "0:34.64").laps, ["16.77", "17.87"]);
  assert.deepEqual(vl.records.find((r) => r.time === "0:34.62").laps, ["17.32", "17.30"]);
  assert.equal(vl.records.find((r) => r.time === "0:34.62").recordDate, "2020-05-03");
});

test("public WR history never promotes an inferred contender or ordinary submission", () => {
  for (const c of courses) {
    assert(
      c.records.every((r) =>
        ["announced", "community-wr", "leaderboard-wr"].includes(r.status),
      ),
    );
    assert(c.currentHolders.every((r) => c.records.some((n) => n.id === r.id)));
    for (const r of c.records)
      if (r.recordDate && r.tourDateRange && !r.achievedAt && r.dateBasis !== "first-screenshot-publication") {
        const proofTime = Date.parse(r.dateBasis === "submission-date" ? r.submittedAt : r.proofUploadedAt);
        assert(
          proofTime >= Date.parse(`${r.tourDateRange.start}T06:00:00Z`) &&
            proofTime < Date.parse(`${r.tourDateRange.end}T06:00:00Z`) + 86400000,
        );
      }
  }
});

test("slash-separated WR ties resolve to separate players without counting repeated announcements twice", () => {
  const course = courses.find((c) => c.id === "piranha-plant-cove-2");
  assert(course.currentHolders.some((r) => r.playerId === "mb3"));
  assert(course.currentHolders.some((r) => r.playerId === "nekozuki"));
  assert.equal(
    course.records.filter((r) => r.playerId === "mb3" && r.time === "1:29.34")
      .length,
    1,
  );
  assert(!players.some((p) => p.id === "mb3-nekozuki"));
});


test("Anniversary 2026 retains intermediate WRs, exact submission dates and the Athens tie", () => {
  for (const [courseId, expected] of [
    ["madrid-drive-3", [["1:19.44", "2026-09-20"], ["1:19.42", "2026-09-27"], ["1:19.39", "2026-09-27"]]],
    ["rome-avanti-3", [["1:16.92", "2026-09-25"], ["1:16.82", "2026-09-27"]]],
  ]) {
    const c = courses.find(c => c.id === courseId);
    for (const [time, date] of expected) {
      const r = c.records.find(r => r.time === time);
      assert(r, `${courseId} ${time}`);
      assert.equal(r.recordDate, date);
      assert(r.proofImageLocal);
      assert.equal(r.laps.reduce((sum, lap) => sum + Math.round(Number(lap) * 100), 0), r.timeCs);
    }
  }
  const athens = courses.find(c => c.id === "athens-dash-3");
  assert.deepEqual(athens.currentHolders.map(r => r.playerId).sort(), ["dit", "nekozuki"]);
});

test("published player portraits exist locally and refreshed identities match Discord IDs", () => {
  const portraits = JSON.parse(fs.readFileSync(new URL("../archive/player-portraits.json", import.meta.url)));
  for (const p of players) {
    if (!p.avatar) continue;
    assert(p.avatar.startsWith("/assets/players/"));
    assert(fs.existsSync(new URL("../public" + p.avatar, import.meta.url)));
    if (portraits[p.id]?.path === p.avatar) {
      assert.equal(portraits[p.id].discordId, p.discordId);
      assert(portraits[p.id].url.includes(`/avatars/${p.discordId}/`));
    }
  }
});

test("Halloween 2019 table retains credited players and achievement days rather than repost date", () => {
  for (const [courseId, playerId, time, date] of [
    ["3ds-toad-circuit", "yersoncz", "1:04.85", "2019-10-25"],
    ["3ds-neo-bowser-city", "unreal91", "1:26.08", "2019-10-24"],
    ["gcn-dino-dino-jungle", "sonicpacker", "1:35.70", "2019-10-25"],
  ]) {
    const r = courses.find(c => c.id === courseId).records.find(r => r.playerId === playerId && r.time === time);
    assert(r);
    assert.equal(r.recordDate, date);
    assert.equal(r.dateBasis, playerId === "yersoncz" ? "documented-date-override" : "source-date");
    if (playerId === "yersoncz") {
      assert.equal(r.dateOverride.source.range, "A20:J20");
      assert.equal(r.dateOverride.date, date);
    }
    assert.equal(r.observedAt, "2019-10-26T02:37:11.857Z");
    assert(!r.video || !/\.(png|jpe?g)(\?|$)/i.test(r.video));
    assert(r.proofImageLocal.startsWith("/assets/proof/"));
    assert(fs.existsSync(new URL("../public" + r.proofImageLocal, import.meta.url)));
  }
});

test("Flower Tour retains the shared record and each subsequent improvement with actual run splits", () => {
  const c = courses.find(c => c.id === "3ds-shy-guy-bazaar-r");
  for (const [playerId, time, date, laps] of [
    ["nu11", "1:39.10", "2020-05-08", ["49.67", "49.43"]],
    ["kazuo", "1:39.10", "2020-05-09", ["49.72", "49.38"]],
    ["kazuo", "1:39.08", "2020-05-09", ["49.50", "49.58"]],
    ["kazuo", "1:39.00", "2020-05-10", ["49.77", "49.23"]],
  ]) {
    const matches = c.records.filter(r => r.playerId === playerId && r.time === time);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].recordDate, date);
    assert.deepEqual(matches[0].laps, laps);
    assert(matches[0].proofImageLocal);
  }
  assert(!c.records.some(r => r.time === "1:38.94"), "best individual laps are not a completed run");
});

test("Jungle Tour preserves the WR exchange, previous-best evidence, and first-run splits", () => {
  const c = courses.find(c => c.id === "snes-mario-circuit-1r");
  const tie = c.records.filter(r => r.time === "0:42.69");
  assert.deepEqual(tie.map(r => r.playerId).sort(), ["brandon", "nu11"]);
  const previous = c.records.find(r => r.time === "0:42.54");
  assert.equal(previous.playerId, "nu11");
  assert.equal(previous.recordDate, "2020-05-20");
  assert.equal(previous.dateBasis, "source-date");
  assert.equal(previous.proofField, "previous-best");
  assert.equal(previous.submittedAt, null);
  assert.deepEqual(previous.laps, [null, null]);
  assert.deepEqual(c.records.find(r => r.time === "0:42.75").laps, ["21.49", "21.26"]);
  assert.deepEqual(c.records.find(r => r.time === "0:42.17").laps, ["21.37", "20.80"]);
  assert.equal(c.records.filter(r => r.time === "0:42.17").length, 1);
  assert.equal(c.records.find(r => r.time === "0:42.29").playerId, "kazuo");
  assert(!c.records.find(r => r.time === "0:42.29").video, "Kaguya's later 42.29 video is a different run");
  assert.equal(c.current.recordDate, "2020-05-26");
  assert.deepEqual(c.current.laps, ["21.27", "20.80"]);
  assert(!c.records.some(r => r.time === "0:42.00"), "best-lap sum is not a completed run");
});

test("Marine Tour preserves ties, intermediate records and rejects a mismatched example video", () => {
  const mc = courses.find(c => c.id === "3ds-mario-circuit");
  const tie = mc.records.filter(r => r.time === "1:35.95");
  assert.deepEqual(tie.map(r => r.playerId).sort(), ["phillish", "superfx"]);
  assert.deepEqual(tie.find(r => r.playerId === "superfx").laps, ["47.77", "48.18"]);
  assert.equal(mc.records.filter(r => r.time === "1:36.16").length, 1, "repeat self-tie is not another record");
  const last = mc.records.find(r => r.time === "1:35.47");
  assert.equal(last.recordDate, "2020-07-04");
  assert.deepEqual(last.laps, ["47.74", "47.73"]);
  const ci = courses.find(c => c.id === "rmx-choco-island-1");
  assert.deepEqual(ci.records.filter(r => ["1:13.88", "1:13.83"].includes(r.time)).map(r => [r.playerId, r.recordDate]),
    [["kazuo", "2020-07-03"], ["kazuo", "2020-07-03"]]);
  assert(!ci.records.some(r => r.time === "1:14.63"), "the recovered earlier Kazuo records make this later run a personal best");
  const middle = ci.records.find(r => r.time === "1:12.71");
  assert.equal(middle.playerId, "nu11");
  assert.equal(middle.submittedAt, "2020-07-05T08:40:03.608Z");
  assert.deepEqual(middle.laps, ["36.36", "36.35"]);
  assert.equal(middle.proofField, "leaderboard");
  assert(middle.proofImageLocal);
  const kaz = ci.records.find(r => r.time === "1:12.36");
  assert.equal(kaz.recordDate, "2020-07-06");
  assert.equal(kaz.video, null, "linked 1:12.42 example is not proof of 1:12.36");
  assert.deepEqual(kaz.laps, ["36.29", "36.07"]);
  assert(!ci.records.some(r => r.time === "1:12.42"));
});

test("Exploration Tour keeps both records in a paired post and the final morning exchange", () => {
  const ddj = courses.find(c => c.id === "gcn-dino-dino-jungle");
  const vl = courses.find(c => c.id === "snes-vanilla-lake-1r");
  const paired = [ddj.records.find(r => r.time === "1:33.66"), vl.records.find(r => r.time === "0:34.45")];
  assert.deepEqual(paired.map(r => r.laps), [["46.97", "46.69"], ["17.48", "16.97"]]);
  assert(paired.every(r => r.submittedAt === "2020-07-22T12:25:17.814Z"));
  assert.notEqual(paired[0].proofImageLocal, paired[1].proofImageLocal);
  const middle = ddj.records.find(r => r.time === "1:33.79");
  assert.equal(middle.proofField, "previous-best");
  assert.equal(middle.submittedAt, null);
  assert.deepEqual(middle.laps, [null, null]);
  const wins = vl.records.find(r => r.playerId === "wins" && r.time === "0:34.44");
  assert.equal(wins.recordDate, "2020-07-28");
  assert.deepEqual(wins.laps, ["17.37", "17.07"]);
  assert.equal(wins.durationDays, 1);
  assert.equal(vl.current.recordDate, "2020-07-29");
  assert.equal(vl.current.submittedAt, "2020-07-29T03:09:09.289Z");
  assert.deepEqual(vl.current.laps, ["17.28", "17.10"]);
  assert(!vl.records.some(r => r.time === "0:33.87"), "corrected lap typo is not a record");
  assert(!ddj.records.some(r => r.time === "1:33.91" || r.time === "1:33.99"), "slower video runs are not new records");
});

test("Paris 2019 preserves the original Mario Circuit exchange instead of dating later reposts", () => {
  const mc = courses.find(c => c.id === "snes-mario-circuit-1");
  const r = time => mc.records.find(r => r.time === time);
  assert.equal(r("0:48.67").recordDate, "2019-11-06");
  assert.equal(r("0:48.44").submittedAt, "2019-11-07T15:29:09.000Z");
  assert.equal(r("0:48.39").submittedAt, "2019-11-07T15:48:39.036Z");
  assert.equal(r("0:48.39").observedAt, "2019-11-09T22:44:31.896Z");
  assert.deepEqual(r("0:48.39").laps, ["24.27", "24.12"]);
  assert.equal(r("0:48.39").video, null, "unavailable original video is not claimed as verified proof");
  assert.equal(r("0:48.36").recordDate, "2019-11-14");
  assert.equal(r("0:48.29").recordDate, "2019-11-14");
  assert.deepEqual(r("0:48.29").laps, ["24.19", "24.10"]);
  assert(r("0:48.29").proofImageLocal);
  assert.equal(r("0:48.29").video, null);
  assert(!r("0:48.66"), "this Discord submission is slower than the already established Tomegome record");
});

test("Wild West keeps the recovered WR exchanges and leaves delayed reigns unresolved", () => {
  const bc = courses.find(c => c.id === "gba-bowser-s-castle-2");
  const dp = courses.find(c => c.id === "snes-donut-plains-1r");
  assert(!bc.records.some(r => ["1:21.49", "1:20.95", "1:18.51"].includes(r.time)),
    "earlier text records disqualify the later personal bests, and the edited image is excluded");
  assert.equal(bc.records.find(r => r.time === "1:20.88").submittedAt, "2020-07-29T06:25:37.618Z");
  assert.equal(bc.current.recordDate, "2020-08-09");
  assert.equal(bc.current.delayedSubmission, true);
  assert.equal(bc.current.durationDays, null);
  assert.equal(bc.records.find(r => r.time === "1:19.66").durationDays, null,
    "the posting date of a delayed successor cannot establish the preceding reign length");
  const player = dp.records.find(r => r.time === "0:51.54");
  assert.equal(player.player, "Player->1.13");
  assert.deepEqual(player.laps, ["25.76", "25.78"]);
  assert(player.proofImageLocal);
  for (const time of ["0:50.01", "0:49.85"]) {
    const previous = dp.records.find(r => r.time === time);
    assert.equal(previous.proofField, "previous-best");
    assertPublicationDateOrUnknown(previous);
    assert(previous.proofImageLocal);
  }
  assert.equal(dp.records.find(r => r.time === "0:49.91").durationDays, null);
  const last = dp.records.filter(r => ["0:49.91", "0:49.84", "0:49.77", "0:49.69"].includes(r.time));
  assert.deepEqual(last.map(r => r.playerId), ["nu11", "kazuo", "saki7", "nu11"]);
  assert.deepEqual(last.at(-1).laps, ["24.85", "24.84"]);
  assert.equal(last.at(-1).submittedAt, "2020-08-07T16:01:01.896Z");
  assert.equal(last.at(-1).video, null, "the unavailable video is retained as a reference, not a working proof link");
});

test("Super Mario Kart Tour separates WR exchanges from slower submissions and mismatched videos", () => {
  const rr = courses.find(c => c.id === "n64-royal-raceway");
  const gv = courses.find(c => c.id === "snes-ghost-valley-1r");
  assert(!rr.records.some(r => ["1:36.68", "1:36.04", "1:35.84", "1:34.38"].includes(r.time)));
  assert.deepEqual(rr.records.filter(r => r.time === "1:34.92").map(r => r.playerId), ["nu11", "superfx"]);
  const final = rr.records.find(r => r.time === "1:34.04");
  assert.equal(final.submittedAt, "2020-09-14T11:22:15.610Z");
  assert.deepEqual(final.laps, ["47.11", "46.93"]);
  assert.equal(final.video, null, "the 1:34.55 video must not remain linked to 1:34.04");
  assert(final.proofImageLocal);
  assert(!gv.records.some(r => ["0:41.56", "0:41.43", "0:41.28"].includes(r.time)));
  assert(gv.records.find(r => r.time === "0:41.66").identityUnresolved);
  assertPublicationDateOrUnknown(gv.records.find(r => r.time === "0:40.85"));
  const fx = gv.records.find(r => r.time === "0:40.59" && r.playerId === "superfx");
  assert.equal(fx.durationDays, 2);
  assert.equal(fx.video, "https://mktwrs.com/assets/proof/superfx-gv1r-4059-20200910.mp4");
  assert.equal(gv.records.find(r => r.time === "0:40.52").recordDate, "2020-09-12");
});

test("Pirate Tour restores exchanges, ties and original dates without accepting mismatched proofs", () => {
  const mc = courses.find(c => c.id === "snes-mario-circuit-1");
  const bc = courses.find(c => c.id === "gba-bowser-s-castle-1r");
  const exchanges = mc.records.filter(r => ["0:42.13", "0:42.12", "0:42.09", "0:42.04", "0:41.94"].includes(r.time));
  assert.deepEqual(exchanges.map(r => r.playerId), ["nu11", "wins", "nu11", "wins", "nu11"]);
  assert.equal(mc.current.recordDate, "2020-08-17");
  assert.equal(mc.current.durationDays, 9);
  assert.deepEqual(mc.records.find(r => r.time === "0:42.92").laps, [null, null], "inconsistent message splits must not be silently corrected");
  assert.equal(mc.records.find(r => r.time === "0:42.12").video, "https://www.youtube.com/watch?v=v3PoyZBWaXs");
  assert(!bc.records.some(r => ["1:00.71", "1:00.76", "1:00.62"].includes(r.time)), "later personal bests and contradictory images do not establish WRs");
  const ties = bc.records.filter(r => r.time === "1:00.63");
  assert.deepEqual(ties.map(r => [r.playerId, r.recordDate]), [["tomegome", "2020-08-12"], ["nu11", "2020-08-13"]]);
  const intermediate = bc.records.find(r => r.time === "1:00.44");
  assertPublicationDateOrUnknown(intermediate);
  assert.equal(intermediate.proofField, "previous-best");
  assert(intermediate.proofImageLocal);
  const tome = bc.records.find(r => r.time === "1:00.31");
  assert.equal(tome.submittedAt, "2020-08-13T17:38:14.000Z");
  assert.equal(tome.video, "https://www.youtube.com/watch?v=gMlt02DTps8");
  assert.equal(bc.current.recordDate, "2020-08-21");
  assert.deepEqual(bc.current.laps, ["30.11", "30.18"]);
  assert.equal(bc.current.video, null, "the linked 1:00.30 non-PB is not proof of 1:00.29");
});

test("Toad vs Toadette restores exchanges while excluding PBs and post-tour dates", () => {
  const dp = courses.find(c => c.id === "snes-donut-plains-1");
  assert.deepEqual(dp.records.filter(r => ["0:49.67", "0:49.65", "0:49.62", "0:49.57"].includes(r.time)).map(r => [r.playerId, r.recordDate]), [
    ["n", "2021-11-04"], ["player-e382bce38389", "2021-11-12"], ["aki", "2021-11-13"], ["aki", "2021-11-15"],
  ]);
  const kd = courses.find(c => c.id === "n64-kalimari-desert-2");
  const tie = kd.records.find(r => r.playerId === "nhspeedy" && r.time === "1:03.39");
  assert.equal(tie.recordDate, "2021-11-16");
  assert.deepEqual(tie.laps, ["29.53", "33.86"]);
  assert(!kd.records.some(r => r.recordDate?.startsWith("2021-11") && ["1:03.48", "1:03.46", "1:03.45"].includes(r.time)));
  const rc = courses.find(c => c.id === "rmx-choco-island-1r");
  assert.deepEqual(rc.records.map(r => r.time), ["1:13.05", "1:12.50", "1:12.48", "1:12.34", "1:12.21", "1:12.19", "1:12.03"]);
  assertPublicationDateOrUnknown(rc.current);
  assert.equal(rc.records.find(r => r.time === "1:12.19").videoCoverage, "partial");
  assert(rc.records.slice(0, 6).every(r => r.proofImageLocal));
  assert(!rc.records.some(r => ["1:12.18", "1:52.83"].includes(r.time)));
});

test("Sky 2022 restores exchanges without withdrawn input errors, duplicate players or mismatched footage", () => {
  const course = courses.find(c => c.id === "rmx-ghost-valley-1r");
  assert.deepEqual(course.records.map(r => [r.playerId, r.time]), [
    ["kmello", "1:01.99"], ["n", "1:01.85"], ["wins", "1:01.81"],
    ["spartacurtyt", "1:01.78"], ["wins", "1:01.76"], ["wins", "1:01.69"],
    ["spartacurtyt", "1:01.60"], ["spartacurtyt", "1:01.57"],
    ["nu11", "1:01.53"], ["spartacurtyt", "1:01.50"],
  ]);
  assert.equal(course.current.submittedAt, "2022-02-28T12:23:49.312Z");
  assert.deepEqual(course.current.laps, ["30.78", "30.72"]);
  assert.match(course.current.video, /_oHloCNsZ2Y/);
  const nu = course.records.find(r => r.playerId === "nu11");
  assert.match(nu.video, /cNc8nLRaswU/);
  assert.deepEqual(nu.laps, ["30.73", "30.80"]);
  assert(!course.records.some(r => ["1:01.47", "1:00.80", "1:01.67", "1:01.59", "1:01.54"].includes(r.time)));
  assert(course.records.every(r => r.proofImageLocal?.startsWith("/assets/proof/")));
});

test("Mii Tour respects prior all-time records and restores the intervening Wakinyo record", () => {
  const rainbow = courses.find(c => c.id === "rmx-rainbow-road-1");
  assert.deepEqual(rainbow.records.filter(r => r.recordDate >= "2022-03-09").map(r => [r.playerId,r.time,r.recordDate]), [
    ["wakinyo","1:18.94","2022-03-15"], ["nu11","1:18.82","2022-03-21"],
  ]);
  assert.equal(rainbow.current.submittedAt, "2022-03-21T02:16:18Z");
  assert.deepEqual(rainbow.current.laps,["39.64","39.18"]);
  assert.match(rainbow.current.video,/OFFJGT-J0w4/);
  assert(!rainbow.records.some(r => ["1:22.25","1:21.40","1:21.31","1:20.95","1:20.12","1:19.05","1:18.84"].includes(r.time)));
  const desert = courses.find(c => c.id === "n64-kalimari-desert-2r");
  assert.deepEqual(desert.records.filter(r => r.recordDate >= "2022-03-09").map(r => [r.playerId,r.time]),[["hilton","1:04.30"]]);
  const hilton=desert.records.find(r=>r.playerId==="hilton");
  assert.equal(hilton.submittedAt,"2022-03-16T21:37:18.218Z");
  assert.deepEqual(hilton.laps,["29.07","35.23"]);
  assert(hilton.proofImageLocal?.startsWith("/assets/proof/"));
});

test("Samurai Tour restores the Sucha/Nu11 exchange and keeps verified splits from the same source", () => {
  const wario = courses.find(c => c.id === "3ds-wario-shipyard-r");
  assert.deepEqual(wario.records.map(r => r.time), ["1:38.31","1:37.92","1:37.69","1:37.55","1:37.49","1:37.44","1:37.37","1:37.36"]);
  const sucha=wario.records.find(r=>r.time==="1:37.55");
  assert.equal(sucha.recordDate,"2022-03-26");
  assert.equal(sucha.playerId,"player-e38199e38184e3819df09f90ba");
  assert.deepEqual(sucha.laps,["48.75","48.80"]);
  assert(wario.records.every(r=>r.proofImageLocal?.startsWith("/assets/proof/")));
  assert.match(wario.current.video,/TV9Eybyk4ck/);
  const vanilla=courses.find(c=>c.id==="rmx-vanilla-lake-1");
  assert.deepEqual(vanilla.records.filter(r=>r.recordDate>="2022-03-23").map(r=>r.time),["1:02.42","1:02.36","1:02.24","1:02.22"]);
  assert.deepEqual(vanilla.current.laps,["31.29","30.93"]);
  assert.equal(vanilla.current.submittedAt,"2022-03-25T16:21:36.451Z");
  assert.match(vanilla.current.video,/1511617819779207176/);
  assert.equal(vanilla.records.filter(r=>r.time==="1:02.44").length,1);
});

test("Yoshi 2022 restores opening records and the distinct N/Nu11 exchange without accepting bot typos", () => {
  const sky = courses.find(c => c.id === "gba-sky-garden");
  const opening = sky.records.filter(r => r.recordDate?.startsWith("2022-04"));
  assert.deepEqual(opening.map(r => r.time), ["1:04.98", "1:04.68", "1:04.44", "1:04.20", "1:04.13"]);
  assert.equal(opening[3].recordDate, "2022-04-07");
  assert.deepEqual(opening[4].laps, ["32.05", "32.08"]);
  assert(!sky.records.some(r => ["1:02.68", "1:04.97", "1:04.41"].includes(r.time)));
  const castle = courses.find(c => c.id === "3ds-bowser-s-castle-r");
  const april = castle.records.filter(r => r.recordDate?.startsWith("2022-04"));
  assert.deepEqual(april.map(r => r.time), ["1:39.89", "1:39.60", "1:39.53", "1:39.50", "1:39.38", "1:39.19", "1:39.12", "1:38.88", "1:38.87", "1:38.84", "1:38.72", "1:38.64", "1:38.59", "1:38.39"]);
  assert.equal(april[7].playerId, "nu11");
  assert.equal(april[8].playerId, "n");
  assert.equal(april[8].recordDate, "2022-04-10");
  assert.deepEqual(april[10].laps, ["49.29", "49.43"]);
  assert.match(april[10].video, /963827033220206683/);
  assert.equal(april[10].recordDate, "2022-04-11");
  assert.match(april[12].video, /yHN3K-z03o0/);
  assert([...opening, ...april].every(r => r.proofImageLocal?.startsWith("/assets/proof/")));
});

test("Amsterdam restores superseded records while respecting the prior all-time WR", () => {
  const rainbow = courses.find(c => c.id === "rmx-rainbow-road-2");
  const tour = rainbow.records.filter(r => r.recordDate >= "2022-04-20" && r.recordDate < "2022-05-04");
  assert.deepEqual(tour.map(r => r.time), ["1:21.52", "1:21.43", "1:21.38", "1:21.37"]);
  assert.equal(tour[0].submittedAt, "2022-04-23T12:06:48.908Z");
  assert(!tour[0].proofImageLocal);
  assert(tour[0].notes.some(n => n.includes("unavailable")));
  assert.equal(tour[2].playerId, "player-e38199e38184e3819df09f90ba");
  assert.deepEqual(tour[2].laps, ["40.73", "40.65"]);
  assert.match(tour[2].source.url, /969894027648466944/);
  assert(!tour.some(r => ["1:21.66", "1:21.57", "1:21.47"].includes(r.time)));
  const choco = courses.find(c => c.id === "snes-choco-island-1r");
  assert.deepEqual(choco.records.map(r => [r.playerId, r.time]), [
    ["retro", "0:41.98"], ["nu11", "0:41.00"], ["nu11", "0:40.79"],
    ["nu11", "0:40.69"], ["wins", "0:40.66"],
  ]);
  assert.equal(choco.current.recordDate, "2022-04-25");
  assert.deepEqual(choco.current.laps, ["20.46", "20.20"]);
  assert.match(choco.current.video, /1521752102640439298/);
  assert(choco.records.every(r => r.proofImageLocal));
});

test("Doctor Tour restores the Daisy Hills exchanges without backdating an undisclosed video", () => {
  const daisy = courses.find(c => c.id === "3ds-daisy-hills-r");
  const tour = daisy.records.filter(r => r.recordDate >= "2022-05-04" && r.recordDate <= "2022-05-18");
  assert.deepEqual(tour.map(r => r.time), ["1:20.88", "1:20.82", "1:20.78", "1:20.60", "1:20.53", "1:20.38", "1:20.26", "1:20.21", "1:20.09", "1:19.95"]);
  assert.equal(tour[3].playerId, "nu11");
  assert.equal(tour[8].recordDate, "2022-05-17");
  assert.deepEqual(tour[8].laps, ["40.08", "40.01"]);
  assert.match(tour[8].video, /lmAiDVHqHwg/);
  assert.equal(tour[9].submittedAt, "2022-05-18T05:55:34.604Z");
  const report = JSON.parse(fs.readFileSync("archive/doctor-2022-reconciliation.json", "utf8"));
  assert(report.confirmedChanges.find(r => r.player === "Fireball").notes.some(n => n.includes("May 13 upload timestamp")));
  assert.match(tour[7].video, /1524705707051868161/);
  assert.deepEqual(tour[7].laps, ["40.11", "40.10"]);
  assert(tour.every(r => r.proofImageLocal?.startsWith("/assets/proof/")));
  assert(!tour.some(r => ["1:20.75", "1:20.71", "1:20.36", "1:20.11"].includes(r.time)));
  const cheep = courses.find(c => c.id === "gba-cheep-cheep-island");
  assert.deepEqual(cheep.records.filter(r => r.recordDate >= "2022-05-04").map(r => r.time), ["1:11.75"]);
  assert.deepEqual(cheep.current.laps, ["35.92", "35.83"]);
  assert.equal(cheep.current.submittedAt, "2022-05-05T05:03:04.671Z");
});

test("Ice Tour uses original Dino Dino Jungle R evidence and keeps slower videos separate", () => {
  const course = courses.find(c => c.id === "gcn-dino-dino-jungle-r");
  const early = course.records.filter(r => r.recordDate < "2021-01-01");
  assert.deepEqual(early.map(r => r.time), ["1:40.46", "1:40.18"]);
  assert.equal(early[0].submittedAt, "2020-01-24T22:56:56.000Z");
  assert.equal(early[1].submittedAt, "2020-01-24T23:08:40.000Z");
  assert.deepEqual(early[1].laps, ["50.14", "50.04"]);
  assert(early.every(r => r.proofImageLocal?.startsWith("/assets/proof/ice-2020-")));
  assert(early.every(r => !r.video));
  assert(!course.records.some(r => ["1:40.32", "1:40.56", "1:40.74", "1:40.80"].includes(r.time)));
  const slower = course.submissions.find(r => r.time === "1:40.32" && r.videoVerified);
  assert(slower);
  assert.equal(slower.includeInProgression, false);
  assert.match(slower.video, /1221415967315709952/);
  const audit = JSON.parse(fs.readFileSync("archive/ice-2020-reconciliation.json", "utf8"));
  assert.equal(audit.historyComplete, false);
  assert.equal(audit.previousBestLeads.length, 2);
  assert.equal(audit.coverage.originalServerAttachmentImagesVisuallyReviewed, 184);
  const castle = courses.find(c => c.id === "gba-bowser-s-castle-1");
  const tomegome = castle.records.find(r => r.playerId === "tomegome" && r.time === "0:59.96");
  const kaguya = castle.records.find(r => r.playerId === "nu11" && r.time === "0:59.96");
  assert.equal(tomegome.submittedAt, "2020-01-15T19:20:10.000Z");
  assert.deepEqual(tomegome.laps, ["30.16", "29.80"]);
  assert.equal(tomegome.videoVerified, true);
  assert.equal(kaguya.video, null);
  assertPublicationDateOrUnknown(kaguya);
  assert.deepEqual(kaguya.laps, [null, null]);
});

test("Mario Bros. restores the reported predecessor and original final submissions", () => {
  const ghost = courses.find(c => c.id === "snes-ghost-valley-1");
  const predecessor = ghost.records.find(r => r.playerId === "adrishi" && r.time === "0:39.96");
  assert(predecessor);
  assert.equal(predecessor.recordDate, "2020-02-28");
  assert.equal(predecessor.submittedAt, "2020-02-28T18:08:17.736Z");
  assert.deepEqual(predecessor.laps, ["20.06", "19.90"]);
  assert.equal(predecessor.durationDays, null);
  for (const [courseId, time] of [["snes-ghost-valley-1", "0:39.93"], ["snes-rainbow-road-r", "1:00.16"]]) {
    const course = courses.find(c => c.id === courseId);
    const final = course.records.find(r => r.playerId === "adrishi" && r.time === time);
    assert.equal(final.submittedAt, "2020-03-11T04:56:53.458Z");
    assert.equal(final.recordDate, "2020-03-11");
    assert.deepEqual(final.laps, [null, null]);
    assert.equal(final.delayedSubmission, true);
    assert.equal(final.durationDays, null);
    assert(fs.existsSync("public" + final.proofImageLocal));
  }
  assert(!ghost.records.some(r => r.playerId === "astre" && r.time === "0:39.99"));
});

test("Vancouver restores the reported predecessor and original final screenshot without inventing splits", () => {
  const course = courses.find(c => c.id === "snes-choco-island-2r");
  assert.deepEqual(course.records.slice(0, 2).map(r => [r.playerId, r.time]), [["nu11", "0:49.56"], ["astre", "0:49.55"]]);
  const [earlier, final] = course.records;
  assertPublicationDateOrUnknown(earlier);
  assert.equal(earlier.durationDays, null);
  assert.equal(final.submittedAt, "2020-02-25T23:13:51.000Z");
  assert.deepEqual(final.laps, [null, null]);
  assert(fs.existsSync("public" + final.proofImageLocal));
  const slower = course.submissions.find(r => r.time === "0:49.65" && r.playerId === "astre");
  assert.deepEqual(slower.laps, ["24.82", "24.83"]);
  assert.equal(slower.includeInProgression, false);
  assert(!course.records.some(r => r.time === "0:49.65"));
  const rainbow = courses.find(c => c.id === "snes-rainbow-road");
  assertPublicationDateOrUnknown(rainbow.records.find(r => r.time === "0:59.94"));
});

test("Valentine's Tour restores the earlier Beach record without inventing dates for later ties", () => {
  const beach = courses.find(c => c.id === "n64-koopa-troopa-beach");
  assert.deepEqual(beach.records.map(r => r.time), ["1:13.86", "1:13.83", "1:13.83"]);
  const earlier = beach.records[0];
  assert.equal(earlier.recordDate, "2020-01-29");
  assert.deepEqual(earlier.laps, ["37.07", "36.79"]);
  assert.match(earlier.video, /1222534288186298369/);
  assert.match(earlier.videoBackup.url, /FvfL6hsVpiY/);
  assert(earlier.additionalSources.some(s => s.messageId === "673024719955689472"));
  assert.equal(earlier.durationDays, null);
  assert(beach.records.slice(1).every(r => r.recordDate === null));
  assert.deepEqual(beach.currentHolders.map(r => r.playerId).sort(), ["nu11", "tomegome"]);
  for (const [courseId, time] of [["n64-koopa-troopa-beach", "1:14.72"], ["n64-koopa-troopa-beach", "1:14.17"], ["3ds-toad-circuit-r", "1:03.60"]]) {
    const course = courses.find(c => c.id === courseId);
    const result = course.submissions.find(r => r.time === time && r.playerId === "astre");
    assert(result?.proofImageLocal);
    assert.equal(result.includeInProgression, false);
    assert(!course.records.some(r => r.id === result.id));
  }
});

test("Hammer Bro split reports do not invent achievement dates or promote slower footage", async () => {
  const { fastestVideo } = await import("../lib/video.mjs");
  const frappe = courses.find(c => c.id === "n64-frappe-snowland");
  assert.deepEqual(frappe.current.laps, ["40.99", "40.99"]);
  assertPublicationDateOrUnknown(frappe.current);
  assert.equal(frappe.current.durationDays, null);
  for (const [id, time, splits] of [
    ["n64-frappe-snowland", "1:22.14", ["40.92", "41.22"]],
    ["gcn-yoshi-circuit-r", "1:31.74", ["45.91", "45.83"]],
  ]) {
    const course = courses.find(c => c.id === id);
    const video = fastestVideo(course);
    assert.equal(video.time, time);
    assert.deepEqual(video.laps, splits);
    assert.equal(video.isCurrent, false);
    assert.equal(video.playerId, "tomegome");
    assert(video.videoVerified && video.videoPreservation.sha256);
    assert(!course.records.some(r => r.time === time));
  }
});

test("Baby Rosalina recovered footage supplies a fallback without creating a WR", async () => {
  const { fastestVideo } = await import("../lib/video.mjs");
  const course = courses.find(c => c.id === "snes-mario-circuit-2r");
  const footage = fastestVideo(course);
  assert.equal(course.current.time, "1:01.83");
  assert.equal(course.current.videoAvailability, "unavailable");
  assert.equal(footage.time, "1:02.56");
  assert.equal(footage.playerId, "tomegome");
  assert.equal(footage.isCurrent, false);
  assert.equal(footage.includeInProgression, false);
  assert.deepEqual(footage.laps, ["31.21", "31.35"]);
  assert(footage.videoVerified && footage.videoPreservation.sha256);
  assert.equal(footage.submittedAt, "2020-03-12T10:50:14Z");
  assert.match(footage.video, /1238054687355465728/);
  assert(!course.records.some(r => ["1:02.56", "1:02.80"].includes(r.time)));
  assert(footage.additionalSources.some(s => s.time === "1:02.33"), "earlier faster rival report prevents WR promotion");
  assert(fs.existsSync("public" + footage.proofImageLocal));
});

test("Sunset Wilds R 1:10.53 keeps its February original date across October migration", () => {
  const course = courses.find(c => c.id === "gba-sunset-wilds-r");
  const record = course.records.find(r => r.timeCs === 7053 && r.playerId === "superfx");
  assert.equal(record.recordDate, "2021-02-19");
  assert.equal(record.submittedAt, "2021-02-19T07:59:12.925Z");
  assert.deepEqual(record.laps, ["35.28", "35.25"]);
  assert.equal(record.durationDays, 9);
  assert(record.additionalSources.some(s => s.messageId === "812231805318332417"));
  assert.match(record.video, /aNjiaWm-h9Y/);
  assert(record.videoBackup?.url);
});
