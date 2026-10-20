import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
const compare=c=>tourRecordingComparison(c,'tour-86','2022-12-28','2023-01-11');
test('New Year 2023 retains the Koopa Cape final posted after rollover without backdating its reign',()=>{
 const c=course('wii-koopa-cape'),d=compare(c);assert.equal(d.worldRecord.id,'1062874009567502386');
 assert.equal(d.worldRecord.time,'1:35.85');assert.equal(d.worldRecord.finalDate,'2023-01-11');
 assert(d.worldRecord.documentedAt>'2023-01-11T06:00:00Z');
 assert(!d.worldRecord.durationIntervals.some(i=>i.start<'2023-01-11T06:00:00Z'));
 assert.equal(d.documentedRecording.time,'1:36.21');assert.equal(d.documentedRecording.finalDate,'2022-12-29');
 assert.equal(d.worldRecord.video,null);
});
test('New Year 2023 retains the late Piranha Plant Slide video with the earlier submission date',()=>{
 const d=compare(course('3ds-piranha-plant-slide'));
 assert.equal(d.worldRecord.time,'1:28.43');assert.equal(d.documentedRecording.time,'1:28.43');
 assert.equal(d.documentedRecording.finalDate,'2023-01-01');
 assert(d.documentedRecording.videoPublishedAt>'2023-01-11T06:00:00Z');
 assert.match(d.documentedRecording.videoBackup.url,/^https:\/\/media\.mktwrs\.com\//);
});
