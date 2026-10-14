import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
test('Vacation opening day ends at August10 06UTC',()=>{
 assert(isReviewedOpeningDay({submittedAt:'2023-08-10T05:59:59Z',recordDate:'2023-08-10'},'2023-08-09'));
 assert(!isReviewedOpeningDay({submittedAt:'2023-08-10T06:00:00Z',recordDate:'2023-08-10'},'2023-08-09'));
});
test('Vacation publishes 25 reviewed leaders and separate available recording choices',()=>{
 const expected={'athens-dash':['1:18.85','1:18.67','1:18.43','1:18.09','1:18.08','1:18.07','1:18.00','1:17.98','1:17.75'],'athens-dash-2r':['1:22.86','1:22.71','1:22.47','1:22.43','1:22.38','1:22.30','1:22.29'],'squeaky-clean-sprint':['1:22.76','1:22.17','1:22.13','1:21.90','1:21.90','1:21.87','1:21.83','1:21.62','1:21.62']};
 for(const [id,times] of Object.entries(expected)){
  const c=routeData(['course',id]).data;
  assert.deepEqual(c.records.filter(r=>r.tourDateRange?.start==='2023-08-09').map(r=>r.time),times);
  assert.equal(c.vacation2023Recording.recording,null);
  if(id==='athens-dash-2r')assert.equal(c.vacation2023Recording.documentedRecording,null);
  else {assert.equal(c.vacation2023Recording.documentedRecording.time,id==='athens-dash'?'1:17.75':'1:21.62');assert.match(c.vacation2023Recording.documentedRecording.videoBackup.url,/media\.mktwrs\.com/);}
  const keys=c.vacation2023SupportingResults.map(r=>r.playerId+'|'+r.time+'|'+r.recordDate);assert.equal(keys.length,new Set(keys).size);
 }
});
test('Final Squeaky tie has independent account, proof, August22 date and record credit',()=>{
 const c=routeData(['course','squeaky-clean-sprint']).data;
 const l=c.records.find(r=>r.id==='1147355273481175120-sasakikojiro'),p=c.records.find(r=>r.id==='1147355273481175120-phillish');
 assert.equal(l.playerId,'litchi');assert.equal(l.recordDate,'2023-08-22');assert.equal(l.submittedAt,'2023-08-22T22:26:03.284Z');assert.equal(l.video,null);assert(!l.videoBackup);assert.match(l.proofImageLocal,/1143672468515606698/);assert.notEqual(l.proofImageLocal,p.proofImageLocal);assert.equal(l.durationDays,2);
 const players=JSON.parse(fs.readFileSync('public/data/players.json','utf8'));assert(players.find(p=>p.id==='litchi').records.includes(l.id));assert(!players.find(p=>p.id==='sasakikojiro').records.includes(l.id));
});
test('All four movies retain original submission and publication clocks',()=>{
 const a=routeData(['course','athens-dash']).data,s=routeData(['course','squeaky-clean-sprint']).data;
 for(const [c,pid,time,post,pub] of [[a,'kuri','1:18.09','2023-08-15T11:57:16.900Z','2023-08-15T11:54:00Z'],[a,'newyork','1:17.75','2023-08-22T12:04:56.070Z','2023-08-22T12:04:13Z'],[s,'newyork','1:21.87','2023-08-16T07:44:56.082Z','2023-08-16T07:44:19Z'],[s,'phillish','1:21.62','2023-08-17T15:56:59.739Z','2023-08-17T16:07:53Z']]){
  const r=c.records.find(r=>r.playerId===pid&&r.time===time);assert.equal(r.submittedAt,post);assert.equal(r.videoPublishedAt,pub);assert.equal(JSON.parse(fs.readFileSync('public/data/courses/'+c.id+'.json','utf8')).records.find(x=>x.id===r.id).videoScopeReview.startToFinishContinuityVerified,false);assert.match(r.videoBackup.url,/media\.mktwrs\.com/);
 }
});
