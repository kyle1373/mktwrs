import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {videoKey,videoUrl} from '../lib/video.mjs';
import {openingDayPublication,isReviewedOpeningDay} from '../lib/opening-day.mjs';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const tourId='tour-16',start='2020-04-22T06:00:00.000Z',end='2020-05-06T06:00:00.000Z';
const files=['archive/trick-2020-discussion-census.json','archive/yoshi-2020-discussion-census.json',
 'artifacts/trick2020-vanilla-lake-reported-date-20261016.json',
 'archive/early-visual-review.json','archive/trick2020-april30-may3-ledger-reconciliation.json'];
const messages=[...read(files[0]),...read(files[1])];
const id=m=>m.id.split('-').at(-1),clock=m=>m.times?.[0];
const refs=r=>[r.source,...(r.additionalSources||[])].filter(Boolean);
const references=(r,m)=>refs(r).some(s=>s.messageId===id(m)||s.url?.endsWith('/'+id(m)));
const platformClock=(id,epoch=1420070400000n)=>new Date(Number((BigInt(id)>>22n)+epoch)).toISOString();
const courses=read('public/data/courses.json').filter(c=>c.appearances.some(a=>a.tourId===tourId));
const a=Date.parse(start),b=Date.parse(end),dateRows=[],pending=[],reigns=[],opening=[],omissions=[];
const near=(x,y,label)=>assert.ok(Math.abs(x-y)<1e-9,`${label}: ${x} != ${y}`);
const daysWithinTour=intervals=>intervals.reduce((sum,w)=>sum+Math.max(0,Math.min(b,Date.parse(w.end))-Math.max(a,Date.parse(w.start)))/86400000,0);
const originalTweet='https://twitter.com/tomegome_g/status/1256832779804766208';
const originalTweetAt=platformClock('1256832779804766208',1288834974657n);
const originalShare=messages.find(m=>id(m)==='706392784159899659');
assert.ok(originalShare.links.some(l=>l.href.startsWith(originalTweet)));
const visualReviews=read(files[3]);
const rowsIn=x=>Array.isArray(x)?x.flatMap(rowsIn):x&&typeof x==='object'?[x,...Object.values(x).flatMap(rowsIn)]:[];
const reviewedImages=rowsIn(visualReviews).filter(r=>r.messageId==='706392784159899659');
for(const [courseId,time] of [['snes-vanilla-lake-1','0:34.62'],['3ds-neo-bowser-city-r','1:25.61']])
 assert.ok(reviewedImages.some(r=>r.courseId===courseId&&r.time===time));
const literalReport=messages.find(m=>id(m)==='705367401012920362');
assert.match(literalReport.text,/He set his time 04\/25/);
assert.equal(platformClock(id(literalReport)),clock(literalReport));
assert.equal(read(files[2]).reportedRunDate,'2020-04-25');

