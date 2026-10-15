import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const course=cid=>routeData(['course',cid]).data;
test('Mario final WR and documented recording remain distinct and dated',()=>{
 const c=course('n64-luigi-raceway'),r=c.mario2024Recording.worldRecord,v=c.mario2024Recording.documentedRecording;
 assert.equal(r.time,'1:12.13');assert.equal(r.playerId,'nekozuki');assert.equal(c.records.find(r=>r.time==='1:12.17').playerId,'nekozuki');assert.equal(r.submittedAt,'2024-03-12T05:19:46.244Z');assert.equal(v.time,'1:12.32');assert.equal(v.submittedAt,'2024-03-07T08:48:44.267Z');assert.match(v.videoBackup.url,/^https:\/\/media.mktwrs.com\//);
 const dp=course('snes-donut-plains-3r').mario2024Recording;assert.equal(dp.worldRecord.time,'0:57.13');assert.equal(dp.documentedRecording.time,'0:57.13');assert.equal(dp.documentedRecording.videoPublishedAt,'2023-03-14T14:27:27Z');
});
test('Earlier REMON discussion image does not collapse later receipts into the same clock',()=>{
 const c=read('public/data/courses/n64-luigi-raceway.json'),r=c.records.find(r=>r.id==='curated-1215953583866908763-mario2024-image-reviewed');assert.equal(r.submittedAt,'2024-03-09T06:40:57.491Z');assert.ok(r.additionalProofImages.every(u=>u.startsWith('https://media.mktwrs.com/')));
 const receipt=c.submissions.find(r=>r.id==='discord-1215953595531526174');assert.equal(receipt.status,'matched-existing-wr-receipt');assert.equal(receipt.submittedAt,'2024-03-09T09:25:25.719Z');assert.equal(receipt.includeInProgression,false);assert.equal(c.candidates.length,0);
});
test('Partial movies and item challenge establish no invented whole-race WR',()=>{
 const a=read('archive/mario2024-original-preservation-and-source-review-20261015.json');assert.equal(a.r2FilesVerified,47);
 const challenge=a.originalMovies.find(m=>m.disposition==='item-box-challenge-no-tt-result');assert.equal(challenge.sourceMessageId,'1216175565694828675');assert.equal(challenge.completedTotal,null);assert.equal(challenge.videoVerified,false);
 const lap=a.originalMovies.find(m=>m.disposition==='single-lap-strategy-35.04');assert.equal(lap.sourceMessageId,'1215350104014192660');assert.equal(lap.completedLap,'0:35.04');assert.equal(lap.completedTotal,null);
 assert.equal(course('n64-luigi-raceway').mario2024Recording.lapDemonstrations[0].time,'0:35.04');
});
test('Old Wins movie publication remains separate from its 2024 sharing event',()=>{
 const r=course('n64-luigi-raceway').mario2024Recording.lateStartRecording;assert.equal(r.time,'1:12.43');assert.equal(r.submittedAt,'2023-03-08T22:22:54.013Z');assert.equal(r.videoSharedAt,'2024-03-07T13:11:47.359Z');assert.match(r.evidenceNote,/Partial 2023/);
});
test('Mario opening-day rows keep only fastest support and limits remain explicit',()=>{
 for(const cid of ['n64-luigi-raceway','snes-donut-plains-3r']){const rows=course(cid).mario2024SupportingResults.filter(r=>r.submittedAt?.slice(0,10)==='2024-03-06');if(rows.length)assert.equal(new Set(rows.map(r=>r.time)).size,1);}
 const a=read('archive/mario2024-original-preservation-and-source-review-20261015.json');assert.equal(a.missingOriginals.length,2);assert.equal(a.freshBrowserCensusCompleted,false);assert.equal(read('archive/mario2024-posted-results-and-preserved-source-reconciliation-20261015.json').newWrIds,0);
});
