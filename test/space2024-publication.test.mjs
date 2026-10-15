import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=cid=>JSON.parse(fs.readFileSync(`public/data/courses/${cid}.json`,'utf8'));
const ccir='gba-cheep-cheep-island-r',kd2='n64-kalimari-desert-2';
test('Space 2024 retains the carried WR and distinguishes the improved WR from available footage',()=>{
 assert.equal(read(ccir).records.length+read(kd2).records.length,26);
 const c=routeData(['course',ccir]).data.space2024Recording,k=routeData(['course',kd2]).data.space2024Recording;
 assert.equal(c.worldRecord.id,'1068224700599255101');assert.equal(c.worldRecord.time,'1:11.78');assert.equal(c.documentedRecording.time,'1:11.78');
 assert.equal(k.worldRecord.id,'1204260087687024680');assert.equal(k.worldRecord.time,'1:03.32');assert.equal(k.documentedRecording.time,'1:03.36');
 for(const r of [c.documentedRecording,k.documentedRecording])assert.match(r.videoBackup.url,/^https:\/\/media\.mktwrs\.com\//);
 assert(!read(ccir).records.some(r=>r.tourDateRange?.start==='2024-01-10'));
});
test('kNo2 closing screenshot supplies the January 24 date while retaining documented tour attribution',()=>{
 const r=read(kd2).records.find(r=>r.id==='1204260087687024680');
 assert.equal(r.submittedAt,'2024-01-24T06:03:32.560Z');assert.equal(r.recordDate,'2024-01-24');assert.equal(r.dateUnresolved,false);assert.equal(r.lateTourSubmission,true);assert.equal(r.courseAppearance,'Space Tour (2024)');assert.equal(r.durationDays,28);assert.equal(read(kd2).records.find(r=>r.id==='1068224230715559956').durationEnd,'2024-01-24');assert.equal(read(kd2).records.find(r=>r.id==='1068224230715559956').durationDays,14);assert.deepEqual(r.laps,['29.54','33.78']);assert.match(r.proofImageLocal,/media\.mktwrs\.com/);assert(!r.video);
 const carried=read(ccir).records.find(r=>r.id==='1068224700599255101');assert.equal(carried.videoPublishedAt,'2023-01-25T02:47:41Z');assert.equal(carried.submittedAt,'2023-01-25T02:52:05.077Z');
});
test('Only fastest first-day support is shown and closing results retain real posting dates',()=>{
 const c=routeData(['course',ccir]).data.space2024SupportingResults,k=routeData(['course',kd2]).data.space2024SupportingResults;
 assert.deepEqual(c.filter(r=>isReviewedOpeningDay(r,'2024-01-10')).map(r=>r.time),['1:11.98']);assert.equal(k.filter(r=>isReviewedOpeningDay(r,'2024-01-10')).length,0);
 for(const r of [...c,...k]){assert.equal(r.recordDate,r.submittedAt.slice(0,10));assert.equal(r.dateUnresolved,false);}
 const late=c.filter(r=>r.submittedAt>='2024-01-24T06:00:00Z');assert.deepEqual(late.map(r=>r.time),['1:12.28','1:12.94','1:12.59']);
 const raw=read(ccir).submissions.find(r=>r.messageId==='1199678236683149402-space2024-closing-receipt-reviewed');assert(raw);assert.equal(raw.receiptResultVerified,true);assert.equal(raw.proofImageVerified,false);assert.equal(raw.includeInProgression,false);
 assert(c.some(r=>r.playerId==='deleted-user'&&r.time==='1:13.59'));assert(c.some(r=>r.playerId==='deleted-user'&&r.time==='1:13.18'));assert(k.some(r=>r.playerId==='ryo'&&r.time==='1:04.97'));
});
test('Unknown-course social crop and repeated submission image do not become additional WRs',()=>{
 const c=routeData(['course',kd2]).data.space2024Recording;
 assert.equal(c.sourceImages.length,1);assert(!c.sourceImages[0].time);assert(!c.sourceImages[0].playerId);assert.match(c.sourceImages[0].note,/course unconfirmed/);assert(!read(kd2).records.some(r=>r.time==='1:03.30'));
 assert.equal(routeData(['course',kd2]).data.space2024SupportingResults.filter(r=>r.time==='1:03.83').length,1);
 const r=read(ccir).submissions.find(r=>r.messageId==='1195894556894429267-space2024-image-reviewed');assert(r.additionalProofImages.some(u=>u.includes('1195907364210081823')));assert.equal(r.includeInProgression,false);
});
