import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=n=>JSON.parse(fs.readFileSync(`public/data/${n}.json`,'utf8'));
test('Animal 2023 carries faster documentary records rather than stale screening WRs',()=>{
 for(const [cid,time] of [['n64-choco-mountain','1:18.37'],['n64-yoshi-valley-r','1:30.47']]){
  const d=routeData(['course',cid]).data;
  assert.equal(d.animal2023Recording.worldRecord.time,time);
  assert.notEqual(d.animal2023Recording.recording?.time,time);
  assert.equal(read(`courses/${cid}`).records.filter(r=>r.tourDateRange?.start==='2023-11-15').length,0);
 }
});
test('Available recording comparisons distinguish verified results from uploader-reported footage',()=>{
 const choco=routeData(['course','n64-choco-mountain']).data.animal2023Recording;
 const yvr=routeData(['course','n64-yoshi-valley-r']).data.animal2023Recording;
 assert.equal(choco.documentedRecording.time,'1:18.93');
 assert.equal(yvr.documentedRecording.time,'1:30.67');
 assert.equal(yvr.reportedRecording.time,'1:30.62');assert.equal(read('courses/n64-yoshi-valley-r').submissions.find(r=>r.id==='curated-animal2022-nu11-M011AAJ6zGg-distinct-recording').videoVerified,false);
 for(const r of [choco.documentedRecording,yvr.documentedRecording,yvr.reportedRecording])assert.match(r.videoBackup.url,/^https:\/\/media\.mktwrs\.com\//);
 assert.equal(yvr.documentedRecording.videoPublishedAt,'2022-11-26T17:22:48Z');assert.equal(yvr.documentedRecording.submittedAt,'2022-11-26T17:24:05.898Z');
});
test('Animal support uses source dates and only the fastest opening-day result',()=>{
 const choco=routeData(['course','n64-choco-mountain']).data.animal2023SupportingResults;
 const yvr=routeData(['course','n64-yoshi-valley-r']).data.animal2023SupportingResults;
 assert.equal(choco.length,16);assert.equal(yvr.length,18);
 assert.deepEqual(yvr.filter(r=>isReviewedOpeningDay(r,'2023-11-15')).map(r=>r.time),['1:31.72']);
 assert(!yvr.some(r=>r.time==='1:32.68'));
 for(const r of [...choco,...yvr]){assert.equal(r.recordDate,r.submittedAt.slice(0,10));assert.equal(r.dateUnresolved,false);assert.match(r.proofImageLocal,/^https:\/\/media\.mktwrs\.com\//);}
 assert(isReviewedOpeningDay({submittedAt:'2023-11-16T05:59:59Z',recordDate:'2023-11-16'},'2023-11-15'));
 assert(!isReviewedOpeningDay({submittedAt:'2023-11-16T06:00:00Z',recordDate:'2023-11-16'},'2023-11-15'));
});
test('Animal strategy clips are preserved with posting clocks and no completed result',()=>{
 for(const [cid,clock] of [['n64-choco-mountain','2023-11-19T10:15:28.208Z'],['n64-yoshi-valley-r','2023-11-27T21:47:49.512Z']]){
  const d=routeData(['course',cid]);const r=d.data.animal2023Recording.strategyReference;
  assert.equal(r.submittedAt,clock);assert.equal(r.videoSharedAt,clock);assert.equal(r.time,undefined);assert.match(r.videoBackup.url,/media\.mktwrs\.com\/assets\/video\/animal2023-/);
  assert(d.players.some(p=>p.id===r.playerId));
 }
});
