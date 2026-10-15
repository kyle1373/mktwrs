import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const cids=['rome-avanti-2','singapore-speedway','singapore-speedway-2r'];
const course=cid=>routeData(['course',cid]).data;
test('Night 2024 WRs and fastest available recordings retain separate totals',()=>{
 const expected=[['1:18.84','1:18.87'],['1:09.43','1:09.43'],['1:24.28','1:24.54']];
 cids.forEach((cid,i)=>{const c=course(cid).night2024Recording;assert.equal(c.worldRecord.time,expected[i][0]);assert.equal(c.documentedRecording.time,expected[i][1]);assert.ok(c.documentedRecording.videoBackup.url.startsWith('https://media.mktwrs.com/'));});
 assert.equal(course('rome-avanti-2').night2024Recording.worldRecord.video,null);assert.equal(course('singapore-speedway-2r').night2024Recording.worldRecord.video,null);
});
test('Final results use original submission clocks and preserve later announcements',()=>{
 const r=read('public/data/courses/rome-avanti-2.json').records.find(r=>r.id==='1264395735814635612');assert.equal(r.submittedAt,'2024-07-02T21:31:33.500Z');assert.equal(r.recordDate,'2024-07-02');assert.ok(r.additionalSources.some(s=>s.url?.includes('1264395735814635612')));
 const s=read('public/data/courses/singapore-speedway-2r.json').records.find(r=>r.id==='1264395851904585738');assert.equal(s.submittedAt,'2024-07-09T02:12:45.174Z');assert.deepEqual(s.laps,['42.11','42.17']);
});
test('Meme video publication in 2024 remains separate from its 2026 repost',()=>{
 const r=course('singapore-speedway-2r').night2024SupportingResults.find(r=>r.time==='1:24.86');assert.ok(r);assert.equal(r.submittedAt,'2024-06-30T03:34:33Z');assert.equal(r.videoPublishedAt,'2024-06-30T03:34:33Z');assert.equal(r.videoSharedAt,'2026-06-24T09:28:15.024Z');assert.equal(r.videoBackup.sha256,'fe32a5e141fe3290e29c14f48c5b6915d0aa5571516abd79d4b09266464839e4');assert.deepEqual(r.laps,['42.42','42.44']);
});
test('Full course collections and all reviewed source rows remain published',()=>{
 const a=read('archive/night2024-posted-results-and-preserved-source-reconciliation-20261015.json');assert.equal(a.sourceDisposition.length,36);let rows=0;let wr=0;const aggregate=read('public/data/courses.json');
 for(const cid of cids){const c=read('public/data/courses/'+cid+'.json'),g=aggregate.find(c=>c.id===cid);for(const k of ['records','submissions','candidates']){assert.deepEqual(c[k],g[k]);rows+=c[k].length;}wr+=c.records.length;for(const s of a.sourceDisposition.filter(s=>s.courseId===cid))assert.ok([...c.records,...c.submissions,...c.candidates].some(r=>r.messageId===s.rawId||r.id==='curated-'+s.rawId),s.rawId);}
 assert.equal(rows,405);assert.equal(wr,48);assert.deepEqual(cids.map(cid=>course(cid).night2024SupportingResults.length),[3,4,15]);
});
test('Conflicting image and partial clips do not create completed-result credit',()=>{
 const c=read('public/data/courses/singapore-speedway-2r.json');for(const k of ['submissions','candidates']){const r=c[k].find(r=>r.id==='discord-1259868751147438101');assert.equal(r.status,'source-image-caption-conflict');assert.equal(r.includeInProgression,false);assert.equal(r.observedImageTime,'1:24.28');}
 assert.ok(course('singapore-speedway-2r').night2024SupportingResults.every(r=>r.status!=='source-image-caption-conflict'&&r.status!=='matched-existing-documented-result-receipt'));
 const p=read('archive/night2024-original-preservation-and-source-review-20261015.json');assert.equal(p.r2FilesVerified,49);assert.equal(p.originalMovies.filter(r=>r.completedTotal===null).length,2);assert.equal(course('rome-avanti-2').night2024Recording.strategyReferences.length,1);assert.equal(course('singapore-speedway-2r').night2024Recording.strategyReferences.length,1);assert.deepEqual(course('singapore-speedway-2r').night2024Recording.documentedRecording.laps,['42.17','42.37']);
 for(const cid of cids){const first=course(cid).night2024SupportingResults.filter(r=>isReviewedOpeningDay(r,'2024-06-26'));assert.ok(first.every(r=>r.timeCs===Math.min(...first.map(r=>r.timeCs))));}
 assert.equal(read('public/data/marioluigi2024-completion.json').validation.livePublicationVerified,true);
});
