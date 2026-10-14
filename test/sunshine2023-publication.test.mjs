import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
test('Sunshine opening window includes hours before July27 rollover',()=>{
 assert(isReviewedOpeningDay({submittedAt:'2023-07-27T05:59:59Z',recordDate:'2023-07-27'},'2023-07-26'));
 assert(!isReviewedOpeningDay({submittedAt:'2023-07-27T06:00:00Z',recordDate:'2023-07-27'},'2023-07-26'));
});
test('Daisy publishes four leaders and a slower documented movie without duplicate receipt result',()=>{
 const c=routeData(['course','wii-daisy-circuit']).data;
 assert.deepEqual(c.records.filter(r=>r.tourDateRange?.start==='2023-07-26').map(r=>r.time),['1:18.60','1:18.43','1:18.37','1:18.30']);
 const q=c.sunshine2023Recording;
 assert.equal(q.worldRecord.time,'1:18.30');assert.equal(q.documentedRecording.time,'1:18.31');assert.equal(q.recording,null);
 assert.equal(q.documentedRecording.submittedAt,'2023-08-05T12:09:30.590Z');assert.equal(q.documentedRecording.videoPublishedAt,'2023-08-05T12:36:22Z');assert.equal(q.documentedRecording.correctedReceiptAt,'2023-08-05T12:51:55.163Z');
 assert.match(q.documentedRecording.videoBackup.url,/media\.mktwrs\.com/);
 assert.equal(c.sunshine2023SupportingResults.filter(r=>r.time==='1:18.31' && r.playerId==='player-e38199e38184e3819df09f90ba').length,1);
});
test('Koopa2R publishes six leaders and excludes the incorrect Daisy receipt',()=>{
 const c=routeData(['course','snes-koopa-troopa-beach-2r']).data;
 assert.deepEqual(c.records.filter(r=>r.tourDateRange?.start==='2023-07-26').map(r=>[r.time,r.recordDate]),[['0:57.93','2023-07-27'],['0:57.73','2023-07-29'],['0:57.63','2023-07-31'],['0:57.61','2023-08-02'],['0:57.57','2023-08-06'],['0:57.55','2023-08-06']]);
 assert.equal(c.sunshine2023Recording.documentedRecording,null);
 assert(!c.sunshine2023SupportingResults.some(r=>r.id==='discord-1137356709413789786'));
 const raw=JSON.parse(fs.readFileSync('public/data/courses/snes-koopa-troopa-beach-2r.json','utf8'));
 assert.equal(raw.submissions.find(r=>r.id==='discord-1137356709413789786').status,'erroneous-reported-input');
});
