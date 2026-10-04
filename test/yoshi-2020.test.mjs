import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
function assertPublicationDateOrUnknown(record) {
  if (record.dateBasis === "first-screenshot-publication") {
    const first = [record.evidencePublishedAt, record.observedAt, record.submittedAt].filter(Boolean).sort()[0];
    assert.equal(record.recordDate, first.slice(0, 10));
    assert(record.proofImageVerified);
    assert(record.dateUnresolved, "publication date preserves race date uncertainty");
  } else assert.equal(record.recordDate, record.achievedAt || null);
}

const course = id => JSON.parse(fs.readFileSync(new URL(`../public/data/courses/${id}.json`,import.meta.url)));
test('Yoshi Tour preserves missing Daisy Hills R improvements and undated predecessor', () => {
 const c=course('3ds-daisy-hills-r');
 assert.deepEqual(c.records.filter(r=>r.achievedAt==='2020-04-13').map(r=>r.time),['1:21.69','1:21.54','1:21.48']);
 const first=c.records.find(r=>r.time==='1:21.79');assert.equal(first.recordDate,'2020-04-11');assert.match(first.proofImageLocal,/yoshi-2020-/);assert(fs.existsSync(new URL('../public'+first.proofImageLocal,import.meta.url)));
 const hidden=c.records.find(r=>r.time==='1:21.18');assert(hidden);assertPublicationDateOrUnknown(hidden);assert.equal(hidden.durationDays,null);
 const kazuo=c.records.find(r=>r.time==='1:21.28'&&r.playerId==='kazuo');assert.equal(kazuo.videoVerified,true);assert.deepEqual(kazuo.laps,['40.60','40.68']);
 assert(!c.records.some(r=>r.time==='1:21.09'),'later demonstration must not become a WR');
});
test('Yoshi Kalimari predecessors do not receive dates from later reposts', () => {
 const c=course('n64-kalimari-desert');
 for(const time of ['1:15.83','1:15.63','1:15.48','1:15.36']){const r=c.records.find(r=>r.time===time);assert(r);assertPublicationDateOrUnknown(r);assert.equal(r.durationDays,null);}
 const astre=c.records.find(r=>r.time==='1:15.52');assert.equal(astre.recordDate,'2020-04-08');assert.deepEqual(astre.laps,['37.77','37.75']);assert.equal(astre.durationDays,null,'undated successor makes this reign unresolved');
 const final=c.records.find(r=>r.time==='1:15.29');assert.equal(final.recordDate,'2020-04-11');assert.deepEqual(final.laps,['37.66','37.63']);
 assert(!c.records.some(r=>r.time==='1:15.47'),'late relative-age screenshot cannot establish the earlier reign');
});
