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
 assert.match(bc.proofImage,/925348370808197150/);
 assert(fs.existsSync('public'+bc.proofImageLocal));
 assert.equal(bc.recordDate,'2021-12-28');
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
 const dated=mt.records.filter(r=>r.recordDate?.startsWith("2020-"));
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
 const fallback=fastestVideo(cm);assert.equal(fallback.time,'1:17.90');assert.equal(fallback.playerId,'nu11');assert.equal(fallback.isCurrent,false);
 const kazuo=cm.submissions.find(r=>r.video?.includes('1362916914759159808')&&r.videoBackup);assert.match(kazuo.videoBackup.url,/kxAngKdbpcA/);
 assert.equal(cm.current.time,'1:17.87');assert.equal(cm.current.recordDate,'2021-02-19');
 assert.equal(cm.current.delayedSubmission,true);assert.equal(cm.current.durationDays,null);
 for(const time of ['1:18.25','1:18.21','1:17.95']) {
  assert(!cm.records.some(r=>r.time===time));
  assert(cm.submissions.some(r=>r.time===time&&r.includeInProgression===false));
 }
 assert.match(sw.records.find(r=>r.time==='1:10.53').video,/aNjiaWm-h9Y/);
 const sunsetBackup=sw.records.find(r=>r.time==='1:10.53').videoBackup;
 assert.match(sunsetBackup.url,/X9MTQhANIls/);
 assert.equal(sunsetBackup.audio,'removed');
 assert.match(sunsetBackup.blockedOriginalUpload,/0h2DWfWN24Y/);
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

test('Sydney April restores dated records and separates video runs from adjacent screenshots',()=>{
 const nbc=courses.find(c=>c.id==='3ds-neo-bowser-city-r');
 const recent=nbc.records.filter(r=>r.recordDate>='2021-04-21');
 assert.deepEqual(recent.map(r=>r.time),['1:23.82','1:23.77','1:23.75','1:23.70','1:23.68']);
 assert.deepEqual(recent.map(r=>r.laps),[['42.00','41.82'],['41.93','41.84'],['41.97','41.78'],['41.97','41.73'],['41.94','41.74']]);
 assert.equal(nbc.current.recordDate,'2021-04-28');assert.match(nbc.current.video,/1388610850978779138/);assert.match(nbc.current.videoBackup.url,/xyqVdSQXoMM/);
 const ci=courses.find(c=>c.id==='rmx-choco-island-2');
 assert.deepEqual(ci.records.map(r=>r.time),['1:03.53','1:02.78','1:02.64','1:02.47','1:02.41']);
 assert.deepEqual(ci.records.find(r=>r.time==='1:02.64').laps,['31.42','31.22']);assert.equal(ci.current.recordDate,'2021-04-29');assert.deepEqual(ci.current.laps,['31.17','31.24']);assert.match(ci.current.videoBackup.url,/t0jKgJvyjL8/);
 assert.equal(fastestVideo(ci).time,'1:02.41');
 const tome=ci.submissions.find(r=>r.playerId==='tomegome'&&r.videoVerified&&r.time==='1:02.83');assert(tome);assert.equal(tome.includeInProgression,false);assert.deepEqual(tome.laps,['31.39','31.44']);
 assert(ci.submissions.some(r=>r.time==='1:03.05'&&r.identityUnresolved&&r.includeInProgression===false));
 assert(ci.submissions.some(r=>r.time==='1:03.54'&&r.dateUnresolved));
 for(const r of [...recent,...ci.records])assert(fs.existsSync('public'+r.proofImageLocal));
});


