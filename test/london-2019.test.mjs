import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("London Daisy Hills recovered improvement reaches history with publication dates and playable duration", () => {
  const course = JSON.parse(fs.readFileSync("public/data/courses/3ds-daisy-hills.json", "utf8"));
  assert.deepEqual(course.records.map(r => [r.time, r.recordDate, r.durationDays]), [
    ["1:23.03", "2019-12-05", 5],
    ["1:23.01", "2019-12-10", 7],
    ["1:22.99", "2019-12-17", 1],
  ]);
  const intermediate = course.records.find(r => r.time === "1:23.01");
  assert.equal(intermediate.proofImageVerified, true);
  assert.equal(intermediate.source.postId, "1204353952721932288");
  const final = course.records.find(r => r.time === "1:22.99");
  assert(final.additionalSources.some(s => s.postId === "1206936318502031361"));
  assert.equal(final.achievedAt, null, "Publication evidence must not invent an achievement date");
  assert.equal(final.video, null);
  assert(!course.records.some(r => ["1:23.09", "1:23.06", "1:23.66"].includes(r.time)));
});

test("London Yoshi final uses contemporary publication and excludes slower embedded cup results", () => {
  const course = JSON.parse(fs.readFileSync("public/data/courses/gcn-yoshi-circuit.json", "utf8"));
  const final = course.records.find(r => r.playerId === "nu11" && r.time === "1:33.68");
  assert.equal(final.recordDate, "2019-12-17");
  assert.equal(final.achievedAt, null);
  assert(final.additionalSources.some(s => s.postId === "1206936318502031361"));
  assert(!course.records.some(r => ["1:48.51", "1:40.71", "1:38.68", "1:43.51"].includes(r.time)));
});
