import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Publication consumes reviewed data. Importing raw sources is a separate,
// explicit operation and must never silently replace these files at deploy.
const data = path.resolve('public/data');
const courses = JSON.parse(fs.readFileSync(path.join(data, 'courses.json'), 'utf8'));
const ids = new Set();
let records = 0;
const cutoff = Date.parse('2026-09-30T06:00:00Z');
for (const course of courses) {
  assert(!ids.has(course.id), `Duplicate published course: ${course.id}`);
  ids.add(course.id);
  const canonical = JSON.parse(fs.readFileSync(path.join(data, 'courses', `${course.id}.json`), 'utf8'));
  assert.deepEqual(course, canonical, `Aggregate differs from reviewed course: ${course.id}`);
  for (const row of course.records) {
    const label = `${course.id}/${row.id}`;
    assert(/^\d{4}-\d{2}-\d{2}$/.test(row.finalDate || ''), `Missing single display date: ${label}`);
    assert(new Date(row.finalDate).toISOString().slice(0, 10) === row.finalDate, `Invalid display date: ${label}`);
    assert(Number.isFinite(row.durationDays) && row.durationDays >= 0, `Missing duration: ${label}`);
    assert(Number.isFinite(row.durationBounds?.minDays) && Number.isFinite(row.durationBounds?.maxDays)
      && row.durationBounds.minDays >= 0 && row.durationBounds.maxDays >= row.durationBounds.minDays,
    `Invalid documented duration bounds: ${label}`);
    records++;
  }
  for (const appearance of course.appearances || []) {
    const start = Date.parse(`${appearance.startDate}T06:00:00Z`);
    const end = Date.parse(`${appearance.endDate}T06:00:00Z`);
    assert(Number.isFinite(start) && Number.isFinite(end) && start < end && end <= cutoff,
      `Invalid playable tour clock: ${course.id}/${appearance.tourId}`);
  }
}
const files = fs.readdirSync(path.join(data, 'courses')).filter(file => file.endsWith('.json'));
assert.equal(files.length, ids.size, 'Published aggregate omits a canonical course');
console.log(`Reviewed archive validated: ${ids.size} courses, ${records} WR entries; publication does not regenerate source data.`);
