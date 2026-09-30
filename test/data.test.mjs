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
        assert(
          r.recordDate >= r.tourDateRange.start &&
            r.recordDate <= r.tourDateRange.end,
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