test('Bowser vs DK restores record exchanges, same-player reties, and corrected video splits',()=>{
 const kd=courses.find(c=>c.id==='n64-kalimari-desert-2r');
 const recent=kd.records.filter(r=>r.recordDate>='2021-05-05'&&r.recordDate<'2021-05-19');
 assert.deepEqual(recent.map(r=>r.time),['1:05.72','1:05.56','1:05.30','1:05.23','1:05.18','1:05.12','1:04.97','1:04.94','1:04.88','1:04.88','1:04.77','1:04.74','1:04.71','1:04.68','1:04.62','1:04.56','1:04.50','1:04.47','1:04.43','1:04.35','1:04.30']);
 assert.deepEqual(recent.filter(r=>r.time==='1:04.88').map(r=>r.playerId),['n','kazuo']);
 assert.deepEqual(recent.find(r=>r.time==='1:04.47').laps,['29.10','35.37']);
 assert.deepEqual(recent.find(r=>r.time==='1:04.43').laps,['29.12','35.31']);
 assert.deepEqual(recent.at(-1).laps,['29.05','35.25']);
 assert.equal(recent.at(-1).recordDate,'2021-05-14');
 assert.match(recent.at(-1).videoBackup.url,/YY07Osa5iU4/);
 assert(kd.submissions.some(r=>r.time==='1:04.47'&&r.includeInProgression===false&&r.laps[0]==='29.17'));
 assert(kd.submissions.some(r=>r.time==='1:04.35'&&r.includeInProgression===false&&r.laps[0]==='29.09'));
 const riw=courses.find(c=>c.id==='3ds-rosalina-s-ice-world-r');
 assert.deepEqual(riw.records.filter(r=>r.recordDate<'2021-05-19').map(r=>r.time),['1:31.87','1:31.83','1:31.57','1:30.19','1:30.01','1:29.85','1:29.62']);
 const kaz=riw.records.find(r=>r.time==='1:29.62');assert.equal(kaz.recordDate,'2021-05-09');assert.deepEqual(kaz.laps,['44.93','44.69']);assert.match(kaz.videoBackup.url,/zYkLiT9qYSY/);
 assert.equal(riw.records.find(r=>r.time==='1:29.85').videoAvailability,'unavailable');
 for(const t of ['1:30.73','1:30.17'])assert(riw.submissions.some(r=>r.time===t&&r.dateUnresolved&&r.submittedAt===null));
 const af=courses.find(c=>c.id==='ds-airship-fortress');assert(!af.records.some(r=>r.time==='1:29.34'));assert.equal(af.current.submittedAt,'2021-05-06T21:38:36.939Z');
 for(const r of [...recent,kaz,af.current])assert(fs.existsSync('public'+r.proofImageLocal));
});

test('Trick Tour restores dated exchanges and separates recorded PBs from faster WRs',()=>{
 const ktb=courses.find(c=>c.id==='n64-koopa-troopa-beach-r');
 const early=ktb.records.filter(r=>r.recordDate<'2021-06-02');
 assert.deepEqual(early.map(r=>r.time),['1:18.01','1:15.95','1:15.64','1:15.48','1:15.48','1:15.47','1:15.33']);
 assert.deepEqual(early.filter(r=>r.time==='1:15.48').map(r=>r.playerId),['nu11','nhspeedy']);
 assert.deepEqual(early.find(r=>r.time==='1:15.47').laps,['37.69','37.78']);
 assert.equal(early.at(-1).submittedAt,'2021-06-01T13:17:13.309Z');
 assert.deepEqual(early.at(-1).laps,['37.67','37.66']);
 assert(ktb.submissions.some(r=>r.time==='1:15.37'&&r.dateUnresolved&&r.submittedAt===null));
 assert(ktb.submissions.some(r=>r.time==='1:15.99'&&r.identityUnresolved&&r.includeInProgression===false));
 const nh=ktb.submissions.find(r=>r.time==='1:15.55'&&r.videoVerified);assert.equal(nh.includeInProgression,false);assert.match(nh.videoBackup.url,/Fuery1J_MTM/);
 const rr=courses.find(c=>c.id==='3ds-rainbow-road-r');
 assert.deepEqual(rr.records.map(r=>r.time),['1:57.87','1:56.56','1:56.05','1:55.54','1:54.80','1:54.62','1:54.48','1:54.05','1:54.00','1:53.82','1:53.79','1:53.70','1:53.60','1:53.39','1:53.33','1:53.24','1:53.16','1:52.96','1:52.88','1:52.69']);
 assert.deepEqual(rr.records.find(r=>r.time==='1:53.79').laps,['36.37',null,null]);
 assert.deepEqual(rr.current.laps,['36.82','41.93','33.94']);assert.equal(rr.current.recordDate,'2021-05-29');
 assert.equal(fastestVideo(rr).time,'1:53.83');assert.equal(fastestVideo(rr).isCurrent,false);assert.match(fastestVideo(rr).videoBackup.url,/zml1t0PMQSg/);
 assert(!rr.records.some(r=>['1:51.98','1:52.93','1:53.55','1:54.66','1:55.63'].includes(r.time)));
 const gv=courses.find(c=>c.id==='snes-ghost-valley-1');
 assert.deepEqual(gv.records.map(r=>r.time),['0:39.96','0:39.93','0:39.92','0:39.88','0:39.88','0:39.87','0:39.76']);
 assert.equal(gv.current.submittedAt,'2021-06-01T14:37:08.850Z');assert.deepEqual(gv.current.laps,['19.96','19.80']);
 assert.equal(fastestVideo(gv).time,'0:39.82');assert.equal(fastestVideo(gv).playerId,'10mp');assert.equal(fastestVideo(gv).isCurrent,false);assert.deepEqual(fastestVideo(gv).laps,['19.96','19.86']);assert.match(fastestVideo(gv).videoBackup.url,/UapqsqI7oHE/);
 const kno=gv.submissions.find(r=>r.time==='0:39.83'&&r.videoVerified);assert.equal(kno.includeInProgression,false);assert.match(kno.videoBackup.url,/dIffIKUOYMg/);
 for(const r of [...early,...rr.records,...gv.records.slice(1)])assert(fs.existsSync('public'+r.proofImageLocal));
});

