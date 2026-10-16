import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { videoKey, videoUrl } from '../lib/video.mjs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const tourId = 'tour-60', start = '2021-12-29T06:00:00.000Z', end = '2022-01-12T06:00:00.000Z';
const sourceFiles = [
  'archive/new-year-2022-submission-messages.json',
  'archive/newyear2022-exact-window-discussion-source-index-20261013.json',
  'archive/raw/new-year-2022-submission-repair-929657619357003796-930702880283983913.json',
];
const messages = [
  ...read(sourceFiles[0]).map(m => ({...m, file:sourceFiles[0]})),
  ...read(sourceFiles[1]).messages.map(m => ({...m, file:sourceFiles[1]})),
  ...read(sourceFiles[2]).data.messages.map(m => ({...m, file:sourceFiles[2]})),
];
const messageId = m => m.id.split('-').at(-1);
const clock = m => m.datetime || m.times?.[0];
const references = r => [r.source, ...(r.additionalSources || [])].filter(Boolean);
const referencesMessage = (r,m) => references(r).some(s => s.messageId === messageId(m) || s.url?.endsWith('/'+messageId(m)));
const platformClock = (id, epoch) => new Date(Number((BigInt(id)>>22n)+epoch)).toISOString();
const near = (a,b,label) => assert.ok(Math.abs(a-b)<1e-9,`${label}: ${a} != ${b}`);
const intersectionDays = (intervals,a,b) => intervals.reduce((sum,w) =>
  sum+Math.max(0, Math.min(Date.parse(w.end),b)-Math.max(Date.parse(w.start),a))/86400000,0);
