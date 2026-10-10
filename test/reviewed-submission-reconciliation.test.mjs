import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileReviewedSubmission} from '../scripts/import-sources.mjs';

test('reviewed source enriches its exact sheet row without duplicating or restoring disputed splits', () => {
  const sheet = {id:'sheet-KM19',courseId:'koopa',playerId:'heria',timeCs:5807,
    laps:['28.96','29.01'],source:{url:'sheet'},submittedAt:null};
  const other = {id:'later-rerun',courseId:'koopa',playerId:'heria',timeCs:5807};
  const course = {submissions:[sheet,other]};
  const proof = {id:'curated-original',courseId:'koopa',playerId:'heria',timeCs:5807,
    laps:[null,null],source:{url:'discord'},submittedAt:'2020-12-31T13:49:58.100Z',
    video:null,videoVerified:false,publicSubmissionReconciliation:{canonicalId:'sheet-KM19'}};
  assert.equal(reconcileReviewedSubmission(course,proof),sheet);
  assert.equal(course.submissions.length,2);
  assert.equal(sheet.id,'sheet-KM19');
  assert.deepEqual(sheet.laps,[null,null]);
  assert.equal(sheet.submittedAt,proof.submittedAt);
  assert.deepEqual(sheet.additionalSources,[{url:'sheet'}]);
  assert.equal(course.submissions[1],other);
  reconcileReviewedSubmission(course,proof);
  assert.equal(course.submissions.length,2);
  assert.equal(sheet.additionalSources.filter(s=>s.url==='sheet').length,1);
});

test('explicit reconciliation refuses wrong runner, total, course or missing canonical row', () => {
  const original={id:'sheet',courseId:'koopa',playerId:'heria',timeCs:5807};
  for (const change of [{playerId:'other'},{timeCs:5808},{courseId:'airship'},
    {publicSubmissionReconciliation:{canonicalId:'missing'}}]) {
    const course={submissions:[{...original}]};
    assert.throws(()=>reconcileReviewedSubmission(course,{...original,id:'curated',
      publicSubmissionReconciliation:{canonicalId:'sheet'},...change}),/mismatch/);
    assert.deepEqual(course.submissions,[original]);
  }
});

test('unreconciled equal-time reruns remain separate submissions', () => {
  const course={submissions:[{id:'old',playerId:'runner',timeCs:5807}]};
  const later={id:'new',playerId:'runner',timeCs:5807};
  reconcileReviewedSubmission(course,later);
  assert.equal(course.submissions.length,2);
});
