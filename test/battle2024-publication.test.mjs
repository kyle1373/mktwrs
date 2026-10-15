import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Battle2024 final WR retains posting date, video publication and announced provenance',()=>{
 const c=read('public/data/courses/snes-donut-plains-2.json'),r=c.records.find(r=>r.id==='1308276800647991408');assert.equal(r.time,'1:00.46');assert.equal(r.submittedAt,'2024-10-15T13:36:46.701Z');assert.equal(r.recordDate,'2024-10-15');assert.equal(r.chronologyDate,r.submittedAt);assert.deepEqual(r.laps,['30.26','30.20']);assert.equal(r.videoPublishedAt,'2024-10-15T13:00:38Z');assert.equal(r.videoSharedAt,undefined);assert.equal(r.videoShareClockUnresolved,true);assert.ok(r.videoBackup.url.startsWith('https://media.mktwrs.com/'));assert.ok(r.additionalSources.some(s=>s.url?.includes('1308276800647991408')));
 const d=course('snes-donut-plains-2');assert.equal(d.battle2024Recording.worldRecord.time,'1:00.46');assert.equal(d.battle2024Recording.documentedRecording.time,'1:00.46');assert.equal(d.battle2024SupportingResults.length,5);assert.equal(d.battle2024Recording.strategyReferences.length,0);
});
test('DonutPlains1R carried WR and slower movie stay separate without fabricated current results',()=>{
 const d=course('snes-donut-plains-1r');assert.equal(d.battle2024Recording.worldRecord.time,'0:49.15');assert.equal(d.battle2024Recording.documentedRecording.time,'0:49.31');assert.equal(d.battle2024SupportingResults.length,0);assert.ok(d.fastestVideo);
 const dp2=course('snes-donut-plains-2'),p=dp2.battle2024SupportingResults.find(r=>r.time==='1:00.72');assert.equal(p.submittedAt,'2024-10-15T17:24:21.893Z');assert.deepEqual(p.laps,['30.54','30.18']);assert.equal(dp2.battle2024SupportingResults.filter(r=>r.time==='1:00.72').length,1);assert.equal(dp2.battle2024SupportingResults.find(r=>r.time==='1:00.55').playerId,'mb3');assert.deepEqual(dp2.battle2024SupportingResults.filter(r=>r.submittedAt<'2024-10-03T06:00:00Z').map(r=>r.time),['1:02.94']);
});
test('All610rows and49existing WRs retained, and5receipts remain source-only',()=>{
 let rows=0,wr=0;const aggregate=read('public/data/courses.json');for(const cid of ['snes-donut-plains-1r','snes-donut-plains-2']){const c=read('public/data/courses/'+cid+'.json'),g=aggregate.find(c=>c.id===cid);for(const k of ['records','submissions','candidates']){assert.deepEqual(c[k],g[k]);rows+=c[k].length;}wr+=c.records.length;}
 assert.equal(rows,610);assert.equal(wr,49);const receipts=read('archive/battle2024-edited-receipt-source-dispositions-20261015.json');assert.equal(receipts.matchedReceipts,5);assert.equal(receipts.mismatchedReceipts,0);assert.ok(receipts.receiptSourceDispositions.every(p=>p.set.includeInProgression===false));
});
test('Ten preserved files retain hashes and source census limitations',()=>{
 const a=read('archive/battle2024-original-preservation-and-source-review-20261015.json');assert.equal(a.originalImages.length,7);assert.equal(a.originalMovies.length,3);assert.equal(a.uniqueCurrentPerformances,6);assert.equal(a.r2FilesVerified,10);for(const f of [...a.originalImages,...a.originalMovies]){assert.equal(f.sha256,f.r2.sha256);assert.equal(f.r2.publicRangeMatchesOriginal,true);}
 assert.equal(a.originalImages.find(f=>f.attachmentId==='1295799442057859093').sha256,a.originalImages.find(f=>f.attachmentId==='1295799713290784848').sha256);const c=read('archive/battle2024-preserved-bounded-source-census-20261015.json');assert.equal(c.currentDiscussionRows,22);assert.equal(c.postCloseContextRows,3);assert.equal(c.freshBrowserCensusCompleted,false);
});
