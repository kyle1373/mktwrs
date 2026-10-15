import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Yoshi final WR retains its actual post after rollover and a separate fastest recording',()=>{
 const c=course('gcn-yoshi-circuit'),r=c.yoshi2024Recording.worldRecord,v=c.yoshi2024Recording.documentedRecording;
 assert.equal(r.time,'1:31.19');assert.equal(r.playerId,'mb3');assert.equal(r.submittedAt,'2024-04-17T06:00:40.383Z');assert.equal(read('public/data/courses/gcn-yoshi-circuit.json').records.find(r=>r.id==='1232480525512343592').lateTourSubmission,true);
 assert.equal(v.time,'1:31.26');assert.equal(v.playerId,'wins');assert.match(v.videoBackup.url,/^https:\/\/media.mktwrs.com\//);
 assert.equal(c.fastestVideo.time,'1:31.17');
});
test('Phillish corrected splits and video sharing do not replace the result submission clock',()=>{
 const c=read('public/data/courses/gcn-yoshi-circuit.json'),r=c.submissions.find(r=>r.messageId==='1227638050587152384-yoshi2024-image-reviewed');
 assert.deepEqual(r.laps,['45.81','45.79']);assert.equal(r.submittedAt,'2024-04-10T15:15:19.672Z');assert.equal(r.videoSharedAt,'2024-04-11T11:10:59.030Z');assert.equal(r.includeInProgression,false);
 const v=c.records.find(r=>r.time==='1:31.26');assert.equal(v.videoPublishedAt,'2024-04-16T14:44:04.867Z');assert.equal(v.submittedAt,'2024-04-16T14:45:00.843Z');
});
test('Single laps, technique clips and context images do not establish whole-race records',()=>{
 const a=read('archive/yoshi2024-original-preservation-and-source-review-20261015.json');assert.equal(a.r2FilesVerified,41);
 assert.equal(a.originalMovies.filter(m=>m.disposition==='partial-lap-strategy-no-completed-total' && m.completedTotal===null).length,2);
 const lap=a.originalMovies.find(m=>m.completedLap==='45.77');assert.equal(lap.completedTotal,null);
 assert.equal(course('gcn-yoshi-circuit').yoshi2024Recording.lapDemonstrations[0].time,'0:45.77');assert.equal(course('gcn-yoshi-circuit').yoshi2024Recording.strategyReferences.length,2);
});
test('Carried Donut Plains result has an honest uploader-reported recording label',()=>{
 const c=course('snes-donut-plains-2r').yoshi2024Recording;assert.equal(c.worldRecord.time,'1:00.08');assert.equal(c.documentedRecording,null);assert.equal(c.reportedRecording.time,'1:00.08');assert.equal(read('public/data/courses/snes-donut-plains-2r.json').records.find(r=>r.id==='1099917584113090641').videoVerified,false);
});
test('Source preservation states missing originals and retains the previous Ninja review',()=>{
 const a=read('archive/yoshi2024-original-preservation-and-source-review-20261015.json');assert.deepEqual(a.missingDiscussionOriginalAttachmentIds,['1229707145415622737','1229866309085298699']);assert.equal(a.freshBrowserCensusCompleted,false);
 const r=read('archive/yoshi2024-posted-results-and-preserved-source-reconciliation-20261015.json');assert.equal(r.canonicalRawRowsUpdated,26);assert.equal(r.newWrIds,0);const lateShine=read('public/data/courses/snes-donut-plains-2r.json').submissions.find(r=>r.messageId==='1230391501901529088-spring2024-image-reviewed');assert.equal(lateShine.submittedAt,'2024-04-18T05:36:33.622Z');assert.equal(lateShine.lateTourSubmission,true);
 const c=read('public/data/courses/3ds-wario-shipyard.json'),late=c.submissions.find(r=>r.messageId==='1225011924492881931-yoshi2024-image-reviewed');assert.equal(late.courseAppearance,'Ninja Tour (2024)');
});
