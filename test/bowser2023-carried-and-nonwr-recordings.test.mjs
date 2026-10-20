import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
const compare=c=>tourRecordingComparison(c,'tour-95','2023-05-03','2023-05-17');
test('Bowser 2023 shows the carried Kalimari recording with its original 2021 source date',()=>{
 const c=course('n64-kalimari-desert-2r'),d=compare(c);
 assert.equal(d.worldRecord.time,'1:04.30');assert.equal(d.documentedRecording.time,'1:04.30');
 assert.equal(d.documentedRecording.finalDate,'2021-05-14');assert.match(d.documentedRecording.videoBackup.url,/bowserdk2021-kalimari-10430-ecb7a9eb5b46\.mp4$/);
 assert.equal(c.records.filter(r=>['896334182928760863','966540176568512563'].includes(r.id)).length,2);
});
test('Bowser 2023 admits reviewed non-WR footage without adding a WR reign or certifying continuity',()=>{
 const c=course('gba-bowser-s-castle-4'),d=compare(c);
 assert.equal(d.worldRecord.time,'1:10.80');assert.equal(d.documentedRecording.time,'1:10.86');assert.equal(d.documentedRecording.finalDate,'2023-05-11');
 assert.equal(d.documentedRecording.videoScope,'result-reviewed');assert.equal(d.documentedRecording.videoScopeReview.startToFinishContinuityVerified,false);
 assert.equal(d.documentedRecording.durationDays,0);assert.equal(c.records.some(r=>r.time==='1:10.86'),false);
 assert.match(d.documentedRecording.videoBackup.url,/bowser2023-675cc4a5e36c35e119ca\.mp4$/);
});
