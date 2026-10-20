import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
test('Yoshi 2023 Donut result-reviewed footage remains eligible without a continuity upgrade',()=>{
 const d=tourRecordingComparison(course('snes-donut-plains-2r'),'tour-93','2023-04-05','2023-04-19');
 assert.equal(d.documentedRecording.time,'1:00.08');assert.equal(d.documentedRecording.finalDate,'2023-04-18');
 assert.equal(d.documentedRecording.videoScope,'result-reviewed');assert.equal(d.documentedRecording.videoScopeReview.startToFinishContinuityVerified,false);
 assert.match(d.documentedRecording.videoBackup.url,/yoshi2023-63d80b4c5f4817f375d0\.mp4$/);
});
test('Wins Yoshi 1:31.46 standing duration ends at the earliest faster documented result',()=>{
 const c=course('gcn-yoshi-circuit'),r=c.records.find(r=>r.id==='1099918465650933810');
 assert.equal(r.documentedAt,'2023-04-07T12:26:59.303Z');assert.equal(r.durationEnd,'2024-04-16T12:30:00.958Z');
 assert.equal(c.records.find(x=>x.documentedAt===r.durationEnd).time,'1:31.41');
 const windows=c.appearances.map(a=>[Date.parse(a.startDate+'T06:00:00Z'),Date.parse(a.endDate+'T06:00:00Z')]);
 const seconds=windows.reduce((sum,[start,end])=>sum+Math.max(0,Math.min(end,Date.parse(r.durationEnd))-Math.max(start,Date.parse(r.documentedAt)))/1000,0);
 assert.ok(Math.abs(r.durationDays-seconds/86400)<1e-9);
});
