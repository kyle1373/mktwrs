import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Execute the generator's boundary calculation without regenerating unrelated data.
const source = fs.readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
const start = source.indexOf('    r.durationEnd = nextRecords.length');
const end = source.indexOf('    r.durationDays =', start);
assert(start >= 0 && end > start);
const boundary = new Function('nextRecords', 'r', source.slice(start, end) + '\nreturn r.durationEnd;');

test('a historical reign with an undated successor has an unknown end date', () => {
  assert.equal(boundary([{recordDate:null}], {}), null);
  assert.equal(boundary([{recordDate:'2019-10-29',dateUnresolved:true}], {}), null);
  assert.equal(boundary([{recordDate:'2019-10-29',delayedSubmission:true}], {}), null);
  assert.equal(boundary([{recordDate:'2019-10-29'}, {recordDate:null}], {}), null);
});

test('resolved successors end the reign at the earliest documented date', () => {
  assert.equal(boundary([{recordDate:'2019-10-30'}, {recordDate:'2019-10-29'}], {}), '2019-10-29');
  assert.equal(boundary([], {}), new Date().toISOString().slice(0,10));
});
