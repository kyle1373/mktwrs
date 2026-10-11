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
test('undated Halloween WR visibly distinguishes screenshot publication from achievement',()=>{
 const r=routeData(['course','gcn-dino-dino-jungle']).data.records.find(r=>r.id==='896332063081390090');
 assert.equal(r.achievedAt,null);assert.equal(r.dateUnresolved,true);
 assert.match(render(r),/>Screenshot published: 2019-11-04; achievement date unknown</);
});
test('unknown achievements stay unknown while documented race dates stay plain',()=>{
 assert.match(render({dateUnresolved:true,achievedAt:null,recordDate:null}),/>Achievement date unknown</);
 assert.match(render({dateBasis:'source-date',achievedAt:'2019-10-29',recordDate:'2019-10-29'}),/>2019-10-29</);
 assert.match(render({dateBasis:'proof-upload-date',recordDate:'2019-10-25'}),/>Proof uploaded: 2019-10-25; achievement date unknown</);
});
