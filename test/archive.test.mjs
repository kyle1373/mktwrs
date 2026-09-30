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
test('Berlin distinguishes original WR images, delayed evidence, and slower surviving footage',()=>{
 const kd=courses.find(c=>c.id==='n64-kalimari-desert-2');
 const recovered=kd.records.find(r=>r.time==='1:03.84');
 assert.equal(recovered.playerId,'astre');assert.equal(recovered.recordDate,'2021-01-13');
 assert.deepEqual(recovered.laps,['29.69','34.15']);assert(fs.existsSync('public'+recovered.proofImageLocal));
 assert(!kd.records.some(r=>r.playerId==='wins'&&['1:03.86','1:03.84'].includes(r.time)));
 assert(!kd.records.some(r=>r.time==='1:03.49'||r.time==='1:03.59'));
 const delayed=kd.records.find(r=>r.time==='1:03.62');assert.equal(delayed.recordDate,null);assert.equal(delayed.durationDays,null);
 assert.equal(kd.records.find(r=>r.time==='1:03.66').durationDays,null);
 const preserved=kd.submissions.find(r=>r.video?.includes('dXCC3NPM8CQ'));assert.equal(preserved.videoVerified,true);assert.match(preserved.videoBackup.url,/O7DSlxI9PQ0/);
 const fallback=fastestVideo(kd);assert.equal(fallback.time,'1:03.36');assert.equal(fallback.isCurrent,false);
 const rrm=courses.find(c=>c.id==='3ds-rock-rock-mountain-r');
 assert.deepEqual(rrm.records.find(r=>r.time==='1:43.37').laps,['51.67','51.70']);
 assert.deepEqual(rrm.records.find(r=>r.time==='1:42.87').laps,['51.52','51.35']);
 const deleted=rrm.records.find(r=>r.playerId==='baseball-club'&&r.time==='1:43.40');assert.equal(deleted.recordDate,null);assert.equal(deleted.durationDays,null);
 assert.equal(rrm.records.find(r=>r.time==='1:43.64').durationDays,null);
 assert.equal(rrm.current.recordDate,'2021-01-18');assert.equal(fastestVideo(rrm).isCurrent,true);assert.match(rrm.current.videoBackup.url,/15haxitqJnY/);
});
test('Cat Tour combines text-only WRs with original posts and preserves unresolved previous bests',()=>{
 const mt=courses.find(c=>c.id==='wii-maple-treeway-r');
 assert.deepEqual(mt.records.slice(0,12).map(r=>[r.playerId,r.time]),[
  ['romain','1:53.15'],['troy','1:53.07'],['romain','1:51.95'],['nu11','1:51.41'],
  ['astre','1:50.92'],['saki7','1:50.74'],['astre','1:50.59'],['nu11','1:50.57'],
  ['nu11','1:50.43'],['astre','1:50.35'],['nu11','1:50.09'],['dit','1:49.98'],
 ]);
 assert(mt.records.find(r=>r.time==='1:50.92').submittedAt<'2021-01-27T11:25:59Z');
 assert(mt.records.find(r=>r.time==='1:50.59').submittedAt<'2021-01-27T14:18:18Z');
 assert(!mt.records.some(r=>['1:51.39','1:50.68','1:50.01'].includes(r.time)));
 assert.equal(mt.records.find(r=>r.time==='1:49.98').recordDate,'2021-02-06');
 assert.deepEqual(mt.records.find(r=>r.time==='1:50.35').laps,['55.20','55.15']);
 const rr=courses.find(c=>c.id==='rmx-rainbow-road-1');
 assert.deepEqual(rr.records.slice(0,16).map(r=>r.time),['1:20.32','1:20.20','1:20.13','1:19.84','1:19.83','1:19.36','1:19.34','1:19.21','1:19.14','1:19.09','1:19.02','1:19.01','1:19.01','1:18.97','1:18.96','1:18.95']);
 const first=rr.records[0];assert.equal(first.playerId,'superfx');assert.equal(first.submittedAt,'2021-01-27T06:39:19.851Z');assert.match(first.source.url,/803876780800475166/);assert(!first.proofImage);
 assert(!rr.records.some(r=>['1:22.29','1:20.74','1:20.38','1:19.43'].includes(r.time)));
 assert.deepEqual(rr.records.find(r=>r.time==='1:19.21').laps,['39.65','39.56']);
 assert.equal(rr.records.find(r=>r.time==='1:18.95').recordDate,'2021-02-07');
 assert(rr.submissions.some(r=>r.time==='1:19.48'&&r.dateUnresolved&&r.includeInProgression===false));
 assert(mt.submissions.some(r=>r.time==='1:50.18'&&r.dateUnresolved&&r.includeInProgression===false));
 for(const r of [...mt.records.slice(0,12),...rr.records.slice(1,16)])assert(fs.existsSync('public'+r.proofImageLocal));
});
test('rescued recordings keep original and backup links without inventing WRs or race dates',()=>{
 const kd=courses.find(c=>c.id==='n64-kalimari-desert-2');
 const wins=kd.records.find(r=>r.playerId==='wins'&&r.time==='1:03.66');
 assert.equal(wins.videoVerified,true);assert.match(wins.video,/QALze8wNxBk/);assert.match(wins.videoBackup.url,/mcwXzeV-D_0/);
 assert.match(fastestVideo(kd).videoBackup.url,/nXG20w4hZa8/);
 const mc=courses.find(c=>c.id==='3ds-mario-circuit');
 assert(!mc.records.some(r=>r.playerId==='superfx'&&r.time==='1:35.60'));
 const rescued=mc.submissions.find(r=>r.playerId==='superfx'&&r.time==='1:35.60');
 assert.equal(rescued.videoVerified,true);assert.equal(rescued.dateUnresolved,true);assert.match(rescued.video,/805034592993935360\/video0.mov/);assert.match(rescued.videoBackup.url,/pzyYSJ0WVI0/);
});
test('Peach vs Daisy restores dated exchanges and separates later tied footage',()=>{
 const dp=courses.find(c=>c.id==='snes-donut-plains-2');
 assert.deepEqual(dp.records.slice(0,5).map(r=>r.time),['1:01.72','1:01.42','1:01.40','1:00.99','1:00.73']);
 assert.equal(dp.records[0].submittedAt,'2021-02-10T06:48:52.636Z');
 assert(!dp.records.some(r=>['1:05.44','1:02.02','1:01.80'].includes(r.time)));
 assert.equal(dp.records.find(r=>r.time==='1:00.73').recordDate,'2021-02-11');
 const sw=courses.find(c=>c.id==='gba-sunset-wilds-r');
 assert.deepEqual(sw.records.find(r=>r.time==='1:10.67').laps,['35.39','35.28']);
 assert.deepEqual(sw.records.find(r=>r.time==='1:10.56').laps,['35.10','35.46']);
 assert.deepEqual(sw.records.find(r=>r.time==='1:10.53').laps,['35.28','35.25']);
 assert.equal(sw.records.find(r=>r.time==='1:10.87').recordDate,null);
 assert.equal(sw.records.find(r=>r.time==='1:10.90').durationDays,null);
 const tied=sw.submissions.find(r=>r.video?.includes('812244311521230898'));
 assert.deepEqual(tied.laps,[null,null]);assert.equal(tied.includeInProgression,false);
 assert.match(tied.videoBackup.url,/k3K1pZS4ahs/);assert.equal(sw.records.filter(r=>r.time==='1:10.53').length,1);
 const cm=courses.find(c=>c.id==='n64-choco-mountain-r');
 assert.equal(cm.records.filter(r=>r.time==='1:19.29').length,2);
 assert(!cm.records.some(r=>['1:18.72','1:18.15','1:18.11'].includes(r.time)));
 assert.equal(cm.records.find(r=>r.time==='1:18.27').derivedLap,2);
 assert.deepEqual(cm.records.find(r=>r.time==='1:18.27').laps,['39.09','39.18']);
 const fallback=fastestVideo(cm);assert.equal(fallback.time,'1:17.95');assert.equal(fallback.playerId,'kazuo');assert.equal(fallback.isCurrent,false);
 assert.match(fallback.video,/1362916914759159808/);assert.match(fallback.videoBackup.url,/kxAngKdbpcA/);
 assert.equal(cm.current.time,'1:17.87');assert.equal(cm.current.recordDate,'2021-02-19');
 assert.equal(cm.current.delayedSubmission,true);assert.equal(cm.current.durationDays,null);
 for(const time of ['1:18.25','1:18.21','1:17.95']) {
  assert(!cm.records.some(r=>r.time===time));
  assert(cm.submissions.some(r=>r.time===time&&r.includeInProgression===false));
 }
 assert.match(sw.records.find(r=>r.time==='1:10.53').video,/aNjiaWm-h9Y/);
 assert.match(sw.records.find(r=>r.time==='1:10.53').videoBackup.url,/0h2DWfWN24Y/);
 assert(cm.submissions.some(r=>r.time==='1:18.05'&&r.dateUnresolved&&r.includeInProgression===false));
});