test('Wedding Tour restores exchanges, adjacent lap shorthand, and the Twitter-only tie',()=>{
 const mc=courses.find(c=>c.id==='3ds-mario-circuit');
 const wedding=mc.records.filter(r=>r.recordDate>='2021-06-02'&&r.recordDate<'2021-06-17');
 assert.deepEqual(wedding.map(r=>r.time),['1:35.42','1:35.31','1:35.23','1:35.17','1:35.12','1:35.11','1:34.99','1:34.85','1:34.76','1:34.55','1:34.50','1:34.44','1:34.35','1:34.35','1:33.94']);
 assert.deepEqual(wedding.find(r=>r.time==='1:35.17').laps,['47.54','47.63']);
 assert.deepEqual(wedding.find(r=>r.time==='1:34.76').laps,['47.02','47.74']);
 assert.deepEqual(wedding.find(r=>r.time==='1:34.55').laps,[null,null]);
 assert.deepEqual(wedding.find(r=>r.time==='1:34.50').laps,['47.14','47.36']);
 assert.deepEqual(wedding.filter(r=>r.time==='1:34.35').map(r=>r.playerId),['superfx','tomegome']);
 const tome=wedding.find(r=>r.playerId==='tomegome');assert.equal(tome.submittedAt,'2021-06-15T09:14:14.000Z');assert.deepEqual(tome.laps,['47.21','47.14']);assert.match(tome.video,/1404728947196055555/);assert.match(tome.videoBackup.url,/itx8KWMWtHI/);assert.equal(tome.durationDays,1);
 assert.match(wedding.find(r=>r.time==='1:35.31').videoBackup.url,/pPek5tziViM/);assert.match(wedding.find(r=>r.time==='1:35.23').videoBackup.url,/XSOOFt2veI4/);assert.match(wedding.find(r=>r.time==='1:34.99').videoBackup.url,/sGUfz13K-0E/);
 assert.equal(mc.current.recordDate,'2021-06-16');assert.equal(mc.current.videoAvailability,'unavailable');assert.equal(fastestVideo(mc).playerId,'tomegome');assert.equal(fastestVideo(mc).time,'1:34.35');assert.equal(fastestVideo(mc).isCurrent,false);
 const rr=courses.find(c=>c.id==='rmx-rainbow-road-2');const early=rr.records.filter(r=>r.recordDate<'2021-06-17');
 assert.deepEqual(early.map(r=>r.time),['1:22.37','1:22.17','1:22.10','1:22.10','1:22.09','1:22.05','1:21.95','1:21.74','1:21.69','1:21.65']);
 assert.deepEqual(early.filter(r=>r.time==='1:22.10').map(r=>r.playerId),['phillish','dit']);assert.deepEqual(early.find(r=>r.time==='1:22.09').laps,['40.99','41.10']);assert.deepEqual(early.find(r=>r.time==='1:22.05').laps,['41.01','41.04']);assert.equal(early.at(-1).recordDate,'2021-06-16');assert.equal(early.at(-1).videoAvailability,'unavailable');
 assert(!rr.records.some(r=>r.playerId==='timael'));
 assert(rr.submissions.some(r=>r.time==='1:22.99'&&r.standingUnresolved&&r.includeInProgression===false));
 for(const [c,t] of [[mc,'1:34.14'],[rr,'1:22.04']])assert(c.submissions.some(r=>r.time===t&&r.dateUnresolved&&r.submittedAt===null&&r.includeInProgression===false));
 for(const r of [...wedding,...early.slice(0,-1)])assert(fs.existsSync('public'+r.proofImageLocal));
});

