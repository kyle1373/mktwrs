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
const {code}=await swc.transform('const date=s=>s?s.slice(0,10):"—";\n'+selected+'\nexports.EvidenceTimes=EvidenceTimes;', {filename:'result-report-times.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const filename=new URL('../app/result-report-times-render.cjs',import.meta.url).pathname;
const compiled=new Module(filename);
compiled.paths=Module._nodeModulePaths(new URL('../app',import.meta.url).pathname);
compiled._compile(code,filename);
const render=r=>renderToStaticMarkup(React.createElement(compiled.exports.EvidenceTimes,{r}));
test('recovered Nova report renders its source clock without inventing a submission time',()=>{
 const r=routeData(['course','3ds-toad-circuit']).data.records.find(r=>r.id==='curated-original-2019-wr-row-18');
 assert.equal(r.time,'1:04.99');
 assert.ok(r.submittedAt == null);
 assert.deepEqual(r.resultReportTimes,[{
  reportedAt:'2019-10-25T10:04:36.476Z',
  url:'https://discord.com/channels/629221606064914442/636461740162416640/637230022293323806',
  originalRunnerSubmission:false,
 }]);
 const html=render(r);
 assert.match(html,/Third-party result report:/);
 assert.match(html,/2019-10-25 10:04:36 UTC/);
 assert.match(html,/637230022293323806/);
 assert.match(html,/exact race completion time is unconfirmed/);
 assert.doesNotMatch(html,/Submitted:/);
});
test('report-only evidence stays visible and runner reports keep their own label',()=>{
 const report={reportedAt:'2019-10-25T10:04:36.476Z',url:'https://example.com/report',originalRunnerSubmission:true};
 assert.match(render({resultReportTimes:[report]}),/Runner result report:/);
 assert.doesNotMatch(render({resultReportTimes:[report]}),/Third-party/);
 assert.equal(render({}), '');
});
