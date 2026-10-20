import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
const compare=c=>tourRecordingComparison(c,'tour-89','2023-02-08','2023-02-22');
test('Exploration 2023 retains the archived final video with its existing result-review limits',()=>{
 const d=compare(course('piranha-plant-cove'));
 assert.equal(d.worldRecord.time,'1:08.46');assert.equal(d.documentedRecording.time,'1:08.46');
 assert.equal(d.documentedRecording.finalDate,'2023-02-19');
 assert.equal(d.documentedRecording.videoScope,'result-reviewed');
 assert.equal(d.documentedRecording.videoScopeReview.fullFrameContinuityAuditPerformed,false);
 assert.match(d.documentedRecording.videoBackup.url,/^https:\/\/media\.mktwrs\.com\//);
});
test('Exploration 2023 keeps the slower surviving Cove2 video separate from its WR and partial clips',()=>{
 const c=course('piranha-plant-cove-2'),d=compare(c);
 assert.equal(d.worldRecord.time,'1:29.38');assert.equal(d.documentedRecording.time,'1:29.81');
 assert.equal(d.documentedRecording.finalDate,'2023-02-12');
 assert.match(d.documentedRecording.videoBackup.url,/exploration2023-GzodqtHfb4A-1e5a453360c1\.webm$/);
 assert(!d.documentedRecording.videoBackup.url.includes('partial'));
});