test('Paris Tour preserves record exchanges, delayed WR evidence, and player identity',()=>{
 const rr=courses.find(c=>c.id==='n64-royal-raceway-r');
 assert.deepEqual(rr.records.map(r=>r.time),['1:37.01','1:34.66','1:34.48','1:34.41','1:34.07','1:34.02','1:33.56','1:33.56','1:33.45','1:33.24']);
 const sucha=rr.records.find(r=>r.time==='1:34.41');assert.equal(sucha.playerId,'player-e38199e38184e3819df09f90ba');assert.deepEqual(sucha.laps,['47.06','47.35']);assert.equal(sucha.derivedLap,2);assert.equal(sucha.submittedAt,'2021-06-16T08:37:56.887Z');
 assert.deepEqual(rr.records.find(r=>r.time==='1:34.07').laps,[null,null]);assert.equal(rr.current.recordDate,'2021-06-25');assert.deepEqual(rr.current.laps,['46.67','46.57']);assert.match(rr.current.videoBackup.url,/rmkWw7ilpAk/);
 const dp=courses.find(c=>c.id==='snes-donut-plains-2r');
 assert.deepEqual(dp.records.filter(r=>r.recordDate<'2021-07-01').map(r=>r.time),['1:01.92','1:01.67','1:01.15','1:00.76','1:00.72','1:00.40']);
 assert.deepEqual(dp.records.find(r=>r.time==='1:01.15').laps,[null,null]);assert.deepEqual(dp.records.find(r=>r.time==='1:00.40').laps,['30.22','30.18']);assert.equal(dp.records.find(r=>r.time==='1:00.40').recordDate,'2021-06-29');
 const nVideo=dp.submissions.find(r=>r.time==='1:00.45'&&r.videoVerified);assert(nVideo.dateUnresolved);assert.equal(nVideo.submittedAt,null);assert.deepEqual(nVideo.laps,['30.25','30.20']);assert.match(nVideo.videoBackup.url,/2TDtC0tSvOY/);assert(!dp.records.some(r=>r.time==='1:00.45'));
 const rrm=courses.find(c=>c.id==='3ds-rock-rock-mountain');
 assert.deepEqual(rrm.records.map(r=>r.time),['1:47.53','1:47.31','1:47.03','1:47.01','1:46.99']);
 const hidden=rrm.records.find(r=>r.time==='1:47.01');assert.equal(hidden.playerId,'phillish');assert.equal(hidden.recordDate,null);assert.equal(hidden.submittedAt,null);assert.equal(hidden.durationDays,null);assert(hidden.delayedSubmission);assert.deepEqual(hidden.laps,['53.58','53.43']);
 assert.equal(rrm.records.find(r=>r.time==='1:47.03').durationDays,null);
 assert.equal(rrm.current.recordDate,'2021-06-29');assert.deepEqual(rrm.current.laps,['53.72','53.27']);assert.match(rrm.current.videoBackup.url,/buJwlw5d8qU/);
 const phillVideo=rrm.submissions.find(r=>r.video?.includes('KvnCYsi8Ozg')&&r.videoVerified);assert.equal(phillVideo.time,'1:47.09');assert.deepEqual(phillVideo.laps,['53.69','53.40']);assert.equal(phillVideo.includeInProgression,false);assert(!rrm.records.some(r=>r.time==='1:47.06'));
 for(const r of [...rr.records,...dp.records.filter(r=>r.recordDate<'2021-07-01'),...rrm.records.slice(1)])assert(fs.existsSync('public'+r.proofImageLocal));
});

