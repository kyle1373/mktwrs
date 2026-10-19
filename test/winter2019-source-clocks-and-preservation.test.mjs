import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));const report=read('artifacts/winter2019-original-source-clock-and-duration-reconciliation-20261019.json');
const courses=read('public/data/courses.json');
test('Winter original post IDs independently establish all 55 selected posting clocks',()=>{
 assert.equal(report.reviewedSourceRows.length,55);assert.equal(report.reviewedSourceRows.filter(r=>r.collection==='records').length,6);
 for(const source of report.reviewedSourceRows){const c=courses.find(c=>c.id===source.courseId),r=c[source.collection].find(r=>r.id===source.id);const decoded=new Date(Number((BigInt(source.originalPostId)>>22n)+1288834974657n)).toISOString();assert.equal(r.documentedAt,decoded);assert.equal(r.finalDate,decoded.slice(0,10));assert.equal(r.finalDate,source.previousDocumentedAt.slice(0,10));assert.ok([r.source,...r.additionalSources||[]].some(s=>s.url===source.sourceURL));}
});
test('Every affected Winter duration independently sums only the documented playable intervals',()=>{
 assert.equal(report.affectedDurations.length,12);
 for(const source of report.affectedDurations){const c=courses.find(c=>c.id===source.courseId),r=c[source.collection].find(r=>r.id===source.id);for(const [field,intervals] of [['minDays',r.durationIntervalsGuaranteed],['maxDays',r.durationIntervalsPossible]]){const sum=intervals.reduce((total,x)=>total+(Date.parse(x.end)-Date.parse(x.start))/86400000,0);assert.ok(Math.abs(sum-r.durationBounds[field])<1e-10);for(const x of intervals)assert.ok(c.appearances.some(a=>a.startDate+'T06:00:00.000Z'<=x.start&&x.end<=a.endDate+'T06:00:00.000Z'));}assert.equal(r.durationDays,r.durationBounds.minDays);}
});
test('All 76 known Winter source rows retain a single supported date and numeric duration',()=>{
 assert.equal(report.knownWinterPostingRows.length,76);
 for(const source of report.knownWinterPostingRows){const c=courses.find(c=>c.id===source.courseId),r=c[source.collection].find(r=>r.id===source.id);assert.match(r.finalDate,/^\d{4}-\d{2}-\d{2}$/);assert.ok(Number.isFinite(r.durationDays));}
 assert.equal(report.undatedUnassignedWorksheetRows.length,112);assert.ok(report.undatedUnassignedWorksheetRows.every(r=>r.hasKnownWinterPost===false));
});
test('Additional original recordings are mapped to R2 without promoting or recertifying supporting results',()=>{
 const manifests=read('archive/video-backups.json');
 for(const v of report.additionalR2Videos){const c=courses.find(c=>c.id===v.courseId),r=c.submissions.find(r=>r.id===v.id);assert.equal(r.videoBackup.url,v.backup.url);assert.equal(r.videoBackup.sha256,v.backup.sha256);assert.ok(!c.records.some(p=>p.id===r.id));assert.ok(Object.values(manifests).some(x=>x.url===v.backup.url));if(r.time==='1:19.76'){assert.equal(r.videoVerified,false);assert.equal(r.videoVerificationUnresolved,true);}}
});
