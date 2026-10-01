import test from "node:test";
import assert from "node:assert/strict";
import {
  playableDays,
  recordDuration,
  progression,
  timestampWithinTour,
  historyEvents,
} from "../public/history.mjs";
test("tour labels include the final morning until the 06:00 UTC reset", () => {
  const range = { start: "2020-07-15", end: "2020-07-28" };
  assert(timestampWithinTour("2020-07-29T03:09:09.289Z", range));
  assert(timestampWithinTour("2020-07-29T05:59:59.999Z", range));
  assert(!timestampWithinTour("2020-07-29T06:00:00.000Z", range));
  assert(!timestampWithinTour("2020-07-15T05:59:59.999Z", range));
  assert(!timestampWithinTour("2021-10-09T09:46:51.688Z", range));
});
test("record clock pauses between tours and resumes on return", () => {
  assert.equal(
    playableDays("2024-02-24", "2024-10-12", [
      { start: "2024-02-20", end: "2024-02-27" },
      { start: "2024-10-10", end: "2024-10-24" },
    ]),
    5,
  );
});
test("overlapping cup windows are counted once; exact break time is exclusive", () => {
  assert.equal(
    playableDays("2024-01-01", "2024-01-03", [
      { start: "2024-01-01", end: "2024-01-02" },
      { start: "2024-01-01T12:00:00Z", end: "2024-01-03" },
    ]),
    2,
  );
});
test("unknown achievement dates do not produce invented durations", () =>
  assert.equal(
    recordDuration({ achievedAt: null }, null, [], "2024-01-01"),
    null,
  ));
test("progression retains ties and improvements, excludes slower submissions", () => {
  const rs = [
    { id: 1, timeCs: 100, status: "verified", achievedAt: "2024-01-01" },
    { id: 2, timeCs: 99, status: "verified", achievedAt: "2024-01-02" },
    { id: 3, timeCs: 99, status: "verified", achievedAt: "2024-01-03" },
    { id: 4, timeCs: 101, status: "verified", achievedAt: "2024-01-04" },
  ];
  assert.deepEqual(
    progression(rs).map((r) => r.id),
    [1, 2, 3],
  );
});

test("WR statistics exclude personal bests and inferred contenders and union tied nation durations", async () => {
  const { courseStatistics } = await import("../public/history.mjs");
  const records = [
    {
      id: "a",
      courseId: "one",
      playerId: "one",
      status: "announced",
      durationDays: 3,
      durationIntervals: [{ start: "2024-02-24", end: "2024-02-27" }],
    },
    {
      id: "b",
      courseId: "one",
      playerId: "two",
      status: "community-wr",
      durationDays: 2,
      durationIntervals: [{ start: "2024-02-25", end: "2024-02-27" }],
    },
    {
      id: "c",
      playerId: "one",
      status: "reconstructed-contender",
      durationDays: 400,
    },
    { id: "d", playerId: "one", status: "sheet-submission", durationDays: 400 },
  ];
  const stats = courseStatistics(records, [
    { id: "one", country: "us" },
    { id: "two", country: "us" },
  ]);
  assert.equal(stats.players[0].count, 1);
  assert.equal(stats.nations[0].count, 2);
  assert.equal(stats.nations[0].days, 3);
});

test("course history inserts tour boundaries, avoids duplicate cups and omits unconfirmed submissions", async () => {
  const { historyEvents } = await import("../public/history.mjs");
  const appearance = {
    tourId: "t",
    startDate: "2024-02-20",
    endDate: "2024-02-27",
  };
  const course = {
    appearances: [appearance, appearance],
    records: [
      { id: "wr", status: "announced", recordDate: "2024-02-24", timeCs: 100 },
      {
        id: "pb",
        status: "reconstructed-contender",
        recordDate: "2024-02-25",
        timeCs: 90,
      },
    ],
  };
  const events = historyEvents(
    course,
    [{ id: "t", name: "Example Tour", source: "https://example.com" }],
    "2024-03-01",
  );
  assert.deepEqual(
    events.map((e) => e.type),
    ["tour-start", "record", "tour-end"],
  );
  assert.equal(events.at(-1).date, "2024-02-27");
});

test("records before the UTC reset precede same-day tour boundary markers", async () => {
  const { historyEvents } = await import("../public/history.mjs");
  const events = historyEvents({
    appearances: [
      { tourId: "old", startDate: "2020-06-03", endDate: "2020-06-17" },
      { tourId: "new", startDate: "2020-06-17", endDate: "2020-07-01" },
    ],
    records: [
      { id: "before", status: "community-wr", recordDate: "2020-06-17", submittedAt: "2020-06-17T05:01:18.072Z", timeCs: 10591 },
      { id: "after", status: "community-wr", recordDate: "2020-06-17", submittedAt: "2020-06-17T06:01:00.000Z", timeCs: 10590 },
    ],
  }, [{ id: "old", name: "Old Tour" }, { id: "new", name: "New Tour" }], "2020-06-18");
  assert.deepEqual(events.filter((e) => e.date === "2020-06-17").map((e) => e.id),
    ["before", "old-end", "new-start", "after"]);
});

test("early-morning submissions do not precede their undated-in-day predecessors on ordinary tour days", async () => {
  const { historyEvents } = await import("../public/history.mjs");
  const events = historyEvents({
    records: [
      { id: "later", status: "community-wr", recordDate: "2020-08-13", submittedAt: "2020-08-13T04:01:38Z", timeCs: 6056 },
      { id: "earlier", status: "community-wr", recordDate: "2020-08-13", submittedAt: null, timeCs: 6063 },
    ],
    appearances: [],
  }, [], "2020-08-26");
  assert.deepEqual(events.map(e => e.id), ["earlier", "later"]);
});

test("undated predecessors remain before a final-morning record and tour end", () => {
  const earlier = { id: "earlier", status: "community-wr", recordDate: null,
    chronologyDate: "2020-03-11", timeCs: 3996,
    tourDateRange: { start: "2020-02-26", end: "2020-03-10" } };
  const events = historyEvents({
    records: [earlier, { id: "later", status: "community-wr", recordDate: "2020-03-11",
      submittedAt: "2020-03-11T04:56:53.458Z", timeCs: 3993 }],
    appearances: [{ tourId: "t", startDate: "2020-02-26", endDate: "2020-03-11" }],
  }, [{ id: "t", name: "Mario Bros. Tour" }], "2020-03-12");
  assert.deepEqual(events.map(e => e.id), ["t-start", "earlier", "later", "t-end"]);
  assert.equal(earlier.recordDate, null);
});
