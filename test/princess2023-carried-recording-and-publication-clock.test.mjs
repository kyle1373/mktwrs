import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
const compare=c=>tourRecordingComparison(c,'tour-97','2023-05-31','2023-06-14');
test('Princess 2023 shows the carried Coconut WR and earlier recording without creating a WR',()=>{
 const c=course('wii-coconut-mall'),d=compare(c);
 assert.equal(d.worldRecord.time,'1:13.93');assert.equal(d.worldRecord.finalDate,'2022-07-13');
 assert.equal(d.documentedRecording.time,'1:14.36');assert.equal(d.documentedRecording.finalDate,'2022-07-10');
 assert.equal(d.documentedRecording.durationDays,0);assert.equal(c.records.some(r=>r.time==='1:14.36'),false);
 assert.match(d.documentedRecording.videoBackup.url,/bangkok2022-y146-coconut-mall-11436-2cdf3ba53eef\.mp4$/);
});
test('Princess Snow Land uses the earlier video publication and pauses WR duration outside tours',()=>{
 const c=course('gba-snow-land-r'),d=compare(c),r=d.worldRecord;
 assert.equal(d.documentedRecording.time,'1:09.09');assert.equal(r.finalDate,'2023-06-07');
 assert.equal(r.documentedAt,'2023-06-07T10:11:13.000Z');assert.ok(Date.parse(r.documentedAt)<Date.parse(r.submittedAt));
 const seconds=r.durationIntervalsGuaranteed.reduce((n,i)=>n+(Date.parse(i.end)-Date.parse(i.start))/1000,0);
 assert.ok(Math.abs(r.durationDays-seconds/86400)<1e-9);
 assert.ok(r.durationDays<(Date.parse('2026-09-30T06:00:00Z')-Date.parse(r.documentedAt))/86400000);
});