test('Snow Tour restores consecutive breaks, adjacent replies, and separate surviving videos',()=>{
 const riw=courses.find(c=>c.id==='3ds-rosalina-s-ice-world');
 assert.deepEqual(riw.records.slice(0,8).map(r=>r.time),['1:30.56','1:30.35','1:30.23','1:30.19','1:30.12','1:30.11','1:29.91','1:29.87']);
 assert.equal(riw.records.find(r=>r.time==='1:29.91').recordDate,'2021-02-28');
 assert.equal(riw.records.find(r=>r.time==='1:29.91').videoAvailability,'unavailable');
 assert.deepEqual(riw.records.find(r=>r.time==='1:29.87').laps,['45.03','44.84']);
 assert(!riw.records.some(r=>r.time==='1:30.26'||r.time==='1:30.04'));
 const speedy=riw.submissions.find(r=>r.playerId==='nhspeedy'&&r.videoVerified&&r.includeInProgression===false);
 assert.equal(speedy.time,'1:30.26');assert.deepEqual(speedy.laps,['45.36','44.90']);assert.equal(speedy.includeInProgression,false);
 const rr=courses.find(c=>c.id==='rmx-rainbow-road-1r');
 assert.deepEqual(rr.records.slice(0,12).map(r=>r.time),['1:30.30','1:20.90','1:19.89','1:19.47','1:18.93','1:18.83','1:18.42','1:18.36','1:18.22','1:18.14','1:17.27','1:17.13']);
 assert.equal(rr.records[0].submittedAt,'2021-02-24T11:41:33.837Z');
 assert.deepEqual(rr.records.find(r=>r.time==='1:18.36').laps,['38.90','39.46']);
 assert.deepEqual(rr.records.find(r=>r.time==='1:18.14').laps,['38.89','39.25']);
 assert.equal(rr.records.find(r=>r.time==='1:17.13').recordDate,'2021-03-01');
 assert(!rr.records.some(r=>r.time==='1:17.96'||r.time==='1:17.17'));
 const sparta=rr.submissions.find(r=>r.playerId==='spartacurtyt'&&r.videoVerified);
 assert.equal(sparta.time,'1:17.96');assert.equal(sparta.includeInProgression,false);assert.match(sparta.videoBackup.url,/qWAjvYamrKE/);
 for(const r of [...riw.records.slice(0,8),...rr.records.slice(0,12)])assert(fs.existsSync('public'+r.proofImageLocal));
});

