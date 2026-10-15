import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));const course=cid=>routeData(['course',cid]).data;
test('Mii2025 separates image-only WR from fastest recovered recording and keeps menu context source-only',()=>{
 const m=course('wii-maple-treeway-r'),b=course('gcn-mushroom-bridge');
 assert.equal(m.mii2025Recording.worldRecord.time,'1:48.93');assert.equal(m.mii2025Recording.documentedRecording.time,'1:49.68');assert.equal(m.fastestVideo.time,'1:49.68');
 assert.equal(b.mii2025Recording.worldRecord.time,'1:10.37');assert.equal(b.mii2025Recording.documentedRecording.time,'1:10.37');assert.equal(b.fastestVideo.time,'1:10.37');
 assert.equal(m.mii2025SupportingResults.length,4);assert.equal(b.mii2025SupportingResults.length,1);assert.equal(b.mii2025Recording.sourceImages.length,1);
 assert.equal(m.mii2025SupportingResults[0].id,'curated-1373158670845608007-mii2025-image-reviewed');
 const rows=read('public/data/courses/gcn-mushroom-bridge.json');assert(![...rows.records,...rows.submissions].some(r=>r.source?.messageId==='1374886964574294040'));
 assert.equal(m.mii2025Recording.practicalReviewComplete,true);const complete=read('public/data/mii2025-completion.json');assert(complete.validation.livePublicationVerified);assert.equal(complete.historyComplete,false);for(const name of ['all-tour-investigation-review-20261013','all-tour-investigation-checklist-20261013']){const tracker=read('public/data/'+name+'.json');assert.equal(tracker.summary.practicallyCompletedTours,146);assert.equal(tracker.summary.toursRequiringInvestigation,35);assert.equal(tracker.activeDetailedTourId,'tour-149');}const mt=read('public/data/courses/wii-maple-treeway-r.json');assert.equal(mt.records.filter(r=>r.id==='1407195549043654749').length,1);assert.equal(mt.records.length,19);assert.equal(rows.records.length,6);
});
test('Mii2025 preserves original screenshot, upload, and later announcement clocks separately',()=>{
 const c=read('public/data/courses/wii-maple-treeway-r.json'),wr=c.records.find(r=>r.id==='1407195549043654749'),s=c.submissions.find(r=>r.id==='curated-1373158670845608007-mii2025-image-reviewed');
 assert.equal(wr.submittedAt,'2025-05-21T13:17:44.050Z');assert.equal(wr.announcedAt,'2025-08-19T02:52:43.321Z');assert.equal(wr.source.messageId,'1374737930597171240');
 assert.equal(s.submittedAt,'2025-05-17T04:42:19.184Z');assert.equal(s.videoPublishedAt,'2025-05-17T04:35:55Z');assert(!s.videoSharedAt&&s.videoShareClockUnresolved);
 assert(s.videoVerified&&s.videoScopeReview.freshResultVerified);assert.equal(s.videoScopeReview.startToFinishContinuityVerified,false);assert.equal(s.videoScope,'result-reviewed');
 assert(s.videoBackup.preservedOriginalUrl.endsWith('.webm'));assert(s.videoBackup.url.endsWith('.mp4'));assert.equal(s.videoPreservation.sha256,s.videoBackup.preservedOriginalSha256);
});
test('All800affected rows match aggregate and every original Mii performance source survives',()=>{
 const all=read('public/data/courses.json');let n=0;for(const cid of ['wii-maple-treeway-r','gcn-mushroom-bridge','gba-bowser-s-castle-4']){const c=read('public/data/courses/'+cid+'.json'),a=all.find(c=>c.id===cid);for(const k of ['records','submissions','candidates']){assert.deepEqual(c[k],a[k]);n+=c[k].length;}}assert.equal(n,800);
 const audit=read('archive/mii2025-original-preservation-and-source-review-20261015.json');let originalPerformances=0;
 for(const image of audit.originalImages)for(const m of image.canonicalMatches){const c=read('public/data/courses/'+m.courseId+'.json');assert([...c.records,...c.submissions].some(r=>r.time===m.time&&r.originalImageSHA256===image.sha256&&r.submittedAt===m.submittedAt&&r.source?.messageId===image.sourceRows[0].messageId));originalPerformances++;}assert.equal(originalPerformances,9);
 assert.equal(read('archive/mii2025-edited-receipt-source-dispositions-20261015.json').mismatchedReceipts,0);
});
test('Mii2025 fifteen preserved files retain integrity and late Bowser submissions keep actual dates',()=>{
 const a=read('archive/mii2025-original-preservation-and-source-review-20261015.json');assert.equal(a.originalImages.length,10);assert.equal(a.originalMovies.length,5);assert.equal(a.distinctRecordings,3);assert.equal(a.r2FilesVerified,15);
 for(const f of [...a.originalImages,...a.originalMovies]){assert.equal(f.sha256,f.r2.sha256);assert(f.r2.publicRangeMatchesOriginal&&f.r2.shaMetadataMd5AndLengthVerified);}assert.equal(a.historyComplete,false);
 const b=course('gba-bowser-s-castle-4');assert.equal(b.bowser2025SupportingResults.length,8);for(const [id,date] of [['curated-1372134844808691722-mii2025-image-reviewed','2025-05-14T08:54:00.035Z'],['curated-1372377486238679262-mii2025-image-reviewed','2025-05-15T00:58:10.260Z']]){const r=read('public/data/courses/gba-bowser-s-castle-4.json').submissions.find(r=>r.id===id);assert(b.bowser2025SupportingResults.some(r=>r.id===id));assert(r?.lateTourSubmission);assert.equal(r.submittedAt,date);}
 assert.equal(b.fastestVideo.time,'1:10.77');
});
