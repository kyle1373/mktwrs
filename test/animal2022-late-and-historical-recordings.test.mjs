import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
const compare=c=>tourRecordingComparison(c,'tour-83','2022-11-16','2022-11-30');
test('Animal 2022 includes its late final WR and keeps the faster available footage separate',()=>{
 const c=course('n64-yoshi-valley-r');const d=compare(c);
 assert.equal(d.worldRecord.id,'1053521178179932180');assert.equal(d.worldRecord.time,'1:30.47');
 assert.equal(d.worldRecord.finalDate,'2022-12-17');
 assert(!d.worldRecord.durationIntervals.some(i=>i.start<'2022-11-30T06:00:00Z'));
 assert.equal(d.documentedRecording.time,'1:30.62');assert.equal(d.documentedRecording.finalDate,'2022-11-29');
 assert.equal(d.worldRecord.video,null);assert.match(d.documentedRecording.videoBackup.url,/^https:\/\/media\.mktwrs\.com\//);
});
test('Animal 2022 shows older Choco footage without changing the faster WR or accepting partial clips',()=>{
 const c=course('n64-choco-mountain');const d=compare(c);
 assert.equal(d.worldRecord.time,'1:18.37');assert.equal(d.worldRecord.finalDate,'2022-11-21');
 assert.equal(d.documentedRecording.time,'1:18.93');assert.equal(d.documentedRecording.finalDate,'2020-12-17');
 assert.equal(d.documentedRecording.playerId,'superfx');
 for(const fields of [{videoScope:'partial-clip'},{videoVerified:false,proofVideoVerified:false}]){
  assert.equal(compare({...c,submissions:[{...d.documentedRecording,...fields}]}).documentedRecording,null);
 }
});
