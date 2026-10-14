import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const expected={
 'berlin-byways-2':['1:23.86','1:23.58','1:23.56','1:23.47','1:23.43','1:23.38'],
 'madrid-drive':['1:18.56','1:18.56','1:18.41','1:18.38','1:18.33','1:18.23','1:17.78','1:17.73','1:17.62','1:17.57','1:17.31'],
 'piranha-plant-cove-3':['1:16.56','1:16.55','1:16.44','1:16.28'],
};
test('Summer opening day includes August24 before06UTC and excludes rollover',()=>{
 assert(isReviewedOpeningDay({submittedAt:'2023-08-24T05:59:59Z',recordDate:'2023-08-24'},'2023-08-23'));
 assert(!isReviewedOpeningDay({submittedAt:'2023-08-24T06:00:00Z',recordDate:'2023-08-24'},'2023-08-23'));
});
test('Summer publishes all21 leaders and ties with distinct available-recording choices',()=>{
 for(const [id,times] of Object.entries(expected)){
  const c=routeData(['course',id]).data;
  assert.deepEqual(c.records.filter(r=>r.tourDateRange?.start==='2023-08-23').map(r=>r.time),times);
  assert.equal(c.summer2023Recording.recording,null);
  if(id==='piranha-plant-cove-3')assert.equal(c.summer2023Recording.documentedRecording,null);
  else {assert.equal(c.summer2023Recording.documentedRecording.time,id==='berlin-byways-2'?'1:23.43':'1:17.31');assert.match(c.summer2023Recording.documentedRecording.videoBackup.url,/media\.mktwrs\.com/);}
  const keys=c.summer2023SupportingResults.map(r=>r.playerId+'|'+r.time+'|'+r.recordDate);assert.equal(keys.length,new Set(keys).size);
  assert(!c.summer2023SupportingResults.some(r=>r.status==='cancelled-submission'));
 }
});
test('Madrid final retains late original posting date, separate movie clock and primary owner',()=>{
 const c=routeData(['course','madrid-drive']).data,r=c.records.find(r=>r.id==='1152024419473047663');
 assert.equal(r.playerId,'kno2');assert.equal(r.recordDate,'2023-09-06');assert.equal(r.submittedAt,'2023-09-06T06:08:57.804Z');assert.equal(r.videoPublishedAt,'2023-09-06T06:11:22+00:00');assert.equal(r.dateUnresolved,false);assert.match(r.proofImageLocal,/1148862395721199686/);
 const raw=JSON.parse(fs.readFileSync('public/data/courses/madrid-drive.json','utf8'));assert.equal(raw.submissions.find(r=>r.id==='discord-1148862386632138802').playerId,'kno2');
});
test('Cancelled and limited proofs get no WR credit, while later candidates survive',()=>{
 const c=JSON.parse(fs.readFileSync('public/data/courses/piranha-plant-cove-3.json','utf8'));
 const limited=c.submissions.find(r=>r.id==='discord-1148402000925560853');assert.equal(limited.proofImageVerified,false);assert.equal(limited.includeInProgression,false);assert.equal(limited.videoScopeReview.startToFinishContinuityVerified,false);assert.match(limited.videoBackup.url,/media\.mktwrs\.com/);assert(!c.records.some(r=>r.id===limited.id));
 for(const id of ['discord-1277470641716465664','discord-1278027772916400128'])assert(c.candidates.some(r=>r.id===id));
 const players=JSON.parse(fs.readFileSync('public/data/players.json','utf8')),a=JSON.parse(fs.readFileSync('archive/summer2023-complete-course-generation-and-player-record-check-20261014.json','utf8'));for(const r of a.newTourWrRows)assert(players.find(p=>p.id===r.playerId).records.includes(r.id));
});
