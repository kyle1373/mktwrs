import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (name) =>
  JSON.parse(
    fs.readFileSync(
      new URL("../public/data/" + name + ".json", import.meta.url),
    ),
  );
const courses = read("courses"),
  players = read("players"),
  tours = read("tours");
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
  assert.equal(nbc.find(r => r.time === "1:25.80").recordDate, null);
  assert.equal(nbc.find(r => r.time === "1:25.80").durationDays, null);
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
  assert.equal(record("0:50.59", "nu11").durationDays, 1,
    "an undated record from a later tour cannot erase a fully dated earlier reign");
  assert.equal(record("0:49.77", "kazuo").durationDays, null,
    "the reign ending at the undated next improvement stays unknown");
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
  assert.equal(frappe.find(r => r.time === "1:21.05").laps, null);
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
      assert(r.mushrooms === null || r.mushrooms.every(Number.isInteger));
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
      if (r.recordDate && r.tourDateRange && !r.achievedAt) {
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
    assert.equal(r.dateBasis, "source-date");
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
    assert.equal(previous.recordDate, null, "later proof upload is not the earlier run's achievement date");
    assert(previous.proofImageLocal);
  }
  assert.equal(dp.records.find(r => r.time === "0:49.91").durationDays, null);
  const last = dp.records.filter(r => ["0:49.91", "0:49.84", "0:49.77", "0:49.69"].includes(r.time));
  assert.deepEqual(last.map(r => r.playerId), ["nu11", "kazuo", "saki7", "nu11"]);
  assert.deepEqual(last.at(-1).laps, ["24.85", "24.84"]);
  assert.equal(last.at(-1).submittedAt, "2020-08-07T16:01:01.896Z");
  assert.equal(last.at(-1).video, null, "the unavailable video is retained as a reference, not a working proof link");
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
  assert.equal(intermediate.recordDate, null);
  assert.equal(intermediate.proofField, "previous-best");
  assert(intermediate.proofImageLocal);
  const tome = bc.records.find(r => r.time === "1:00.31");
  assert.equal(tome.submittedAt, "2020-08-13T17:38:14.000Z");
  assert.equal(tome.video, "https://www.youtube.com/watch?v=gMlt02DTps8");
  assert.equal(bc.current.recordDate, "2020-08-21");
  assert.deepEqual(bc.current.laps, ["30.11", "30.18"]);
  assert.equal(bc.current.video, null, "the linked 1:00.30 non-PB is not proof of 1:00.29");
});
