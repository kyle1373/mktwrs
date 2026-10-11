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
const selected=page.slice(page.indexOf('function SplitSourceNote('),page.indexOf('function Time('));
const {code}=await swc.transform(selected+'\nexports.SplitSourceNote=SplitSourceNote;', {filename:'split-source-note.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const filename=new URL('../app/split-source-note-render.cjs',import.meta.url).pathname;
const compiled=new Module(filename);
compiled.paths=Module._nodeModulePaths(new URL('../app',import.meta.url).pathname);
compiled._compile(code,filename);
const render=r=>renderToStaticMarkup(React.createElement(compiled.exports.SplitSourceNote,{r}));
test('actual Halloween opening WR exposes conflicting sheet and player splits through page projection',()=>{
 const r=routeData(['course','3ds-toad-circuit']).data.records.find(r=>r.id==='curated-original-2019-wr-row-4');
 assert.deepEqual(r.laps,['33.24','35.55']);
 const html=render(r);
 assert.match(html,/Split sources differ/);
 assert.match(html,/WR-history sheet 33.24; player report 34.24/);
 assert.match(html,/1571823398\/22#22/);
});
test('existing video-overlay disagreement is shown without recertifying footage',()=>{
 const r=routeData(['course','3ds-toad-circuit']).data.records.find(r=>r.id==='curated-original-2019-wr-row-14');
 assert.match(render(r),/WR-history sheet 32.59; prior video review 32.69/);
});
test('records without a disagreement do not show a notice',()=>{
 assert.equal(render({laps:['32.00','32.00']}),'');
});
