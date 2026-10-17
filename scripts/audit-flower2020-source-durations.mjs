import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {openingDayPublication,isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const courseId='3ds-shy-guy-bazaar-r',tourId='tour-17',start='2020-05-06T06:00:00.000Z',end='2020-05-20T06:00:00.000Z';
const files=['archive/flower-2020-discussion-census.json','archive/flower-2020-opening-boundary-census.json',
 'archive/flower2020-selected-recording-fresh-visual-and-access-review-20261013.json',
 'artifacts/flower2020-sheet-and-earlier-report-date-review-20261016.json',
 'artifacts/flower2020-preserved-original-video-publication-metadata-20261016.json'];
const messages=[...read(files[0]),...read(files[1])],c=read('public/data/courses/'+courseId+'.json');
const clock=id=>new Date(Number((BigInt(id)>>22n)+1420070400000n)).toISOString();
const refs=r=>[r.source,...r.additionalSources||[]].filter(Boolean);
const reference=(r,m)=>refs(r).some(s=>s.messageId===m.id.split('-').at(-1)||s.url?.endsWith('/'+m.id.split('-').at(-1)));
const rows=[],pending=[],omissions=[];const changes=read(files[3]);
for(const collection of ['records','submissions','candidates'])for(const r of c[collection]||[]){
 if(r.finalDate&&r.finalDate>'2020-05-20')continue;
 assert.ok(Number.isFinite(r.durationDays)&&r.durationDays>=0,r.id+' duration');
 let evidence=null;
 const override=changes.overrides.find(e=>e.id===r.id&&e.collection===collection);
 if(override){
  assert.equal(r.documentedAt,override.timestamp);assert.equal(r.documentedDateSourceUrl,override.sourceUrl);
  const m=messages.find(m=>override.sourceUrl.endsWith('/'+m.id.split('-').at(-1)));
  assert.ok(m);assert.equal(clock(m.id.split('-').at(-1)),r.documentedAt);
  if(r.id.startsWith('sheet-')){
   const cross=changes.sheetCrosswalks.find(x=>x.sheetId===r.id),canonical=c.records.find(p=>p.id===cross.canonicalId);
   assert.ok(refs(canonical).some(s=>s.url===r.source.url));assert.equal(r.playerId,canonical.playerId);assert.equal(r.time,canonical.time);assert.deepEqual(r.laps,canonical.laps);
  }else if(r.playerId==='wins'){
   const meta=read(files[4]);assert.equal(new Date(meta.timestamp*1000).toISOString(),'2020-05-19T10:26:09.000Z');
   assert.match(m.text,/I have a 1:39.76 on record/);assert.ok(m.text.startsWith('Wins\n'));
   const share=messages.find(m=>m.id.endsWith('712250209509572648'));assert.ok(share.text.startsWith('Wins\n'));assert.ok(share.links.some(l=>l.href.includes('fUX_uDUWN_Y')));
   assert.equal(r.submittedAt,'2020-05-19T10:26:09Z');assert.equal(r.videoPublishedAt,'2020-05-19T10:26:09Z');
  }else{
   assert.equal(r.playerId,'brandonsg');assert.equal(r.proofImageVerified,true);assert.ok(reference(r,m));
   assert.match(m.text,r.time==='1:40.00'?/Got a 1:40 flat on recording/:/40\.46/);
   assert.equal(r.submittedAt,changes.earlierReports.find(x=>x.id===r.id).laterProofSharedAt);
  }
  evidence={basis:override.basis,sourceUrl:override.sourceUrl,messageId:m.id.split('-').at(-1),capturedText:m.text};
 }else if(r.id==='curated-810619049138323456-verified-video-support'){
  const proof=read(files[4]);assert.equal(proof.id,'fUX_uDUWN_Y');assert.equal(new Date(proof.timestamp*1000).toISOString(),'2020-05-19T10:26:09.000Z');
  assert.equal(r.documentedAt,'2020-05-19T10:26:09.000Z');assert.ok(refs(r).some(s=>s.url.includes('fUX_uDUWN_Y')));
  const share=messages.find(m=>m.id.endsWith('712250209509572648'));assert.ok(share.links.some(l=>l.href.includes('fUX_uDUWN_Y')));
  evidence={basis:'reviewed-original-video-publication',sourceUrl:'https://www.youtube.com/watch?v=fUX_uDUWN_Y',laterSharedAt:share.times[0],priorVideoReview:files[2]};
 }else if(r.documentedAt){
  const m=messages.find(m=>m.times?.[0]===r.documentedAt&&reference(r,m));assert.ok(m,r.id+' original preserved post');
  assert.equal(clock(m.id.split('-').at(-1)),r.documentedAt);
  evidence={basis:'preserved-original-post',sourceUrl:'https://discord.com/channels/629221606064914442/636461740162416640/'+m.id.split('-').at(-1),messageId:m.id.split('-').at(-1),capturedText:m.text};
 }
 if(r.documentedAt)assert.equal(r.finalDate,r.documentedAt.slice(0,10));
 if(!evidence){assert.equal(r.finalDate,null);pending.push({id:r.id,playerId:r.playerId,time:r.time,source:r.source,reason:'Worksheet has no preserved date or proven dated source crosswalk.'});}
 const same=c.records.find(p=>p.playerId===r.playerId&&p.timeCs===r.timeCs);
 if(collection!=='records')assert.equal(r.durationDays,same?.durationDays||0,r.id+' canonical alias or no proven WR reign');
 rows.push({courseId,collection,id:r.id,playerId:r.playerId,time:r.time,date:r.finalDate,documentedAt:r.documentedAt,creditedWrDays:r.durationDays,sourceVerified:!!evidence,...evidence});
}
const a=Date.parse(start),b=Date.parse(end),reigns=[];
assert.deepEqual(c.appearances.map(x=>[x.tourId,x.startDate,x.endDate]),[[tourId,'2020-05-06','2020-05-20']]);
for(const r of c.records){
 const begin=Date.parse(r.documentedAt),faster=c.records.filter(p=>p.timeCs<r.timeCs),finish=Math.min(b,...faster.map(p=>Date.parse(p.documentedAt)));
 const expected=Math.max(0,finish-Math.max(a,begin))/86400000;
 assert.ok(Math.abs(r.durationDays-expected)<1e-9,r.id+' independent playable duration');
 const expectedIntervals=expected>0?[{start:new Date(Math.max(a,begin)).toISOString(),end:new Date(finish).toISOString()}]:[];
 assert.deepEqual(r.durationIntervalsGuaranteed,expectedIntervals);assert.deepEqual(r.durationIntervalsPossible,expectedIntervals);
 reigns.push({id:r.id,time:r.time,playerId:r.playerId,begin:r.documentedAt,end:new Date(finish).toISOString(),days:expected});
}
for(const r of c.submissions.filter(r=>r.proofImageVerified&&r.documentedAt&&r.documentedAt>=start&&r.documentedAt<end)){
 if(c.records.some(p=>p.timeCs===r.timeCs&&p.playerId===r.playerId))continue;
 const prior=c.records.filter(p=>p.documentedAt<=r.documentedAt);
 if(prior.length&&r.timeCs<Math.min(...prior.map(p=>p.timeCs)))omissions.push(r.id);
}
const opening=c.records.filter(r=>Date.parse(r.documentedAt)>=a&&Date.parse(r.documentedAt)<a+86400000);
for(const r of c.records)assert.equal(isReviewedOpeningDay(r,'2020-05-06'),opening.includes(r));
const expectedOpening=opening.filter(r=>r.timeCs===Math.min(...opening.map(p=>p.timeCs))).map(r=>r.id);
const actualOpening=openingDayPublication([c],[]).courses[0].records.filter(r=>opening.includes(r)).map(r=>r.id);
assert.deepEqual(actualOpening,expectedOpening);assert.deepEqual(omissions,[]);
assert.equal(rows.length,62);assert.equal(rows.filter(r=>r.collection==='records').length,16);assert.equal(pending.length,24);
const report={tourId,checkedAt:'2026-10-16',sourceRowsChecked:rows.length,verifiedSourceDates:rows.filter(r=>r.sourceVerified).length,
 recordDatesReviewed:16,missingCanonicalDates:0,missingDurations:0,undatedSupportingRows:pending.length,
 sourceFiles:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')})),
 dateRows:rows,reigns,openingLeaderIds:actualOpening,pending,screenshotImprovementsMissingFromProgression:omissions,
 canonicalDateReviewComplete:true,tourWindowDurationReviewComplete:true,preservedTourSourceDateReviewComplete:false,historyComplete:false,
 limitations:['24 worksheet submissions remain undated; do not invent dates or certify all-source completion.','Original race clocks are not assumed from later sharing; reviewed earlier self-reports remain distinguished from video publication.','Prior proof/video content reviews are carried forward; no fresh visual review or exhaustive worldwide history certification.']};
fs.writeFileSync('public/data/flower2020-source-and-duration-review.json',JSON.stringify(report,null,2)+'\n');
console.log({rows:rows.length,verified:report.verifiedSourceDates,undated:pending.length,canonicalDatesPass:true,durationsPass:true,openingLeaderIds:actualOpening});
