import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const cids=['wii-dry-dry-ruins','piranha-plant-cove-2r'];
const course=cid=>routeData(['course',cid]).data;
test('Pipe 2024 WR and fastest available recordings stay separate from later records',()=>{
 const expected=[['1:17.90','1:17.90'],['1:31.28','1:31.31']];
 cids.forEach((cid,i)=>{const c=course(cid).pipe2024Recording;assert.equal(c.worldRecord.time,expected[i][0]);assert.equal(c.documentedRecording.time,expected[i][1]);assert.ok(c.documentedRecording.videoBackup.url.startsWith('https://media.mktwrs.com/'));});
 assert.equal(course('piranha-plant-cove-2r').pipe2024Recording.worldRecord.video,null);
 const old=read('public/data/courses/wii-dry-dry-ruins.json').records.find(r=>r.id==='1136096968901398628');assert.equal(old.submittedAt,'2023-07-17T14:47:35.892Z');assert.equal(old.videoBackup.sha256,'f3677613eea3ea09db81009f611181fc8d105cf36bc8349238d6c80d49165b97');assert.equal(old.videoBackup.reviewAudit,'archive/pipe2023-four-original-video-r2-and-posting-date-review-20261014.json');
 assert.ok(read('public/data/courses/wii-dry-dry-ruins.json').records.some(r=>r.id==='1406664937199374357'&&r.time==='1:17.65'));
});
test('Final result retains the human posting clock and its later announcement source',()=>{
 const c=read('public/data/courses/piranha-plant-cove-2r.json');const r=c.records.find(r=>r.id==='1274824870248845414');assert.equal(r.submittedAt,'2024-07-21T15:32:08.195Z');assert.equal(r.recordDate,'2024-07-21');assert.deepEqual(r.laps,['45.58','45.70']);assert.ok(r.additionalSources.some(s=>s.url?.includes('1274824870248845414')));
 const v=c.records.find(r=>r.id==='curated-1262778386078502922-pipe2024-image-reviewed');assert.equal(v.submittedAt,'2024-07-16T14:30:28.529Z');assert.equal(v.videoPublishedAt,'2024-07-16T14:33:34Z');assert.equal(v.videoSharedAt,'2024-07-16T14:40:32.198Z');assert.deepEqual(v.laps,['45.79','45.52']);assert.ok(v.additionalProofImages.some(u=>u.includes('1262779575843422328')));
});
test('Repeated screenshot keeps the first performance date and no duplicate display row',()=>{
 const c=course('piranha-plant-cove-2r');const rows=c.pipe2024SupportingResults.filter(r=>r.playerId==='taidayo'&&r.time==='1:31.56');assert.equal(rows.length,1);assert.equal(rows[0].submittedAt,'2024-07-18T16:20:31.247Z');
 const r=read('public/data/courses/piranha-plant-cove-2r.json').submissions.find(r=>r.id===rows[0].id);assert.ok(r.additionalProofImages.some(u=>u.includes('1263531686906564720')));
 const a=read('archive/pipe2024-edited-receipt-source-dispositions-20261015.json');assert.equal(a.matchedReceipts,17);assert.equal(a.mismatchedReceipts,0);assert.ok(c.pipe2024SupportingResults.every(r=>r.status!=='matched-existing-documented-result-receipt'));
});
test('Every reviewed source survives in full course collections without additional WRs',()=>{
 const a=read('archive/pipe2024-posted-results-and-preserved-source-reconciliation-20261015.json');assert.equal(a.sourceDisposition.length,27);let rows=0,wr=0;const aggregate=read('public/data/courses.json');
 for(const cid of cids){const c=read('public/data/courses/'+cid+'.json'),g=aggregate.find(c=>c.id===cid);for(const k of ['records','submissions','candidates']){assert.deepEqual(c[k],g[k]);rows+=c[k].length;}wr+=c.records.length;for(const s of a.sourceDisposition.filter(s=>s.courseId===cid))assert.ok([...c.records,...c.submissions,...c.candidates].some(r=>r.messageId===s.rawId||r.id==='curated-'+s.rawId),s.rawId);}
 assert.equal(rows,267);assert.equal(wr,22);assert.deepEqual(cids.map(cid=>course(cid).pipe2024SupportingResults.length),[11,14]);
});
test('Four partial clips remain technique references with separate publication and sharing dates',()=>{
 const c=course('piranha-plant-cove-2r').pipe2024Recording;assert.equal(c.strategyReferences.length,4);assert.ok(c.strategyReferences.every(r=>!r.time&&!r.includeInProgression));
 const lap=c.strategyReferences.find(r=>r.video.includes('iJk4_7UILM0'));assert.equal(lap.videoPublishedAt,'2023-07-25T20:36:26Z');assert.equal(lap.videoSharedAt,'2024-07-15T13:30:10.016Z');
 const shown=c.strategyReferences.find(r=>r.video.includes('1262652719584252006'));assert.match(shown.evidenceNote,/45\.56/);assert.match(shown.evidenceNote,/does not show45\.46/);
 const p=read('archive/pipe2024-original-preservation-and-source-review-20261015.json');assert.equal(p.r2FilesVerified,35);assert.equal(p.originalMovies.filter(r=>r.completedTotal===null).length,4);assert.equal(p.originalImages.length,29);
 assert.equal(read('public/data/night2024-completion.json').validation.livePublicationVerified,true);
});
