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
const selected=page.slice(page.indexOf('function RecordDate('),page.indexOf('function Duration('));
const {code}=await swc.transform('const date=s=>s?s.slice(0,10):"—";\n'+selected+'\nexports.RecordDate=RecordDate;', {filename:'record-date.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const filename=new URL('../app/record-date-render.cjs',import.meta.url).pathname;
const compiled=new Module(filename);
compiled.paths=Module._nodeModulePaths(new URL('../app',import.meta.url).pathname);
compiled._compile(code,filename);
const render=r=>renderToStaticMarkup(React.createElement(compiled.exports.RecordDate,{r}));
test('final date is the sole visible date, including estimated historical attribution',()=>{
 const r=routeData(['course','gcn-yoshi-circuit-r']).data.records.find(r=>r.id==='896332585544863754');
 assert.equal(render(r),'2020-04-07');
 assert.equal(r.announcedAt,'2021-10-09T09:45:41.448Z');
 assert.deepEqual(r.tourDateRange,{start:'2020-03-25',end:'2020-04-07'});
});
test('source clock details do not add visible date ambiguity',()=>{
 assert.equal(render({finalDate:'2020-03-27',dateUnresolved:true,submittedAt:'2020-03-27T09:50:20.577Z'}),'2020-03-27');
 assert.equal(render({finalDate:'2019-10-29',achievedAt:'2019-10-29',submittedAt:'2019-10-30T12:00:00Z'}),'2019-10-29');
});
test('all recovered Yoshi Circuit R leaders have definite display dates',()=>{
 const c=routeData(['course','gcn-yoshi-circuit-r']).data;
 assert.deepEqual(c.hammerRecoveredProgression.map(r=>[r.time,r.finalDate]).sort(),[
  ['1:32.78','2020-03-27'],['1:32.28','2020-03-27'],['1:31.96','2020-03-28'],['1:31.74','2020-03-29']
 ].sort());
 for(const r of c.hammerRecoveredProgression)assert.equal(render(r),r.finalDate);
});
