import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Jungle 42.59 preserves the adjacent lap reply instead of citing the screenshot as its split source', () => {
  const course = JSON.parse(fs.readFileSync(new URL('../public/data/courses/snes-mario-circuit-1r.json', import.meta.url)));
  const run = course.records.find(r => r.messageId === '712581323767808010-verified');
  assert.deepEqual(run.laps, ['21.44', '21.15']);
  assert.equal(run.lapSource.messageId, '712582631572897802');
  assert.equal(run.source.messageId, '712581323767808010');
  assert.equal(run.laps.reduce((sum, lap) => sum + Math.round(Number(lap) * 100), 0), run.timeCs);
  assert(run.additionalSources.some(source => source.messageId === run.lapSource.messageId));
});
