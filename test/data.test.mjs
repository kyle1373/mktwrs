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
