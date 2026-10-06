import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = course => JSON.parse(fs.readFileSync(new URL(`../public/data/courses/${course}.json`, import.meta.url)));
test('preserved original result enriches an announcement with an expired remote proof', () => {
  const course = read('ds-luigi-s-mansion');
  const record = course.records.find(r => r.playerId === 'nu11' && r.time === '1:23.14');
  assert.equal(record.recordDate, '2019-11-14');
  assert.deepEqual(record.laps, ['41.67', '41.47']);
  assert.equal(record.proofImageLocal, '/assets/proof/nu11-2019-luigi-mansion-12314-original.webp');
  assert(record.proofImageVerified);
  assert(fs.existsSync(new URL('../public' + record.proofImageLocal, import.meta.url)));
  assert(record.additionalProofImages.some(url => url.includes('785129118449926194')));
  assert.equal(record.videoAvailability, 'unavailable');
});