test('Mario Tour restores short WR exchanges and validates shorthand against original totals',()=>{
 const lm=courses.find(c=>c.id==='ds-luigi-s-mansion-r');
 assert.deepEqual(lm.records.map(r=>r.time),['1:28.93','1:25.45','1:25.43','1:24.69','1:24.64','1:23.62','1:23.60','1:23.43','1:23.39','1:23.29','1:23.23','1:23.21','1:23.19','1:23.09','1:22.96','1:22.89','1:22.84','1:22.75']);
 assert.equal(lm.records.find(r=>r.time==='1:25.43').playerId,'marumo');
 assert.equal(lm.records.find(r=>r.time==='1:25.43').submittedAt,'2021-03-10T07:16:09.543Z');
 assert.deepEqual(lm.records.find(r=>r.time==='1:23.39').laps,[null,null]);
 assert.deepEqual(lm.records.find(r=>r.time==='1:23.29').laps,['41.56','41.73']);
 assert.equal(lm.current.recordDate,'2021-03-18');
 const footage=fastestVideo(lm);assert.equal(footage.time,'1:22.79');assert.equal(footage.isCurrent,false);assert.equal(footage.dateUnresolved,true);assert.equal(footage.submittedAt,null);
 assert.deepEqual(footage.laps,['41.41','41.38']);assert.match(footage.video,/1372898731717189632/);assert.match(footage.videoBackup.url,/Dutdl5C_HpI/);
 assert(!lm.records.some(r=>r.time==='1:22.79'||r.time==='1:22.83'));
 const bc=courses.find(c=>c.id==='gba-bowser-s-castle-1');
 assert.deepEqual(bc.records.filter(r=>r.recordDate>='2021-03-10'&&r.recordDate<'2021-03-24').map(r=>r.time),['0:59.88','0:59.82','0:59.82','0:59.72','0:59.68','0:59.63','0:59.59','0:59.55']);
 assert.deepEqual(bc.records.find(r=>r.playerId==='nu11'&&r.time==='0:59.82').laps,['29.62','30.20']);
 assert.equal(bc.current.recordDate,'2021-03-22');assert(!bc.records.some(r=>r.time==='0:59.58'));
 const tb=courses.find(c=>c.id==='tokyo-blur-4');
 assert.deepEqual(tb.records.slice(0,7).map(r=>r.time),['0:47.64','0:47.26','0:46.92','0:46.84','0:46.57','0:46.35','0:46.31']);
 assert.deepEqual(tb.records.find(r=>r.time==='0:46.84').laps,['21.67','25.17']);
 assert.equal(tb.records.find(r=>r.time==='0:46.31').recordDate,'2021-03-23');
 assert(tb.submissions.some(r=>r.time==='0:47.48'&&r.identityUnresolved&&r.includeInProgression===false));
 for(const r of [...lm.records,...tb.records.slice(0,7)])assert(fs.existsSync('public'+r.proofImageLocal));
});

