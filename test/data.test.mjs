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
