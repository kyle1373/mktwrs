import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Spring carries Berlin and improves Athens without inventing an available full-run movie',()=>{
 const a=course('athens-dash-2').spring2024Recording,b=course('berlin-byways').spring2024Recording;
 assert.equal(a.worldRecord.time,'1:33.42');assert.equal(a.worldRecord.submittedAt,'2024-05-01T05:55:40.823Z');assert.equal(a.documentedRecording,null);
 assert.equal(b.worldRecord.time,'1:14.41');assert.equal(b.documentedRecording.time,'1:14.41');assert.equal(b.documentedRecording.submittedAt,'2023-04-27T04:23:45.401Z');assert.equal(b.documentedRecording.videoPublishedAt,'2023-04-27T04:40:09Z');
});
test('Canceled malformed input and corrected identical repost retain separate clocks',()=>{
 const c=read('public/data/courses/athens-dash-2.json'),r=c.records.find(r=>r.id==='1241780457365049465');
 assert.equal(r.time,'1:33.42');assert.equal(r.correctedReceiptAt,'2024-05-01T05:56:36.534Z');assert.equal(r.videoSharedAt,'2024-04-30T13:09:47.357Z');assert.equal(r.videoAvailability,'unavailable');
 assert.ok(!c.records.some(r=>r.time==='1:33.00'));
 const receipt=c.submissions.find(r=>r.id==='discord-1232671283821412372');assert.equal(receipt.status,'matched-existing-wr-receipt');assert.equal(receipt.includeInProgression,false);assert.ok(!c.candidates.some(r=>r.id===receipt.id));
});
test('Earlier discussion image and after-rollover result use their actual posting times',()=>{
 const c=read('public/data/courses/berlin-byways.json'),r=c.submissions.find(r=>r.messageId==='1234435549419274291-spring2024-image-reviewed');assert.equal(r.submittedAt,'2024-04-29T09:25:59.314Z');assert.equal(r.correctedReceiptAt,'2024-04-29T09:26:09.685Z');
 const late=read('public/data/courses/athens-dash-2.json').submissions.find(r=>r.messageId==='1235114368153419810-spring2024-image-reviewed');assert.equal(late.submittedAt,'2024-05-01T06:23:32.683Z');assert.equal(late.lateTourSubmission,true);
});
test('Lap clips, caption best and timer-limit result do not become complete-run records',()=>{
 const a=read('archive/spring2024-original-preservation-and-source-review-20261015.json');assert.equal(a.r2FilesVerified,51);assert.equal(a.originalMovies.filter(m=>m.completedTotal===null).length,7);
 const m=a.originalMovies.find(m=>m.sourceMessageId==='1232842672268644452');assert.equal(m.completedLap,'46.72');assert.equal(m.captionBestLapSeparateFromShownLap,true);assert.equal(m.completedTotal,null);
 assert.equal(course('athens-dash-2').spring2024Recording.strategyReferences.length,6);assert.equal(course('berlin-byways').spring2024Recording.strategyReferences.length,1);
 assert.ok(!course('athens-dash-2').spring2024SupportingResults.some(r=>r.time==='9:59.99'));
});
test('Opening-day publication and future collections preserve the agreed review scope',()=>{
 const c=course('athens-dash-2'),rows=c.spring2024SupportingResults.filter(r=>isReviewedOpeningDay(r,'2024-04-17'));assert.ok(rows.length>0);const best=Math.min(...rows.map(r=>r.timeCs));assert.ok(rows.every(r=>r.timeCs===best));
 const p=read('scripts/spring2024-publication-preservation.json'),full=read('public/data/courses/athens-dash-2.json');for(const original of p.preservedFutureCandidates) assert.deepEqual(full.candidates.find(r=>r.id===original.id),original);
 const r=read('archive/spring2024-posted-results-and-preserved-source-reconciliation-20261015.json');assert.equal(r.canonicalRawRowsUpdated,32);assert.equal(r.newWrIds,0);assert.equal(r.freshBrowserCensusCompleted,false);
 assert.equal(read('public/data/yoshi2024-completion.json').validation.livePublicationVerified,true);
});
