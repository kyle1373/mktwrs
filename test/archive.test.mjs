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
test('current Airship WR uses original May 6 result and mismatched BC2R image is excluded',()=>{
 const af=courses.find(c=>c.id==='ds-airship-fortress').current;
 assert.equal(af.recordDate,'2021-05-06');
 assert.deepEqual(af.laps,['45.24','44.71']);
 assert(fs.existsSync('public'+af.proofImageLocal));
 const bc=courses.find(c=>c.id==='gba-bowser-s-castle-2r').current;
 assert.equal(bc.proofImage,null);
 assert.match(bc.proofImageRejection.reason,/Tome/);
 assert.equal(bc.recordDate,null);
});
test('Sunset restores the Saki–Nu–Kazuo exchange and keeps undated previous bests out of WR history',()=>{
 const c=courses.find(c=>c.id==='3ds-neo-bowser-city');
 const runs=c.records.filter(r=>r.recordDate>='2020-11-04'&&r.recordDate<'2020-11-18');
 assert.deepEqual(runs.map(r=>[r.playerId,r.time]),[
  ['saki7','1:25.53'],['saki7','1:25.51'],['nu11','1:25.14'],['kazuo','1:25.13'],
  ['kazuo','1:24.93'],['kazuo','1:24.88'],['kazuo','1:24.83'],['kazuo','1:24.70'],
 ]);
 assert.deepEqual(runs.find(r=>r.time==='1:24.93').laps,['42.49','42.44']);
 assert.equal(c.current.recordDate,'2020-11-10');
 assert.equal(c.current.durationDays,8);
 assert.match(c.current.videoBackup.url,/KYMlINbVzB0/);
 assert(!c.records.some(r=>r.time==='1:25.40'));
 assert(c.submissions.some(r=>r.time==='1:25.40'&&r.dateUnresolved));
 for(const r of runs)assert(fs.existsSync('public'+r.proofImageLocal));
 const rr=courses.find(c=>c.id==='n64-royal-raceway').records.find(r=>r.time==='1:33.97');
 assert.equal(rr.recordDate,'2020-11-08');
 assert.deepEqual(rr.laps,['46.90','47.07']);
});
test('Mario vs. Luigi restores both exchanges, preserves three sections, and excludes disputed runs',()=>{
 const mc=courses.find(c=>c.id==='snes-mario-circuit-2');
 const runs=mc.records.filter(r=>r.recordDate>='2020-11-18'&&r.recordDate<'2020-12-02');
 assert.deepEqual(runs.map(r=>r.time),['0:59.08','0:58.75','0:57.95','0:57.91','0:57.72','0:57.67','0:57.56','0:57.50','0:57.40','0:57.28']);
 assert(!runs[0].laps?.some(Boolean));
 assert.deepEqual(mc.current.laps,['28.52','28.76']);
 assert.equal(mc.current.recordDate,'2020-11-24');
 assert.match(mc.current.videoBackup.url,/tEgE_32WBrU/);
 const rr=courses.find(c=>c.id==='3ds-rainbow-road');
 assert.deepEqual(rr.records.slice(7).map(r=>[r.playerId,r.time]),[
  ['nu11','1:59.26'],['nu11','1:59.24'],['kazuo','1:59.21'],['astre','1:59.09'],['kazuo','1:59.01'],['kazuo','1:58.96'],['kazuo','1:58.93'],['kazuo','1:58.81'],['kazuo','1:58.80'],
 ]);
 assert.deepEqual(rr.current.laps,['33.75','48.80','36.25']);
 assert.equal(rr.current.recordDate,'2020-11-26');
 assert.match(rr.current.videoBackup.url,/l-7sVtTwQ-0/);
 assert(!rr.records.some(r=>r.playerId==='kazuo'&&r.time==='1:59.26'));
 assert.equal(rr.submissions.filter(r=>r.identityUnresolved).length,3);
 for(const r of [...runs,...rr.records])assert(fs.existsSync('public'+r.proofImageLocal));
 const fragment=rr.records.find(r=>r.time==='1:59.01');
 assert(!fragment.video);
 assert.match(fragment.videoFragments[0].description,/does not show the finish/);
});
