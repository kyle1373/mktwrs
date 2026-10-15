import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=()=>routeData(['course','snes-donut-plains-3']).data;
test('Halloween2024 carried WR and matching recording retain their original separate clocks',()=>{
 const r=read('public/data/courses/snes-donut-plains-3.json').records.find(r=>r.id==='1039950316147322890');assert.equal(r.time,'0:56.42');assert.equal(r.submittedAt,'2022-10-29T16:22:25.696Z');assert.equal(r.recordDate,'2022-10-29');assert.equal(r.videoPublishedAt,'2022-11-02T08:49:19Z');assert.ok(r.videoBackup.url.startsWith('https://media.mktwrs.com/'));
 const d=course();assert.equal(d.halloween2024Recording.worldRecord.time,'0:56.42');assert.equal(d.halloween2024Recording.documentedRecording.time,'0:56.42');assert.equal(d.halloween2024SupportingResults.length,14);assert.equal(d.halloween2024Recording.strategyReferences.length,0);
});
test('Opening day displays final fastest source and October30 pre-close retains its posting date',()=>{
 const d=course(),s=d.halloween2024SupportingResults;assert.deepEqual(s.filter(r=>r.submittedAt<'2024-10-17T06:00:00Z').map(r=>r.time),['0:59.01']);const r=s.find(r=>r.submittedAt==='2024-10-30T03:30:28.694Z');assert.equal(r.time,'0:57.00');assert.equal(r.recordDate,'2024-10-30');assert.ok(!r.lateTourSubmission);assert.ok(read('public/data/courses/snes-donut-plains-3.json').submissions.filter(r=>r.canonicalSourceReviewAudit==='archive/halloween2024-posted-results-and-preserved-source-reconciliation-20261015.json').every(r=>r.includeInProgression===false));
 const raw=read('archive/curated-runs.json').filter(r=>r.canonicalSourceReviewAudit==='archive/halloween2024-posted-results-and-preserved-source-reconciliation-20261015.json');assert.equal(raw.length,16);assert.ok(raw.some(r=>r.time==='0:59.78'));assert.ok(raw.some(r=>r.time==='0:59.39'));assert.ok(raw.every(r=>r.recordDate===r.submittedAt.slice(0,10)));
});
test('All232rows and3existing WRs retained, eight matching receipts receive no duplicate credit',()=>{
 const c=read('public/data/courses/snes-donut-plains-3.json'),g=read('public/data/courses.json').find(c=>c.id==='snes-donut-plains-3');let rows=0;for(const k of ['records','submissions','candidates']){assert.deepEqual(c[k],g[k]);rows+=c[k].length;}assert.equal(rows,232);assert.equal(c.records.length,3);
 const a=read('archive/halloween2024-edited-receipt-source-dispositions-20261015.json');assert.equal(a.matchedReceipts,8);assert.equal(a.mismatchedReceipts,0);assert.ok(a.receiptSourceDispositions.every(p=>p.set.includeInProgression===false));
});
test('Seventeen preserved files retain hashes and bounded source review limitations',()=>{
 const a=read('archive/halloween2024-original-preservation-and-source-review-20261015.json');assert.equal(a.originalImages.length,16);assert.equal(a.originalMovies.length,1);assert.equal(a.uniqueCurrentPerformances,16);assert.equal(a.r2FilesVerified,17);for(const f of [...a.originalImages,...a.originalMovies]){assert.equal(f.sha256,f.r2.sha256);assert.equal(f.r2.publicRangeMatchesOriginal,true);}
 const c=read('archive/halloween2024-preserved-bounded-source-census-20261015.json');assert.equal(c.currentDiscussionRows,5);assert.equal(c.postCloseContextRows,0);assert.equal(c.freshBrowserCensusCompleted,false);
});
