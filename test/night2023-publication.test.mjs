import test from 'node:test';
import assert from 'node:assert/strict';
import { routeData } from '../lib/data.mjs';
import { isReviewedOpeningDay } from '../lib/opening-day.mjs';
const course = id => routeData(['course', id]).data;
test('Night Rome chronology uses earlier original video publication', () => {
  const c = course('rome-avanti-2');
  const rows = c.records.filter(r => r.tourDateRange?.start === '2023-06-28');
  assert.deepEqual(rows.map(r => [r.time, r.recordDate]), [
    ['1:19.41', '2023-06-30'], ['1:19.14', '2023-07-01'],
    ['1:18.96', '2023-07-04'], ['1:18.94', '2023-07-11'], ['1:18.87', '2023-07-11']
  ]);
  const earlier = rows.find(r => r.time === '1:18.96');
  assert.equal(earlier.submittedAt, '2023-07-09T12:16:36.649Z');
  assert.equal(earlier.videoPublishedAt, '2023-07-04T08:39:14Z');
  assert.match(earlier.videoBackup.url, /media.mktwrs.com/);
  assert(!rows.some(r => r.time === '1:19.11'));
  assert.equal(c.night2023Recording.documentedRecording.time, '1:18.87');
});
test('Night opening playable day and final submission include the hours before reset', () => {
  const c = course('singapore-speedway-2r');
  const rows = c.records.filter(r => r.tourDateRange?.start === '2023-06-28');
  assert.deepEqual(rows.map(r => r.time), ['1:26.02', '1:25.84', '1:25.68', '1:25.08', '1:24.98']);
  assert(isReviewedOpeningDay(rows[0], '2023-06-28'));
  assert(!isReviewedOpeningDay({...rows[0], submittedAt: '2023-06-29T06:00:00Z'}, '2023-06-28'));
  assert.equal(c.night2023Recording.worldRecord.submittedAt, '2023-07-12T05:58:26.898Z');
  assert.equal(c.night2023Recording.documentedRecording.time, '1:25.08');
  assert.equal(c.night2023Recording.documentedRecording.videoPublishedAt, '2023-07-07T20:09:50Z');
});
test('Night Singapore retains its earlier WR and recording', () => {
  const c = course('singapore-speedway');
  assert.equal(c.night2023Recording.worldRecord.time, '1:09.43');
  assert.equal(c.night2023Recording.worldRecord.recordDate, '2022-01-25');
  assert.equal(c.night2023Recording.recording.time, '1:09.43');
  assert(c.night2023SupportingResults.some(r => r.time === '1:10.75'));
  assert(!c.records.some(r => r.tourDateRange?.start === '2023-06-28'));
});
