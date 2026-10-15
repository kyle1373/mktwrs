import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Ninja final results retain their posted dates and separate available recordings',()=>{
 const c=course('wii-rainbow-road'),rr=c.ninja2024Recording;assert.equal(c.fastestVideo.time,'1:13.83');assert.equal(c.fastestVideo.documentedRecordingSelection,true);
 assert.equal(rr.worldRecord.time,'1:13.83');assert.equal(rr.worldRecord.playerId,'kuri');assert.equal(rr.worldRecord.submittedAt,'2024-03-22T14:06:39.117Z');assert.equal(rr.documentedRecording.time,'1:13.83');assert.match(rr.documentedRecording.videoBackup.url,/^https:\/\/media.mktwrs.com\//);
 const ws=course('3ds-wario-shipyard').ninja2024Recording;
 assert.equal(ws.worldRecord.time,'1:33.36');assert.equal(ws.worldRecord.playerId,'nekozuki');assert.equal(ws.worldRecord.submittedAt,'2024-03-25T05:26:42.420Z');assert.equal(ws.reportedRecording.time,'1:33.45');assert.equal(ws.reportedRecording.playerId,'n');
});
test('The documented receipt and partial movie receive no duplicate WR credit',()=>{
 const c=read('public/data/courses/wii-rainbow-road.json');assert.equal(c.candidates.length,0);
 const receipt=c.submissions.find(r=>r.id==='discord-1223547992510955562');assert.equal(receipt.status,'matched-existing-documented-result-receipt');assert.equal(receipt.includeInProgression,false);
 const v=course('wii-rainbow-road').ninja2024Recording.lateStartRecording;assert.equal(v.time,'1:15.53');assert.equal(c.submissions.find(r=>r.id===v.id).includeInProgression,false);assert.match(c.submissions.find(r=>r.id===v.id).videoCompleteness,/first-lap-and-race-start-missing/);
});
test('Opening strategy footage and lap images establish no invented whole-race totals',()=>{
 const a=read('archive/ninja2024-original-preservation-and-source-review-20261015.json');assert.equal(a.r2FilesVerified,60);
 const opening=a.originalMovies.filter(m=>m.disposition==='opening-lap1-strategy-clip');assert.equal(opening.length,3);assert.ok(opening.every(m=>m.completedTotal===null));
 const lap=a.originalMovies.find(m=>m.completedLap==='43.19');assert.equal(lap.completedTotal,null);assert.equal(course('wii-rainbow-road').ninja2024Recording.lapDemonstrations[0].time,'0:43.19');
 assert.equal(a.originalImages.filter(f=>f.disposition==='lap-only-no-completed-total').length,3);
});
test('Late Ninja source keeps its real posting date while later WRs survive unchanged',()=>{
 const c=read('public/data/courses/3ds-wario-shipyard.json'),late=c.submissions.find(r=>r.messageId==='1225011924492881931-yoshi2024-image-reviewed');
 assert.equal(late.submittedAt,'2024-04-03T09:20:02.420Z');assert.equal(late.lateTourSubmission,true);assert.equal(late.courseAppearance,'Ninja Tour (2024)');
 const next=c.records.find(r=>r.id==='1493433079774052406');assert.equal(next.time,'1:33.34');assert.equal(next.submittedAt,'2026-03-28T12:17:10.067Z');
});
test('Opening-day publication keeps fastest only and the source review states its limits',()=>{
 const c=course('wii-rainbow-road');assert.deepEqual(c.records.filter(r=>isReviewedOpeningDay(r,'2024-03-20')).map(r=>r.time),['1:15.32']);
 const a=read('archive/ninja2024-posted-results-and-preserved-source-reconciliation-20261015.json');assert.equal(a.newWrIds,0);assert.equal(a.freshBrowserCensusCompleted,false);assert.equal(a.canonicalRawRowsUpdated,49);
});
