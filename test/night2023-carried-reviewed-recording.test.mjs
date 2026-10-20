import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
test('Night 2023 displays the carried Singapore result-reviewed video without upgrading its scope',()=>{
 const c=JSON.parse(fs.readFileSync('public/data/courses/singapore-speedway.json','utf8'));
 const d=tourRecordingComparison(c,'tour-99','2023-06-28','2023-07-12');
 assert.equal(d.worldRecord.time,'1:09.43');assert.equal(d.documentedRecording.id,d.worldRecord.id);
 assert.equal(d.documentedRecording.finalDate,'2022-01-25');assert.equal(d.documentedRecording.videoScope,'result-reviewed');
 assert.equal(d.documentedRecording.videoScopeReview.startToFinishContinuityVerified,false);
 assert.match(d.documentedRecording.videoBackup.url,/singapore2022-singapore-10943-e425cf9a676b\.mp4$/);
});
