import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {routeData} from '../lib/data.mjs';

test('reviewed New Year submissions before the 06:00 UTC close remain visible with original proofs', () => {
  const expected = {
    'ds-airship-fortress-r': ['798768511568183307', '798774980359487488', '798786581355429928', '798787146064330752'],
    'snes-koopa-troopa-beach-2': ['798776769292926977'],
  };
  for (const [courseId, messageIds] of Object.entries(expected)) {
    const c = routeData(['course', courseId]).data;
    const rows = c.newyear2021SupportingResults;
    for (const messageId of messageIds) {
      const r = rows.find(r => r.id.includes(messageId));
      assert(r, `${courseId}: missing final-period submission ${messageId}`);
      assert(Date.parse(r.submittedAt) < Date.parse('2021-01-13T06:00:00Z'));
      assert.match(r.proofImageLocal, /^https:\/\/media\.mktwrs\.com\/assets\/proof\/.+\.(png|jpg)$/);
    }
    assert(!rows.some(r => Date.parse(r.submittedAt) >= Date.parse('2021-01-13T06:00:00Z')));
  }
});

test('protected N video retains source clocks without becoming available footage or a new WR', () => {
  const c = routeData(['course', 'ds-airship-fortress-r']).data;
  const r = c.newyear2021SupportingResults.find(r => r.id.includes('798786581355429928'));
  assert.equal(r.time, '1:36.57');
  assert.equal(r.submittedAt, '2021-01-13T05:32:41.732Z');
  assert.equal(r.videoSharedAt, '2026-10-05T16:48:59.118Z');
  assert.equal(r.videoAvailability, 'unavailable');
  const source = JSON.parse(readFileSync('public/data/courses/ds-airship-fortress-r.json', 'utf8'))
    .submissions.find(source => source.id.includes('798786581355429928'));
  assert.equal(source.videoVerified, false);
  assert.match(r.videoReference, /1349236040318373888/);
  assert(!c.records.some(record => record.id === r.id));
  assert.equal(c.newyear2021Recording.worldRecord.time, '1:36.44');
  assert.equal(c.newyear2021Recording.documentedRecording.time, '1:36.91');
});
