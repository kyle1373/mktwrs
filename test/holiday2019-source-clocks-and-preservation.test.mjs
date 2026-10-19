import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));const report=read('artifacts/holiday2019-original-source-clock-and-duration-reconciliation-20261019.json');
const courses=read('public/data/courses.json');
test('Holiday original post IDs independently establish all 29 selected posting clocks',()=>{
 assert.equal(report.reviewedSourceRows.length,29);assert.equal(report.reviewedSourceRows.filter(r=>r.collection==='records').length,2);
 for(const source of report.reviewedSourceRows){const c=courses.find(c=>c.id===source.courseId),r=c[source.collection].find(r=>r.id===source.id);const decoded=new Date(Number((BigInt(source.originalPostId)>>22n)+1288834974657n)).toISOString();assert.equal(r.documentedAt,decoded);assert.equal(r.finalDate,decoded.slice(0,10));assert.equal(r.finalDate,source.previousDocumentedAt.slice(0,10));assert.ok([r.source,...r.additionalSources||[]].some(s=>s.url===source.sourceURL));}
});
test('Every affected Holiday duration independently sums only the documented playable intervals',()=>{
 assert.equal(report.affectedDurations.length,4);
 for(const source of report.affectedDurations){const c=courses.find(c=>c.id===source.courseId),r=c[source.collection].find(r=>r.id===source.id);for(const [field,intervals] of [['minDays',r.durationIntervalsGuaranteed],['maxDays',r.durationIntervalsPossible]]){const sum=intervals.reduce((total,x)=>total+(Date.parse(x.end)-Date.parse(x.start))/86400000,0);assert.ok(Math.abs(sum-r.durationBounds[field])<1e-10);for(const x of intervals)assert.ok(c.appearances.some(a=>a.startDate+'T06:00:00.000Z'<=x.start&&x.end<=a.endDate+'T06:00:00.000Z'));}assert.equal(r.durationDays,r.durationBounds.minDays);}
});
test('All 41 known Holiday source rows retain a single supported date and numeric duration',()=>{
 assert.equal(report.knownHolidayPostingRows.length,41);
 for(const source of report.knownHolidayPostingRows){const c=courses.find(c=>c.id===source.courseId),r=c[source.collection].find(r=>r.id===source.id);assert.match(r.finalDate,/^\d{4}-\d{2}-\d{2}$/);assert.ok(Number.isFinite(r.durationDays));}
 assert.equal(report.undatedUnassignedWorksheetRows.length,53);assert.ok(report.undatedUnassignedWorksheetRows.every(r=>r.hasKnownHolidayPost===false));
});
test('Both accepted Holiday WR clocks match independently decoded original post IDs',()=>{assert.equal(report.reviewedCanonicalWRs.length,2);for(const source of report.reviewedCanonicalWRs){const r=courses.find(c=>c.id===source.courseId).records.find(r=>r.id===source.id);assert.equal(r.documentedAt,new Date(Number((BigInt(source.originalPostId)>>22n)+1288834974657n)).toISOString());}});
test('Preserved DK Pass route clip remains separate from a certified completed race',()=>{const c=courses.find(c=>c.id==='ds-dk-pass');const ref=c.coverage.sourceRecordingReferences.find(r=>r.id==='holiday2019-dkpass-route-46Xc33T3In4');assert.equal(ref.raceTotal,null);assert.equal(ref.fullRaceVerified,false);assert.equal(ref.backup.videoScope,'partial-route-clip');assert.equal(c.records.find(r=>r.id==='896332334268297217').video,null);const mapping=read('archive/video-backups.json')['youtube:46Xc33T3In4'];assert.equal(mapping.url,ref.backup.url);assert.equal(mapping.fullRaceVerified,false);});
