import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=cid=>JSON.parse(fs.readFileSync(`public/data/courses/${cid}.json`,'utf8'));
test('Holiday 2023 distinguishes carried Snow WR from current results and reported footage',()=>{
 const d=routeData(['course','gba-snow-land']).data,c=d.holiday2023Recording;
 assert(read('gba-snow-land').appearances.some(a=>a.tourId==='tour-111'));
 assert.equal(c.worldRecord.id,'1058253597781000283');assert.equal(c.worldRecord.time,'1:08.42');
 assert.equal(c.reportedRecording.time,'1:08.42');assert.match(c.reportedRecording.videoBackup.url,/^https:\/\/media\.mktwrs\.com\//);
 assert.equal(read('gba-snow-land').records.find(r=>r.id==='1058253597781000283').videoVerified,false);
 assert(d.holiday2023SupportingResults.some(r=>r.time==='1:08.66'));
 assert(!read('gba-snow-land').records.some(r=>r.tourDateRange?.start==='2023-12-13'));
});
test('Phillish WR screenshot and later movie keep their independent source clocks',()=>{
 const d=routeData(['course','vancouver-velocity-3']).data,c=d.holiday2023Recording,r=read('vancouver-velocity-3').records.find(r=>r.id==='1192533972043964436');
 assert(read('vancouver-velocity-3').appearances.some(a=>a.tourId==='tour-111'));
 assert.equal(d.fastestVideo.time,'1:15.96');assert.equal(d.fastestVideo.documentedRecordingSelection,true);
 assert.equal(c.worldRecord.id,r.id);assert.equal(c.worldRecord.time,'1:15.96');assert.equal(c.documentedRecording.time,'1:15.96');
 assert.equal(r.submittedAt,'2023-12-17T17:43:10.516Z');assert.equal(r.recordDate,'2023-12-17');
 assert.equal(r.videoPublishedAt,'2023-12-20T11:25:26Z');assert.equal(r.videoSharedAt,'2023-12-20T12:28:24.893Z');assert.equal(r.videoSubmittedAt,r.videoSharedAt);
 assert.equal(r.dateUnresolved,false);assert.equal(r.videoScopeReview.startToFinishContinuityVerified,false);
 assert.match(r.proofImageLocal,/media\.mktwrs\.com/);assert.match(r.videoBackup.url,/media\.mktwrs\.com/);
});
test('No-items race, lap demonstration and discussion image cannot become standard WRs',()=>{
 const d=routeData(['course','vancouver-velocity-3']).data,c=d.holiday2023Recording;
 const r=read('vancouver-velocity-3').submissions.find(r=>r.messageId==='1186300595779403887-holiday2023-nita-video-reviewed');
 assert(r);assert.equal(r.time,'1:17.80');assert.equal(r.performanceCategory,'no-items-support');assert.equal(r.includeInProgression,false);
 assert.equal(r.submittedAt,'2023-12-18T13:35:02.433Z');assert.equal(r.videoPublishedAt,'2023-12-18T13:30:38Z');
 assert.equal(c.lapDemonstration.time,'37.94');assert.equal(c.lapDemonstration.completedRaceTime,null);assert.equal(c.lapDemonstration.videoSharedAt,'2023-12-14T16:14:17.747Z');
 assert.equal(c.sourceImages[0].postedAt,'2023-12-16T19:10:58.696Z');assert.match(c.sourceImages[0].url,/media\.mktwrs\.com/);
 assert(!read('vancouver-velocity-3').records.some(r=>['1:15.6','1:15.60','1:15.8','1:15.80','1:15.87','37.94'].includes(r.time)));
});
test('Opening-day policy and late submissions retain the actual 06 UTC source boundary',()=>{
 let late=0;
 for(const [cid,best] of [['gba-snow-land','1:08.74'],['vancouver-velocity-3','1:16.05']]){
  const rows=routeData(['course',cid]).data.holiday2023SupportingResults;
  assert.deepEqual(rows.filter(r=>isReviewedOpeningDay(r,'2023-12-13')).map(r=>r.time),[best]);
  for(const r of rows){assert.equal(r.recordDate,r.submittedAt.slice(0,10));assert.equal(r.dateUnresolved,false);}
  const closing=rows.filter(r=>r.submittedAt>='2023-12-27T06:00:00Z');late+=closing.length;for(const r of closing)assert.equal(r.recordDate,'2023-12-27');
 }
 assert.equal(late,5);
 assert(!isReviewedOpeningDay({submittedAt:'2023-12-14T06:00:00Z',recordDate:'2023-12-14'},'2023-12-13'));
});
