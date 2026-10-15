import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=cid=>JSON.parse(fs.readFileSync(`public/data/courses/${cid}.json`,'utf8'));
const ids=['bangkok-rush-2','singapore-speedway-r','tokyo-blur-4'];
const rows=cid=>['records','submissions','candidates'].flatMap(k=>read(cid)[k]);
test('Winter retains 31 WRs and distinguishes reported footage from documented standard results',()=>{
 assert.equal(ids.reduce((n,c)=>n+read(c).records.length,0),31);
 for(const [cid,wr,movie] of [[ids[0],'1:32.39','1:32.68'],[ids[1],'1:10.44','1:10.88'],[ids[2],'0:45.90','0:45.94']]){const d=routeData(['course',cid]).data.winter2024Recording;assert.equal(d.worldRecord.time,wr);assert.equal(d.documentedRecording.time,movie);assert.match(d.documentedRecording.videoBackup.url,/^https:\/\/media\.mktwrs\.com\//);}
 const b=routeData(['course',ids[0]]).data.winter2024Recording;assert.equal(b.reportedRecording.time,'1:32.39');assert.equal(b.recording,null);
});
test('Screenshot, movie publication, receipt, and human share retain distinct clocks',()=>{
 const shine=rows(ids[0]).find(r=>r.messageId==='1202588979275235438-winter2024-image-reviewed');assert.equal(shine.submittedAt,'2024-02-01T12:19:15.682Z');assert.equal(shine.videoPublishedAt,'2024-02-01T12:01:28Z');assert.equal(shine.videoSubmittedAt,'2024-02-01T12:19:19.339Z');assert(!shine.videoSharedAt);
 const sucha=rows(ids[0]).find(r=>r.messageId==='1201114105990352997-winter2024-image-reviewed');assert.equal(sucha.submittedAt,'2024-01-28T10:38:38.489Z');assert.equal(sucha.videoSharedAt,'2024-01-28T11:00:30.472Z');assert.equal(sucha.performanceCategory,'no-items');assert.equal(sucha.includeInProgression,false);assert.match(sucha.videoBackup.url,/media\.mktwrs\.com/);
 const menu=rows(ids[0]).find(r=>r.messageId==='1201114374786514984-winter2024-discussion-reviewed');assert.equal(menu.proofField,'menu-tour-best-panel');assert.notEqual(menu.playerId,sucha.playerId);assert.equal(menu.performanceCategory,'stored-menu-result');assert(!menu.video);
});
test('Tokyo final WR uses its original posting date and retains the carried reign ending',()=>{
 const d=read(ids[2]),r=d.records.find(r=>r.id==='1209624145000792084');assert.equal(r.recordDate,'2024-02-06');assert.equal(r.submittedAt,'2024-02-06T13:14:23.120Z');assert.equal(r.dateUnresolved,false);assert.equal(r.durationDays,29);assert.equal(r.durationEnd,'2026-10-15');assert.equal(d.records.find(r=>r.id==='1074903169542389840').durationEnd,'2024-02-06');assert(!r.video);
});
test('Opening-day display uses only fastest results and late receipts retain real dates',()=>{
 for(const cid of ids){const d=routeData(['course',cid]).data,opening=d.winter2024SupportingResults.filter(r=>isReviewedOpeningDay(r,'2024-01-24'));assert(new Set(opening.map(r=>r.timeCs)).size<=1);for(const r of d.winter2024SupportingResults.filter(r=>r.canonicalSourceReviewAudit)){assert.equal(r.recordDate,r.submittedAt.slice(0,10));assert.equal(r.dateUnresolved,false);}}
 const late=ids.flatMap(cid=>routeData(['course',cid]).data.winter2024SupportingResults.filter(r=>r.submittedAt>='2024-02-07T06:00:00Z'));assert.deepEqual(late.map(r=>r.time).sort(),['1:11.14','1:11.44','1:32.62']);for(const cid of ids)for(const r of rows(cid).filter(r=>r.messageId?.includes('closing-receipt-reviewed'))){assert.equal(r.receiptResultVerified,true);assert.equal(r.proofImageVerified,false);assert.equal(r.includeInProgression,false);}
});
test('Earlier missing original does not receive invented certification and unrelated history survives generation',()=>{
 const p=rows(ids[0]).find(r=>r.messageId==='1201880710051266591-winter2024-image-reviewed');assert(p);assert.equal(p.submittedAt,'2024-01-30T13:24:51.140Z');assert(!rows(ids[0]).some(r=>r.messageId==='1201880563095699456-winter2024-image-reviewed'));
 const candidate=read(ids[0]).candidates.find(r=>r.id==='discord-1467422368933875793');assert.equal(candidate.time,'1:32.33');assert.equal(candidate.status,'reconstructed-contender');assert(candidate.submittedAt.startsWith('2026-02-01'));
 assert.equal(read(ids[2]).submissions.filter(r=>r.id.includes('march2021-support-reviewed')).length,143);
});
