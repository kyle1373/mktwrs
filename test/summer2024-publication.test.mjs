import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const cids=['berlin-byways-2','madrid-drive','piranha-plant-cove-3'];
const course=cid=>routeData(['course',cid]).data;
test('Summer 2024 compares carried WRs and recordings without treating partial Cove3 footage as a full run',()=>{
 const expected=[['1:23.38','1:23.38'],['1:17.31','1:17.31'],['1:16.06',null]];
 cids.forEach((cid,i)=>{const d=course(cid).summer2024Recording;assert.equal(d.worldRecord.time,expected[i][0]);assert.equal(d.documentedRecording?.time||null,expected[i][1]);if(d.documentedRecording)assert.ok(d.documentedRecording.videoBackup.url.startsWith('https://media.mktwrs.com/'));});
 const clips=course('piranha-plant-cove-3').summer2024Recording.strategyReferences;assert.equal(clips.length,3);assert.ok(clips.every(r=>!r.time && r.videoBackup.url.startsWith('https://media.mktwrs.com/')));
 const madrid=course('madrid-drive').summer2024Recording.documentedRecording;assert.equal(madrid.submittedAt,'2023-09-06T06:08:57.804Z');assert.equal(madrid.videoPublishedAt,'2023-09-06T06:11:22+00:00');
});
test('Cove3 progression retains posting clocks, separate identities, lap captions and final announcement',()=>{
 const c=read('public/data/courses/piranha-plant-cove-3.json');
 const expected=[['curated-1276480615214092348-summer2024-image-reviewed','1:16.27','2024-08-23T09:58:14.530Z','unknown'],['curated-1276480753445896252-summer2024-image-reviewed','1:16.23','2024-08-23T09:58:47.487Z','player-e38199e38184e3819df09f90ba'],['curated-1278027762459873351-summer2024-image-reviewed','1:16.17','2024-08-27T16:26:03.178Z','player-e38199e38184e3819df09f90ba'],['1290731431890255945','1:16.06','2024-08-30T12:10:01.927Z','remon']];
 for(const [id,time,clock,pid] of expected){const r=c.records.find(r=>r.id===id);assert.equal(r.time,time);assert.equal(r.submittedAt,clock);assert.equal(r.recordDate,clock.slice(0,10));assert.equal(r.chronologyDate,clock);assert.equal(r.playerId,pid);assert.ok(r.proofImageLocal.startsWith('https://media.mktwrs.com/'));assert.equal(r.video,null);}
 assert.deepEqual(c.records.find(r=>r.id==='1290731431890255945').laps,['38.02','38.04']);assert.ok(c.records.find(r=>r.id==='1290731431890255945').additionalSources.some(s=>s.url?.includes('1290731431890255945')));
});
test('All588course rows and45WRs survive;11matched receipts receive no duplicate credit',()=>{
 let rows=0,wr=0;const aggregate=read('public/data/courses.json');
 for(const cid of cids){const c=read('public/data/courses/'+cid+'.json'),g=aggregate.find(c=>c.id===cid);for(const k of ['records','submissions','candidates']){assert.deepEqual(c[k],g[k]);rows+=c[k].length;}wr+=c.records.length;}
 assert.equal(rows,588);assert.equal(wr,45);assert.deepEqual(cids.map(cid=>course(cid).summer2024SupportingResults.length),[2,5,14]);
 const receipts=read('archive/summer2024-edited-receipt-source-dispositions-20261015.json');assert.equal(receipts.matchedReceipts,11);assert.equal(receipts.mismatchedReceipts,0);
 assert.ok(receipts.receiptSourceDispositions.every(r=>r.set.includeInProgression===false));
});
test('Thirty-two preserved files are verified; unmapped snowy evidence remains source-only after close',()=>{
 const p=read('archive/summer2024-original-preservation-and-source-review-20261015.json');assert.equal(p.r2FilesVerified,32);assert.equal(p.originalImages.length,27);assert.equal(p.originalMovies.length,5);
 for(const f of [...p.originalImages,...p.originalMovies]){assert.equal(f.sha256,f.r2.sha256);assert.equal(f.r2.publicRangeMatchesOriginal,true);}
 const snow=p.originalImages.find(f=>f.attachmentId==='1280774680843784193');assert.equal(snow.sourceRows[0].publishedAt,'2024-09-04T06:21:19.545Z');assert.deepEqual(snow.canonicalMatches,[]);
 const census=read('archive/summer2024-preserved-bounded-source-census-20261015.json');assert.equal(census.currentDiscussionRows,51);assert.equal(census.postCloseContextRows,30);assert.equal(census.freshBrowserCensusCompleted,false);
});
