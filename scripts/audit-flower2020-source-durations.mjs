import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {openingDayPublication,isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const courseId='3ds-shy-guy-bazaar-r',tourId='tour-17',start='2020-05-06T06:00:00.000Z',end='2020-05-20T06:00:00.000Z';
const files=['archive/flower-2020-discussion-census.json','archive/flower-2020-opening-boundary-census.json',
 'archive/flower2020-selected-recording-fresh-visual-and-access-review-20261013.json',
 'artifacts/flower2020-sheet-and-earlier-report-date-review-20261016.json',
 'artifacts/flower2020-preserved-original-video-publication-metadata-20261016.json',
 'artifacts/flower2020-fourteen-worksheet-original-proof-date-review-20261016.json',
 'archive/flower-2020-server-images-census.json',
 'artifacts/flower2020-tomegome-original-tweet-date-review-20261016.json',
 'archive/flower-2020-server-links-census.json',
 'artifacts/flower2020-ryu-whiplash-alias-and-two-source-dates-20261016.json',
 'artifacts/flower2020-hilton-account-filter-and-original-result-date-review-20261016.json',
 'artifacts/flower2020-retort-curry-original-result-and-worksheet-discrepancy-20261016.json'];
const messages=[...read(files[0]),...read(files[1]),...read(files[6]),...read(files[8])],c=read('public/data/courses/'+courseId+'.json');
const clock=id=>new Date(Number((BigInt(id)>>22n)+1420070400000n)).toISOString();
const refs=r=>[r.source,...r.additionalSources||[]].filter(Boolean);
const reference=(r,m)=>refs(r).some(s=>s.messageId===m.id.split('-').at(-1)||s.url?.endsWith('/'+m.id.split('-').at(-1)));
const rows=[],pending=[],omissions=[];const changes=read(files[3]),sheetProofReview=read(files[5]),tomeReview=read(files[7]),ryuReview=read(files[9]),hiltonReview=read(files[10]);
for(const collection of ['records','submissions','candidates'])for(const r of c[collection]||[]){
 if(r.finalDate&&r.finalDate>'2020-05-20')continue;
 assert.ok(Number.isFinite(r.durationDays)&&r.durationDays>=0,r.id+' duration');
 let evidence=null;
 const override=[...changes.overrides,...sheetProofReview.overrides,...tomeReview.overrides,...ryuReview.overrides,...hiltonReview.overrides].find(e=>e.id===r.id&&e.collection===collection);
 if(override?.reviewArtifact===files[10]){
  const h=hiltonReview,m=messages.find(m=>m.id.endsWith(h.accountFilter.targetMessageId));
  const profile=read('public/data/players.json').find(p=>p.id==='hilton');
  assert.equal(profile.discordId,h.accountFilter.discordId);assert.equal(h.knownProfile.discordId,profile.discordId);
  assert.ok(h.accountFilter.query.includes('from:'+profile.discordId));assert.ok(h.accountFilter.freshBrowserReview);
  assert.ok(m.text.startsWith(h.accountFilter.observedAuthor+'\n'));assert.ok(m.links.some(l=>l.href.includes('/'+h.accountFilter.targetAttachmentId+'/')));
  assert.equal(r.playerId,'hilton');assert.equal(r.time,h.visualReview.finishTime);assert.equal(h.visualReview.finishField,'CLEARED');assert.equal(h.visualReview.lapCounter,'2/2');
  assert.equal(r.documentedAt,clock(h.accountFilter.targetMessageId));assert.equal(r.documentedDateSourceUrl,override.sourceUrl);
  const bytes=fs.readFileSync(h.originalFile);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),h.sha256);assert.equal(crypto.createHash('md5').update(bytes).digest('hex'),h.r2Etag);
  assert.ok(h.visualReview.freshVisualReview&&h.r2EtagMatchesSourceMd5);assert.equal(h.publicHead.status,200);assert.equal(h.publicHead.bytes,bytes.length);assert.equal(r.durationDays,0);
  evidence={basis:override.basis,sourceUrl:override.sourceUrl,messageId:h.accountFilter.targetMessageId,capturedText:m.text,runnerDiscordId:profile.discordId,evidenceImageUrl:h.r2Url};
 }else if(override?.reviewArtifact===files[9]){
  const cross=ryuReview.rows.find(x=>x.sheetId===r.id),m=messages.find(m=>m.id.endsWith(cross.messageId));
  assert.equal(r.playerId,'ryu');assert.equal(cross.time,r.time);assert.equal(cross.visualValue,r.time);assert.equal(cross.visualField,'New Record');
  assert.equal(clock(cross.messageId),r.documentedAt);assert.equal(r.documentedDateSourceUrl,cross.sourceUrl);assert.ok(m.text.startsWith('Whiplash\n'));
  const named=messages.find(m=>m.id.endsWith('710273287510556755')),response=messages.find(m=>m.id.endsWith('710273630109433958'));
  assert.match(named.text,/And gl bouffon \(ryu\)/);assert.ok(response.text.startsWith('Whiplash\n'));assert.match(response.text,/Super/);
  const ownName=ryuReview.rows.find(x=>x.sheetId==='name-context');assert.equal(ownName.visualValue,'PNX★Ryukano.');assert.ok(ownName.sourceMessage.text.startsWith('Whiplash\n'));
  for(const proof of [cross,ownName]){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(proof.originalFile)).digest('hex'),proof.sha256);assert.ok(proof.freshVisualReview&&proof.r2EtagMatchesSourceMd5);}
  assert.equal(r.durationDays,0);
  evidence={basis:override.basis,sourceUrl:cross.sourceUrl,messageId:cross.messageId,capturedText:m.text,runnerAliasContextSourceUrl:'https://discord.com/channels/629221606064914442/636461740162416640/710273287510556755',evidenceImageUrl:cross.r2Url,evidenceAdditionalImageUrls:[ownName.r2Url]};
 }else if(override?.reviewArtifact===files[7]){
  const meta=read(tomeReview.sourceMetadataFile).tweet;
  assert.equal(meta.id,tomeReview.originalTweetId);assert.equal(meta.author.screen_name,'tomegome_g');
  assert.equal(meta.text,r.laps.join('/'));assert.equal(r.time,'1:39.28');assert.equal(r.playerId,'tomegome');
  const originalClock=new Date(Number((BigInt(meta.id)>>22n)+1288834974657n)).toISOString();
  assert.equal(originalClock,r.documentedAt);assert.equal(Math.floor(Date.parse(originalClock)/1000),meta.created_timestamp);
  assert.equal(r.documentedDateSourceUrl,tomeReview.originalTweetUrl);
  const share=messages.find(m=>m.id.endsWith('710258629382766625'));assert.ok(share.links.some(l=>l.href===r.documentedDateSourceUrl));
  assert.ok(r.laps.every(l=>share.text.includes(l)));assert.equal(clock('710258629382766625'),tomeReview.laterSharedAt);
  for(const p of tomeReview.photos){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p.originalFile)).digest('hex'),p.sha256);assert.ok(p.r2EtagMatchesSourceMd5&&p.freshVisualReview);}
  assert.equal(tomeReview.photos[0].finishTime,r.time);assert.equal(tomeReview.photos[0].previousBest,'1:39.43');
  assert.equal(r.durationDays,0);
  evidence={basis:override.basis,sourceUrl:r.documentedDateSourceUrl,originalTweetId:meta.id,capturedText:meta.text,laterSharedAt:tomeReview.laterSharedAt,evidenceImageUrl:tomeReview.photos[0].r2Url,evidenceAdditionalImageUrls:[tomeReview.photos[1].r2Url]};
 }else if(override){
  assert.equal(r.documentedAt,override.timestamp);assert.equal(r.documentedDateSourceUrl,override.sourceUrl);
  const m=messages.find(m=>override.sourceUrl.endsWith('/'+m.id.split('-').at(-1)));
  assert.ok(m);assert.equal(clock(m.id.split('-').at(-1)),r.documentedAt);
  if(override.reviewArtifact===files[5]){
   const cross=sheetProofReview.rows.find(x=>x.sheetId===r.id);assert.ok(cross);
   assert.equal(cross.playerId,r.playerId);assert.equal(cross.time,r.time);assert.deepEqual(cross.laps,r.laps);
   assert.equal(cross.sourcePostedAt,r.documentedAt);assert.equal(cross.sourceUrl,r.documentedDateSourceUrl);
   assert.equal(cross.visualReview.finishTime,r.time);assert.equal(cross.visualReview.freshVisualReview,true);
   assert.equal(cross.visualReview.previousBestUsedAsFinish,false);assert.equal(cross.r2EtagMatchesSourceMd5,true);
   if(['heria','flare'].includes(r.playerId)){
    const profile=read('public/data/players.json').find(p=>p.id===r.playerId);assert.ok(profile.discordId);
    assert.ok(JSON.stringify(m).includes('/avatars/'+profile.discordId+'/'),r.id+' source author account');
   }
   if(cross.visualReview.sourceLapsMatchWorksheet)assert.ok(r.laps.every(lap=>m.text.includes(lap)));
  }else if(r.id.startsWith('sheet-')){
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
  evidence={basis:override.basis,sourceUrl:override.sourceUrl,messageId:m.id.split('-').at(-1),capturedText:m.text,...(override.reviewArtifact===files[5]?{evidenceImageUrl:sheetProofReview.rows.find(x=>x.sheetId===r.id).proofImageUrl}: {})};
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
 if(!evidence){assert.equal(r.finalDate,null);
  const candidate=r.id==='sheet-BF27'?read(files[11]):null;
  if(candidate){assert.equal(r.time,candidate.worksheetTime);assert.notEqual(r.time,candidate.originalCompletedResultTime);assert.equal(candidate.originalCompletedResultPostedAt,clock(candidate.originalResultMessageId));assert.equal(candidate.worksheetDateAssigned,false);}
  pending.push({id:r.id,playerId:r.playerId,time:r.time,source:r.source,reason:candidate?.reason||'Worksheet has no preserved date or proven dated source crosswalk.',...(candidate?{candidateSourceReview:files[11],differentRunTime:candidate.originalCompletedResultTime,differentRunPostedAt:candidate.originalCompletedResultPostedAt,candidateEvidenceImages:candidate.photos.map(p=>p.r2Url)}:{})});}
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
assert.equal(rows.length,62);assert.equal(rows.filter(r=>r.collection==='records').length,16);assert.equal(pending.length,6);
const report={tourId,checkedAt:'2026-10-16',sourceRowsChecked:rows.length,verifiedSourceDates:rows.filter(r=>r.sourceVerified).length,
 recordDatesReviewed:16,missingCanonicalDates:0,missingDurations:0,undatedSupportingRows:pending.length,
 sourceFiles:files.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')})),
 dateRows:rows,reigns,openingLeaderIds:actualOpening,pending,screenshotImprovementsMissingFromProgression:omissions,
 canonicalDateReviewComplete:true,tourWindowDurationReviewComplete:true,preservedTourSourceDateReviewComplete:false,historyComplete:false,
 limitations:['6 worksheet submissions remain undated; do not invent dates or certify all-source completion.','Original race clocks are not assumed from later sharing; reviewed earlier self-reports remain distinguished from video publication.','14 newly matched worksheet original result images, both Tomegome original tweet result images and the Ryu alias/result originals were freshly reviewed; prior video reviews are carried forward. Exhaustive worldwide history is not certified.']};
fs.writeFileSync('public/data/flower2020-source-and-duration-review.json',JSON.stringify(report,null,2)+'\n');
console.log({rows:rows.length,verified:report.verifiedSourceDates,undated:pending.length,canonicalDatesPass:true,durationsPass:true,openingLeaderIds:actualOpening});