test('Summer Tour restores the original Twitter date and preserves the faster no-video result',()=>{
 const ci=courses.find(c=>c.id==='rmx-choco-island-1');
 const summer=ci.records.filter(r=>r.recordDate>='2021-06-30'&&r.recordDate<'2021-07-14');
 assert.deepEqual(summer.map(r=>r.time),['1:12.32','1:12.28','1:12.24','1:12.08']);
 assert.deepEqual(summer.map(r=>r.laps),[['36.38','35.94'],['36.25','36.03'],['36.17','36.07'],['36.05','36.03']]);
 const tome=summer[2];assert.equal(tome.playerId,'tomegome');assert.equal(tome.submittedAt,'2021-07-06T12:00:05.000Z');assert.match(tome.source.url,/1412380830387773444/);assert.match(tome.video,/1412384717966508034/);assert.match(tome.videoBackup.url,/sWfK59GisAs/);
 assert.equal(ci.current.submittedAt,'2021-07-13T15:00:30.792Z');assert(!ci.current.video);assert.equal(fastestVideo(ci).time,'1:12.24');assert.equal(fastestVideo(ci).isCurrent,false);
 assert(!ci.records.some(r=>r.time==='1:12.23'));assert(ci.submissions.some(r=>r.time==='1:12.23'&&r.dateUnresolved&&r.submittedAt===null&&r.includeInProgression===false));
 const af=courses.find(c=>c.id==='ds-airship-fortress-r');assert.equal(af.current.recordDate,'2021-01-12');assert.equal(af.current.time,'1:36.44');
 for(const r of summer)assert(fs.existsSync('public'+r.proofImageLocal));
});

test('Los Angeles Tour restores the video-dated WR between Nu11 and DIT and distinguishes adjacent footage',()=>{
 const kd=courses.find(c=>c.id==='n64-kalimari-desert-r');
 assert.deepEqual(kd.records.map(r=>r.time),['1:19.79','1:19.27','1:18.86','1:18.78','1:18.70','1:18.68','1:18.63','1:18.50','1:18.48','1:18.43','1:18.40','1:18.33']);
 const n=kd.records.find(r=>r.time==='1:18.48');assert.equal(n.recordDate,'2021-07-22');assert.equal(n.playerId,'n');assert.deepEqual(n.laps,['40.05','38.43']);assert.equal(n.derivedLap,2);assert.match(n.videoBackup.url,/Run8VHVgXHY/);assert.equal(n.durationDays,2);
 assert.equal(kd.current.submittedAt,'2021-07-28T05:07:15.639Z');assert.deepEqual(kd.current.laps,['39.87','38.46']);assert(!kd.current.video);assert.equal(fastestVideo(kd).time,'1:18.48');assert.equal(fastestVideo(kd).isCurrent,false);
 const mc=courses.find(c=>c.id==='snes-mario-circuit-3');
 assert.deepEqual(mc.records.map(r=>r.time),['1:07.37','1:07.18','1:07.11','1:07.03','1:06.59','1:06.53','1:06.44']);
 assert.equal(mc.current.submittedAt,'2021-07-24T01:16:39.000Z');assert.equal(mc.current.playerId,'tomegome');assert.deepEqual(mc.current.laps,['33.21','33.23']);assert(!mc.current.video);
 const tome=fastestVideo(mc);assert.equal(tome.time,'1:06.61');assert.deepEqual(tome.laps,['33.29','33.32']);assert.equal(tome.isCurrent,false);assert.match(tome.videoBackup.url,/A1T-uTgYl-k/);
 for(const t of ['1:07.06','1:06.68'])assert(mc.submissions.some(r=>r.time===t&&r.dateUnresolved&&r.submittedAt===null&&r.includeInProgression===false));
 for(const r of [...kd.records,...mc.records.slice(2)])assert(fs.existsSync('public'+r.proofImageLocal));
});

