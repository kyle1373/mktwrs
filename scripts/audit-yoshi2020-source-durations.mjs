import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {videoKey,videoUrl} from '../lib/video.mjs';
import {openingDayPublication,isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const tourId='tour-15',start='2020-04-08T06:00:00.000Z',end='2020-04-22T06:00:00.000Z';
const files=['archive/yoshi-2020-discussion-census.json','archive/yoshi2020-opening-hour-preserved-messages-20261016.json','archive/trick-2020-discussion-census.json','archive/yoshi2020-ryukano-original-post-fresh-20261016.json','archive/raw/workbook-extracted.json'];
const messages=[...read(files[0]),...read(files[1]).messages,...read(files[2]),read(files[3]).post];
const clock=m=>m.times?.[0],id=m=>m.id.split('-').at(-1);
const refs=r=>[r.source,...(r.additionalSources||[])].filter(Boolean);
const refMatches=(r,m)=>refs(r).some(s=>s.messageId===id(m)||s.url?.endsWith('/'+id(m)));
const platformClock=(id,epoch=1420070400000n)=>new Date(Number((BigInt(id)>>22n)+epoch)).toISOString();
const attachment=url=>url?.match(/\/attachments\/\d+\/(\d+)\//)?.[1];
const hasAttachment=(m,a)=>a&&[...(m.links||[]).map(l=>l.href),...(m.images||[]).map(i=>i.src)].some(u=>attachment(u)===a);
const courses=read('public/data/courses.json').filter(c=>c.appearances.some(a=>a.tourId===tourId));
const dateRows=[],pending=[],durationRows=[],omissions=[],opening=[];
const a=Date.parse(start),b=Date.parse(end);
const intersection=(ws)=>ws.reduce((sum,w)=>sum+Math.max(0,Math.min(Date.parse(w.end),b)-Math.max(Date.parse(w.start),a))/86400000,0);
const near=(x,y,label)=>assert.ok(Math.abs(x-y)<1e-9,`${label}: ${x} != ${y}`);
for(const c of courses){
 for(const collection of ['records','submissions','candidates'])for(const r of c[collection]||[]){
  if(!(r.finalDate>='2020-04-08'&&r.finalDate<'2020-04-23'))continue;
  assert.equal(r.finalDate,r.documentedAt?.slice(0,10),r.id+' UTC publication day');
  assert.ok(Number.isFinite(r.durationDays)&&r.durationDays>=0,r.id+' duration');
  let source=messages.find(m=>clock(m)===r.documentedAt&&refMatches(r,m));
  let basis=source?'preserved-original-post':null,peerId,evidence;
  if(!source) {
   const photo=attachment(r.proofImage);
   source=messages.find(m=>clock(m)===r.documentedAt&&hasAttachment(m,photo));
   if(source)basis='same-original-attachment-post';
  }
  if(!source){
   const peer=c.records.find(p=>p.id!==r.id&&p.playerId===r.playerId&&p.timeCs===r.timeCs&&p.documentedAt===r.documentedAt&&
    ((videoKey(videoUrl(p))&&videoKey(videoUrl(p))===videoKey(videoUrl(r)))||refs(p).some(s=>s.url===r.documentedDateSourceUrl||s.url===r.source?.url)));
   if(peer){source=messages.find(m=>clock(m)===peer.documentedAt&&refMatches(peer,m));if(source){basis='same-player-total-and-footage-source';peerId=peer.id;}}
  }
  if(source){assert.equal(platformClock(id(source)),r.documentedAt,r.id+' source snowflake');evidence={messageId:id(source),sourceUrl:`https://discord.com/channels/629221606064914442/${source.id.startsWith('chat-messages-')?source.id.split('-').at(-2):'636461740162416640'}/${id(source)}`,capturedText:source.text,...(peerId?{peerId}:{})};}
  else if(/^curated-yoshi-2020-tomegome-daisy-121(?:69|54|48)$/.test(r.id)){
   const file='artifacts/yoshi2020-tomegome-original-tweet-publication-clock-20261016.json';
   assert.equal(platformClock('1249652486790471685',1288834974657n),r.documentedAt);
   assert.equal(r.documentedDateSourceUrl,'https://twitter.com/tomegome_g/status/1249652486790471685');
   basis='reviewed-original-three-result-tweet';evidence={sourceUrl:r.documentedDateSourceUrl,reviewArtifact:file};
  }
  else if(r.id==='sheet-C82'&&collection==='submissions'){
   const found=[];const walk=x=>{if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){if(x.row===82&&x.cells?.some(c=>c.cell==='H82'&&c.link===r.proofImage))found.push(x);Object.values(x).forEach(walk);}};walk(read(files[4]));
   assert.equal(found.length,1);const cells=Object.fromEntries(found[0].cells.map(c=>[c.cell,c]));
   assert.equal(cells.C82.value,'SuperSonic2');assert.equal(cells.D82.value,r.time);
   assert.equal(platformClock(attachment(cells.H82.link)),r.documentedAt);
   assert.equal(r.documentedAt,r.proofUploadedAt);assert.equal(r.durationDays,0);
   const earlier=c.records.find(p=>p.id==='curated-yoshi-2020-undated-n64-kalimari-desert-11563');
   assert.ok(earlier.timeCs<r.timeCs&&earlier.documentedAt<r.documentedAt);
   basis='preserved-sheet-proof-attachment-upload';evidence={sourceUrl:cells.H82.link,preservedFile:files[4],attachmentId:attachment(cells.H82.link),clockScope:'Proof upload, not a recovered message or exact race finish',originalMessageRecovered:false,originalImageRecovered:false};
  }
  if(!evidence)pending.push({courseId:c.id,collection,id:r.id,time:r.time,documentedAt:r.documentedAt,reason:'Posting reference needs independent preserved source corroboration.'});
  const same=c.records.find(p=>p.playerId===r.playerId&&p.timeCs===r.timeCs);
  if(collection!=='records'){if(same)near(r.durationDays,same.durationDays,r.id+' canonical duration alias');else assert.equal(r.durationDays,0,r.id+' non-WR credit');}
  dateRows.push({courseId:c.id,collection,id:r.id,time:r.time,playerId:r.playerId,date:r.finalDate,documentedAt:r.documentedAt,withinTour:Date.parse(r.documentedAt)>=a&&Date.parse(r.documentedAt)<b,creditedWrDays:r.durationDays,sourceVerified:!!evidence,basis,...evidence});
  if(collection!=='records'&&r.proofImageVerified&&!same&&Date.parse(r.documentedAt)>=a&&Date.parse(r.documentedAt)<b){const prior=c.records.filter(p=>p.documentedAt&&p.documentedAt<=r.documentedAt);if(prior.length&&r.timeCs<Math.min(...prior.map(p=>p.timeCs)))omissions.push(r.id);}
 }
 // Independently calculate this tour's credited intervals from source timestamps.
 // All earlier records are evaluated at opening; the first strictly faster
 // posting ends the interval. Ties coexist, and the 06 UTC close pauses credit.
 const standing=c.records.filter(r=>r.finalDate<'2020-04-23');
 const begin=r=>r.finalDate<'2020-04-08'?a:Math.max(a,Date.parse(r.documentedAt));
 for(const r of standing){const t=begin(r),finish=Math.min(b,...standing.filter(p=>p.timeCs<r.timeCs).map(begin));const expected=Math.max(0,finish-t)/86400000;
  near(intersection(r.durationIntervalsGuaranteed),expected,r.id+' guaranteed tour duration');near(intersection(r.durationIntervalsPossible),expected,r.id+' possible tour duration');
  if(expected>0)durationRows.push({courseId:c.id,id:r.id,time:r.time,playerId:r.playerId,start:new Date(t).toISOString(),end:new Date(finish).toISOString(),playableDays:expected});
 }
 const day=c.records.filter(r=>Date.parse(r.documentedAt)>=a&&Date.parse(r.documentedAt)<a+86400000);
 for(const r of c.records.filter(r=>r.finalDate>='2020-04-08'&&r.finalDate<'2020-04-10'))assert.equal(isReviewedOpeningDay(r,'2020-04-08'),day.includes(r),r.id+' opening boundary');
 const expected=day.filter(r=>r.timeCs===Math.min(...day.map(r=>r.timeCs))).map(r=>r.id);
 const actual=openingDayPublication([c],[]).courses[0].records.filter(r=>day.includes(r)).map(r=>r.id);
 assert.deepEqual(actual,expected,c.id+' final opening leaders');opening.push({courseId:c.id,openingLeaderIds:actual});
}
assert.equal(dateRows.filter(r=>r.collection==='records').length,16);assert.equal(dateRows.filter(r=>r.collection==='submissions').length,267);assert.deepEqual(omissions,[]);
assert.ok(dateRows.filter(r=>r.collection==='records').every(r=>r.sourceVerified));assert.deepEqual(pending,[]);
const report={tourId,checkedAt:'2026-10-16',sourceRowsChecked:dateRows.length,canonicalDatesSourceVerified:16,sourceRowsVerified:dateRows.filter(r=>r.sourceVerified).length,missingDates:0,missingDurations:0,sourceFiles:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')})),datePolicy:'Use documented posting/publication or a preserved proof upload when the original message is unavailable; identify upload clocks separately. Exact race finish times are not asserted.',durationPolicy:'Independently checked tour-only credited playable intervals; strictly faster postings end reigns; ties coexist; 06 UTC rollover.',dateRows,durationRows,opening,pending,screenshotImprovementsMissingFromProgression:omissions,tourWindowDurationReviewComplete:true,preservedTourSourceDateReviewComplete:pending.length===0,historyComplete:false,limitations:['One slower sheet entry has only its preserved proof upload clock; its original message and image remain unrecovered.','Earlier previous-best race dates are not proven by later screenshots; source posting dates are retained and unproven reigns receive no credit.','This reviews currently preserved entries and tour durations, not exhaustive worldwide history.']};
fs.writeFileSync('public/data/yoshi2020-source-and-duration-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({rows:dateRows.length,verified:report.sourceRowsVerified,pending,omissions,courses:courses.length}));
