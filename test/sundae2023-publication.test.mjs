import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const expected={'gba-luigi-circuit':['0:49.69','0:49.62','0:49.44','0:49.27'],'snes-vanilla-lake-2r':['0:31.77','0:31.71','0:31.65','0:31.65','0:31.62','0:31.48']};
test('Sundae opening-day boundary is06UTC and rollover is excluded',()=>{
 assert(isReviewedOpeningDay({submittedAt:'2023-09-07T05:59:59Z',recordDate:'2023-09-07'},'2023-09-06'));
 assert(!isReviewedOpeningDay({submittedAt:'2023-09-07T06:00:00Z',recordDate:'2023-09-07'},'2023-09-06'));
});
test('Sundae recovered leaders and ties retain distinct available movie choices',()=>{
 for(const [id,times] of Object.entries(expected)){
  const c=routeData(['course',id]).data;
  assert.deepEqual(c.records.filter(r=>r.tourDateRange?.start==='2023-09-06').map(r=>r.time),times);
  assert.equal(c.sundae2023Recording.recording,null);
  assert.equal(c.sundae2023Recording.documentedRecording.time,id==='gba-luigi-circuit'?'0:49.27':'0:31.82');
  assert.match(c.sundae2023Recording.documentedRecording.videoBackup.url,/media\.mktwrs\.com/);
  const keys=c.sundae2023SupportingResults.map(r=>r.playerId+'|'+r.time+'|'+r.recordDate);assert.equal(keys.length,new Set(keys).size);
  assert(!c.sundae2023SupportingResults.some(r=>r.status==='cancelled-submission'));
 }
});
test('Sundae preserves cancellation evidence and original submission/movie/share clocks',()=>{
 const lc=routeData(['course','gba-luigi-circuit']).data,vl=routeData(['course','snes-vanilla-lake-2r']).data;
 const r=lc.records.find(r=>r.time==='0:49.44');assert(r.cancelledReceiptRetained);assert.match(r.independentResultReview.basis,/previous-best49\.44/);
 const v=vl.sundae2023Recording.documentedRecording;assert.equal(v.submittedAt,'2023-09-19T22:02:25.418Z');assert.equal(v.videoPublishedAt,'2023-09-19T21:51:43+00:00');assert.equal(v.videoSubmittedAt,'2023-09-19T22:02:40.576Z');
 const f=lc.sundae2023Recording.documentedRecording;assert.equal(f.submittedAt,'2023-09-08T11:08:08.015Z');assert.equal(f.videoSubmittedAt,'2023-09-17T20:08:39.051Z');
});
test('Menu screenshots and private movies do not replace reviewed recordings; later candidates and ownership survive',()=>{
 const c=JSON.parse(fs.readFileSync('public/data/courses/snes-vanilla-lake-2r.json','utf8'));
 for(const id of ['discord-1548334006658007111','sheet-DER32'])assert(c.candidates.some(r=>r.id===id));
 assert.equal(c.records.find(r=>r.time==='0:31.71').videoAvailability,'private');
 for(const r of c.submissions.filter(r=>r.proofField==='cup-menu-best'))assert(!c.records.some(w=>w.id===r.id));
 const ps=JSON.parse(fs.readFileSync('public/data/players.json','utf8')),a=JSON.parse(fs.readFileSync('archive/sundae2023-complete-course-generation-and-player-record-check-20261014.json','utf8'));
 assert.equal(a.newTourWrRows.length,7);for(const r of a.newTourWrRows)assert(ps.find(p=>p.id===r.playerId).records.includes(r.id));
});
