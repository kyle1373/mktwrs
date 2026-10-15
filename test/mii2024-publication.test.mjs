import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Mii carried WRs remain separate from available tour recordings',()=>{
 const m=course('wii-maple-treeway-r').mii2024Recording,b=course('gcn-mushroom-bridge').mii2024Recording;
 assert.equal(m.worldRecord.time,'1:49.29');assert.equal(m.documentedRecording.time,'1:49.78');assert.equal(b.worldRecord.time,'1:10.37');assert.equal(b.documentedRecording.time,'1:10.37');
 assert.equal(b.documentedRecording.videoBackup.kind,'r2-h264-aac-playback-transcode');assert.ok(b.documentedRecording.videoBackup.preservedOriginalSha256);
});
test('Recovered movie retains independent publication and submission clocks',()=>{
 const r=course('wii-maple-treeway-r').mii2024Recording.documentedRecording;
 assert.equal(r.submittedAt,'2024-05-25T13:44:04.422Z');assert.equal(r.videoSharedAt,'2024-05-25T13:44:04.422Z');assert.equal(r.videoPublishedAt,'2024-05-25T13:20:36Z');assert.deepEqual(r.laps,['55.02','54.76']);assert.match(r.videoBackup.url,/^https:\/\/media.mktwrs.com\//);assert.equal(r.recordingContinuityPending,true);
});
test('Closing submission keeps its real posting clock and is shown with Mii evidence',()=>{
 const c=course('wii-maple-treeway-r'),r=c.mii2024SupportingResults.find(r=>r.time==='1:50.55' && r.source?.url.endsWith('/1245255343508815904'));assert.ok(r);assert.equal(r.time,'1:50.55');assert.equal(r.submittedAt,'2024-05-29T06:00:09.618Z');assert.equal(r.recordDate,'2024-05-29');assert.equal(read('public/data/courses/wii-maple-treeway-r.json').submissions.find(r=>r.id==='curated-1245255343508815904-mii2024-image-reviewed').lateTourSubmission,true);assert.ok(!c.records.some(r=>r.time==='1:50.55'));
});
test('Stored-menu context and next-tour proof do not gain Mii WR credit',()=>{
 const a=read('archive/mii2024-original-preservation-and-source-review-20261015.json'),c=course('gcn-mushroom-bridge');assert.equal(a.r2FilesVerified,34);assert.equal(a.currentImagePerformances,29);assert.equal(a.originalImages.filter(f=>f.disposition==='stored-menu-context').length,1);assert.equal(a.originalImages.filter(f=>f.disposition==='princess2024-opening-source-only').length,1);assert.equal(c.mii2024Recording.sourceImages.length,1);assert.equal(a.freshBrowserCensusCompleted,false);assert.ok(a.originalImages.every(f=>f.priorOriginalHashRecorded===false));assert.equal(read('archive/mii2024-posted-results-and-preserved-source-reconciliation-20261015.json').newWrIds,0);
});
test('Opening day shows only its fastest result and earlier published IDs survive generation',()=>{
 for(const cid of ['wii-maple-treeway-r','gcn-mushroom-bridge']) {const c=course(cid),rows=c.mii2024SupportingResults.filter(r=>isReviewedOpeningDay(r,'2024-05-15'));const best=Math.min(...rows.map(r=>r.timeCs));assert.ok(rows.every(r=>r.timeCs===best));}
 const p=read('scripts/mii2024-publication-preservation.json');assert.equal(p.preservedRows.length,65);for(const original of p.preservedRows) assert.deepEqual(read('public/data/courses/'+original.courseId+'.json')[original.collection].find(r=>r.id===original.row.id),original.row);
 assert.equal(read('public/data/bowser2024-completion.json').validation.livePublicationVerified,true);
});
