import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const cids=['wii-daisy-circuit','snes-koopa-troopa-beach-2r'];
const course=cid=>routeData(['course',cid]).data;
test('Sunshine 2024 WRs and recordings retain the actual late submission boundary',()=>{
 const d=course(cids[0]).sunshine2024Recording,k=course(cids[1]).sunshine2024Recording;
 assert.equal(d.worldRecord.time,'1:18.15');assert.equal(d.documentedRecording.time,'1:18.15');assert.equal(d.worldRecord.submittedAt,'2024-08-07T13:26:23.374Z');assert.equal(d.worldRecord.recordDate,'2024-08-07');assert.match(d.dateBoundaryNote,/after the tour closed/);assert.equal(d.reportedRecording.time,'1:18.23');assert.equal(d.reportedRecording.videoPublishedAt,'2024-07-27T08:36:21Z');
 assert.equal(k.worldRecord.time,'0:57.17');assert.equal(k.worldRecord.video,null);assert.ok(!k.worldRecord.laps||k.worldRecord.laps.every(l=>!l));assert.equal(k.documentedRecording.time,'0:57.42');assert.equal(k.documentedRecording.submittedAt,'2024-08-05T09:44:28.972Z');assert.equal(k.documentedRecording.videoPublishedAt,'2024-08-05T15:10:30Z');assert.equal(k.documentedRecording.videoSharedAt,'2024-08-05T23:09:24.945Z');
});
test('Contemporary WR improvements and the Daisy tie retain posting dates and source evidence',()=>{
 const d=read('public/data/courses/'+cids[0]+'.json');
 for(const [id,day] of [['curated-1266466137869127791-sunshine2024-image-reviewed','2024-07-26'],['curated-1267618667764514867-sunshine2024-image-reviewed','2024-07-29']]){const r=d.records.find(r=>r.id===id);assert.equal(r.time,'1:18.20');assert.equal(r.recordDate,day);assert.ok(r.proofImageLocal.startsWith('https://media.mktwrs.com/'));}
 const k=read('public/data/courses/'+cids[1]+'.json');for(const [id,time,day] of [['curated-1267455755972513904-sunshine2024-image-reviewed','0:57.48','2024-07-29'],['curated-1268885975749103657-sunshine2024-image-reviewed','0:57.38','2024-08-02'],['1274825400567992371','0:57.17','2024-08-03']]){const r=k.records.find(r=>r.id===id);assert.equal(r.time,time);assert.equal(r.recordDate,day);}
 assert.equal(d.records.find(r=>r.id==='1139362445480177824').time,'1:18.30');assert.equal(k.records.find(r=>r.id==='1139362790906265772').time,'0:57.55');
});
test('The 57.60 movie and later image display once with the earliest source clock',()=>{
 const rows=course(cids[1]).sunshine2024SupportingResults.filter(r=>r.time==='0:57.60');assert.equal(rows.length,1);const r=rows[0];assert.equal(r.submittedAt,'2024-08-04T14:10:32.706Z');assert.ok(r.proofImageLocal.includes('1269685519'));assert.ok(r.videoBackup.url.includes('1269658739263406110'));
 assert.ok(r.sourceReportTimes.some(s=>s.postedAt==='2024-08-04T15:56:57.514Z'));
 const early=course(cids[0]).sunshine2024SupportingResults.filter(r=>r.time==='1:19.01');assert.equal(early.length,1);assert.equal(early[0].submittedAt,'2024-07-27T15:09:57.638Z');assert.ok(course(cids[0]).sunshine2024SupportingResults.filter(r=>r.submittedAt.startsWith('2024-07-24')).every(r=>r.time==='1:18.75'));
 const receipts=read('archive/sunshine2024-edited-receipt-source-dispositions-20261015.json');assert.equal(receipts.matchedReceipts,19);assert.equal(receipts.mismatchedReceipts,0);
});
test('All 303 prior course rows and 23 WR IDs survive with one new supporting tutorial result',()=>{
 const a=read('archive/sunshine2024-posted-results-and-preserved-source-reconciliation-20261015.json');assert.equal(a.sourceDisposition.length,33);let rows=0,wr=0;const aggregate=read('public/data/courses.json');
 for(const cid of cids){const c=read('public/data/courses/'+cid+'.json'),g=aggregate.find(c=>c.id===cid);for(const k of ['records','submissions','candidates']){assert.deepEqual(c[k],g[k]);rows+=c[k].length;}wr+=c.records.length;for(const s of a.sourceDisposition.filter(s=>s.courseId===cid))assert.ok([...c.records,...c.submissions,...c.candidates].some(r=>r.messageId===s.rawId||r.id==='curated-'+s.rawId),s.rawId);}
 assert.equal(rows,304);assert.equal(wr,23);assert.deepEqual(cids.map(cid=>course(cid).sunshine2024SupportingResults.length),[13,12]);
});
test('Every available source is preserved while four partial clips remain separate from full results',()=>{
 const p=read('archive/sunshine2024-original-preservation-and-source-review-20261015.json');assert.equal(p.r2FilesVerified,48);assert.equal(p.originalImages.length,38);assert.equal(p.originalMovies.length,10);assert.equal(p.originalMovies.filter(r=>r.completedTotal===null).length,4);for(const f of [...p.originalImages,...p.originalMovies]){assert.equal(f.sha256,f.r2.sha256);assert.equal(f.r2.publicRangeMatchesOriginal,true);}
 const partial=cids.flatMap(cid=>course(cid).sunshine2024Recording.strategyReferences);assert.equal(partial.length,4);assert.ok(partial.every(r=>!r.time));const lap=partial.find(r=>r.video.includes('FmgTUfHaa1I'));assert.equal(lap.videoPublishedAt,'2024-08-03T06:09:59Z');assert.equal(lap.videoSharedAt,'2024-08-03T06:14:56.963Z');
 assert.equal(read('archive/sunshine2024-daisy-strategy-video-result-review-20261015.json').completedTotal,'1:18.23');assert.equal(read('public/data/pipe2024-completion.json').validation.livePublicationVerified,true);
});
