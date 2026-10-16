import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import Module from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const swc=require('next/dist/build/swc');
await swc.loadBindings();
const page=fs.readFileSync(new URL('../app/archive.jsx',import.meta.url),'utf8');
const selected=page.slice(page.indexOf('function EvidenceTimes('),page.indexOf('function BackupIcon('));
const {code}=await swc.transform(selected+'\nexports.Time=Time;', {filename:'evidence-times.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const compiled=new Module(new URL('../app/evidence-times-render.cjs',import.meta.url).pathname);
compiled.paths=Module._nodeModulePaths(new URL('../app',import.meta.url).pathname);
compiled._compile(code,new URL('../app/evidence-times-render.cjs',import.meta.url).pathname);
const render=r=>renderToStaticMarkup(React.createElement(compiled.exports.Time,{record:r}));
test('time cell keeps original link without submission or publication prose',()=>{
 const html=render({time:'1:04.54',originalVideo:'https://youtu.be/5mQGD5k9V5k',originalVideoAvailable:false,submittedAt:'2019-10-27T18:47:11Z',videoPublishedAt:'2019-10-27T18:56:43Z'});
 assert.match(html,/href="https:\/\/youtu.be\/5mQGD5k9V5k"/);
 assert.equal(html.replace(/<[^>]*>/g,''),'1:04.54');
 assert.doesNotMatch(html,/Submitted:|Video published:|Submission, report/);
});
test('time without a video renders only the total',()=>{
 const html=render({time:'1:35.38',submittedAt:'2019-10-30T14:31:27Z',recordDate:'2019-10-29'});
 assert.equal(html.replace(/<[^>]*>/g,''),'1:35.38');
 assert.doesNotMatch(html,/2019-10-29|2019-10-30/);
});
test('unverified reference retains source and accessible qualification without extra visible text',()=>{
 const html=render({time:'1:05.33',videoReference:'https://twitter.com/40pairs/status/1187010514271911937'});
 assert.match(html,/href="https:\/\/twitter.com\/40pairs\/status\/1187010514271911937"/);
 assert.match(html,/reference unverified/);assert.equal(html.replace(/<[^>]*>/g,''),'1:05.33');
});
test('unavailable original uses preserved playable backup for the time link',()=>{
 const html=render({time:'1:04.54',video:'https://youtu.be/5mQGD5k9V5k',videoAvailability:'unavailable',videoBackup:{status:'available',url:'https://media.mktwrs.com/assets/video/proof.mp4'}});
 assert.match(html,/href="https:\/\/media.mktwrs.com\/assets\/video\/proof.mp4"/);
 assert.equal(html.replace(/<[^>]*>/g,''),'1:04.54');
});