test('Yoshi Tour restores dated exchanges and separates each player’s proof',()=>{
 const tb=courses.find(c=>c.id==='tokyo-blur-4r');
 assert.deepEqual(tb.records.map(r=>r.time),['0:48.82','0:47.46','0:47.39','0:47.09','0:46.91','0:46.82','0:46.74','0:46.57','0:46.51','0:46.47','0:46.47']);
 const troy=tb.records.find(r=>r.time==='0:47.39');
 assert.equal(troy.playerId,'troy');assert.equal(troy.submittedAt,'2021-03-24T06:34:41.049Z');
 assert.deepEqual(tb.records.find(r=>r.time==='0:47.09').laps,['24.66','22.43']);
 const tie=tb.records.find(r=>r.playerId==='tomegome'&&r.time==='0:46.47');
 assert.equal(tie.video,null);assert.deepEqual(tie.laps,['24.36','22.11']);
 assert.equal(tie.recordDate,'2021-04-05');
 assert(tb.submissions.some(r=>r.time==='0:47.39'&&r.identityUnresolved&&r.includeInProgression===false));
 assert.equal(fastestVideo(tb).time,'0:46.51');assert.match(fastestVideo(tb).videoBackup.url,/7kZiQ4ck8y0/);
 const wp=courses.find(c=>c.id==='ds-waluigi-pinball');
 assert.deepEqual(wp.records.map(r=>r.time),['1:47.31','1:46.91','1:46.83','1:46.75','1:46.73','1:46.68','1:46.53','1:46.53','1:46.46','1:46.21']);
 assert.equal(wp.current.recordDate,'2021-04-05');
 assert(!wp.records.some(r=>['1:47.68','1:46.72','1:46.33'].includes(r.time)));
 const footage=fastestVideo(wp);assert.equal(footage.time,'1:46.72');assert.equal(footage.isCurrent,false);
 assert.deepEqual(footage.laps,['53.34','53.38']);assert.match(footage.videoBackup.url,/MYuFsJdIxiA/);
 for(const r of [...tb.records,...wp.records.slice(1)])assert(fs.existsSync('public'+r.proofImageLocal));
});

test('Ninja Tour restores exchanges, correct ties, and lap shorthand from adjacent replies',()=>{
 const mc=courses.find(c=>c.id==='3ds-mario-circuit-r');
 assert.deepEqual(mc.records.map(r=>r.time),['1:38.04','1:37.91','1:37.77','1:37.60','1:37.48','1:37.46','1:37.19','1:36.81','1:36.63','1:36.26','1:36.23','1:36.14','1:36.14','1:36.11','1:35.92','1:35.84']);
 assert.deepEqual(mc.records.find(r=>r.time==='1:37.77').laps,['48.77','49.00']);
 assert.deepEqual(mc.records.find(r=>r.time==='1:36.23').laps,['48.19','48.04']);
 assert.deepEqual(mc.records.find(r=>r.time==='1:35.92').laps,['47.82','48.10']);
 assert.deepEqual(mc.current.laps,['47.94','47.90']);assert.equal(mc.current.recordDate,'2021-04-16');
 assert.deepEqual(mc.records.filter(r=>r.time==='1:36.14').map(r=>r.playerId),['superfx','wins']);
 assert.match(mc.current.video,/O_ByD9fz4tU/);assert.match(mc.current.videoBackup.url,/guLRQ3rL1ys/);
 assert.match(mc.records.find(r=>r.time==='1:36.81').videoBackup.url,/wDYz3h05dYI/);
 assert.match(mc.records.find(r=>r.playerId==='wins'&&r.time==='1:36.14').videoBackup.url,/qrQ528UaAM4/);
 for(const time of ['1:36.40','1:36.24','1:35.89']) {
  assert(!mc.records.some(r=>r.time===time));assert(mc.submissions.some(r=>r.time===time&&r.dateUnresolved&&r.submittedAt===null&&r.includeInProgression===false));
 }
 const rr=courses.find(c=>c.id==='snes-rainbow-road');
 assert.deepEqual(rr.records.map(r=>r.time),['0:59.94','0:59.58','0:59.28','0:59.25','0:59.20','0:58.99']);
 assert.deepEqual(rr.records.find(r=>r.time==='0:59.20').laps,['29.32','29.88']);
 assert.equal(rr.current.recordDate,'2021-04-18');assert.equal(rr.current.videoAvailability,'unavailable');
 const footage=fastestVideo(rr);assert.equal(footage.time,'0:59.49');assert.equal(footage.isCurrent,false);assert.match(footage.videoBackup.url,/b9a68GD9Gyw/);
 for(const r of [...mc.records,...rr.records.slice(1)])assert(fs.existsSync('public'+r.proofImageLocal));
});