for(const c of courses){
 for(const collection of ['records','submissions','candidates'])for(const r of c[collection]||[]){
  if(!(r.finalDate>='2020-04-22'&&r.finalDate<'2020-05-07'))continue;
  assert.ok(Number.isFinite(r.durationDays)&&r.durationDays>=0,r.id+' duration');
  let evidence,basis,source,peerId;
  if(r.documentedDateSourceUrl===originalTweet){
   assert.equal(r.documentedAt,originalTweetAt);assert.equal(r.playerId,'tomegome');
   assert.ok(['0:34.62','1:25.61','1:25.69'].includes(r.time));
   if(r.id==='sheet-R71'){
    const canonical=c.records.find(p=>p.playerId===r.playerId&&p.timeCs===r.timeCs&&refs(p).some(s=>s.url===r.source.url));
    assert.ok(canonical,'explicit worksheet row crosswalk');assert.deepEqual(r.laps,canonical.laps);
    basis='explicit-worksheet-row-original-tweet-crosswalk';peerId=canonical.id;
   }else{
    assert.ok(references(r,originalShare)||refs(c.records.find(p=>p.timeCs===r.timeCs&&p.playerId===r.playerId)||{}).some(s=>s.url===r.source?.url));
    basis='original-reviewed-two-result-tweet';
   }
   evidence={sourceUrl:originalTweet,originalShareId:id(originalShare),reviewFile:files[3],...(peerId?{peerId}:{})};
  }else if(r.id==='curated-trick-2020-tomegome-3472'){
   assert.equal(r.finalDate,'2020-04-25');assert.equal(r.documentedAt,null);
   assert.equal(r.documentedDatePrecision,'day');assert.equal(r.documentedDateTimezone,'unspecified');
   const result=messages.find(m=>id(m)==='705365794720317470');assert.match(result.text,/tome 34\.72 VL1/);
   basis='explicit-retrospectively-reported-calendar-day';evidence={sourceUrl:r.documentedDateSourceUrl,
    reportPostedAt:clock(literalReport),capturedText:literalReport.text,reviewFile:files[2],withinDayClockKnown:false};
  }else{
   source=messages.find(m=>clock(m)===r.documentedAt&&references(r,m));
   if(source)basis='preserved-original-post';
   if(!source&&videoKey(videoUrl(r))){
    const peer=[...c.records,...c.submissions].find(p=>p.id!==r.id&&p.playerId===r.playerId&&p.timeCs===r.timeCs&&
     videoKey(videoUrl(p))===videoKey(videoUrl(r))&&p.documentedAt===r.documentedAt&&messages.some(m=>clock(m)===p.documentedAt&&references(p,m)));
    if(peer){source=messages.find(m=>clock(m)===peer.documentedAt&&references(peer,m));basis='same-player-total-and-footage-source';peerId=peer.id;}
   }
   if(source){assert.equal(platformClock(id(source)),r.documentedAt,r.id+' original post clock');
    evidence={sourceUrl:`https://discord.com/channels/629221606064914442/636461740162416640/${id(source)}`,messageId:id(source),capturedText:source.text,...(peerId?{peerId}:{})};}
  }
  if(!evidence)pending.push({courseId:c.id,collection,id:r.id,time:r.time,date:r.finalDate,documentedAt:r.documentedAt});
  if(r.documentedAt)assert.equal(r.finalDate,r.documentedAt.slice(0,10),r.id+' source date');
  const same=c.records.find(p=>p.playerId===r.playerId&&p.timeCs===r.timeCs);
  if(collection!=='records'){if(same)near(r.durationDays,same.durationDays,r.id+' canonical duration alias');else assert.equal(r.durationDays,0,r.id+' no proven WR reign');}
  dateRows.push({courseId:c.id,collection,id:r.id,playerId:r.playerId,time:r.time,date:r.finalDate,
   documentedAt:r.documentedAt,creditedWrDays:r.durationDays,sourceVerified:!!evidence,basis,...evidence});
 }
 // Independent bounded calculations. For a reported calendar day with no
 // confirmed timezone, UTC+14 through UTC-12 gives a 50-hour source window.
 // Exact post clocks stay exact. No production duration bounds are reused.
 const standing=c.records.filter(r=>r.finalDate<'2020-05-07');
 const sourceBounds=r=>{
  if(r.finalDate<'2020-04-22')return {earliest:a,latest:a};
  if(r.documentedAt){const t=Math.max(a,Date.parse(r.documentedAt));return {earliest:t,latest:t};}
  assert.equal(r.id,'curated-trick-2020-tomegome-3472');const day=Date.parse(r.finalDate+'T00:00:00Z');
  return {earliest:Math.max(a,day-14*3600000),latest:Math.max(a,day+36*3600000)};
 };
 for(const r of standing){const s=sourceBounds(r),faster=standing.filter(p=>p.timeCs<r.timeCs).map(sourceBounds);
  if(r.id==='curated-702425239707189252-702425239426170991-2020-proof-review'){
   const proof=c.submissions.find(p=>p.id==='curated-702431312627236894-702431312417652736-2020-proof-review');
   assert.equal(proof.time,'0:35.47');assert.equal(proof.proofImageVerified,true);assert.equal(proof.documentedAt,'2020-04-22T08:11:15.473Z');faster.push(sourceBounds(proof));
  }
  const minEnd=Math.min(b,...faster.map(p=>p.earliest)),maxEnd=Math.min(b,...faster.map(p=>p.latest));
  const minDays=Math.max(0,minEnd-s.latest)/86400000,maxDays=Math.max(0,maxEnd-s.earliest)/86400000;
  near(daysWithinTour(r.durationIntervalsGuaranteed),minDays,r.id+' guaranteed tour duration');
  near(daysWithinTour(r.durationIntervalsPossible),maxDays,r.id+' possible tour duration');
  if(maxDays>0)reigns.push({courseId:c.id,id:r.id,time:r.time,playerId:r.playerId,
   sourceStart:{earliest:new Date(s.earliest).toISOString(),latest:new Date(s.latest).toISOString()},
   sourceEnd:{earliest:new Date(minEnd).toISOString(),latest:new Date(maxEnd).toISOString()},minDays,maxDays});
 }
 for(const r of c.submissions.filter(r=>r.proofImageVerified&&r.documentedAt&&r.documentedAt>=start&&r.documentedAt<end)){
  if(c.records.some(p=>p.playerId===r.playerId&&p.timeCs===r.timeCs))continue;
  if(r.id==='curated-702431312627236894-702431312417652736-2020-proof-review'){
   assert.equal(r.time,'0:35.47');assert.equal(r.durationDays,0);
   const prior=c.records.find(p=>p.id==='curated-702425239707189252-702425239426170991-2020-proof-review');assert.equal(prior.durationEnd,r.documentedAt);continue;
  }
  if(r.id==='curated-702431312627236894-previous-03550-trickopening2020-recheck'){
   const finish=c.submissions.find(p=>p.id==='curated-702431312627236894-702431312417652736-2020-proof-review');
   assert.equal(r.proofField,'previous-best');assert.equal(r.proofImageLocal,finish.proofImageLocal);assert.equal(r.documentedAt,finish.documentedAt);assert.ok(r.timeCs>finish.timeCs);assert.equal(r.durationDays,0);continue;
  }
  const prior=standing.filter(p=>sourceBounds(p).earliest<=Date.parse(r.documentedAt));
  if(prior.length&&r.timeCs<Math.min(...prior.map(p=>p.timeCs)))omissions.push(r.id);
 }
 const day=c.records.filter(r=>r.documentedAt&&Date.parse(r.documentedAt)>=a&&Date.parse(r.documentedAt)<a+86400000);
 for(const r of c.records.filter(r=>r.finalDate>='2020-04-22'&&r.finalDate<'2020-04-24'))assert.equal(isReviewedOpeningDay(r,'2020-04-22'),day.includes(r),r.id+' opening boundary');
 const expected=day.filter(r=>r.timeCs===Math.min(...day.map(r=>r.timeCs))).map(r=>r.id);
 const actual=openingDayPublication([c],[]).courses[0].records.filter(r=>day.includes(r)).map(r=>r.id);
 assert.deepEqual(actual,expected);opening.push({courseId:c.id,openingLeaderIds:actual});
}
assert.equal(dateRows.filter(r=>r.collection==='records').length,30);
assert.equal(dateRows.filter(r=>r.collection==='submissions').length,314);
assert.deepEqual(pending,[]);assert.deepEqual(omissions,[]);
const report={tourId,checkedAt:'2026-10-16',sourceRowsChecked:dateRows.length,recordDatesReviewed:30,
 submissionDatesReviewed:314,missingDates:0,missingDurations:0,newlyDatedSheetEntries:['sheet-R71'],
 sourceFiles:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')})),
 datePolicy:'Original posting/publication unless an earlier date is explicitly reported. Calendar-day source uncertainty remains preserved.',
 durationPolicy:'Independent tour-only credited playable intervals, including the reported calendar-day uncertainty; ties coexist, strictly faster evidence ends credit, 06 UTC opening/close.',
 dateRows,reigns,opening,pending,screenshotImprovementsMissingFromProgression:omissions,
 preservedTourSourceDateReviewComplete:true,tourWindowDurationReviewComplete:true,historyComplete:false,
 limitations:['Tomegome 0:34.72 has an explicitly reported April 25 date, with unknown within-day clock and timezone; duration bounds are retained.','Prior image/video content interpretations are retained from cited source reviews; this independently reviews dated source clocks and tour duration math.','Exhaustive worldwide history is not certified.']};
fs.writeFileSync('public/data/trick2020-source-and-duration-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({rows:dateRows.length,pending,omissions,courses:courses.length}));
