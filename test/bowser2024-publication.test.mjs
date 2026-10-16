import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Bowser carries both WRs and distinguishes reported and documented recordings',()=>{
 const b=course('gba-bowser-s-castle-4').bowser2024Recording,k=course('n64-kalimari-desert-2r').bowser2024Recording;
 assert.equal(b.worldRecord.time,'1:10.80');assert.equal(b.worldRecord.submittedAt,'2023-05-10T11:08:09.177Z');assert.equal(b.documentedRecording.time,'1:10.86');assert.equal(b.reportedRecording,null);assert.equal(b.documentedRecording.videoBackup.preservedOriginalSha256,'71d5892993478c27bd0a56b221094076e42ccf79cc4f4bfc7472d9bdd2ed69d3');
 assert.equal(k.worldRecord.time,'1:04.30');assert.equal(k.documentedRecording.time,'1:04.30');assert.match(k.documentedRecording.videoBackup.url,/^https:\/\/media.mktwrs.com\//);
});
test('No-item result and matching repost retain separate clocks without main-category credit',()=>{
 const c=read('public/data/courses/n64-kalimari-desert-2r.json'),r=c.submissions.find(r=>r.messageId==='1237060040289161246-bowser2024-image-reviewed'),receipt=c.submissions.find(r=>r.id==='discord-1237159533692981328');
 assert.equal(r.performanceCategory,'no-items');assert.equal(r.includeInProgression,false);assert.deepEqual(r.laps,['30.29','35.28']);assert.equal(r.submittedAt,'2024-05-06T15:14:57.069Z');assert.equal(r.videoSharedAt,'2024-05-06T15:26:27.453Z');assert.equal(receipt.submittedAt,'2024-05-06T21:50:15.722Z');assert.equal(receipt.status,'matched-existing-documented-result-receipt');assert.equal(receipt.performanceCategory,'no-items');assert.ok(!c.records.some(r=>r.time==='1:05.57'));
});
test('Result submission remains separate from later completed-video sharing',()=>{
 const c=read('public/data/courses/n64-kalimari-desert-2r.json'),r=c.submissions.find(r=>r.messageId==='1237460803771306034-bowser2024-image-reviewed');assert.equal(r.submittedAt,'2024-05-07T17:47:26.529Z');assert.equal(r.videoSharedAt,'2024-05-07T17:48:23.746Z');assert.deepEqual(r.laps,['29.24','35.79']);assert.match(r.videoBackup.url,/^https:\/\/media.mktwrs.com\//);
 const f=read('public/data/courses/gba-bowser-s-castle-4.json').submissions.find(r=>r.id==='curated-1235288737169145867-bowser2024-discussion-video-reviewed');assert.equal(f.submittedAt,'2024-05-01T17:56:25.496Z');assert.deepEqual(f.laps,['38.27','33.18']);
});
test('Originals, proof copies and partial clips retain honest scopes',()=>{
 const a=read('archive/bowser2024-original-preservation-and-source-review-20261015.json');assert.equal(a.r2FilesVerified,64);assert.equal(a.originalImagesWithPriorSha256,54);assert.equal(a.originalImages.filter(f=>f.classification==='retained-public-proof-copy' && f.originalDownloadBytesCertified===false).length,2);assert.equal(a.missingOriginalAttachmentIds.length,4);
 const m=a.originalMovies.filter(m=>m.completedTotal===null);assert.equal(m.length,2);assert.equal(m.find(m=>m.completedLap).completedLap,'38.16');assert.equal(a.originalImages.filter(f=>f.disposition==='secondary-leaderboard-context').length,1);
 assert.equal(course('gba-bowser-s-castle-4').bowser2024Recording.strategyReferences.length,1);
});
test('Opening-day and future-publication rules preserve the sole-tour review scope',()=>{
 for(const cid of ['gba-bowser-s-castle-4','n64-kalimari-desert-2r']) {const c=course(cid),rows=c.bowser2024SupportingResults.filter(r=>isReviewedOpeningDay(r,'2024-05-01'));const best=Math.min(...rows.map(r=>r.timeCs));assert.ok(rows.every(r=>r.timeCs===best));}
 const p=read('scripts/bowser2024-publication-preservation.json'),c=read('public/data/courses/gba-bowser-s-castle-4.json');for(const original of p.preservedFutureCandidates) {const actual=c.candidates.find(r=>r.id===original.id);assert(actual);assert.equal(actual.time,original.time);assert.equal(actual.playerId,original.playerId);assert.equal(actual.canonicalSourceReviewAudit,'archive/bowser2026-posted-results-and-source-clock-reconciliation-20261015.json');const patch=read('scripts/reviewed-publication-field-patches.json').rows.find(p=>p.courseId===c.id&&p.collection==='candidates'&&p.id===original.id);assert(patch&&!patch.remove);const expected={...original,...patch.set};for(const key of patch.unset||[])delete expected[key];assert.deepEqual(actual,expected);}
 const a=read('archive/bowser2024-posted-results-and-preserved-source-reconciliation-20261015.json');assert.equal(a.canonicalRawRowsUpdated,55);assert.equal(a.newWrIds,0);assert.equal(a.freshBrowserCensusCompleted,false);assert.equal(read('public/data/spring2024-completion.json').validation.livePublicationVerified,true);
});
