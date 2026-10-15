import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=cid=>JSON.parse(fs.readFileSync(`public/data/courses/${cid}.json`,'utf8'));
test('Peach vs Bowser 2023 keeps stable WRs and distinguishes the carried record from current support',()=>{
 for(const [cid,id,time] of [['3ds-bowser-s-castle-r','966559082955821056','1:38.39'],['ds-peach-gardens','1189361589913124894','1:26.58'],['n64-royal-raceway','1189361686306619392','1:33.66']]){
  const d=routeData(['course',cid]).data;
  assert.equal(d.peachbowser2023Recording.worldRecord.id,id);
  assert.equal(d.peachbowser2023Recording.worldRecord.time,time);
  assert.equal(d.peachbowser2023Recording.documentedRecording.time,time);
  assert.match(d.peachbowser2023Recording.documentedRecording.videoBackup.url,/^https:\/\/media\.mktwrs\.com\/assets\/video\//);
 }
 assert.equal(read('3ds-bowser-s-castle-r').records.filter(r=>r.tourDateRange?.start==='2023-11-29').length,0);
 assert(!read('n64-royal-raceway').records.some(r=>r.time==='1:33.86'));
});
test('Sucha screenshots date the submissions without falsely dating the later movies',()=>{
 const rr=read('n64-royal-raceway').records.find(r=>r.id==='1189361686306619392');
 const pg=read('ds-peach-gardens').records.find(r=>r.id==='1189361589913124894');
 assert.equal(rr.recordDate,'2023-12-01');assert.equal(rr.submittedAt,'2023-12-01T08:52:37.455Z');
 assert.equal(rr.videoPublishedAt,'2023-12-01T11:14:04Z');assert.equal(rr.videoSharedAt,'2023-12-01T11:19:04.591Z');
 assert.equal(pg.recordDate,'2023-12-06');assert.equal(pg.submittedAt,'2023-12-06T10:45:37.112Z');
 assert.equal(pg.videoPublishedAt,'2023-12-06T10:52:23Z');assert.equal(pg.videoSubmittedAt,undefined);
 for(const r of [rr,pg]){assert.equal(r.dateUnresolved,false);assert.match(r.proofImageLocal,/media\.mktwrs\.com/);assert(Date.parse(r.videoPublishedAt)>Date.parse(r.submittedAt));}
 assert.equal(pg.additionalProofImages.length,1);
});
test('Current support keeps actual closing dates and only the fastest opening result',()=>{
 const pg=routeData(['course','ds-peach-gardens']).data.peachbowser2023SupportingResults;
 const rr=routeData(['course','n64-royal-raceway']).data.peachbowser2023SupportingResults;
 const bcr=routeData(['course','3ds-bowser-s-castle-r']).data.peachbowser2023SupportingResults;
 assert.deepEqual(pg.filter(r=>isReviewedOpeningDay(r,'2023-11-29')).map(r=>r.time),['1:26.88']);
 assert.deepEqual(rr.filter(r=>isReviewedOpeningDay(r,'2023-11-29')).map(r=>r.time),['1:33.98']);
 const late=pg.find(r=>r.time==='1:27.28' && r.submittedAt==='2023-12-13T06:24:43.919Z');assert(late);assert.equal(late.submittedAt,'2023-12-13T06:24:43.919Z');assert.equal(late.recordDate,'2023-12-13');
 assert(bcr.some(r=>r.time==='1:38.90'));assert(!isReviewedOpeningDay({submittedAt:'2023-11-30T06:29:18.855Z',recordDate:'2023-11-30'},'2023-11-29'));
 for(const r of [...pg,...rr,...bcr]){assert.equal(r.recordDate,r.submittedAt.slice(0,10));assert.equal(r.dateUnresolved,false);assert.match(r.proofImageLocal,/^https:\/\/media\.mktwrs\.com\//);}
});
test('Supporting movies retain result scope and their independent publication clocks',()=>{
 const bcr=read('3ds-bowser-s-castle-r').submissions;
 for(const [raw,time,date] of [['1182656426057941042-peach-bowser2023-image-reviewed','1:38.76','2023-12-08T12:12:47Z'],['1182876914508120165-peach-bowser2023-image-reviewed','1:38.62','2023-12-09T02:14:01Z']]){
  const r=bcr.find(r=>r.messageId===raw || r.id==='curated-'+raw);assert(r);assert.equal(r.time,time);assert.equal(r.videoPublishedAt,date);assert.equal(r.videoScopeReview.startToFinishContinuityVerified,false);assert.match(r.videoBackup.url,/media\.mktwrs\.com/);
 }
});
