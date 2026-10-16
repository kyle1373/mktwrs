import test from 'node:test';
import assert from 'node:assert/strict';
import {routeData} from '../lib/data.mjs';
const course=id=>routeData(['course',id]).data;
test('Ninja2023 selects later result-reviewed fastest footage without an uploader-only duplicate',()=>{
 const c=course('3ds-wario-shipyard').ninja2023Recording;
 assert.equal(c.worldRecord.time,'1:33.45');assert.equal(c.documentedRecording.time,'1:33.45');assert.equal(c.recording.time,'1:33.45');assert.equal(c.reportedRecording,null);
 assert.equal(c.recording.recordingContinuityPending,true);assert.match(c.dateBoundaryNote,/finish was verified as 1:33.45/);assert.doesNotMatch(c.dateBoundaryNote,/uploader-reported|reported separately/);
 assert.equal(c.recording.videoBackup.url,'https://media.mktwrs.com/assets/video/ninja2023-6bb8456c04ac096129e5.mp4');
});
test('The later assessment preserves the 2023 submission, movie publication and share clocks',()=>{
 const r=course('3ds-wario-shipyard').ninja2023Recording.recording;
 assert.equal(r.submittedAt,'2023-04-03T14:00:05.058Z');assert.equal(r.videoPublishedAt,'2023-04-04T01:56:48Z');assert.equal(r.videoSharedAt,'2023-04-04T01:59:02.690Z');assert.equal(r.announcedAt,'2023-04-07T03:54:59.789Z');
});
test('Ninja2023 Rainbow Road retains its distinct reviewed footage and uploader-reported faster result',()=>{
 const c=course('wii-rainbow-road').ninja2023Recording;assert.equal(c.recording.time,'1:15.83');assert.equal(c.reportedRecording.time,'1:15.60');assert.equal(c.worldRecord.time,'1:15.60');
});
