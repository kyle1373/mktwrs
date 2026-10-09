import test from "node:test";
import assert from "node:assert/strict";
import { fastestVideo, videoUrl } from "../lib/video.mjs";

test("reviewed proofVideoUrl submissions supply footage and preserve unreviewed source links", () => {
  const run = { id: "curated-pb", playerId: "b", timeCs: 9000,
    proofVideoUrl: "https://youtu.be/x6kNnKr29Zg", proofVideoVerified: true };
  assert.equal(videoUrl(run), run.proofVideoUrl);
  assert.equal(fastestVideo({ records: [], submissions: [run] }).id, run.id);
  assert.equal(videoUrl({ proofVideoUrl: run.proofVideoUrl }), run.proofVideoUrl);
  assert.equal(fastestVideo({ submissions: [{ ...run, proofVideoVerified: false }] }), null);
});
