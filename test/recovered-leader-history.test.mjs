import assert from 'node:assert/strict';
import test from 'node:test';
import {historyEvents} from '../public/history.mjs';
const course = {appearances: [], records: [
  {id:'final',status:'announced',timeCs:9131,tourDateRange:{end:'2020-04-07'}},
  {id:'reported',status:'documented-submission',recordDate:'2020-03-27',timeCs:9278,recoveredLeaderEvidence:{reviewAudit:'source-review.json',publishedAt:'2020-03-27T09:50:20Z'}},
  {id:'video',status:'documented-submission',recordDate:'2020-03-29',timeCs:9174,recoveredLeaderEvidence:{reviewAudit:'source-review.json',publishedAt:'2020-03-29T09:18:51Z'}},
  {id:'ordinary-pb',status:'documented-submission',recordDate:'2020-03-28',timeCs:9269},
]};
test('default history still excludes results without confirmed WR status',()=>{
  assert.deepEqual(historyEvents(course,[],'2026-10-14').map(e=>e.id),['final']);
});
test('reviewed leaders appear chronologically only when requested; ordinary PBs stay excluded',()=>{
  const events=historyEvents(course,[],'2026-10-14',{includeRecoveredLeaders:true});
  assert.deepEqual(events.map(e=>e.id),['reported','video','final']);
  assert.equal(events[0].record.status,'documented-submission');
  assert.equal(events[0].record.recoveredLeaderEvidence.reviewAudit,'source-review.json');
});
