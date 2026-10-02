import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url)));

test('recovered videos enrich historical records without replacing original submission dates', () => {
  const peach = read('public/data/courses/ds-peach-gardens.json').records.find(r => r.time === '1:26.58');
  assert.match(peach.video, /1GrmZnTkaDY/);
  assert.equal(peach.videoVerified, true);
  assert.equal(peach.submittedAt, '2023-12-06T10:51:58.143Z');
  const ghost = read('public/data/courses/snes-ghost-valley-1r.json').records.find(r => r.time === '0:40.59' && r.playerId === 'superfx');
  assert.match(ghost.video, /superfx-gv1r-4059-20200910.mp4/);
  assert.match(ghost.videoBackup.url, /fm9lEZ59ZiI/);
  assert.equal(ghost.recordDate, '2020-09-10');
  assert.deepEqual(ghost.laps, ['20.37', '20.22']);
});

test('dated Sucha intermediate Luigi Raceway WR precedes the faster next-day record', () => {
  const records = read('public/data/courses/n64-luigi-raceway-r.json').records;
  const prior = records.find(r => r.time === '1:11.87');
  const next = records.find(r => r.time === '1:11.86');
  assert.equal(prior.recordDate, '2024-06-24');
  assert.equal(next.recordDate, '2024-06-25');
  assert.match(prior.video, /16vI7eIWw-4/);
  assert.deepEqual(prior.laps, ['34.93', '36.94']);
});
