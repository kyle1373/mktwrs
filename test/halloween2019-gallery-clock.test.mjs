import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {historyEvents} from '../public/history.mjs';
import {recordChronology} from '../lib/video.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const course=read('public/data/courses/gcn-dino-dino-jungle.json');
const source=read('artifacts/halloween2019-dark13546-original-result-image-and-cet-window-review-20261019.json');
const id='curated-639823450353041419-verified';
test('original CET new-record image minute converts across UTC midnight without inventing seconds',()=>{
 const record=course.records.find(r=>r.id===id),proof=source.originalNewRecordImage;
 const utc=Date.parse(source.localSourceDate+'T'+proof.freshVisualReview.galleryOriginalImageMinute+':00'+source.utcOffset);
 assert.equal(record.time,proof.freshVisualReview.currentRun);
 assert.equal(record.finalDate,new Date(utc).toISOString().slice(0,10));
 assert.equal(record.documentedAt,null);
 assert.equal(record.documentedDateTimezone,'UTC');
 assert.equal(Date.parse(record.durationBounds.start.earliest),utc);
 assert.equal(Date.parse(record.durationBounds.start.latest),utc+60000);
 assert.equal(record.durationBounds.start.exact,false);
 assert.ok(Math.abs(record.durationBounds.maxDays-record.durationBounds.minDays-1/1440)<1e-10);
});
test('WR and matching submission share the corrected proof while retaining later publication clocks',()=>{
 const r=course.records.find(r=>r.id===id),s=course.submissions.find(r=>r.id===id);
 assert.equal(r.proofImageLocal,source.primaryImageURL);
 assert.equal(s.proofImageLocal,r.proofImageLocal);
 assert.equal(s.finalDate,r.finalDate);
 assert.equal(r.preservedImageContentReview.currentRunShown,'1:35.46');
 assert.equal(r.preservedImageContentReview.previousBestShown,'1:35.47');
 assert.equal(r.previousImageContentDisposition.currentRunShown,'1:35.48');
 assert.equal(r.submittedAt,null);
 assert.equal(r.evidencePublishedAt,'2019-10-31T20:01:22.149Z');
 assert.equal(r.screenshotSourceEvents[1].postedAt,'2019-11-01T13:49:57.909Z');
 assert.equal(course.records.filter(r=>r.playerId==='dark'&&r.time==='1:35.46').length,1);
});
test('actual client projection retains the known UTC minute and corrected public date',()=>{
 const projected=routeData(['course','gcn-dino-dino-jungle']).data.records.find(r=>r.id===id);
 assert.equal(projected.finalDate,'2019-10-28');
 assert.equal(projected.documentedLocalWindow.start,'2019-10-28T23:05');
 assert.equal(projected.documentedLocalWindow.end,'2019-10-28T23:06');
 assert.equal(projected.documentedDateTimezone,'UTC');
 assert.equal(projected.documentedDatePrecision,'period');
 assert.equal(projected.proofImageLocal,source.primaryImageURL);
});

test('known UTC source window orders Dark after earlier same-day WRs in the history table',()=>{
 const events=historyEvents(course,read('public/data/tours.json'),'2026-09-30T06:00:00Z',{publishedRecords:true});
 const earlier=events.findIndex(e=>e.id==='curated-original-2019-wr-row-50');
 assert.ok(earlier>=0);assert.ok(events.findIndex(e=>e.id===id)>earlier);
 const r=course.records.find(r=>r.id===id),prev=course.records.find(r=>r.id==='curated-original-2019-wr-row-50');
 assert.ok(recordChronology(r,prev)>0);
 assert.equal(r.documentedAt,null);
});
test('UTC source minute before reset sorts before the tour-end clock without inventing an exact timestamp',()=>{
 const r={id:'minute',recordDate:'2022-05-18',finalDate:'2022-05-18',documentedAt:null,documentedDateTimezone:'UTC',documentedLocalWindow:{start:'2022-05-18T05:59',end:'2022-05-18T06:00'},timeCs:6000,status:'community-wr'};
 const events=historyEvents({records:[r],appearances:[{tourId:'tour',startDate:'2022-05-04',endDate:'2022-05-18'}]},[{id:'tour',name:'Tour'}],'2022-05-18T07:00:00Z');
 assert.ok(events.findIndex(e=>e.id==='minute')<events.findIndex(e=>e.id==='tour-end'));
 assert.equal(r.documentedAt,null);
});
