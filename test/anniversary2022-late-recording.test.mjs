import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
const compare=c=>tourRecordingComparison(c,'tour-79','2022-09-21','2022-10-05');
test('Anniversary keeps the late Berlin record and recording with zero playable WR days',()=>{
 const c=course('berlin-byways-3');const d=compare(c);
 assert.equal(d.worldRecord.id,'1028138576740876369');assert.equal(d.worldRecord.time,'1:14.32');
 assert.equal(d.worldRecord.finalDate,'2022-10-05');assert(d.worldRecord.documentedAt>'2022-10-05T06:00:00Z');
 assert.equal(d.worldRecord.durationDays,0);assert.equal(d.documentedRecording.id,d.worldRecord.id);
 assert.match(d.documentedRecording.videoBackup.url,/^https:\/\/media\.mktwrs\.com\//);
 assert.equal(compare(course('singapore-speedway-2')).documentedRecording.time,'1:22.99');
});
test('Anniversary late-source eligibility does not accept partial or unverified recording evidence',()=>{
 const c=course('berlin-byways-3');const r=c.records.find(r=>r.id==='1028138576740876369');
 for(const fields of [{videoScope:'partial-clip'},{videoVerified:false,proofVideoVerified:false}]){
  const d=compare({...c,records:[{...r,...fields}],submissions:[]});
  assert.equal(d.worldRecord.time,'1:14.32');assert.equal(d.documentedRecording,null);assert.equal(d.recording,null);
 }
});
