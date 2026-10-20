import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
const compare=c=>tourRecordingComparison(c,'tour-96','2023-05-17','2023-05-31');
test('Mii 2023 uses the earlier verified Maple footage while retaining its carried WR',()=>{
 const c=course('wii-maple-treeway-r'),d=compare(c);
 assert.equal(d.worldRecord.time,'1:49.29');assert.equal(d.documentedRecording.time,'1:50.37');assert.equal(d.documentedRecording.finalDate,'2021-02-02');
 assert.equal(d.documentedRecording.videoScope,'full-run');assert.equal(d.documentedRecording.durationDays,0);
 assert.match(d.documentedRecording.videoBackup.url,/cat2021-pZJSQ2w4WME-fa40209e1cba\.webm$/);
 assert.equal(c.records.some(r=>r.time==='1:50.37'),false);
});
test('Mii 2023 selects the reviewed Mushroom WR representation instead of its unscoped duplicate',()=>{
 const d=compare(course('gcn-mushroom-bridge'));
 assert.equal(d.documentedRecording.id,'1114964088326471821');assert.equal(d.documentedRecording.time,'1:10.37');
 assert.equal(d.documentedRecording.finalDate,'2023-05-31');assert.equal(d.documentedRecording.videoScope,'result-reviewed');
 assert.equal(d.documentedRecording.videoScopeReview.startToFinishContinuityVerified,false);
 assert.match(d.documentedRecording.videoBackup.url,/mii2023-8b2a0d7085b39849e083\.mp4$/);
});
