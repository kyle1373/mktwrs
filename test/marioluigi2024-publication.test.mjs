import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=()=>routeData(['course','n64-luigi-raceway-r']).data;
test('Mario vs Luigi WR and fastest available movie retain separate totals',()=>{
 const c=course().marioluigi2024Recording;assert.equal(c.worldRecord.time,'1:11.86');assert.equal(c.worldRecord.video,null);assert.equal(c.documentedRecording.time,'1:11.87');assert.equal(c.documentedRecording.videoBackup.kind,'r2-h264-aac-playback-transcode');assert.equal(c.documentedRecording.videoBackup.preservedOriginalSha256,'bde7febd570a44d625ac387b4442527d6758b496e16407d6acdf131e28c2b814');assert.deepEqual(c.documentedRecording.laps,['34.93','36.94']);
});
test('Later movie sharing does not replace the original 2024 result clock',()=>{
 const r=course().marioluigi2024Recording.documentedRecording;assert.equal(r.submittedAt,'2024-06-24T12:41:09.374Z');assert.equal(r.videoPublishedAt,'2024-06-24T13:43:25Z');assert.ok(r.videoSharedAt.startsWith('2025-06-12'));assert.equal(r.recordDate,'2024-06-24');assert.equal(r.recordingContinuityPending,true);
 const wr=course().marioluigi2024Recording.worldRecord;assert.equal(wr.submittedAt,'2024-06-25T11:08:56.288Z');assert.equal(wr.announcedAt,'2024-07-21T00:58:57.382Z');assert.ok(read('public/data/courses/n64-luigi-raceway-r.json').records.find(r=>r.id==='1264386099934003281').additionalSources.some(s=>s.url?.includes('1264386099934003281')));
});
test('Replacement image uses the actual human posting clock with earlier receipt retained',()=>{
 const r=read('public/data/courses/n64-luigi-raceway-r.json').records.find(r=>r.time==='1:11.95');assert.equal(r.submittedAt,'2024-06-20T03:00:54.854Z');assert.equal(r.source.messageId,'1253182767802617867');assert.equal(r.receiptCreatedAt,'2024-06-20T02:11:38.258Z');assert.ok(r.additionalSources.some(s=>s.messageId==='1253170366940184678'));
});
test('Every reviewed result survives full course generation without new WR IDs',()=>{
 const a=read('archive/marioluigi2024-posted-results-and-preserved-source-reconciliation-20261015.json'),c=read('public/data/courses/n64-luigi-raceway-r.json');assert.equal(a.sourceDisposition.length,23);assert.equal(c.records.length,13);assert.equal(c.submissions.length,173);assert.equal(course().marioluigi2024SupportingResults.length,17);assert.ok(course().marioluigi2024SupportingResults.every(r=>!['edited-receipt-time-unverified','matched-existing-documented-result-receipt'].includes(r.status)));
 for(const source of a.sourceDisposition)assert.ok([...c.records,...c.submissions].some(r=>r.messageId===source.rawId||r.id==='curated-'+source.rawId),source.rawId);
});
test('Partial, ordinary race, malformed and previous-tour evidence stays outside completed totals',()=>{
 const a=read('archive/marioluigi2024-original-preservation-and-source-review-20261015.json'),c=course();assert.equal(a.r2FilesVerified,34);assert.equal(a.currentImagePerformances,21);assert.equal(a.priorTourSourceOnlyImages,2);assert.equal(a.malformedReposts,2);assert.equal(a.unresolvedCourseImages,2);assert.equal(a.freshBrowserCensusCompleted,false);assert.equal(c.marioluigi2024Recording.strategyReferences.length,2);assert.equal(c.marioluigi2024Recording.sourceImages.length,1);assert.ok(!c.records.some(r=>r.time==='34.82'));
 const first=c.marioluigi2024SupportingResults.filter(r=>isReviewedOpeningDay(r,'2024-06-12'));assert.ok(first.every(r=>r.timeCs===Math.min(...first.map(r=>r.timeCs))));assert.equal(read('public/data/princess2024-completion.json').validation.livePublicationVerified,true);
});
