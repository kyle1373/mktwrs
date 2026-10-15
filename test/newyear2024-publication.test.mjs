import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=cid=>JSON.parse(fs.readFileSync(`public/data/courses/${cid}.json`,'utf8'));
const kc='wii-koopa-cape',pps='3ds-piranha-plant-slide';
test('New Year 2024 preserves 23 WRs and separates Koopa Cape WR from available footage',()=>{
 assert.equal(read(kc).records.length+read(pps).records.length,23);
 for(const cid of [kc,pps])assert(read(cid).appearances.some(a=>a.tourId==='tour-112'));
 const c=routeData(['course',kc]).data.newyear2024Recording;
 assert.equal(c.worldRecord.id,'1197596670645518491');assert.equal(c.worldRecord.time,'1:35.65');assert.equal(c.documentedRecording.time,'1:35.77');
 assert.match(c.documentedRecording.videoBackup.url,/media\.mktwrs\.com/);
 assert.equal(routeData(['course',pps]).data.newyear2024Recording.worldRecord.time,'1:28.03');
});
test('WR screenshots, movie publications and executed submission receipts retain independent clocks',()=>{
 const rs=read(pps).records;
 for(const [id,posted,published,receipt] of [
 ['curated-1191562870442446970-newyear2024-image-reviewed','2024-01-02T02:05:26.481Z','2024-01-02T02:08:46Z','2024-01-02T02:09:46.533Z'],
 ['curated-1192770551832383549-newyear2024-image-reviewed','2024-01-05T10:04:20.162Z','2024-01-05T10:08:54Z','2024-01-05T10:09:12.022Z'],
 ['1197596509772984370','2024-01-06T05:31:02.571Z','2024-01-06T05:23:36Z','2024-01-06T05:31:02.571Z']]){
 const r=rs.find(r=>r.id===id);assert.equal(r.submittedAt,posted);assert.equal(r.recordDate,posted.slice(0,10));assert.equal(r.videoPublishedAt,published);assert.equal(r.videoSubmittedAt,receipt);assert(!r.videoSharedAt);assert.equal(r.dateUnresolved,false);assert.equal(r.videoScopeReview.startToFinishContinuityVerified,false);
 }
});
test('Matching receipts remain source evidence without additional WR credit',()=>{
 const d=read(pps);assert.equal(d.candidates.length,0);
 for(const id of ['discord-1191563961179590837','discord-1192472098942226492','discord-1192481107824889856','discord-1192771775981961276']){
 const r=d.submissions.find(r=>r.id===id);assert(r);assert.equal(r.status,'matched-existing-wr-receipt');assert.equal(r.includeInProgression,false);assert(d.records.some(wr=>wr.id===r.matchedExistingWrId));assert.equal(r.recordDate,r.submittedAt.slice(0,10));assert(!d.records.some(wr=>wr.id===id));
 }
});
test('Lap clips and image-only leads cannot become completed race records',()=>{
 const c=routeData(['course',pps]).data.newyear2024Recording;
 assert.deepEqual(c.lapDemonstrations.map(r=>r.time),['44.23','44.10']);
 for(const r of c.lapDemonstrations){assert.equal(r.completedRaceTime,null);assert.equal(r.videoScope,'single-lap');assert.match(r.videoBackup.url,/media\.mktwrs\.com/);}
 assert.equal(c.sourceImages.length,5);for(const r of c.sourceImages.slice(-3)){assert(!r.time);assert(!r.playerId);assert.equal(r.postedAt.slice(0,10),'2024-01-10');}
 assert(!read(pps).records.some(r=>['44.23','44.10','2:37.70'].includes(r.time)));
});
test('Opening-day fastest results and late posts use their actual submission dates',()=>{
 let late=0;
 for(const [cid,best] of [[kc,'1:35.98'],[pps,'1:28.71']]){
 const rows=routeData(['course',cid]).data.newyear2024SupportingResults;
 assert.deepEqual(rows.filter(r=>isReviewedOpeningDay(r,'2023-12-27')).map(r=>r.time),[best]);
 for(const r of rows){assert.equal(r.recordDate,r.submittedAt.slice(0,10));assert.equal(r.dateUnresolved,false);if(r.submittedAt>='2024-01-10T06:00:00Z'){late++;assert.equal(r.recordDate,'2024-01-10');}}
 }
 assert.equal(late,3);assert(routeData(['course',kc]).data.newyear2024SupportingResults.some(r=>r.playerId==='ryo'&&r.time==='1:42.11'));assert(routeData(['course',pps]).data.newyear2024SupportingResults.some(r=>r.playerId==='deleted-user'&&r.time==='2:37.70'));
});