test('Mario vs Peach restores original posts and adjacent split replies without equating clips to complete runs',()=>{
 const ci=courses.find(c=>c.id==='gba-cheep-cheep-island');
 const early=ci.records.filter(r=>r.recordDate<'2021-08-11');
 assert.deepEqual(early.map(r=>r.time),['1:13.09','1:12.27','1:12.00','1:11.88','1:11.79']);
 assert.deepEqual(early.find(r=>r.time==='1:12.00').laps,['36.09','35.91']);
 const phill=early.find(r=>r.time==='1:11.88');assert.deepEqual(phill.laps,['35.99','35.89']);assert.match(phill.videoBackup.url,/axMgNvtb5_s/);
 const tome=early.at(-1);assert.equal(tome.submittedAt,'2021-08-04T07:17:10.000Z');assert.deepEqual(tome.laps,['35.94','35.85']);assert(!tome.video);assert(tome.additionalSources.some(s=>s.url.includes('1422818882364997633')));
 assert(ci.submissions.some(r=>r.time==='1:11.84'&&r.dateUnresolved&&r.submittedAt===null&&r.includeInProgression===false));
 const cm=courses.find(c=>c.id==='n64-choco-mountain');const n=cm.records.find(r=>r.time==='1:18.43');assert.equal(n.submittedAt,'2021-08-03T00:24:46.915Z');assert.deepEqual(n.laps,['39.30','39.13']);
 const dated=cm.records.find(r=>r.time==='1:18.38');assert.equal(dated.recordDate,'2021-08-08');assert.equal(dated.submittedAt,null);assert.deepEqual(dated.laps,[null,null]);assert(!cm.records.some(r=>r.time==='1:18.37'));
 const pb=cm.submissions.find(r=>r.video?.includes('mE_v06fSxs4')&&r.videoVerified);assert.equal(pb.time,'1:19.16');assert.equal(pb.includeInProgression,false);assert.match(pb.videoBackup.url,/duJvSl_JVpk/);
 for(const r of [...early,n])assert(fs.existsSync('public'+r.proofImageLocal));
});


test('Later Madrid Drive 3 video preserves the original result date and both evidence links',()=>{
 const c=courses.find(c=>c.id==='madrid-drive-3');
 assert.equal(c.current.time,'1:19.39');assert.equal(c.current.submittedAt,'2026-09-27T13:16:37.874Z');
 assert.deepEqual(c.current.laps,['39.70','39.69']);assert.match(c.current.video,/y5e84zxS4lM/);assert.match(c.current.videoBackup.url,/mI1RpHqJ4So/);
 assert.equal(fastestVideo(c).isCurrent,true);
});


test('Frost restores opening records, a deleted holder, the Kura exchange, and separately attributed recordings',()=>{
 const dk=courses.find(c=>c.id==='wii-dk-summit');
 assert.deepEqual(dk.records.map(r=>r.time),['1:35.93','1:35.51','1:34.99','1:34.40','1:34.28','1:33.94','1:33.79','1:33.64','1:33.57','1:33.37','1:33.22','1:33.09','1:32.97','1:32.90','1:32.81']);
 const unknown=dk.records.find(r=>r.time==='1:35.51');assert(unknown.identityUnresolved);assert.equal(unknown.playerId,'unidentified-runner-frost-2021');assert.equal(unknown.submittedAt,'2021-08-11T06:18:51.388Z');
 const video=dk.records.find(r=>r.time==='1:32.97');assert.deepEqual(video.laps,['46.44','46.53']);assert.equal(video.recordDate,'2021-08-17');assert.match(video.videoBackup.url,/F1bZ7b-Rk6w/);
 assert(!dk.records.some(r=>r.time==='1:32.92'));assert(dk.submissions.some(r=>r.time==='1:32.91'&&r.dateUnresolved&&r.includeInProgression===false));
 const tc=courses.find(c=>c.id==='3ds-toad-circuit-r');assert.deepEqual(tc.records.map(r=>r.time),['1:03.09','1:03.09','1:03.01','1:02.94','1:02.90','1:02.87','1:02.80','1:02.78','1:02.75','1:02.74','1:02.62']);
 assert.deepEqual(tc.records.slice(0,2).map(r=>r.playerId),['tomegome','astre']);
 assert.deepEqual(tc.records.find(r=>r.time==='1:03.01').laps,[null,null]);
 const kura=tc.records.find(r=>r.time==='1:02.90');assert.equal(kura.playerId,'kura');assert.equal(kura.submittedAt,'2021-08-13T10:27:42.285Z');
 const wins=tc.records.find(r=>r.time==='1:02.94');assert.deepEqual(wins.laps,['31.51','31.43']);assert.match(wins.videoBackup.url,/o4qnh0blS_E/);
 const astre=tc.records.find(r=>r.time==='1:02.75');assert.equal(astre.recordDate,'2021-08-15');assert.match(astre.videoBackup.url,/l3-1c-8eZ5M/);
 const former=tc.records.find(r=>r.time==='1:02.74');assert.equal(former.recordDate,null);assert.equal(former.submittedAt,null);assert.deepEqual(former.laps,['31.44','31.30']);assert.equal(fastestVideo(tc).time,'1:02.74');assert.equal(fastestVideo(tc).isCurrent,false);
 assert(!tc.records.some(r=>r.time==='1:02.95'&&r.playerId==='phillish'));
 for(const r of [...dk.records.slice(0,-1),...tc.records.slice(1)])assert(fs.existsSync('public'+r.proofImageLocal));
});

