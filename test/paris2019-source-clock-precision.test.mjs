import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {routeData} from '../lib/data.mjs';
const courses=JSON.parse(fs.readFileSync(new URL('../public/data/courses.json',import.meta.url))),review=JSON.parse(fs.readFileSync(new URL('../artifacts/paris2019-original-publication-clock-precision-and-duration-review-20261019.json',import.meta.url)));
test('all19 Paris WR source IDs independently supply their publication clocks',()=>{
 assert.equal(review.reviewedWRs.length,19);
 for(const source of review.reviewedWRs){const r=courses.find(c=>c.id===source.courseId).records.find(r=>r.id===source.id);const expected=new Date(Number((BigInt(source.originalPostId)>>22n)+1288834974657n)).toISOString();assert.equal(r.documentedAt,expected);assert.equal(r.finalDate,source.previousDocumentedAt.slice(0,10));assert.ok(Date.parse(expected)-Date.parse(source.previousDocumentedAt)>=0);assert.ok(Date.parse(expected)-Date.parse(source.previousDocumentedAt)<1000);}
});
test('all affected credited intervals sum independently to the published exact durations',()=>{
 for(const changed of review.affectedDurations){const c=courses.find(c=>c.id===changed.courseId),r=c[changed.collection].find(r=>r.id===changed.id);for(const [key,intervals] of [['minDays',r.durationIntervalsGuaranteed],['maxDays',r.durationIntervalsPossible]]){const total=intervals.reduce((sum,x)=>sum+(Date.parse(x.end)-Date.parse(x.start))/86400000,0);assert.ok(Math.abs(total-r.durationBounds[key])<1e-10,r.id+' '+key);}assert.equal(r.durationBounds.minDays,r.durationBounds.maxDays);}
});
test('current holders and alias submissions inherit corrected original source precision',()=>{
 for(const id of ['ds-luigi-s-mansion','snes-mario-circuit-1','3ds-shy-guy-bazaar']){const c=courses.find(c=>c.id===id);for(const holder of [c.current,...c.currentHolders].filter(Boolean)){const r=c.records.find(r=>r.id===holder.id);assert.equal(holder.documentedAt,r.documentedAt);assert.equal(holder.durationDays,r.durationDays);}const projected=routeData(['course',id]);assert.ok(projected.data.records.every(r=>r.finalDate&&Number.isFinite(r.durationDays)));}
});
test('zero-credit former result retains its own publication and no invented WR duration',()=>{
 const c=courses.find(c=>c.id==='ds-luigi-s-mansion'),r=c.records.find(r=>r.id==='curated-luigi-mansion-2019-1193922281489043456-previous-image-reviewed');assert.equal(r.documentedAt,'2019-11-11T16:03:48.567Z');assert.equal(r.durationDays,0);assert.equal(r.time,'1:23.49');
});
