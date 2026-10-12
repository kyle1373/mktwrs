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
const selected=page.slice(page.indexOf('function HalloweenSupportingResults('),page.indexOf('function CoursePage('));
const helpers=`const date=s=>s?s.slice(0,10):'—';function Player({id,players}){return players.find(p=>p.id===id)?.name||id;}function Time({record}){return record.time;}`;
const {code}=await swc.transform(helpers+selected+'\nexports.HalloweenSupportingResults=HalloweenSupportingResults;', {filename:'forum-results.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const filename=new URL('../app/forum-results-render.cjs',import.meta.url).pathname;
const compiled=new Module(filename);
compiled.paths=Module._nodeModulePaths(new URL('../app',import.meta.url).pathname);
compiled._compile(code,filename);
test('published supporting results retain identities and clocks after opening-day omissions',()=>{
 let total=0;
 for(const cid of ['3ds-toad-circuit','3ds-neo-bowser-city','gcn-dino-dino-jungle']){
  const page=routeData(['course',cid]);const results=page.data.halloweenSupportingResults;total+=results.length;
  for(const r of results){assert.ok(page.players.some(p=>p.id===r.playerId));assert.ok(r.source.url.startsWith('https://'));if(r.id.includes("forum-halloween2019")) assert.ok(r.forumSourceTimes.length);}
 }
 assert.ok(total > 0 && total < 45);
});
test('actual supporting results render as reports with unknown race days',()=>{
 const page=routeData(['course','3ds-toad-circuit']);
 const html=renderToStaticMarkup(React.createElement(compiled.exports.HalloweenSupportingResults,{results:page.data.halloweenSupportingResults,players:page.players}));
 assert.match(html,/Harambey/);assert.match(html,/SamH/);assert.match(html,/1:05.75/);
 assert.match(html,/Unknown; set during Halloween Tour/);assert.match(html,/Primary source/);
 assert.match(html,/outside WR progression/);
});
test('unrelated track with no forum results renders no section',()=>{
 assert.equal(renderToStaticMarkup(React.createElement(compiled.exports.HalloweenSupportingResults,{results:[],players:[]})),'');
});

test('opening-day supporting row is omitted but original video and social evidence remain archived',async()=>{
 const {archive}=await import('../lib/data.mjs');
 const page=routeData(['course','3ds-neo-bowser-city']);
 const id='curated-halloween2019-original-nbc-row-17';
 assert.ok(!page.data.halloweenSupportingResults.some(r=>r.id===id));
 const r=archive().courses.find(c=>c.id==='3ds-neo-bowser-city').submissions.find(r=>r.id===id);
 assert.equal(r.videoReference,'https://youtu.be/q12wOiA8qlQ?t=101');
 assert.ok(r.additionalSources.some(s=>s.url.includes('1187141321946996736')));
});
