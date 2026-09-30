import test from "node:test";
import assert from "node:assert/strict";
import {
  playableDays,
  recordDuration,
  progression,
} from "../public/history.mjs";
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
