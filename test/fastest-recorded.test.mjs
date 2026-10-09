import test from "node:test";
import assert from "node:assert/strict";
import { fastestRecorded, fastestVideo, videoUrl } from "../lib/video.mjs";

test("faster reviewed submissions are visible without changing the WR, including ties", () => {
  const wr = { id: "wr", playerId: "a", timeCs: 10000 };
  const course = { records: [wr], currentHolders: [wr], submissions: [
    { id: "unverified", playerId: "x", timeCs: 8000 },
    { id: "pb", playerId: "b", timeCs: 9000, proofImageVerified: true },
    { id: "tie", playerId: "c", timeCs: 9000, proofVideoVerified: true },
    { id: "duplicate", playerId: "b", timeCs: 9000, proofImageVerified: true },
  ] };
  assert.deepEqual(fastestRecorded(course).map(r => r.playerId), ["b", "c"]);
  assert(fastestRecorded(course).every(r => !r.isCurrent));
  assert.deepEqual(course.currentHolders, [wr]);
});
test("reviewed proofVideoUrl submissions supply footage and preserve unreviewed source links", () => {
  const run = { id: "curated-pb", playerId: "b", timeCs: 9000,
    proofVideoUrl: "https://youtu.be/x6kNnKr29Zg", proofVideoVerified: true };
  assert.equal(videoUrl(run), run.proofVideoUrl);
  assert.equal(fastestVideo({ records: [], submissions: [run] }).id, run.id);
  assert.equal(videoUrl({ proofVideoUrl: run.proofVideoUrl }), run.proofVideoUrl);
  assert.equal(fastestVideo({ submissions: [{ ...run, proofVideoVerified: false }] }), null);
});
