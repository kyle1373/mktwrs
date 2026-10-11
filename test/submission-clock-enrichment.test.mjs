import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Execute the importer assignment so a clockless matching sheet entry cannot
// silently erase the original record's documented submission/publication clock.
const source = fs.readFileSync(new URL('../scripts/import-sources.mjs', import.meta.url), 'utf8');
const assignment = source.match(/^\s*r\.submittedAt = .*;$/m)?.[0];
assert(assignment);
const enrichClock = new Function('r', 's', assignment);

test('matching source without a clock retains the documented original clock', () => {
 const record = {submittedAt:'2019-10-25T16:55:00Z'};
 enrichClock(record, {submittedAt:null});
 assert.equal(record.submittedAt,'2019-10-25T16:55:00Z');
 enrichClock(record, {});
 assert.equal(record.submittedAt,'2019-10-25T16:55:00Z');
});
test('explicit selected source clock is used and absent clocks remain unknown', () => {
 const record = {submittedAt:'2019-10-25T16:55:00Z'};
 enrichClock(record, {submittedAt:'2019-10-25T11:40:58.546Z'});
 assert.equal(record.submittedAt,'2019-10-25T11:40:58.546Z');
 const unknown = {};
 enrichClock(unknown, {});
 assert.equal(unknown.submittedAt,null);
});

test('Halloween original clocks survive both public downloads and page projection', async () => {
 const {routeData} = await import('../lib/data.mjs');
 const read = name => JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
 const curated = read('archive/curated-runs.json');
 const dedicated = read('public/data/courses/3ds-toad-circuit.json');
 const aggregate = read('public/data/courses.json').find(c=>c.id===dedicated.id);
 const display = routeData(['course',dedicated.id]).data;
 for (const id of ['637479815665942539-3ds-toad-circuit','original-2019-wr-row-10','original-2019-wr-row-19']) {
  const original = curated.find(r=>r.messageId===id);
  assert(original.submittedAt);
  for (const published of [dedicated,aggregate,display]) {
   const record=published.records.find(r=>r.id==='curated-'+id);
   assert.equal(record.submittedAt,original.submittedAt);
   assert.equal(record.achievedAt,original.achievedAt);
  }
 }
});
