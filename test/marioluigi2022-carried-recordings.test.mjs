import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison}from'../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
const compare=c=>tourRecordingComparison(c,'tour-78','2022-09-07','2022-09-21');
test('Mario vs Luigi 2022 includes the carried DK Pass WR with its original date and footage',()=>{
 const d=compare(course('ds-dk-pass'));assert.equal(d.worldRecord.id,'896333065431965716');
 assert.equal(d.worldRecord.time,'1:31.56');assert.equal(d.worldRecord.finalDate,'2020-09-29');
 assert.equal(d.documentedRecording.time,'1:31.56');assert.match(d.documentedRecording.videoBackup.url,/media\.mktwrs\.com/);
});
test('Mario vs Luigi 2022 keeps historical Maple footage separate from the faster screenshot WR',()=>{
 const c=course('wii-maple-treeway-r');const d=compare(c);
 assert.equal(d.worldRecord.time,'1:49.29');assert.equal(d.worldRecord.finalDate,'2022-09-20');
 assert.equal(d.documentedRecording.time,'1:50.37');assert.equal(d.documentedRecording.finalDate,'2021-02-02');
 assert.equal(d.documentedRecording.durationDays,0);assert.equal(d.documentedRecording.playerId,'maler-markus');
 assert(!c.records.some(r=>r.id===d.documentedRecording.id));
 const partial={...d.documentedRecording,videoScope:'partial-clip'};
 assert.equal(compare({...c,submissions:[partial]}).documentedRecording,null);
});
