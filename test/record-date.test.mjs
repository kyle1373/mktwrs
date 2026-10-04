import test from "node:test";
import assert from "node:assert/strict";
import { screenshotPublicationDate } from "../scripts/record-date.mjs";

test("screenshot date uses first known appearance instead of later repost", () => {
  assert.equal(screenshotPublicationDate({ proofImageVerified: true, proofImage: "proof.webp", observedAt: "2019-11-04T18:21:02Z", submittedAt: "2020-07-01T12:00:00Z" }), "2019-11-04");
});
test("previous-best screenshot may supply publication date without inventing race date", () => {
  const record = { proofImageVerified: true, proofImageLocal: "/proof.webp", proofField: "previous-best", observedAt: "2019-11-04T18:21:02Z", achievedAt: null };
  assert.equal(screenshotPublicationDate(record), "2019-11-04");
  assert.equal(record.achievedAt, null);
});
test("text-only reports and undated screenshots remain undated", () => {
  assert.equal(screenshotPublicationDate({ observedAt: "2019-11-04" }), null);
  assert.equal(screenshotPublicationDate({ proofImageVerified: true, proofImage: "proof.webp" }), null);
});
test("later screenshot repost does not override a verified earlier achievement bound", () => {
  assert.equal(screenshotPublicationDate({
    proofImageVerified: true,
    proofImageLocal: "/proof.webp",
    proofField: "previous-best",
    observedAt: "2019-10-31T20:01:22Z",
    achievementDateBounds: { notBefore: "2019-10-28", notAfter: "2019-10-29" },
  }), null);
});
