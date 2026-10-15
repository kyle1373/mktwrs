import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Doctor final WRs retain contemporary posting dates and separate carried recordings',()=>{
 for(const [cid,id,time,date,doc] of [['ds-peach-gardens-r','1219694565657804833','1:27.16','2024-03-06T06:02:56.277Z','1:27.21'],['gba-sky-garden','1219694774953443399','1:03.97','2024-03-01T11:27:49.434Z','1:04.09']]){
  const c=course(cid),r=c.doctor2024Recording.worldRecord;
  assert.equal(r.id,id);assert.equal(r.time,time);assert.equal(r.submittedAt,date);assert.equal(r.recordDate,date.slice(0,10));assert.match(r.proofImageLocal,/^https:\/\/media.mktwrs.com\//);
  assert.equal(c.doctor2024Recording.documentedRecording.time,doc);assert.equal(c.doctor2024Recording.recording,null);
 }
});
test('Doctor carried movie publication and result submission clocks stay distinct',()=>{
 const p=course('ds-peach-gardens-r').doctor2024Recording.documentedRecording;
 const s=course('gba-sky-garden').doctor2024Recording.documentedRecording;
 assert.equal(p.videoPublishedAt,'2023-03-07T05:10:58Z');assert.equal(p.submittedAt,'2023-03-08T05:21:08.522Z');
 assert.equal(s.videoPublishedAt,'2023-03-07T09:15:13Z');assert.equal(s.submittedAt,'2023-03-07T09:20:15.336Z');
 for(const r of [p,s])assert.match(r.videoBackup.url,/^https:\/\/media.mktwrs.com\//);
});
test('Sky Garden 2024 reign ends at known 2026 successor without selecting its movie for 2024',()=>{
 const d=read('public/data/courses/gba-sky-garden.json');const r=d.records.find(r=>r.id==='1219694774953443399');
 assert.equal(r.durationEnd,'2026-02-26');assert.equal(r.durationDays,27);
 assert.deepEqual(r.durationIntervals,[{start:'2024-03-01',end:'2024-03-06'},{start:'2025-02-19',end:'2025-03-05'},{start:'2026-02-18',end:'2026-02-26'}]);
 assert.equal(d.records.find(r=>r.id==='1480018610201301063').time,'1:03.85');assert.equal(course(d.id).doctor2024Recording.documentedRecording.time,'1:04.09');
});
test('Partial strategy clips and missing or edited proofs cannot establish fabricated results',()=>{
 const a=read('archive/doctor2024-original-preservation-and-source-review-20261015.json');const partial=a.originalMovies.filter(m=>m.disposition==='partial-mid-lap-strategy');assert.equal(partial.length,2);
 for(const m of partial){assert.equal(m.completedTotal,null);assert.equal(m.completedLap,null);assert.equal(m.videoVerified,false);assert.match(m.r2.url,/^https:\/\/media.mktwrs.com\//);}
 assert.equal(a.missingOriginals[0].attachmentId,'1213716105877790730');
 const c=read('public/data/courses/gba-sky-garden.json'),r=c.submissions.find(r=>r.id==='discord-1214706396973506630');assert.equal(r.time,'1:05.35');assert.equal(r.proofImageVerified,false);assert.match(r.evidenceNote,/1:05.44/);
 const original=c.submissions.find(r=>r.messageId==='1214706383887409233-doctor2024-image-reviewed');assert.equal(original.time,'1:05.44');
});
test('Late Doctor menu best and opening results retain their proper dates and scope',()=>{
 const c=course('gba-sky-garden');const menu=c.doctor2024SupportingResults.find(r=>r.time==='1:04.77');assert.ok(menu);assert.equal(menu.submittedAt,'2024-03-06T07:02:20.454Z');assert.match(menu.evidenceNote,/Stored cup-menu best/);
 for(const cid of ['ds-peach-gardens-r','gba-sky-garden']){const rows=course(cid).doctor2024SupportingResults.filter(r=>r.submittedAt?.slice(0,10)==='2024-02-21');assert.equal(rows.length,1);}
 const receipt=read('archive/doctor2024-posted-results-and-preserved-source-reconciliation-20261015.json').missingCancelledReceipt;assert.equal(receipt.sameBytesEstablished,false);assert.equal(receipt.laterPostedAt,'2024-03-03T05:14:50.677Z');
});
