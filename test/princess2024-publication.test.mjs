import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Princess WRs and fastest available recordings keep separate evidence',()=>{
 const c=course('wii-coconut-mall').princess2024Recording,s=course('gba-snow-land-r').princess2024Recording;
 assert.equal(c.worldRecord.time,'1:13.51');assert.equal(c.documentedRecording.time,'1:13.64');assert.equal(c.worldRecord.video,null);assert.equal(s.worldRecord.time,'1:09.09');assert.equal(s.documentedRecording.time,'1:09.09');
 assert.ok(c.documentedRecording.videoBackup.preservedOriginalSha256);assert.equal(c.documentedRecording.videoBackup.kind,'r2-h264-aac-playback-transcode');
});
test('Result, edited receipt and movie sharing keep independent clocks',()=>{
 const c=course('wii-coconut-mall'),r=c.princess2024Recording.documentedRecording;
 assert.equal(r.submittedAt,'2024-06-10T10:48:36.081Z');assert.equal(r.videoSharedAt,'2024-06-10T10:49:25.149Z');assert.deepEqual(r.laps,['36.81','36.83']);assert.equal(r.recordDate,'2024-06-10');
 const final=c.princess2024Recording.worldRecord;assert.equal(final.submittedAt,'2024-06-11T16:25:35.389Z');assert.equal(final.announcedAt,'2024-06-17T19:48:20.397Z');assert.equal(final.recordDate,'2024-06-11');
});
test('All reviewed result sources survive earlier publication deferrals',()=>{
 const audit=read('archive/princess2024-posted-results-and-preserved-source-reconciliation-20261015.json'),raw=read('archive/curated-runs.json');assert.equal(audit.sourceDisposition.length,46);
 for(const source of audit.sourceDisposition){const r=raw.find(r=>r.messageId===source.rawId),c=read('public/data/courses/'+r.courseId+'.json');assert.ok([...c.records,...c.submissions,...c.candidates].some(row=>row.messageId===source.rawId||row.id==='curated-'+source.rawId),source.rawId);}
 assert.equal(read('archive/princess2024-reviewed-source-publication-release-20261015.json').releasedReviewedRows.length,28);
});
test('Preserved partial clips and stored menu stay distinct from completed performances',()=>{
 const a=read('archive/princess2024-original-preservation-and-source-review-20261015.json');assert.equal(a.r2FilesVerified,62);assert.equal(a.originalImages.length,48);assert.equal(a.originalMovies.length,14);assert.equal(a.freshBrowserCensusCompleted,false);
 const c=course('wii-coconut-mall'),s=course('gba-snow-land-r');assert.equal(c.princess2024Recording.strategyReferences.length,2);assert.equal(s.princess2024Recording.sourceImages.length,1);assert.ok(!s.records.some(r=>r.time==='1:09.95'));
 const full=read('public/data/courses/wii-coconut-mall.json');const z=[...full.records,...full.submissions].find(r=>r.id==='curated-1247411335055147098-princess2024-image-reviewed');assert.ok(z.videoBackup.url);assert.equal(z.videoVerified,false);
});
test('First day shows its final best and prior completed tour remains LIVE',()=>{
 for(const cid of ['wii-coconut-mall','gba-snow-land-r']){const c=course(cid),rows=c.princess2024SupportingResults.filter(r=>isReviewedOpeningDay(r,'2024-05-29')),best=Math.min(...rows.map(r=>r.timeCs));assert.ok(rows.every(r=>r.timeCs===best));}
 assert.equal(read('public/data/mii2024-completion.json').validation.livePublicationVerified,true);
});
