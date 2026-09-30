import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const courses=JSON.parse(fs.readFileSync('public/data/courses.json'));
test('Anniversary 2020 restores the WR exchange with original dates, splits and preserved images',()=>{
 const c=courses.find(c=>c.id==='3ds-toad-circuit');
 const runs=c.records.filter(r=>r.recordDate>='2020-10-07'&&r.recordDate<'2020-10-21');
 assert.deepEqual(runs.map(r=>r.time),['1:04.33','1:04.31','1:04.30','1:04.27','1:04.13','1:04.08','1:04.04','1:03.96']);
 assert.deepEqual(runs.find(r=>r.time==='1:04.30').laps,['32.15','32.15']);
 assert.deepEqual(runs.find(r=>r.time==='1:04.27').laps,['32.12','32.15']);
 assert.equal(runs.at(-1).recordDate,'2020-10-18');
 for (const r of runs) assert(fs.existsSync('public'+r.proofImageLocal));
 assert(!c.records.some(r=>['1:04.26','1:04.12','1:04.16'].includes(r.time)));
});
test('Halloween 2020 restores dated exchanges while excluding later PBs and undated candidates',()=>{
 const runs=id=>courses.find(c=>c.id===id).records.filter(r=>r.recordDate>='2020-10-21'&&r.recordDate<'2020-11-04');
 const af=runs('ds-airship-fortress');
 assert.deepEqual(af.map(r=>r.time),['1:31.67','1:31.38','1:30.96','1:30.92','1:30.75','1:30.72','1:30.67','1:30.42','1:30.25','1:30.20','1:30.07']);
 assert.deepEqual(af.find(r=>r.time==='1:30.75').laps,['45.30','45.45']);
 assert.deepEqual(af.at(-1).laps,['45.47','44.60']);
 assert.equal(af.at(-1).recordDate,'2020-11-01');
 const bc=runs('gba-bowser-s-castle-2r');
 assert.deepEqual(bc.map(r=>r.time),['1:20.82','1:20.31','1:20.20','1:20.15','1:20.08','1:20.06','1:19.89','1:19.83','1:19.81','1:19.69','1:19.54','1:19.48','1:19.48','1:19.29']);
 assert.deepEqual(bc.find(r=>r.time==='1:19.48'&&r.playerId==='nu11').laps,['39.54','39.94']);
 for(const r of [...af,...bc]) assert(fs.existsSync('public'+r.proofImageLocal));
});
