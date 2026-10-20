import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
const compare=c=>tourRecordingComparison(c,'tour-84','2022-11-30','2022-12-14');
test('Peach vs Bowser 2022 retains the carried Bowser Castle R record and original recording date',()=>{
 const c=course('3ds-bowser-s-castle-r'),d=compare(c);assert.equal(d.worldRecord.id,'966559082955821056');
 assert.equal(d.worldRecord.time,'1:38.39');assert.equal(d.worldRecord.finalDate,'2022-04-19');
 assert.equal(d.documentedRecording.time,'1:38.39');assert.equal(d.documentedRecording.finalDate,'2022-04-19');
 for(const fields of [{videoScope:'partial-clip'},{videoVerified:false,proofVideoVerified:false}]){
  const x=compare({...c,records:[{...d.worldRecord,...fields}],submissions:[]});
  assert.equal(x.worldRecord.time,'1:38.39');assert.equal(x.documentedRecording,null);
 }
});
test('Peach vs Bowser 2022 retains the carried Royal record separately from the slower surviving video',()=>{
 const d=compare(course('n64-royal-raceway'));assert.equal(d.worldRecord.id,'896333179479285770');
 assert.equal(d.worldRecord.time,'1:33.97');assert.equal(d.worldRecord.finalDate,'2020-11-08');
 assert.equal(d.documentedRecording.time,'1:34.23');assert.equal(d.documentedRecording.finalDate,'2022-12-05');
 assert.equal(d.worldRecord.video,null);assert.match(d.documentedRecording.videoBackup.url,/^https:\/\/media\.mktwrs\.com\//);
 assert.equal(compare(course('ds-peach-gardens')).worldRecord.time,'1:26.60');
});
