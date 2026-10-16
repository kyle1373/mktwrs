import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import Module from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {publicationArchive,routeData} from '../lib/data.mjs';
process.env.NODE_ENV='production';
const require=createRequire(import.meta.url),swc=require('next/dist/build/swc');await swc.loadBindings();
const source=fs.readFileSync(new URL('../app/archive.jsx',import.meta.url),'utf8');
const {code}=await swc.transform(source+'\nexport {CoursePage};',{filename:'archive.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});
const filename=new URL('../app/clean-course-render.cjs',import.meta.url).pathname,compiled=new Module(filename);compiled.filename=filename;compiled.paths=Module._nodeModulePaths(new URL('../app',import.meta.url).pathname);compiled._compile(code,filename);
const courses=publicationArchive().courses;
for(const c of courses)test(c.name+' renders definite dates, complete published history and compact proof links',()=>{
 const props=routeData(['course',c.id]),html=renderToStaticMarkup(React.createElement(compiled.exports.CoursePage,{data:props.data,players:props.players,tours:props.tours}));
 const $=load(html),text=$('body').text();assert.equal($('h1').text(),c.name);
 assert.doesNotMatch(text,/Submission, report and video times|run date unknown|date unresolved|chronology is established|Submitted:|Video published:|Image unavailable/i);
 assert.doesNotMatch(text,/\b\d+–\d+\b/);
 const tables=$('table.wr-table');assert.ok(tables.length>=2);
 for(const row of $('tr[data-record-id]').toArray())assert.match($(row).find('td').first().text(),/^\d{4}-\d{2}-\d{2}$/);
 const expectedRows=new Map([...props.data.records,...props.data.bestHolders,...props.data.hammerRecoveredProgression,props.data.fastestVideo].filter(Boolean).map(r=>[r.id,r]));
 for(const row of $('tr[data-record-id]').toArray()){
  const r=expectedRows.get($(row).attr('data-record-id'));assert.ok(r);
  const expected=r.durationDays>0&&r.durationDays<1?'<'+'1':String(Math.floor(r.durationDays));
  assert.equal($(row).find('td').eq(4).text(),expected,r.id+' duration');
 }
 const history=tables.last();const recovered=props.data.hammerRecoveredProgression;
 assert.equal(history.find('tr.tour-event').length,new Set(c.appearances.map(a=>a.tourId)).size*2);
 for(const row of $('tr[data-record-id]').toArray())assert.match($(row).find('td').eq(4).text(),/^(?:<1|\d+)$/);
 assert.equal(history.find('tr[data-record-id]').length,c.records.length+recovered.length);
 for(const r of [...c.records,...recovered]){const row=history.find('tr[data-record-id]').filter((i,e)=>$(e).attr('data-record-id')===r.id);assert.equal(row.length,1);assert.equal(row.find('td').first().text(),r.finalDate);assert.ok(row.text().includes(r.time));}
 assert.equal($('a[download]').attr('href'),'/data/courses/'+c.id+'.json');
 assert.ok(props.data.bestRecorded.timeCs<=Math.min(...c.records.map(r=>r.timeCs)));
});
test('known image-only WR keeps a separate slower surviving video without clock prose',()=>{
 const p=routeData(['course','gcn-yoshi-circuit-r']);assert.equal(p.data.bestRecorded.time,'1:31.31');assert.equal(p.data.fastestVideo.time,'1:31.74');assert.equal(p.data.bestRecorded.finalDate,'2021-10-09');
 const $=load(renderToStaticMarkup(React.createElement(compiled.exports.CoursePage,{data:p.data,players:p.players,tours:p.tours})));
 assert.deepEqual($('h2').map((i,e)=>$(e).text()).get(),['All-time best','Best video','Course Stats','History']);
});
