import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));const report=read('artifacts/london2019-original-source-clock-and-duration-reconciliation-20261019.json');
const courses=read('public/data/courses.json');
test('London original post IDs independently establish all 53 selected posting clocks',()=>{
 assert.equal(report.reviewedSourceRows.length,53);assert.equal(report.reviewedSourceRows.filter(r=>r.collection==='records').length,4);
 for(const source of report.reviewedSourceRows){const c=courses.find(c=>c.id===source.courseId),r=c[source.collection].find(r=>r.id===source.id);const decoded=new Date(Number((BigInt(source.originalPostId)>>22n)+1288834974657n)).toISOString();assert.equal(r.documentedAt,decoded);assert.equal(r.finalDate,decoded.slice(0,10));assert.equal(r.finalDate,source.previousDocumentedAt.slice(0,10));assert.ok([r.source,...r.additionalSources||[]].some(s=>s.url===source.sourceURL));}
});
test('Every affected London duration independently sums only the documented playable intervals',()=>{
 assert.equal(report.affectedDurations.length,9);
 for(const source of report.affectedDurations){const c=courses.find(c=>c.id===source.courseId),r=c[source.collection].find(r=>r.id===source.id);for(const [field,intervals] of [['minDays',r.durationIntervalsGuaranteed],['maxDays',r.durationIntervalsPossible]]){const sum=intervals.reduce((total,x)=>total+(Date.parse(x.end)-Date.parse(x.start))/86400000,0);assert.ok(Math.abs(sum-r.durationBounds[field])<1e-10);for(const x of intervals)assert.ok(c.appearances.some(a=>a.startDate+'T06:00:00.000Z'<=x.start&&x.end<=a.endDate+'T06:00:00.000Z'));}assert.equal(r.durationDays,r.durationBounds.minDays);}
});
test('All 77 known London source rows retain a single supported date and numeric duration',()=>{
 assert.equal(report.knownLondonPostingRows.length,77);
 for(const source of report.knownLondonPostingRows){const c=courses.find(c=>c.id===source.courseId),r=c[source.collection].find(r=>r.id===source.id);assert.match(r.finalDate,/^\d{4}-\d{2}-\d{2}$/);assert.ok(Number.isFinite(r.durationDays));}
 assert.equal(report.undatedUnassignedWorksheetRows.length,95);assert.ok(report.undatedUnassignedWorksheetRows.every(r=>r.hasKnownLondonPost===false));
});
test('All six accepted London WR clocks match independently decoded original post IDs',()=>{assert.equal(report.reviewedCanonicalWRs.length,6);for(const source of report.reviewedCanonicalWRs){const r=courses.find(c=>c.id===source.courseId).records.find(r=>r.id===source.id);assert.equal(r.documentedAt,new Date(Number((BigInt(source.originalPostId)>>22n)+1288834974657n)).toISOString());}});
