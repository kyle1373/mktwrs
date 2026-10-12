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
const selected=page.slice(page.indexOf('function EvidenceTimes('),page.indexOf('function Time('))+page.slice(page.indexOf('function Time('),page.indexOf('function BackupIcon('))+page.slice(page.indexOf('function HalloweenSupportingResults('),page.indexOf('function CoursePage('));
const {code}=await swc.transform('const date=s=>s?s.slice(0,10):"—";function Player({id}){return <span>{id}</span>;}\n'+selected+'\nexports.HalloweenSupportingResults=HalloweenSupportingResults;', {filename:'result-report-times.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const filename=new URL('../app/result-report-times-render.cjs',import.meta.url).pathname;
const compiled=new Module(filename);
compiled.paths=Module._nodeModulePaths(new URL('../app',import.meta.url).pathname);
compiled._compile(code,filename);
const render=r=>renderToStaticMarkup(React.createElement(compiled.exports.HalloweenSupportingResults,{results:r,players:[]}));
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
