import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import Module from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {routeData} from '../lib/data.mjs';
const require=createRequire(import.meta.url);
const swc=require('next/dist/build/swc');
await swc.loadBindings();
const page=fs.readFileSync(new URL('../app/archive.jsx',import.meta.url),'utf8');
const selected=page.slice(page.indexOf('function EvidenceTimes('),page.indexOf('function Time('))+page.slice(page.indexOf('function Time('),page.indexOf('function BackupIcon('))+page.slice(page.indexOf('function HalloweenRecording('),page.indexOf('function CoursePage('));
const {code}=await swc.transform('const date=s=>s?s.slice(0,10):"—";function Player({id}){return <span>{id}</span>;}\n'+selected+'\nexports.HalloweenSupportingResults=HalloweenSupportingResults;exports.HalloweenRecording=HalloweenRecording;', {filename:'result-report-times.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const filename=new URL('../app/result-report-times-render.cjs',import.meta.url).pathname;
const compiled=new Module(filename);
compiled.paths=Module._nodeModulePaths(new URL('../app',import.meta.url).pathname);
compiled._compile(code,filename);
const render=r=>renderToStaticMarkup(React.createElement(compiled.exports.HalloweenSupportingResults,{results:r,players:[]}));
test('carried recording assessments expose pending continuity beside original video',()=>{
 for (const cid of ['3ds-toad-circuit','3ds-neo-bowser-city','gcn-dino-dino-jungle']) {
  const comparison=routeData(['course',cid]).data.halloween2019Recording;
  assert.equal(comparison.recording.recordingContinuityPending,true);
  const html=renderToStaticMarkup(React.createElement(compiled.exports.HalloweenRecording,{comparison,players:[]}));
  assert.match(html,/Selected recording from prior review:/);
  assert.match(html,/uninterrupted start-to-finish race coverage still needs verification/);
  assert.ok(html.includes(comparison.recording.video.replaceAll('&','&amp;')));
  assert.doesNotMatch(html,/Fastest full-race recording in the reviewed evidence:/);
 }
});

test('eight recovered NBC source posts expose clocks without claiming verified result contents',()=>{
 const rows=routeData(['course','3ds-neo-bowser-city']).data.halloweenSupportingResults;
 const recovered=rows.filter(r=>r.recoveredSourcePost);
 assert.equal(recovered.length,8);
 for(const r of recovered){
  assert.equal(r.recoveredSourcePost.resultContentsVerified,false);
  const html=render([r]);
  assert.match(html,/Original source posted:/);
  assert.match(html,/image contents and result total remain unverified/);
  assert.ok(html.includes(r.recoveredSourcePost.postedAt.replace('T',' ').replace('.000Z',' UTC')));
  assert.doesNotMatch(html,/Submitted:/);
 }
 const missing=rows.find(r=>r.id==='curated-halloween2019-original-nbc-row-8');
 assert.equal(missing.recoveredSourcePost,undefined);
});

test('supporting table renders actual preserved forum clocks without invented submission times',()=>{
 const rows=routeData(['course','3ds-toad-circuit']).data.halloweenSupportingResults;
 const row=rows.find(r=>r.id==='curated-forum-halloween2019-samh-reply-31-10575');
 assert.ok(row.forumSourceTimes.length);
 const html=render([row]);
 assert.match(html,/Forum report:/);
 assert.ok(html.includes(row.forumSourceTimes[0].forumPostedAtDisplayed));
 assert.match(html,/timezone unknown/);
 assert.doesNotMatch(html,/Submitted:/);
});
test('supporting video evidence retains separate original publication clock',()=>{
 const rows=routeData(['course','3ds-neo-bowser-city']).data.halloweenSupportingResults;
 const row=rows.find(r=>r.id==='curated-halloween2019-original-nbc-row-10');
 assert.equal(row.videoPublishedAt,'2019-10-24T09:55:59Z');
 assert.match(render([row]),/Video published: 2019-10-24 09:55:59 UTC/);
});

test('supporting partial clip keeps source clock and does not promise a full race proof',()=>{
 const rows=routeData(['course','3ds-toad-circuit']).data.halloweenSupportingResults;
 const row=rows.find(r=>r.id==='sheet-AH15');
 assert.equal(row.videoScope,'single-lap-clip');
 const html=render([row]);
 assert.match(html,/Partial recording; complete race unverified/);
 assert.match(html,/Partial video reference for 1:05.28/);
 assert.match(html,/Video published: 2019-10-25 14:17:25 UTC/);
 assert.doesNotMatch(html,/Watch video proof for 1:05.28/);
 assert.ok(html.includes(row.video));
});

test('supporting sheet links include reviewed clocks while superseded opening-day rows stay omitted',()=>{
 const rows=routeData(['course','3ds-toad-circuit']).data.halloweenSupportingResults;
 assert.ok(rows.some(r=>r.id==='sheet-AH14' && r.videoPublishedAt==='2019-10-24T21:03:12Z'));
 assert.ok(rows.some(r=>r.id==='sheet-AH36' && r.videoPublishedAt==='2019-10-25T08:02:25Z'));
 assert.ok(!rows.some(r=>r.id==='sheet-AH23'));
});

test('Yerson sheet date disagreement remains explicit beside original sheet day',()=>{
 const r=routeData(['course','3ds-toad-circuit']).data.halloweenSupportingResults.find(r=>r.id==='sheet-AH11');
 assert.equal(r.achievedAt,'2019-10-24');
 const html=render([r]);
 assert.match(html,/Sheet day differs from reviewed WR-history day:/);
 assert.match(html,/>2019-10-25<\/a>/);
 assert.match(html,/2019-10-24/);
 assert.match(html,/Exact race time remains unconfirmed/);
});


test('reviewed later-tour runner report exposes an undated previous best without creating WR history',()=>{
 const course=routeData(['course','3ds-toad-circuit']).data;
 const id='curated-nu11-halloween-2019-1187741228168810497-previous';
 const rows=course.halloweenSupportingResults.filter(r=>r.id===id);
 assert.equal(rows.length,1);
 const r=rows[0];
 assert.equal(r.time,'1:05.23');
 assert.ok(r.achievedAt == null && r.submittedAt == null);
 assert.ok(!course.records.some(r=>r.id===id));
 const html=render(rows);
 assert.match(html,/Runner result report:/);
 assert.match(html,/2019-10-24 15:01:52 UTC/);
 assert.ok(html.includes('1187383715053178880'));
 assert.doesNotMatch(html,/Submitted:/);
 const nbc=routeData(['course','3ds-neo-bowser-city']).data;
 assert.ok(!nbc.halloweenSupportingResults.some(r=>r.id==='curated-639542633336930354-verified'));
});


test('same reviewed original report is shown once across WR and supporting tables',()=>{
 const c=routeData(['course','3ds-toad-circuit']).data;
 const original='curated-nu11-halloween-2019-1189347136720310272-original-10446';
 assert.ok(!c.halloweenSupportingResults.some(r=>r.id===original));
 const wr=c.records.find(r=>r.id==='896332014423261204');
 assert.equal(wr.time,'1:04.46');
 assert.ok(wr.resultReportTimes.some(e=>e.url==='https://twitter.com/_Kaguya_Games/status/1189347136720310272' && e.reportedAt==='2019-10-30T01:03:49Z'));
 assert.ok(c.halloweenSupportingResults.some(r=>r.id==='curated-nu11-halloween-2019-1187741228168810497-previous'));
});


test('image report clocks distinguish existing image evidence from exact written result captions',()=>{
 const rows=routeData(['course','3ds-toad-circuit']).data.halloweenSupportingResults;
 const image=rows.find(r=>r.id==='curated-nu11-halloween-2019-1187748510839513091-result');
 const html=render([image]);
 assert.match(html,/Runner result image posted:/);
 assert.match(html,/2019-10-25 15:11:26 UTC/);
 assert.match(html,/caption does not state the exact total/);
 const written=rows.find(r=>r.id==='curated-nu11-halloween-2019-1187908955424489473-result');
 const writtenHtml=render([written]);
 assert.match(writtenHtml,/Runner result report:/);
 assert.doesNotMatch(writtenHtml,/caption does not state the exact total/);
});

test('Reddit video result disagreement is visible and does not replace the documented time',()=>{
 const c=routeData(['course','3ds-neo-bowser-city']).data;
 const r=c.halloweenSupportingResults.find(r=>r.id==='curated-halloween2019-original-nbc-row-12');
 assert.equal(r.time,'1:27.41');
 const html=render([r]);
 assert.match(html,/Unresolved video result: original post says 1:27.41/);
 assert.match(html,/automated reads of the linked video suggest 1:27.48/);
 assert.match(html,/still needs visual verification/);
 assert.match(html,/documented time is retained/);
 assert.ok(!c.records.some(r=>r.time==='1:27.48'));
});

test('unresolved Meester NBC totals are visible without silently correcting documentary result',()=>{
 const c=routeData(['course','3ds-neo-bowser-city']).data;
 const r=c.halloweenSupportingResults.find(r=>r.id==='curated-halloween2019-original-nbc-row-18');
 assert.equal(r.time,'1:30.26');assert.ok(r.submittedAt==null);
 const html=render([r]);
 assert.match(html,/Unresolved source disagreement: sheet 1:30.26/);
 assert.match(html,/previously read as 1:30.23/);
 assert.match(html,/says 1:08.23 on NBC; that value is not accepted as a result/);
 assert.ok(html.includes('637527483398357003'));
 assert.ok(html.includes('1571823398/40#40'));
 assert.ok(!c.records.some(r=>r.time==='1:08.23'));
});
