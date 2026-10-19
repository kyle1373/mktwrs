import test from 'node:test';
import assert from 'node:assert/strict';
import {applyFinalDates} from '../lib/final-dates.mjs';
import {applyDocumentedDurations} from '../lib/documented-durations.mjs';

test('a confirmed CEST submission minute bounds both reigns without inventing seconds', () => {
  const course={id:'ghost',appearances:[{startDate:'2022-07-13',endDate:'2022-07-27'}],
    records:[{id:'previous',playerId:'previous',time:'0:40.41',timeCs:4041,submittedAt:'2022-07-20T02:02:44.150Z'},
      {id:'kirio',playerId:'kirio',time:'0:40.39',timeCs:4039},
      {id:'next',playerId:'next',time:'0:40.36',timeCs:4036,submittedAt:'2022-07-27T05:35:00.315Z'}],
    submissions:[],candidates:[]};
  const evidence={courseId:'ghost',id:'kirio',playerId:'kirio',time:'0:40.39',
    utcWindow:{start:'2022-07-24T20:36',end:'2022-07-24T20:37'},basis:'original-submission-minute'};
  applyFinalDates([course],[evidence]);applyDocumentedDurations([course]);
  const previous=course.records[0],kirio=course.records[1];
  assert.equal(kirio.finalDate,'2022-07-24');assert.equal(kirio.documentedAt,null);
  assert.equal(kirio.documentedDateTimezone,'UTC');
  assert.equal(kirio.durationBounds.start.earliest,'2022-07-24T20:36:00.000Z');
  assert.equal(kirio.durationBounds.start.latest,'2022-07-24T20:37:00.000Z');
  assert.equal(previous.durationBounds.end.earliest,'2022-07-24T20:36:00.000Z');
  assert.equal(previous.durationBounds.end.latest,'2022-07-24T20:37:00.000Z');
  assert.equal(Math.floor(kirio.durationDays),2);
  assert.ok(Math.abs(kirio.durationBounds.maxDays-kirio.durationBounds.minDays-1/1440)<1e-12);
  assert.throws(()=>applyFinalDates([course],[{...evidence,timestamp:'2022-07-24T20:36:00Z'}]),/does not match/);
  assert.throws(()=>applyFinalDates([course],[{...evidence,utcWindow:{start:'2022-07-24T20:37',end:'2022-07-24T20:36'}}]),/does not match/);
});
