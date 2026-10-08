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

test('same-source screenshot and verified video proof both survive record enrichment', () => {
  const record = read('piranha-plant-cove').records.find(r => r.id === '1078514612225441792');
  const proofs = new Set([record.proofImageLocal, ...(record.additionalProofImages || [])]);
  assert(proofs.has('/assets/proof/exploration2023-1076944081760026705.webp'));
  assert(proofs.has('/assets/proof/wins-piranha-plant-cove-10846-original-video.webp'));
  assert.equal(record.submittedAt, '2023-02-19T19:11:17.825Z');
  assert.deepEqual(record.laps, ['34.16', '34.30']);
});
