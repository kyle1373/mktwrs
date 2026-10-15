import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Sundae 2024 final result uses the submission clock and preserves later video publication',()=>{
 const c=read('public/data/courses/gba-luigi-circuit.json'),r=c.records.find(r=>r.id==='1290731539428016141');assert.equal(r.time,'0:49.13');assert.equal(r.submittedAt,'2024-09-15T03:10:03.528Z');assert.equal(r.recordDate,'2024-09-15');assert.equal(r.chronologyDate,r.submittedAt);assert.deepEqual(r.laps,['24.64','24.49']);assert.equal(r.videoPublishedAt,'2024-10-04T09:00:58Z');assert.equal(r.videoSharedAt,undefined);assert.equal(r.videoShareClockUnresolved,true);assert.ok(r.videoBackup.url.startsWith('https://media.mktwrs.com/'));assert.ok(r.additionalSources.some(s=>s.url?.includes('1290731539428016141')));
 const d=course('gba-luigi-circuit').sundae2024Recording;assert.equal(d.worldRecord.time,'0:49.13');assert.equal(d.documentedRecording.time,'0:49.13');assert.equal(d.documentedRecording.videoPublishedAt,r.videoPublishedAt);assert.equal(d.strategyReferences.length,1);assert.ok(!d.strategyReferences[0].time);assert.ok(course('gba-luigi-circuit').fastestVideo);
});
test('Vanilla Lake2R carried WR stays separate from slower available recording and first-day support',()=>{
 const d=course('snes-vanilla-lake-2r');assert.equal(d.sundae2024Recording.worldRecord.time,'0:31.48');assert.equal(d.sundae2024Recording.documentedRecording.time,'0:31.82');assert.equal(d.sundae2024Recording.documentedRecording.videoPublishedAt,'2023-09-19T21:51:43+00:00');
 const opening=d.sundae2024SupportingResults.filter(r=>r.submittedAt<'2024-09-05T06:00:00Z');assert.deepEqual(opening.map(r=>r.time),['0:31.54']);assert.deepEqual(course('gba-luigi-circuit').sundae2024SupportingResults.filter(r=>r.submittedAt<'2024-09-05T06:00:00Z').map(r=>r.time),['0:49.75']);assert.deepEqual([course('gba-luigi-circuit').sundae2024SupportingResults.length,d.sundae2024SupportingResults.length],[10,6]);
});
test('All605affected rows remain, with429Sundae rows and13noncredit receipts',()=>{
 const aggregate=read('public/data/courses.json');let rows=0,wr=0;
 for(const cid of ['gba-luigi-circuit','snes-vanilla-lake-2r','piranha-plant-cove-3']){const c=read('public/data/courses/'+cid+'.json'),g=aggregate.find(c=>c.id===cid);for(const k of ['records','submissions','candidates']){assert.deepEqual(c[k],g[k]);rows+=c[k].length;}wr+=c.records.length;}
 assert.equal(rows,605);assert.equal(wr,25);const a=read('archive/sundae2024-edited-receipt-source-dispositions-20261015.json');assert.equal(a.matchedReceipts,13);assert.equal(a.mismatchedReceipts,0);assert.ok(a.receiptSourceDispositions.every(p=>p.set.includeInProgression===false));
 const prior=read('public/data/courses/piranha-plant-cove-3.json').submissions.find(r=>r.messageId==='1280899544586129502-sundae2024-image-reviewed');assert.equal(prior.time,'1:16.43');assert.equal(prior.submittedAt,'2024-09-04T14:37:29.392Z');assert.ok(prior.proofImageLocal.startsWith('https://media.mktwrs.com/'));assert.equal(course('piranha-plant-cove-3').summer2024SupportingResults.length,14);assert.equal(course('piranha-plant-cove-3').sundae2024Recording,undefined);
});
test('Thirty preserved files retain exact hashes and movie clocks',()=>{
 const p=read('archive/sundae2024-original-preservation-and-source-review-20261015.json');assert.equal(p.r2FilesVerified,30);assert.equal(p.originalImages.length,26);assert.equal(p.originalMovies.length,4);for(const f of [...p.originalImages,...p.originalMovies]){assert.equal(f.sha256,f.r2.sha256);assert.equal(f.r2.publicRangeMatchesOriginal,true);}
 const m=p.originalMovies.find(f=>f.videoId==='GVH4HFcfaO0');assert.equal(m.videoPublishedAt,'2024-10-04T09:00:58Z');assert.equal(m.submittedAt,'2024-09-15T03:10:03.528Z');assert.equal(m.videoShareClockUnresolved,true);assert.equal(m.completedTotal,'0:49.13');const census=read('archive/sundae2024-preserved-bounded-source-census-20261015.json');assert.equal(census.currentDiscussionRows,39);assert.equal(census.freshBrowserCensusCompleted,false);
});
