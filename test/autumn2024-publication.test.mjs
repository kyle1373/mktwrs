import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Autumn2024 carried WRs retain matching movies and separate original posting clocks',()=>{
 for(const [cid,id,time,submitted,published,count] of [['los-angeles-laps-2','1178887189124370537','1:13.41','2023-11-03T01:57:28.181Z','2023-11-03T01:57:00Z',9],['los-angeles-laps-3','1042970214414950400','1:18.78','2022-11-11T17:20:02.780Z','2022-11-11T20:14:33Z',3]]){
 const r=read('public/data/courses/'+cid+'.json').records.find(r=>r.id===id);assert.equal(r.time,time);assert.equal(r.submittedAt,submitted);assert.equal(r.recordDate,submitted.slice(0,10));assert.equal(r.videoPublishedAt,published);assert.ok(r.videoBackup.url.startsWith('https://media.mktwrs.com/'));const d=course(cid);assert.equal(d.autumn2024Recording.worldRecord.time,time);assert.equal(d.autumn2024Recording.documentedRecording.time,time);assert.equal(d.autumn2024SupportingResults.length,count);assert.equal(d.autumn2024Recording.strategyReferences.length,0);
 }
});
test('Opening-day and deleted-author sources retain posting dates without invented identity or WR credit',()=>{
 const s=course('los-angeles-laps-2').autumn2024SupportingResults;assert.deepEqual(s.filter(r=>r.submittedAt<'2024-10-31T06:00:00Z').map(r=>r.time),['1:14.93']);const u=s.find(r=>r.time==='1:13.62');assert.equal(u.playerId,'unknown');assert.equal(u.submittedAt,'2024-10-31T16:02:32.163Z');assert.equal(u.recordDate,'2024-10-31');assert.deepEqual(s.find(r=>r.time==='1:13.54').laps,['36.88','36.66']);
 const raw=read('archive/curated-runs.json').filter(r=>r.canonicalSourceReviewAudit==='archive/autumn2024-posted-results-and-preserved-source-reconciliation-20261015.json');assert.equal(raw.length,12);assert.ok(raw.every(r=>r.recordDate===r.submittedAt.slice(0,10) && r.includeInProgression===false));assert.equal(course('los-angeles-laps-3').autumn2024SupportingResults.filter(r=>r.submittedAt<'2024-10-31T06:00:00Z').length,0);
});
test('All326rows including later2025WRs remain preserved, eight receipts receive no duplicate credit',()=>{
 let rows=0,wr=0;const aggregate=read('public/data/courses.json');for(const cid of ['los-angeles-laps-2','los-angeles-laps-3']){const c=read('public/data/courses/'+cid+'.json'),g=aggregate.find(c=>c.id===cid);for(const k of ['records','submissions','candidates']){assert.deepEqual(c[k],g[k]);rows+=c[k].length;}wr+=c.records.length;}
 assert.equal(rows,326);assert.equal(wr,15);assert.ok(read('public/data/courses/los-angeles-laps-2.json').records.some(r=>r.id==='1446724632488181844-kuri' && r.time==='1:13.30'));const a=read('archive/autumn2024-edited-receipt-source-dispositions-20261015.json');assert.equal(a.matchedReceipts,8);assert.equal(a.mismatchedReceipts,0);assert.ok(a.receiptSourceDispositions.every(p=>p.set.includeInProgression===false));
});
test('Fourteen originals retain exact hashes; captured discussion absence is not an exhaustive claim',()=>{
 const a=read('archive/autumn2024-original-preservation-and-source-review-20261015.json');assert.equal(a.originalImages.length,12);assert.equal(a.originalMovies.length,2);assert.equal(a.uniqueCurrentPerformances,12);assert.equal(a.r2FilesVerified,14);for(const f of [...a.originalImages,...a.originalMovies]){assert.equal(f.sha256,f.r2.sha256);assert.equal(f.r2.publicRangeMatchesOriginal,true);}
 const c=read('archive/autumn2024-preserved-bounded-source-census-20261015.json');assert.equal(c.currentDiscussionRows,0);assert.equal(c.postCloseContextRows,0);assert.equal(c.freshBrowserCensusCompleted,false);assert.equal(c.historyComplete,false);
});
