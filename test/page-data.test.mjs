import test from 'node:test';
import assert from 'node:assert/strict';
import {archive,publicationArchive,routeData} from '../lib/data.mjs';
import {courseStatistics} from '../public/history.mjs';
process.env.NODE_ENV='production';
const raw=archive(),published=publicationArchive();
test('homepage keeps final dates and usable proof links under 150 KB',()=>{
 const props=routeData();assert.ok(Buffer.byteLength(JSON.stringify(props))<150000);assert.equal(props.tours.length,0);
 assert.deepEqual(props.data.flatMap(c=>c.currentHolders.map(r=>r.id)),published.courses.flatMap(c=>c.currentHolders.map(r=>r.id)));
 for(const c of props.data)for(const r of c.currentHolders){
  const original=raw.courses.find(x=>x.id===c.id).currentHolders.find(x=>x.id===r.id);
  assert.equal(r.finalDate,original.finalDate);assert.ok(props.players.some(p=>p.id===r.playerId));
  for(const k of ['time','durationDays','video','proofImage','proofImageLocal'])assert.deepEqual(r[k],original[k]);
  assert.equal(r.videoBackup?.url,original.videoBackup?.url);
 }
});
test('all 142 compact course payloads preserve published history, final dates and WR statistics',()=>{
 assert.equal(published.courses.length,142);
 for(const c of published.courses){
  const p=routeData(['course',c.id]);assert.equal(p.data.submissions,undefined);assert.equal(p.tours.length,new Set(c.appearances.map(a=>a.tourId)).size);
  assert.deepEqual(courseStatistics(p.data.records,p.players),courseStatistics(c.records,published.players));
  assert.deepEqual(p.data.records.map(r=>[r.id,r.time,r.playerId,r.finalDate,r.source?.url,r.laps]),c.records.map(r=>[r.id,r.time,r.playerId,r.finalDate,r.source?.url,r.laps]));
  for(const r of [...p.data.records,...p.data.bestHolders,...p.data.hammerRecoveredProgression,p.data.fastestVideo].filter(Boolean)){
   assert.match(r.finalDate,/^\d{4}-\d{2}-\d{2}$/);assert.ok(p.players.some(x=>x.id===r.playerId));
  }
 }
});
test('player pages apply the same opening-day history policy and retain current WR flags',()=>{
 const id='tomegome',p=routeData(['player',id]);assert.equal(p.data.records.length,published.courses.flatMap(c=>c.records.filter(r=>r.playerId===id)).length);
 assert.equal(p.data.avatar,raw.players.find(x=>x.id===id).avatar);
 for(const r of p.data.records){const c=published.courses.find(c=>c.id===r.courseId);assert.equal(r.isCurrent,c.currentHolders.some(h=>h.playerId===r.playerId&&h.timeCs===r.timeCs));}
});
test('compact proof metadata preserves playable backup URLs; full integrity metadata stays in the archive',()=>{
 for(const c of published.courses){const p=routeData(['course',c.id]);for(const r of p.data.records){const original=c.records.find(x=>x.id===r.id);assert.equal(r.videoBackup?.url,original.videoBackup?.url);assert.equal(r.videoBackup?.status,original.videoBackup?.status);assert.equal(r.videoBackup?.sha256,undefined);}}
 assert.ok(raw.courses.some(c=>c.records.some(r=>r.videoBackup?.sha256)));
});