test('Kamek restores exchanges, attributes the reposted sub-minute run, and never dates late footage as a race',()=>{
 const vl=courses.find(c=>c.id==='rmx-vanilla-lake-1');
 const kamek=vl.records.filter(r=>!r.recordDate || r.recordDate<'2022-01-01');
 assert.deepEqual(kamek.map(r=>r.time),['1:03.12','1:03.02','1:02.91','1:02.79','1:02.72','1:02.67','1:02.66','1:02.64','1:02.59','1:02.54','1:02.52','1:02.44']);
 assert.deepEqual(vl.records.find(r=>r.time==='1:02.52').laps,['31.38','31.14']);
 const late=vl.records.find(r=>r.time==='1:02.44');assert.equal(late.recordDate,null);assert.deepEqual(late.laps,['31.31','31.13']);assert.equal(late.durationDays,null);
 assert(!vl.records.some(r=>r.time==='1:02.58'));
 const rr=courses.find(c=>c.id==='snes-rainbow-road-r');
 assert.deepEqual(rr.records.map(r=>r.time),['1:00.16','1:00.10','1:00.09','1:00.06','0:59.99','0:59.94']);
 const repost=rr.records.find(r=>r.time==='0:59.99');assert.equal(repost.playerId,'nu11');assert.equal(repost.recordDate,null);assert.equal(repost.submittedAt,null);assert.equal(repost.observedAt,'2021-09-04T22:44:14.985Z');
 assert.equal(rr.records.find(r=>r.time==='1:00.06').durationDays,null);
 assert(rr.submissions.some(r=>r.time==='0:59.96'&&r.dateUnresolved&&r.includeInProgression===false));
 assert(!rr.records.some(r=>r.playerId==='n'));
 for(const r of [...kamek,...rr.records])assert(fs.existsSync('public'+r.proofImageLocal));
});

test('Space restores original exchanges and ties without turning a repost or slower PB into a WR',()=>{
 const rr=courses.find(c=>c.id==='rmx-rainbow-road-2r');
 const runs=rr.records.filter(r=>r.submittedAt?.startsWith('2021-11'));
 assert.deepEqual(runs.map(r=>r.time),['1:23.95','1:23.65','1:23.45','1:23.44','1:23.15','1:23.02','1:23.02','1:23.01','1:22.86','1:22.85','1:22.70','1:22.69','1:22.58','1:22.51','1:22.33','1:22.30','1:22.22','1:22.14','1:22.03','1:21.96','1:21.91','1:21.84','1:21.75','1:21.75','1:21.71','1:21.71','1:21.69','1:21.60','1:21.57']);
 assert.equal(runs.find(r=>r.time==='1:23.15').submittedAt,'2021-11-19T10:05:28.381Z');
 const nh=runs.find(r=>r.time==='1:22.30');assert.deepEqual(nh.laps,['41.31','40.99']);assert.match(nh.video,/asfPB4daRsA/);
 assert.equal(runs.find(r=>r.time==='1:21.84').submittedAt,'2021-11-21T13:57:38.467Z');
 assert.deepEqual(runs.filter(r=>r.time==='1:21.71').map(r=>r.playerId),['superfx','nu11']);
 assert.equal(runs.filter(r=>r.time==='1:21.60').length,1);assert.equal(runs.find(r=>r.time==='1:21.60').playerId,'n');
 assert(!runs.find(r=>r.time==='1:21.69').video);assert(!runs.some(r=>r.time==='1:22.71'));
 const pb=rr.submissions.find(r=>r.video?.includes('YWMZZBw137A')&&r.videoVerified);assert.equal(pb.includeInProgression,false);assert.deepEqual(pb.laps,['41.34','41.37']);
 assert(rr.submissions.some(r=>r.time==='1:21.88'&&r.dateUnresolved&&r.submittedAt===null&&r.includeInProgression===false));
 const local=runs.find(r=>r.time==='1:21.91');assert(fs.existsSync('public'+new URL(local.video).pathname));assert(local.additionalSources.some(s=>s.url.includes('911957820411371550')));
 const ktb=courses.find(c=>c.id==='snes-koopa-troopa-beach-2');const november=ktb.records.filter(r=>r.submittedAt?.startsWith('2021-11'));assert.deepEqual(november.map(r=>r.time),['0:57.51']);assert.deepEqual(november[0].laps,['28.88','28.63']);
});

