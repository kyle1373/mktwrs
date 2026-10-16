import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isReviewedOpeningDay, openingDayPublication } from '../lib/opening-day.mjs';
import { applyFinalDates } from '../lib/final-dates.mjs';

const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
test('all 24 reviewed New Year dates retain source identity and exact publication clocks', () => {
  const courses = read('../public/data/courses.json');
  const audit = read('../artifacts/newyear2022-current-record-date-source-audit-20261016.json');
  const evidence = read('../scripts/documented-date-evidence.json').filter(r => r.reviewArtifact.endsWith('newyear2022-current-record-date-source-audit-20261016.json'));
  assert.equal(evidence.length,24);
  for (const proof of evidence) {
    const c = courses.find(c => c.id === proof.courseId), r = c.records.find(r => r.id === proof.id);
    assert.equal(r.playerId,proof.playerId); assert.equal(r.time,proof.time);
    assert.equal(r.documentedAt,proof.timestamp); assert.equal(r.finalDate,proof.timestamp.slice(0,10));
    assert.ok(audit.rows.some(row => row.id === r.id && row.sourceUrl === proof.sourceUrl));
  }
  applyFinalDates(courses,evidence);
  for (const proof of evidence) assert.equal(courses.find(c => c.id===proof.courseId).records.find(r=>r.id===proof.id).documentedDateSourceUrl,proof.sourceUrl);
});
test('New Year opening day ends at 06 UTC, keeping the fastest run posted after midnight', () => {
  const make = (id,timeCs,submittedAt) => ({id,playerId:id,timeCs,submittedAt,recordDate:submittedAt.slice(0,10)});
  const slow = make('slow',7733,'2021-12-29T14:36:06.343Z');
  const best = make('best',7728,'2021-12-30T00:47:27.800Z');
  const late = make('late',7723,'2021-12-30T06:00:00.000Z');
  assert.equal(isReviewedOpeningDay(best,'2021-12-29'),true);
  assert.equal(isReviewedOpeningDay(late,'2021-12-29'),false);
  assert.equal(isReviewedOpeningDay(make('before',7720,'2021-12-29T05:59:59.999Z'),'2021-12-29'),false);
  const result=openingDayPublication([{records:[slow,best,late],appearances:[{tourId:'tour-60'}]}],[]);
  assert.deepEqual(result.courses[0].records.map(r=>r.id),['best','late']);
});
