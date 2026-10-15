import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const cids=['athens-dash','athens-dash-2r','squeaky-clean-sprint'];
const course=cid=>routeData(['course',cid]).data;
test('Vacation 2024 final WRs remain separate from available historical recordings',()=>{
 const expected=[['1:17.72','1:17.75'],['1:21.95',null],['1:21.48','1:21.62']];cids.forEach((cid,i)=>{const d=course(cid).vacation2024Recording;assert.equal(d.worldRecord.time,expected[i][0]);assert.equal(d.documentedRecording?.time||null,expected[i][1]);assert.equal(d.worldRecord.video,null);if(d.documentedRecording)assert.ok(d.documentedRecording.videoBackup.url.startsWith('https://media.mktwrs.com/'));});
 const old=read('public/data/courses/athens-dash.json').records.find(r=>r.id==='1147355757961031690');assert.equal(old.submittedAt,'2023-08-22T12:04:56.070Z');assert.equal(old.videoBackup.sha256,'00b67dfa83dadf9f0453dd4518d2db65154eac7dbf48da9cf5f6da3154a706ee');
 assert.ok(read('public/data/courses/athens-dash-2r.json').records.some(r=>r.id==='1424248853317550081'&&r.time==='1:21.91'));
});
test('Three final results retain original posting clocks, caption splits and later announcements',()=>{
 const expected=[['1279827290620035093','2024-08-10T19:55:44.394Z',['38.87','38.85']],['1279827479288086618','2024-08-12T10:32:57.791Z',['40.94','41.01']],['1279827694330187799','2024-08-12T07:03:55.300Z',['40.77','40.71']]];
 cids.forEach((cid,i)=>{const r=read('public/data/courses/'+cid+'.json').records.find(r=>r.id===expected[i][0]);assert.equal(r.submittedAt,expected[i][1]);assert.equal(r.recordDate,expected[i][1].slice(0,10));assert.equal(r.chronologyDate,r.submittedAt);assert.deepEqual(r.laps,expected[i][2]);assert.ok(r.additionalSources.some(s=>s.url?.includes(r.id)));assert.ok(r.proofImageLocal.startsWith('https://media.mktwrs.com/'));});
});
test('SYUN paired images remain distinct courses and late1:18.27 retains its corrected course and date',()=>{
 const a=course('athens-dash-2r').vacation2024SupportingResults.find(r=>r.time==='1:22.38'&&r.playerId==='syun'),s=course('squeaky-clean-sprint').vacation2024SupportingResults.find(r=>r.time==='1:22.25'&&r.playerId==='syun');assert.ok(a&&s);assert.equal(a.submittedAt,'2024-08-13T16:35:26.088Z');assert.equal(s.submittedAt,a.submittedAt);assert.notEqual(a.proofImageLocal,s.proofImageLocal);
 const late=course('athens-dash').vacation2024SupportingResults.find(r=>r.time==='1:18.27');assert.equal(late.submittedAt,'2024-08-21T06:07:59.835Z');assert.equal(late.playerId,'unknown');assert.ok(!course('athens-dash-2r').vacation2024SupportingResults.some(r=>r.time==='1:18.27'));
 const first=course('squeaky-clean-sprint').vacation2024SupportingResults.filter(r=>r.submittedAt<'2024-08-08T06:00:00Z');assert.deepEqual(first.map(r=>r.time),['1:21.75']);
});
test('All586existing course rows and36WR IDs survive source reconciliation without slow-challenge credit',()=>{
 const a=read('archive/vacation2024-posted-results-and-preserved-source-reconciliation-20261015.json');assert.equal(a.sourceDisposition.length,45);let rows=0,wr=0;const aggregate=read('public/data/courses.json');
 for(const cid of cids){const c=read('public/data/courses/'+cid+'.json'),g=aggregate.find(c=>c.id===cid);for(const k of ['records','submissions','candidates']){assert.deepEqual(c[k],g[k]);rows+=c[k].length;}wr+=c.records.length;for(const s of a.sourceDisposition.filter(s=>s.courseId===cid))assert.ok([...c.records,...c.submissions,...c.candidates].some(r=>r.messageId===s.rawId||r.id==='curated-'+s.rawId),s.rawId);assert.ok(course(cid).vacation2024SupportingResults.every(r=>r.timeCs<18000));}
 assert.equal(rows,586);assert.equal(wr,36);assert.deepEqual(cids.map(cid=>course(cid).vacation2024SupportingResults.length),[9,12,12]);assert.equal(read('archive/vacation2024-edited-receipt-source-dispositions-20261015.json').matchedReceipts,21);
});
test('65preserved originals include historical publication clocks and separate partial footage',()=>{
 const p=read('archive/vacation2024-original-preservation-and-source-review-20261015.json');assert.equal(p.r2FilesVerified,65);assert.equal(p.originalImages.length,59);assert.equal(p.originalMovies.length,6);for(const f of [...p.originalImages,...p.originalMovies]){assert.equal(f.sha256,f.r2.sha256);assert.equal(f.r2.publicRangeMatchesOriginal,true);}
 const ref=course('squeaky-clean-sprint').vacation2024Recording.reportedRecording;assert.equal(ref.videoPublishedAt,'2023-09-23T14:04:21Z');assert.equal(ref.videoSharedAt,'2024-08-12T11:58:11.485Z');assert.equal(ref.playerId,'unknown');assert.ok(ref.videoBackup.url.includes('LqEWB8bjffU'));
 const clips=course('athens-dash-2r').vacation2024Recording.strategyReferences;assert.equal(clips.length,2);assert.ok(clips.every(r=>!r.time));assert.equal(clips.find(r=>r.video.includes('1271699086344585216')).playerId,'player-e3828be38184');assert.equal(read('public/data/sunshine2024-completion.json').validation.livePublicationVerified,true);
});
