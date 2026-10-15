import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Rome2024 WRs preserve first screenshot, repost split and separate video clocks',()=>{
 const c=read('public/data/courses/rome-avanti-3.json');
 const first=c.records.find(r=>r.id==='curated-1287387856880406561-anniversary2024-image-reviewed'),final=c.records.find(r=>r.id==='1308276465279959090');
 assert.equal(first.time,'1:17.10');assert.equal(first.submittedAt,'2024-09-22T12:19:43.590Z');assert.equal(first.videoPublishedAt,'2024-09-22T11:16:22Z');assert.equal(first.videoSharedAt,'2024-09-22T22:55:30.020Z');
 assert.equal(final.time,'1:16.96');assert.equal(final.submittedAt,'2024-09-23T12:17:46.226Z');assert.equal(final.chronologyDate,final.submittedAt);assert.deepEqual(final.laps,['38.52','38.44']);assert.equal(final.videoPublishedAt,'2024-09-23T13:15:12Z');assert.equal(final.videoSharedAt,undefined);assert.ok(final.additionalSources.some(s=>s.url?.includes('1308276465279959090')));assert.ok(final.videoBackup.url.startsWith('https://media.mktwrs.com/'));
 const duplicate=c.submissions.find(r=>r.id==='curated-sucha-supplied-m4Whuu_Yt6c');assert.equal(duplicate.includeInProgression,false);assert.equal(duplicate.submittedAt,'2024-09-23T12:21:08.869Z');assert.equal(duplicate.status,'matched-existing-performance-source');
 const d=course('rome-avanti-3');assert.equal(d.anniversary2024Recording.worldRecord.time,'1:16.96');assert.equal(d.anniversary2024Recording.documentedRecording.time,'1:16.96');assert.equal(d.anniversary2024Recording.strategyReferences.length,2);assert.ok(d.anniversary2024Recording.strategyReferences.every(r=>!r.time));assert.equal(d.anniversary2024SupportingResults.length,6);
});
test('Carried WRs and available movies remain separate from future improvements',()=>{
 const a=course('athens-dash-3'),m=course('madrid-drive-3');assert.equal(a.anniversary2024Recording.worldRecord.time,'1:11.73');assert.equal(a.anniversary2024Recording.documentedRecording.time,'1:11.88');assert.equal(m.anniversary2024Recording.worldRecord.time,'1:19.45');assert.equal(m.anniversary2024Recording.documentedRecording.time,'1:19.45');assert.equal(a.anniversary2024SupportingResults.length,6);assert.equal(m.anniversary2024SupportingResults.length,3);
 assert.deepEqual(a.anniversary2024SupportingResults.filter(r=>r.submittedAt<'2024-09-19T06:00:00Z').map(r=>r.time),['1:12.00']);assert.ok(a.fastestVideo);assert.ok(m.fastestVideo);
 for(const [cid,time,at] of [['madrid-drive-3','1:19.86','2024-10-02T06:05:12.799Z'],['rome-avanti-3','1:17.26','2024-10-02T06:06:48.110Z']]){const r=course(cid).anniversary2024SupportingResults.find(r=>r.time===time);assert.equal(r.submittedAt,at);assert.equal(read('public/data/courses/'+cid+'.json').submissions.find(s=>s.time===time && s.messageId?.includes('anniversary2024')).lateTourSubmission,true);}
});
test('All398rows and25stable WRs retained; receipts remain source-only',()=>{
 let rows=0,wr=0;const aggregate=read('public/data/courses.json');
 for(const cid of ['athens-dash-3','madrid-drive-3','rome-avanti-3']){const c=read('public/data/courses/'+cid+'.json'),g=aggregate.find(c=>c.id===cid);for(const k of ['records','submissions','candidates']){assert.deepEqual(c[k],g[k]);rows+=c[k].length;}wr+=c.records.length;}
 assert.equal(rows,398);assert.equal(wr,25);const r=read('archive/anniversary2024-edited-receipt-source-dispositions-20261015.json');assert.equal(r.matchedReceipts,7);assert.equal(r.mismatchedReceipts,0);assert.ok(r.receiptSourceDispositions.every(p=>p.set.includeInProgression===false));
});
test('R2 originals, duplicate image and publication metadata are retained accurately',()=>{
 const a=read('archive/anniversary2024-original-preservation-and-source-review-20261015.json');assert.equal(a.originalImages.length,18);assert.equal(a.originalMovies.length,6);assert.equal(a.uniqueCurrentPerformances,17);assert.equal(a.byteIdenticalReposts,1);assert.equal(a.r2FilesVerified,24);for(const f of [...a.originalImages,...a.originalMovies]){assert.equal(f.sha256,f.r2.sha256);assert.equal(f.r2.publicRangeMatchesOriginal,true);}
 assert.equal(a.originalImages.find(f=>f.attachmentId==='1287749752133517352').sha256,a.originalImages.find(f=>f.attachmentId==='1287750602088120382').sha256);const census=read('archive/anniversary2024-preserved-bounded-source-census-20261015.json');assert.equal(census.currentDiscussionRows,39);assert.equal(census.freshBrowserCensusCompleted,false);
});
