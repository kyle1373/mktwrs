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
const selected=page.slice(page.indexOf('function EvidenceTimes('),page.indexOf('function SplitSourceNote('));
const {code}=await swc.transform(selected+'\nexports.EvidenceTimes=EvidenceTimes;', {filename:'forum-times.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const filename=new URL('../app/forum-times-render.cjs',import.meta.url).pathname;
const compiled=new Module(filename);
compiled.paths=Module._nodeModulePaths(new URL('../app',import.meta.url).pathname);
compiled._compile(code,filename);
const render=r=>renderToStaticMarkup(React.createElement(compiled.exports.EvidenceTimes,{r}));
test('actual NBC record preserves original forum clocks through client projection',()=>{
 const r=routeData(['course','3ds-neo-bowser-city']).data.records.find(r=>r.id==='curated-637479815665942539-3ds-neo-bowser-city');
 assert.equal(r.forumSourceTimes.length,1);
 const html=render(r);
 assert.match(html,/10\/25\/19 at 03:48:15/);
 assert.match(html,/timezone unknown/);
 assert.match(html,/1571823398\/30#30/);
 assert.doesNotMatch(html,/Submitted:/);
});
test('forum-only evidence and displayed edit clocks appear without fabricated UTC submission',()=>{
 const html=render({forumSourceTimes:[{url:'https://example.com/forum/31',forumPostedAtDisplayed:'10/25/19 at 07:07:00',forumLastEditDisplayed:'10/25/19 at 08:00:00',forumTimezoneKnown:false}]});
 assert.match(html,/Forum report:/);assert.match(html,/Last forum edit:/);
 assert.doesNotMatch(html,/UTC|Submitted:/);
 assert.match(html,/Historical edit contents remain unconfirmed/);
});
test('absent clocks render no panel',()=>assert.equal(render({}),''));

test('retained Toad report clocks reach the rendered page independently from submission',()=>{
 const r=routeData(['course','3ds-toad-circuit']).data.records.find(r=>r.id==='curated-original-2019-wr-row-21');
 assert.equal(r.sourceReportTimes.length,3);
 const html=render(r);
 assert.match(html,/Discord report:/);
 assert.match(html,/2019-10-27 03:39:16 UTC/);
 assert.match(html,/637857824130465801/);
 assert.match(html,/Source posting date used as the submission date unless other evidence establishes a different date/);
 assert.doesNotMatch(html,/Submitted:/);
});
test('report-only evidence renders without inventing submission or video clocks',()=>{
 const html=render({sourceReportTimes:[{url:'https://discord.com/channels/1/2/3',postedAt:'2019-10-27T08:02:16.906Z'}]});
 assert.match(html,/2019-10-27 08:02:16 UTC/);
 assert.doesNotMatch(html,/Submitted:|Video published:|Video shared:/);
});


test('Nu11 original result UTC date and calibrated forum report survive actual route projection',()=>{
 const r=routeData(['course','3ds-toad-circuit']).data.records.find(r=>r.id==='896332014423261204');
 assert.equal(r.finalDate,'2019-10-30');
 assert.equal(r.documentedAt,'2019-10-30T01:03:49.000Z');
 const html=render(r);
 assert.match(html,/2019-10-30 03:38:13 UTC/);
 assert.match(html,/Original forum display: 10\/29\/19 at 19:38:13 \(UTC-08:00\)/);
 assert.doesNotMatch(html,/timezone unknown/);
 assert.match(html,/2019-10-30 01:03:49 UTC/);
});
test('Nova date follows original forum posting while the later edit remains separate',()=>{
 const r=routeData(['course','3ds-toad-circuit']).data.records.find(r=>r.id==='curated-original-2019-wr-row-18');
 assert.equal(r.finalDate,'2019-10-24');
 assert.equal(r.documentedAt,'2019-10-24T21:24:39.000Z');
 assert.equal(r.durationDays,0.4030902777777778);
 assert.equal(r.durationBounds.minDays,r.durationBounds.maxDays);
 const html=render(r);
 assert.match(html,/2019-10-24 21:24:39 UTC/);
 assert.match(html,/Last forum edit: 2019-10-25 00:03:39 UTC/);
 assert.match(html,/Original forum report posting clock used as the submission date/);
 assert.match(html,/Historical edit contents remain unconfirmed/);
 assert.doesNotMatch(html,/Submitted:/);
});

test('Dark original image-post clocks render separately from its earlier capture minute',()=>{
 const r=routeData(['course','gcn-dino-dino-jungle']).data.records.find(r=>r.id==='curated-639823450353041419-verified');
 assert.equal(r.screenshotSourceTimes.length,2);
 const html=render(r);
 assert.match(html,/Result image posted:/);
 assert.match(html,/2019-10-31 20:01:22 UTC/);
 assert.match(html,/2019-11-01 13:49:57 UTC/);
 assert.match(html,/639554529364410391/);
 assert.match(html,/639823450353041419/);
 assert.doesNotMatch(html,/Submitted:|Runner result/);
});

test('original worksheet uploads supply UTC dates without fabricating runner submission times',()=>{
 for (const [course,id,date,at] of [
  ['3ds-neo-bowser-city','curated-637479815665942539-3ds-neo-bowser-city','2019-10-24','2019-10-24T18:29:45.738Z'],
  ['gcn-dino-dino-jungle','curated-637479815665942539-gcn-dino-dino-jungle','2019-10-26','2019-10-26T02:18:57.255Z'],
 ]) {
  const r=routeData(['course',course]).data.records.find(r=>r.id===id);
  assert.equal(r.finalDate,date);assert.equal(r.documentedAt,at);
  assert.equal(r.durationPrecision,'timestamp');
  assert.equal(r.durationBounds.minDays,r.durationBounds.maxDays);
  assert.equal(r.originalWorksheetProofUpload.uploadedAt,at);
  const html=render(r);
  assert.match(html,/Original worksheet proof uploaded:/);
  assert.match(html,/Date follows this original proof upload/);
  assert.match(html,/two-original-worksheet-proof-upload-clocks-reconciliation/);
  assert.doesNotMatch(html,/Submitted:/);
 }
});
test('Unreal original image clock stays distinct from its source upload clock',()=>{
 const r=routeData(['course','3ds-neo-bowser-city']).data.records.find(r=>r.id==='curated-637479815665942539-3ds-neo-bowser-city');
 const html=render(r);
 assert.match(html,/2019-10-24 18:29:45 UTC/);
 assert.match(html,/Result image clock: 2019-10-24 18:23 \(time zone unconfirmed\)/);
});
test('proof-upload-only evidence renders independently of submission and report clocks',()=>{
 const html=render({originalWorksheetProofUpload:{uploadedAt:'2019-10-26T02:18:57.255Z',reviewURL:'https://media.mktwrs.com/review.json'}});
 assert.match(html,/2019-10-26 02:18:57 UTC/);
 assert.doesNotMatch(html,/Submitted:|Result image posted:|Forum report:/);
});
