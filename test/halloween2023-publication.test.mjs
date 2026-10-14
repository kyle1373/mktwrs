import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=n=>JSON.parse(fs.readFileSync(`public/data/${n}.json`,'utf8'));
test('Halloween 2023 carries the existing WR and adds no slower WR credit',()=>{
 const c=read('courses/snes-donut-plains-3');
 assert.deepEqual(c.records.map(r=>r.time),['0:56.63','0:56.52','0:56.42']);
 assert.deepEqual(c.records.map(r=>r.recordDate),['2022-10-20','2022-10-27','2022-10-29']);
 assert.equal(c.records.filter(r=>r.tourDateRange?.start==='2023-10-18').length,0);
 const d=routeData(['course',c.id]).data;
 assert.equal(d.halloween2023Recording.worldRecord.id,'1039950316147322890');
 assert.equal(d.halloween2023Recording.documentedRecording.time,'0:56.42');
 assert.equal(d.halloween2023Recording.recording,null);
 assert(d.halloween2023SupportingResults.every(r=>r.timeCs>5642));
 assert.equal(Math.min(...d.halloween2023SupportingResults.map(r=>r.timeCs)),5679);
});
test('Recovered originals retain human submission dates and preserved evidence links',()=>{
 const c=read('courses/snes-donut-plains-3');
 for(const [mid,date,time] of [['1165725437180268554','2023-10-22T18:56:42.355Z','0:57.27'],['1166139886131216586','2023-10-23T22:23:34.685Z','0:57.00']]){
  const r=c.submissions.find(r=>r.source?.messageId===mid&&r.time===time);
  assert(r);assert.equal(r.submittedAt,date);assert.equal(r.recordDate,date.slice(0,10));assert.equal(r.dateUnresolved,false);
  assert.match(r.proofImageLocal,/media\.mktwrs\.com\/assets\/proof\/halloween2023-.*\.png$/);
 }
});
test('Partial technique footage has no completed result and remains a separate reference',()=>{
 const d=routeData(['course','snes-donut-plains-3']);const p=d.data.halloween2023Recording.strategyReference;
 assert.equal(p.playerId,'rubix');assert.equal(p.time,undefined);assert.equal(p.submittedAt,'2023-10-20T17:41:23.124Z');
 assert.equal(p.videoBackup.evidenceScope,'partial-technique-footage-no-completed-result');assert(d.players.some(r=>r.id==='rubix'));
});
test('Halloween first-day classification respects the 06 UTC tour boundary',()=>{
 assert(isReviewedOpeningDay({submittedAt:'2023-10-19T05:59:59Z',recordDate:'2023-10-19'},'2023-10-18'));
 assert(!isReviewedOpeningDay({submittedAt:'2023-10-19T06:00:00Z',recordDate:'2023-10-19'},'2023-10-18'));
});
