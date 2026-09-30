import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fastestVideo } from '../lib/video.mjs';
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
test('Winter 2020 restores both exchanges and attributes tied footage to its actual runner',()=>{
 const ci=courses.find(c=>c.id==='snes-choco-island-1');
 assert.deepEqual(ci.records.map(r=>r.time),['0:41.43','0:40.68','0:40.68','0:40.36','0:40.30','0:40.29','0:40.07','0:39.92','0:39.87','0:39.81','0:39.76','0:39.76']);
 const nu=ci.records.find(r=>r.playerId==='nu11'&&r.time==='0:39.76');
 const fx=ci.records.find(r=>r.playerId==='superfx');
 assert.equal(nu.recordDate,'2020-12-06');assert.equal(nu.video,null);assert.equal(nu.videoBackup,undefined);
 assert.equal(fx.recordDate,'2020-12-15');assert.deepEqual(fx.laps,['20.04','19.72']);
 assert.match(fx.video,/kdfx2c/);assert.match(fx.videoBackup.url,/9ZHoPbG1evM/);
 const wk=ci.records.find(r=>r.playerId==='wakinyo');assert(!wk.proofImage);assert.deepEqual(wk.laps,['20.30','19.99']);
 const mt=courses.find(c=>c.id==='wii-maple-treeway');
 const dated=mt.records.filter(r=>r.recordDate);
 assert.deepEqual(dated.map(r=>r.time),['1:48.66','1:47.67','1:47.57','1:47.57','1:47.09','1:47.08','1:47.02','1:46.73','1:46.64','1:46.62','1:46.16']);
 assert.equal(dated.at(-1).recordDate,'2020-12-08');assert.deepEqual(dated.at(-1).laps,['52.99','53.17']);
 assert(!mt.records.some(r=>r.time==='1:47.07'));
 const fallback=fastestVideo(mt);assert.equal(fallback.playerId,'wins');assert.equal(fallback.time,'1:46.16');assert.equal(fallback.isCurrent,false);assert.match(fallback.videoBackup.url,/vElKKGJkqsc/);
 assert.equal(fastestVideo(ci).playerId,'superfx');
 const ids=[...ci.records,...mt.records].map(r=>r.id);assert.equal(new Set(ids).size,ids.length);
 for(const r of [...ci.records,...dated].filter(r=>r.playerId!=='wakinyo'))assert(fs.existsSync('public'+r.proofImageLocal));
});
test('Rosalina restores intermediate WRs, corrects repost dates, and keeps uncertain runs out of progression',()=>{
 const sw=courses.find(c=>c.id==='gba-sunset-wilds');
 const missing=sw.records.find(r=>r.playerId==='wins'&&r.time==='1:11.19');
 assert.equal(missing.recordDate,'2020-12-18');assert.deepEqual(missing.laps,['35.67','35.52']);
 assert(sw.records.findIndex(r=>r.time==='1:11.19')<sw.records.findIndex(r=>r.time==='1:11.11'));
 const kaz=sw.records.find(r=>r.time==='1:10.30');assert.equal(kaz.recordDate,'2020-12-28');
 assert.equal(kaz.durationDays,11);assert.match(kaz.videoBackup.url,/ItlthLSPRpg/);
 assert(!sw.records.some(r=>r.time==='1:10.81'));
 assert(sw.submissions.some(r=>r.time==='1:10.81'&&r.dateUnresolved&&r.includeInProgression===false));
 const cm=courses.find(c=>c.id==='n64-choco-mountain');
 const tome=cm.records.find(r=>r.time==='1:19.29');assert.equal(tome.submittedAt,'2020-12-16T08:42:24.000Z');assert.equal(tome.playerId,'tomegome');
 assert(!cm.records.some(r=>r.time==='1:19.33'||r.time==='1:19.47'));
 assert.deepEqual(cm.records.find(r=>r.playerId==='zxflare').laps,['40.05','39.86']);
 const last2020=cm.records.find(r=>r.time==='1:18.51');assert.equal(last2020.video,null);assert.equal(last2020.recordDate,'2020-12-29');assert(fs.existsSync('public'+last2020.proofImageLocal));assert.match(last2020.videoRejection.reason,/predates/);
 const fallback=fastestVideo(cm);assert.equal(fallback.playerId,'superfx');assert.equal(fallback.time,'1:18.93');assert.equal(fallback.isCurrent,false);assert.match(fallback.video,/aKBh5R2tbTQ/);assert.match(fallback.videoBackup.url,/QqsQhQPtolU/);
 for(const r of [...sw.records,...cm.records].filter(r=>r.recordDate>='2020-12-16'&&r.recordDate<'2020-12-30'&&r.time!=='1:18.51'))assert(fs.existsSync('public'+r.proofImageLocal));
});
test('New Year 2021 restores Access and Wins exchanges with original dates and excludes later PBs',()=>{
 const af=courses.find(c=>c.id==='ds-airship-fortress-r');
 assert.deepEqual(af.records.slice(0,9).map(r=>[r.playerId,r.time]),[
  ['nu11','1:37.98'],['access','1:37.72'],['access','1:37.69'],['access','1:37.61'],['access','1:37.57'],['access','1:37.46'],['access','1:37.38'],['nu11','1:37.21'],['wins','1:37.11'],
 ]);
 const recovered=af.records.find(r=>r.time==='1:36.66');
 assert.equal(recovered.submittedAt,'2021-01-08T01:22:20.493Z');assert.deepEqual(recovered.laps,['48.44','48.22']);
 assert.equal(af.current.recordDate,'2021-01-12');assert.deepEqual(af.current.laps,['48.26','48.18']);
 assert.equal(af.current.videoAvailability,'unavailable');
 const fallback=fastestVideo(af);assert.equal(fallback.playerId,'wins');assert.equal(fallback.time,'1:36.91');assert.equal(fallback.isCurrent,false);assert.match(fallback.video,/6dLatix8LUs/);
 assert(!af.records.some(r=>['1:37.55','1:36.91','1:36.51'].includes(r.time)));
 const ktb=courses.find(c=>c.id==='snes-koopa-troopa-beach-2');
 assert.equal(ktb.records.find(r=>r.time==='0:57.59').recordDate,'2020-12-31');
 assert.equal(ktb.current.recordDate,'2021-11-17');assert.match(ktb.current.videoBackup.url,/HngDnzsFz3c/);assert.equal(fastestVideo(ktb).isCurrent,true);
 assert(!ktb.records.some(r=>r.time==='0:57.99'||r.time==='0:59.06'));
 assert(ktb.submissions.some(r=>r.time==='1:02.39'&&r.identityUnresolved&&r.includeInProgression===false));
 for(const r of [...af.records,...ktb.records.filter(r=>r.recordDate)])assert(fs.existsSync('public'+r.proofImageLocal));
});