const courses = read('public/data/courses.json').filter(c => c.appearances.some(a => a.tourId===tourId));
const rows = [], courseDurations = [], omissions = [];
for (const c of courses) {
  for (const collection of ['records','submissions','candidates']) for (const r of c[collection]) {
    if (!(r.finalDate>='2021-12-29' && r.finalDate<'2022-01-13')) continue;
    assert.equal(r.finalDate,r.documentedAt?.slice(0,10),r.id+' dated posting');
    assert.ok(Number.isFinite(r.durationDays) && r.durationDays>=0,r.id+' duration');
    let source = messages.find(m => clock(m)===r.documentedAt && referencesMessage(r,m));
    let basis = source ? 'preserved-original-post' : null;
    let peerId;
    if (!source && videoKey(videoUrl(r))) {
      const peer = [...c.records,...c.submissions].find(p => p.id!==r.id && p.playerId===r.playerId &&
        p.timeCs===r.timeCs && videoKey(videoUrl(p))===videoKey(videoUrl(r)) && p.documentedAt===r.documentedAt &&
        messages.some(m => clock(m)===p.documentedAt && referencesMessage(p,m)));
      if (peer) {
        source=messages.find(m => clock(m)===peer.documentedAt && referencesMessage(peer,m));
        basis='identical-player-total-and-footage-original-post';peerId=peer.id;
      }
    }
    let evidence;
    if (source) {
      assert.equal(platformClock(messageId(source),1420070400000n),r.documentedAt,r.id+' snowflake');
      const channel = source.id.startsWith('chat-messages-') ? source.id.split('-').at(-2) :
        (references(r).find(s=>s.messageId===messageId(source))?.url?.split('/').at(-2) ||
         (source.file.includes('discussion') ? '636461740162416640' : '875784780573184010'));
      evidence={sourceUrl:`https://discord.com/channels/629221606064914442/${channel}/${messageId(source)}`,
        preservedFile:source.file,messageId:messageId(source),capturedText:source.text,...(peerId?{peerId}:{})};
    } else if (r.playerId==='dit' && r.timeCs===3420 && videoKey(videoUrl(r))==='youtube:4WTs_KPwdno') {
      const file='archive/newyear2022-selected-recording-clocks-and-scope-20261012.json';
      const proof=read(file).originalRecordingEvidence['new-year-2022-930129255533281320'];
      assert.equal(new Date(proof.videoPublishedAt).toISOString(),r.documentedAt);
      basis='preserved-original-video-publication';evidence={sourceUrl:proof.videoPublicationSource.url,preservedFile:file};
    } else if (r.id==='sheet-ACR27' && /1480353594260230152/.test(r.video)) {
      assert.equal(platformClock('1480353594260230152',1288834974657n),r.documentedAt);
      basis='original-twitter-publication-identifier';evidence={sourceUrl:r.video,
        limitation:'Original movie unavailable; this verifies posting time of the preserved reference, not newly recovered footage.'};
    }
    assert.ok(evidence,r.id+' source not independently matched');
    const same=c.records.find(p=>p.playerId===r.playerId && p.timeCs===r.timeCs);
    if (collection!=='records') {
      if (same) near(r.durationDays,same.durationDays,r.id+' canonical duration alias');
      else {assert.equal(r.durationDays,0);assert.equal(r.durationBounds.basis,'no-documented-wr-reign');}
    }
    rows.push({courseId:c.id,collection,id:r.id,playerId:r.playerId,time:r.time,
      date:r.finalDate,documentedAt:r.documentedAt,creditedWrDays:r.durationDays,basis,...evidence});
    if (collection!=='records' && r.proofImageVerified && !same) {
      const prior=c.records.filter(p=>p.documentedAt && p.documentedAt<=r.documentedAt);
      if (prior.length && r.timeCs<=Math.min(...prior.map(p=>p.timeCs))) omissions.push(r.id);
    }
  }
  // Independent tour-only duration calculation: a timestamped result starts its
  // credited reign; the first strictly faster documented result ends it. Ties
  // coexist. Earlier results are evaluated at the tour's start, and tour close
  // pauses credit. This does not call the production duration calculator.
  const a=Date.parse(start),b=Date.parse(end),reigns=[];
  const standing=c.records.filter(r => r.finalDate<'2022-01-13');
  const begins=r => r.finalDate<'2021-12-29' ? a : Math.max(a,Date.parse(r.documentedAt));
  for (const r of standing) {
    const t=begins(r), faster=standing.filter(p=>p.timeCs<r.timeCs);
    const finish=Math.min(b,...faster.map(begins));
    const expected=Math.max(0,finish-t)/86400000;
    const guaranteed=intersectionDays(r.durationIntervalsGuaranteed,a,b);
    const possible=intersectionDays(r.durationIntervalsPossible,a,b);
    near(guaranteed,expected,r.id+' guaranteed tour duration');
    near(possible,expected,r.id+' possible tour duration');
    if (expected>0) reigns.push({id:r.id,time:r.time,playerId:r.playerId,
      start:new Date(t).toISOString(),end:new Date(finish).toISOString(),playableDays:expected});
  }
  courseDurations.push({courseId:c.id,start,end,reigns});
}
assert.equal(rows.filter(r=>r.collection==='records').length,24);
assert.equal(rows.filter(r=>r.collection==='submissions').length,102);
assert.deepEqual(omissions,[]);
const report={tourId,checkedAt:'2026-10-16',sourceRowsChecked:rows.length,recordDatesChecked:24,
  submissionDatesChecked:102,dateValuesChanged:0,missingDates:0,missingDurations:0,
  screenshotImprovementsMissingFromProgression:omissions,
  sourceFiles:sourceFiles.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')})),
  datePolicy:'Documented posting/publication, not an asserted exact race completion time.',
  durationPolicy:'Credited playable time; ties coexist; strictly faster results end reigns; tour reset is 06 UTC.',
  rows,courseDurations,preservedTourSourceDateReviewComplete:true,tourWindowDurationReviewComplete:true,tourHistoryComplete:false,
  limitations:['Original race dates of previous-best results are not established by their later screenshots.',
    'This checks currently preserved entries and tour-only durations; it does not prove exhaustive worldwide history.',
    'Original image/movie interpretations are retained from the cited prior source reviews; not every frame was freshly reviewed.']};
fs.writeFileSync('public/data/newyear2022-source-and-duration-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sourceRowsChecked:rows.length,missingDates:0,missingDurations:0,omissions,courseCount:courses.length}));
