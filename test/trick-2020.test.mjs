import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const course=id=>JSON.parse(fs.readFileSync(new URL(`../public/data/courses/${id}.json`,import.meta.url)));
test('Trick discussion restores the early Neo Bowser City R exchange with run-specific splits',()=>{
 const c=course('3ds-neo-bowser-city-r');
 const restored=c.records.filter(r=>r.messageId?.startsWith('trick-2020-'));
 assert.deepEqual(restored.map(r=>r.time),['1:26.49','1:26.03','1:25.92','1:25.63','1:25.08','1:24.90','1:24.89','1:24.75','1:24.74']);
 assert.deepEqual(restored.find(r=>r.time==='1:24.75').laps,['42.38','42.37']);
 assert.deepEqual(restored.find(r=>r.time==='1:25.92').laps,[null,null]);
 for(const r of restored.filter(r=>r.proofImageLocal))assert(fs.existsSync(new URL('../public'+r.proofImageLocal,import.meta.url)));
});
test('retrospective Tomegome result disqualifies slower later Kazuo runs without losing their media',()=>{
 const c=course('snes-vanilla-lake-1');const tome=c.records.find(r=>r.time==='0:34.72');
 assert.equal(tome.recordDate,'2020-04-25');assert.equal(tome.submittedAt,null);assert.equal(tome.dateEvidence,'retrospective-community-report');assert.equal(tome.durationDays,null);
 assert(!c.records.some(r=>['0:34.79','0:34.75'].includes(r.time)));
 const video=c.submissions.find(r=>r.time==='0:34.75'&&r.playerId==='kazuo'&&r.messageId==='704306358438068365-verified');assert(video);assert.equal(video.includeInProgression,false);assert.equal(video.video,'https://www.youtube.com/watch?v=rSqe5vlbZy8');assert.equal(video.videoVerified,true);
});
test('opening Vanilla Lake exchange preserves original splits and separates reports from achievements',()=>{
 const c=course('snes-vanilla-lake-1');
 const astre=c.records.find(r=>r.messageId==='trick-2020-702434659526770758');
 assert(astre);assert.equal(astre.time,'0:35.40');assert.deepEqual(astre.laps,['17.71','17.69']);assert(astre.proofImageLocal);
 const milky=c.records.find(r=>r.messageId==='trick-2020-702437997290848306');
 assert(milky);assert.equal(milky.time,'0:35.21');assert.equal(milky.recordDate,'2020-04-22');assert.equal(milky.durationDays,0);assert.equal(milky.submittedAt,null);
 assert.equal(milky.dateEvidence,'first-course-availability-and-contemporary-report');
 assert.deepEqual([milky.achievementDateBounds.notBefore,milky.achievementDateBounds.notAfter],['2020-04-22T06:00:00Z','2020-04-22T08:37:49.221Z']);
 assert.equal(milky.observedAt,'2020-04-22T08:37:49.221Z');
});