test('Holiday restores the DIT exchange from surviving text and dates NHSpeedy original results',()=>{
 const mt=courses.find(c=>c.id==='wii-maple-treeway');const late=mt.records.filter(r=>r.recordDate>='2021-12-01');
 assert.deepEqual(late.map(r=>r.time),['1:45.92','1:45.88','1:45.75']);
 assert.deepEqual(late.map(r=>r.playerId),['nhspeedy','dit','nhspeedy']);
 assert.deepEqual(late.map(r=>r.durationDays),[1,8,4]);
 assert.deepEqual(late[1].laps,['52.78','53.10']);assert.equal(late[1].submittedAt,'2021-12-03T08:59:23.267Z');assert(fs.existsSync('public'+late[1].proofImageLocal));assert(late[1].notes.some(n=>n.includes('HTTP 404')));assert(late[1].notes.some(n=>n.includes('final leaderboard')));
 assert.equal(late[2].submittedAt,'2021-12-11T16:15:12.935Z');assert.deepEqual(late[2].laps,['52.92','52.83']);
 const nita=mt.submissions.find(r=>r.video?.includes('Udm4G22UIJY')&&r.videoVerified);assert.equal(nita.includeInProgression,false);assert.deepEqual(nita.laps,['53.92','53.87']);
 const cm=courses.find(c=>c.id==='n64-choco-mountain-r');assert(!cm.records.some(r=>r.recordDate>='2021-12-01'));
 const pb=cm.submissions.find(r=>r.id?.startsWith('curated-')&&r.video?.includes('1468908639646019585')&&r.videoVerified);assert.equal(pb.time,'1:17.90');assert.equal(pb.includeInProgression,false);assert.deepEqual(pb.laps,['38.79','39.11']);assert.equal(pb.submittedAt.slice(0,10),'2021-12-09');assert(fs.existsSync('public'+pb.proofImageLocal));
});

test('Penguin restores opening WRs and exact original dates without promoting unsupported claims',()=>{
 const vl=courses.find(c=>c.id==='snes-vanilla-lake-2');
 assert.deepEqual(vl.records.map(r=>r.time),['0:33.93','0:33.59','0:32.69','0:32.28','0:32.24','0:31.52','0:31.22']);
 assert.equal(vl.records[0].submittedAt,'2021-12-15T06:31:29.232Z');
 assert.equal(vl.records.find(r=>r.time==='0:31.52').submittedAt,'2021-12-15T19:45:39.102Z');
 assert.deepEqual(vl.records.find(r=>r.time==='0:31.52').laps,['15.97','15.55']);
 assert.equal(vl.current.submittedAt,'2021-12-16T14:48:33.000Z');
 assert.equal(vl.current.durationDays,13);assert.deepEqual(vl.current.laps,['15.66','15.56']);
 assert(!vl.records.some(r=>['0:32.13','0:32.10','0:31.87','0:31.58','0:31.21'].includes(r.time)));
 assert(vl.submissions.some(r=>r.time==='0:31.87'&&r.includeInProgression===false));
 assert(vl.submissions.some(r=>r.time==='0:31.80'&&r.dateUnresolved&&r.submittedAt===null));
 for(const r of vl.records)assert(fs.existsSync('public'+r.proofImageLocal));
 const bc=courses.find(c=>c.id==='gba-bowser-s-castle-2r');const late=bc.records.filter(r=>r.recordDate>='2021-12-01');
 assert.deepEqual(late.map(r=>r.time),['1:19.17']);assert.deepEqual(late[0].laps,['39.44','39.73']);
 assert.equal(late[0].submittedAt,'2021-12-28T11:24:04.189Z');assert.equal(late[0].durationDays,1);assert.equal(late[0].videoAvailability,'unavailable');
 assert(fs.existsSync('public'+late[0].proofImageLocal));
 const pb=bc.submissions.find(r=>r.id.includes('penguin')&&r.time==='1:19.48');assert.equal(pb.includeInProgression,false);assert.deepEqual(pb.laps,['39.54','39.94']);
 const fallback=fastestVideo(bc);assert(fallback);assert.notEqual(fallback.time,'1:19.17');
});
