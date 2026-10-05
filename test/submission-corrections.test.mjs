import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("reviewed screenshot correction reaches both bot and copied sheet evidence", () => {
  const course = JSON.parse(fs.readFileSync("public/data/courses/n64-kalimari-desert-2.json", "utf8"));
  for (const id of ["sheet-ATP33", "discord-1064985253179048036"]) {
    const row = course.submissions.find(r => r.id === id);
    assert(row, `Missing original source row ${id}`);
    assert.equal(row.time, "1:13.94");
    assert.equal(row.timeCs, 7394);
    assert.equal(row.originalReportedTime, "1:13.00");
    assert.deepEqual(row.laps, [null, null]);
    assert(row.additionalSources.some(s => s.messageId === "1064985251979477022"));
  }
  assert(!course.records.some(r => r.time === "1:13.00"));
});

test("runner withdrawals override stale bot acceptance without inventing corrected laps", () => {
  const course = JSON.parse(fs.readFileSync("public/data/courses/rmx-ghost-valley-1r.json", "utf8"));
  for (const [id, time, reportedLaps, withdrawalMessage] of [
    ["discord-947835096470265907", "1:01.47", [null, null], "947835758922829864"],
    ["discord-948138839644471386", "1:00.80", ["30.80", null], "948225465221533756"],
  ]) {
    const row = course.submissions.find(r => r.id === id);
    assert(row);
    assert.equal(row.status, "withdrawn-submission");
    assert.equal(row.includeInProgression, false);
    assert.equal(row.originalReportedTime, time);
    assert.deepEqual(row.originalReportedLaps, reportedLaps);
    assert.deepEqual(row.laps, [null, null]);
    assert.equal(row.derivedLap, undefined);
    assert(row.additionalSources.some(s => s.messageId === withdrawalMessage));
    assert(!course.records.some(r => r.id === id));
  }
});

test("verified earlier original video dates a WR without moving its later submission", () => {
  const course = JSON.parse(fs.readFileSync("public/data/courses/n64-luigi-raceway.json", "utf8"));
  const row = course.records.find(r => r.id === "1493428638119362741");
  assert.equal(row.recordDate, "2026-03-14");
  assert.equal(row.submittedAt, "2026-03-17T14:29:58.700Z");
  assert.equal(row.durationDays, 4);
  assert.equal(row.videoVerified, true);
  assert.deepEqual(row.laps, ["34.99", "37.04"]);
});
