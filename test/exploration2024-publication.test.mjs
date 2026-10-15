import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const ids=['piranha-plant-cove','piranha-plant-cove-2'];
const read=cid=>JSON.parse(fs.readFileSync(`public/data/courses/${cid}.json`,'utf8'));
test('Exploration retains 17 WRs and separates reported and documented footage from the final times',()=>{
 assert.equal(ids.reduce((n,id)=>n+read(id).records.length,0),17);
 const a=routeData(['course',ids[0]]).data.exploration2024Recording,b=routeData(['course',ids[1]]).data.exploration2024Recording;
 assert.equal(a.worldRecord.id,'1078514612225441792');assert.equal(a.worldRecord.time,'1:08.46');assert.equal(a.reportedRecording.time,'1:08.46');assert.equal(a.documentedRecording,null);
 assert.equal(b.worldRecord.id,'1215068996248936541');assert.equal(b.worldRecord.time,'1:29.34');assert.equal(b.documentedRecording.time,'1:29.81');assert.match(b.documentedRecording.videoBackup.url,/^https:\/\/media\.mktwrs\.com\//);assert(!b.worldRecord.video);
});
test('Original screenshot dates govern the new WR and late submissions',()=>{
 const r=read(ids[1]).records.find(r=>r.id==='1215068996248936541');assert.equal(r.recordDate,'2024-02-12');assert.equal(r.submittedAt,'2024-02-12T18:10:13.838Z');assert.equal(r.dateUnresolved,false);assert.equal(r.durationDays,37);assert.equal(r.durationEnd,'2026-10-15');assert.equal(read(ids[1]).records.find(r=>r.id==='1078515335923257476').durationEnd,'2024-02-12');
 const late=ids.flatMap(cid=>routeData(['course',cid]).data.exploration2024SupportingResults).filter(r=>r.submittedAt>='2024-02-21T06:00:00Z');assert.deepEqual(late.map(r=>r.time).sort(),['1:08.66','1:09.70','1:29.73']);for(const x of late){assert.equal(x.recordDate,'2024-02-21');assert(ids.some(id=>read(id).submissions.some(r=>r.time===x.time&&r.lateTourSubmission===true&&r.courseAppearance==='Exploration Tour (2024)')));}
});
test('A partial strategy clip receives no completed-time or WR credit',()=>{
 const d=routeData(['course',ids[1]]).data.exploration2024Recording,s=d.strategyReference;assert(s);assert(!s.time);assert.match(s.videoBackup.url,/media\.mktwrs\.com/);assert.match(s.evidenceNote,/no completed lap or whole-race total/);assert.equal(s.submittedAt,'2024-02-18T19:28:02.148Z');assert(!read(ids[1]).records.some(r=>r.source?.messageId==='1208857477609955449'));
 const p=JSON.parse(fs.readFileSync('archive/exploration2024-original-preservation-and-source-review-20261015.json','utf8'));const m=p.originalMovies.find(m=>m.sourceMessageId==='1208857477609955449');assert.equal(m.completedTotal,null);assert.equal(m.completedLap,null);
});
test('Supporting dates, first-day filtering, and adjacent-tour sources retain their proper scope',()=>{
 for(const id of ids){const d=routeData(['course',id]).data;const opening=d.exploration2024SupportingResults.filter(r=>isReviewedOpeningDay(r,'2024-02-07'));assert(new Set(opening.map(r=>r.timeCs)).size<=1);for(const r of d.exploration2024SupportingResults.filter(r=>r.canonicalSourceReviewAudit)){assert.equal(r.recordDate,r.submittedAt.slice(0,10));assert.equal(r.dateUnresolved,false);}}
 const p=JSON.parse(fs.readFileSync('archive/exploration2024-original-preservation-and-source-review-20261015.json','utf8'));assert.equal(p.originalImages.filter(f=>f.disposition==='late-winter2024-source-only').length,3);assert.equal(p.originalImages.filter(f=>f.disposition==='doctor2024-opening-source-only').length,2);assert(read(ids[0]).submissions.some(r=>r.playerId==='deleted-user'&&r.time==='1:08.78'));
});
