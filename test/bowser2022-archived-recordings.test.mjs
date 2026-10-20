import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
const compare=c=>tourRecordingComparison(c,'tour-77','2022-08-24','2022-09-07');
test('Bowser archive includes reviewed final videos while retaining uncertified race continuity',()=>{
 for(const [cid,time]of [['gba-bowser-s-castle-3','1:25.86'],['snes-choco-island-2r','0:48.49']]){
  const c=course(cid);const d=compare(c);
  assert.equal(d.documentedRecording.time,time);
  assert.equal(d.documentedRecording.videoScope,'result-reviewed');
  assert.equal(d.documentedRecording.videoScopeReview.startToFinishContinuityVerified,false);
  assert.match(d.documentedRecording.videoBackup.url,/^https:\/\/media\.mktwrs\.com\//);
  assert.equal(d.recording,null);
 }
 const wins=compare(course('snes-choco-island-2r')).documentedRecording;
 assert(wins.videoPublishedAt>'2022-09-07T06:00:00Z');
 assert.equal(wins.finalDate,'2022-08-30');
});
test('Bowser archive still rejects partial clips and unverified completed totals',()=>{
 const c=course('gba-bowser-s-castle-3');const final=c.records.find(r=>r.time==='1:25.86');
 for(const fields of [{videoScope:'partial-clip'},{videoVerified:false,proofVideoVerified:false}]){
  const d=compare({...c,records:[{...final,...fields}],submissions:[]});
  assert.equal(d.documentedRecording,null);assert.equal(d.recording,null);
 }
});
