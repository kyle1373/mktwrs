import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyReviewedRecordClassifications } from '../scripts/reviewed-record-classifications.mjs';
import { applyFinalDates } from '../lib/final-dates.mjs';
import { applyDocumentedDurations } from '../lib/documented-durations.mjs';
import { courseStatistics } from '../public/history.mjs';

const evidence = JSON.parse(fs.readFileSync(new URL('../scripts/reviewed-record-classifications.json', import.meta.url)));
const source = JSON.parse(fs.readFileSync(new URL('../archive/newyear2022-vanilla-lake-pb-classification-review-20261016.json', import.meta.url)));
function fixture() {
  const pb = structuredClone(source.originalCanonicalRecord);
  const wr = {id: evidence.rows[0].earlierFasterId, playerId:'dit', time:'0:34.20', timeCs:3420,
    submittedAt:'2022-01-01T04:31:15Z',status:'announced'};
  return {id:pb.courseId, records:[wr,pb], submissions:[structuredClone(pb)], candidates:[],
    current:wr, currentHolders:[wr], appearances:[{startDate:'2021-12-29',endDate:'2022-01-12'}]};
}
test('later personal best keeps date and proof, loses WR credit, and does not shorten the faster reign', () => {
  const c = fixture(), original = structuredClone(c.submissions[0]);
  applyReviewedRecordClassifications([c], evidence);
  assert.equal(c.records.length,1);
  assert.equal(c.current.time,'0:34.20');
  for (const [key,value] of Object.entries(original))
    if (key !== 'status') assert.deepEqual(c.submissions[0][key],value);
  assert.equal(c.submissions[0].status,'personal-best');
  assert.equal(c.submissions[0].recordClassificationReview.originalStatus,'community-wr');
  applyFinalDates([c]); applyDocumentedDurations([c]);
  assert.equal(c.submissions[0].finalDate,'2022-01-02');
  assert.equal(c.submissions[0].durationDays,0);
  assert.equal(c.submissions[0].durationBounds.basis,'no-documented-wr-reign');
  assert.ok(c.records[0].durationDays > 11);
  assert.equal(courseStatistics(c.records,[{id:'dit',name:'DIT'}]).players.length,1);
});
test('classification cannot be applied to another time, source clock, or an earlier WR candidate', () => {
  for (const patch of [{time:'0:34.10'}, {submittedAt:'2021-12-30T18:39:28.756Z'},
    {earlierFasterDocumentedAt:'2022-01-03T04:31:15.000Z'}, {earlierFasterTime:'0:34.50'}]) {
    assert.throws(()=>applyReviewedRecordClassifications([fixture()],{rows:[{...evidence.rows[0],...patch}]}),/Classification .* mismatch/);
  }
});
