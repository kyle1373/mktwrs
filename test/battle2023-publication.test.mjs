import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=n=>JSON.parse(fs.readFileSync(`public/data/${n}.json`,'utf8'));
test('Battle returning tracks retain carried WR and two dated Shine improvements',()=>{
 const d1=read('courses/snes-donut-plains-1r'),d2=read('courses/snes-donut-plains-2');
 assert.equal(d1.records.filter(r=>r.tourDateRange?.start==='2023-10-04').length,0);
 const rs=d2.records.filter(r=>r.tourDateRange?.start==='2023-10-04');assert.deepEqual(rs.map(r=>r.time),['1:00.60','1:00.50']);
 assert.deepEqual(rs.map(r=>r.id),['curated-1160796890187706408-battle2023-video-reviewed','1168941274380914769']);
 assert.deepEqual(rs.map(r=>r.recordDate),['2023-10-09','2023-10-10']);assert.equal(d2.candidates.filter(r=>r.time==='1:00.60').length,0);
 for(const r of rs)assert(read('players').find(p=>p.id===r.playerId).records.includes(r.id));
});
test('Battle comparison separates carried WR from earlier available recording',()=>{
 const d=routeData(['course','snes-donut-plains-1r']).data.battle2023Recording;assert.equal(d.worldRecord.time,'0:49.15');assert.equal(d.worldRecord.playerId,'hilton');assert.equal(d.documentedRecording.time,'0:49.31');assert.equal(d.documentedRecording.playerId,'nu11');assert.match(d.documentedRecording.videoBackup.url,/media\.mktwrs\.com\/assets\/video\//);assert.equal(d.recording,null);
 const p=routeData(['course','snes-donut-plains-2']).data.battle2023Recording;assert.equal(p.worldRecord.time,'1:00.50');assert.equal(p.documentedRecording.time,'1:00.50');assert.equal(p.recording,null);
});
test('Battle preserves screenshot, original movies and distinct known share clock',()=>{
 const c=read('courses/snes-donut-plains-2');for(const t of ['1:00.60','1:00.50']){const r=c.records.find(r=>r.time===t);assert.match(r.proofImageLocal,/media\.mktwrs\.com/);assert.match(r.videoBackup.url,/media\.mktwrs\.com/);assert(r.videoPublishedAt);assert.equal(r.videoScopeReview.startToFinishContinuityVerified,false);}
 const r=c.records.find(r=>r.time==='1:00.50');assert.equal(r.submittedAt,'2023-10-10T04:23:13.869Z');assert.equal(r.videoSubmittedAt,'2023-10-10T04:30:06.128Z');
 const early=c.records.find(r=>r.time==='1:00.60');assert.equal(early.submittedAt,'2023-10-09T04:32:25.184Z');assert.equal(early.videoSubmittedAt,undefined);
});
test('Battle opening-day rule uses the exact 06 UTC boundary',()=>{
 assert(isReviewedOpeningDay({submittedAt:'2023-10-05T05:59:59Z',recordDate:'2023-10-05'},'2023-10-04'));assert(!isReviewedOpeningDay({submittedAt:'2023-10-05T06:00:00Z',recordDate:'2023-10-05'},'2023-10-04'));
});
