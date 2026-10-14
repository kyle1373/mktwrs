import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=n=>JSON.parse(fs.readFileSync(`public/data/${n}.json`,'utf8'));
const tour=r=>r.tourDateRange?.start==='2023-09-20';
const finals={'athens-dash-3':'1162597423470878732','madrid-drive-3':'1162598591001546913','rome-avanti-3':'1162598789530538094'};
test('Anniversary publishes final opening-day leaders, later improvements and ties with posting dates',()=>{
 const expected={'athens-dash-3':['1:11.95','1:11.95','1:11.93','1:11.88','1:11.77','1:11.73'],'madrid-drive-3':['1:20.71','1:20.69','1:20.25','1:19.88','1:19.73','1:19.45'],'rome-avanti-3':['1:17.69','1:17.39','1:17.27']};
 for(const [cid,times] of Object.entries(expected)){
  const course=read('courses/'+cid);const records=course.records.filter(tour);assert.deepEqual(records.map(r=>r.time),times);assert(records.every(r=>r.recordDate===r.submittedAt.slice(0,10)));assert.equal(course.candidates.length,0);assert(course.records.some(r=>r.id===finals[cid]));
  const p=routeData(['course',cid]).data;assert.equal(p.anniversary2023Recording.worldRecord.id,finals[cid]);
 }
});
test('Anniversary comparisons use available preserved movies separately from unavailable WR footage',()=>{
 for(const [cid,t] of Object.entries({'athens-dash-3':'1:11.77','madrid-drive-3':'1:19.45','rome-avanti-3':'1:17.69'})){
  const c=routeData(['course',cid]).data.anniversary2023Recording;assert.equal(c.documentedRecording.time,t);assert.match(c.documentedRecording.videoBackup.url,/^https:\/\/media.mktwrs.com\/assets\/proof\//);assert.equal(c.recording,null);
 }
 const d=routeData(['course','athens-dash-3']).data;assert.equal(d.anniversary2023Recording.worldRecord.videoAvailability,'unavailable');
});
test('Anniversary recovered Remon image/movie retains result, distinct lap evidence and known share clock',()=>{
 const c=read('courses/madrid-drive-3');const r=c.submissions.find(r=>r.source?.messageId==='1155158290133680229');assert(r);assert.equal(r.time,'1:20.29');assert.equal(r.submittedAt,'2023-09-23T15:06:38.171Z');assert.equal(r.videoSubmittedAt,'2023-09-23T15:07:35.737Z');assert.deepEqual(r.lapSourceDiscrepancyReview.reportedLaps,['40.18','40.11']);assert.deepEqual(r.laps,['40.16','40.13']);assert(!c.records.some(x=>x.id===r.id));
 const rome=read('courses/rome-avanti-3').records.find(r=>r.time==='1:17.69');assert.equal(rome.submittedAt,'2023-09-21T10:48:44.648Z');assert.equal(rome.videoSubmittedAt,'2023-09-22T05:18:53.760Z');assert.deepEqual(rome.laps,['38.78','38.91']);
});
test('Anniversary opening-day UTC rollover and new WR profile ownership remain exact',()=>{
 assert(isReviewedOpeningDay({submittedAt:'2023-09-21T05:52:55.216Z',recordDate:'2023-09-21'},'2023-09-20'));assert(!isReviewedOpeningDay({submittedAt:'2023-09-21T06:00:00Z',recordDate:'2023-09-21'},'2023-09-20'));
 const players=read('players');for(const cid of Object.keys(finals))for(const r of read('courses/'+cid).records.filter(tour))assert(players.find(p=>p.id===r.playerId).records.includes(r.id));
});
