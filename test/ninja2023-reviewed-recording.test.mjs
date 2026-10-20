import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tourRecordingComparison} from '../lib/video.mjs';
const course=id=>JSON.parse(fs.readFileSync(`public/data/courses/${id}.json`,'utf8'));
const compare=c=>tourRecordingComparison(c,'tour-92','2023-03-22','2023-04-05');
test('Ninja 2023 restores the Wario result-reviewed video without upgrading continuity',()=>{
 const d=compare(course('3ds-wario-shipyard'));
 assert.equal(d.worldRecord.time,'1:33.45');assert.equal(d.documentedRecording.time,'1:33.45');
 assert.equal(d.documentedRecording.finalDate,'2023-04-03');
 assert.equal(d.documentedRecording.videoScope,'result-reviewed');
 assert.match(d.documentedRecording.videoBackup.url,/ninja2023-6bb8456c04ac096129e5\.mp4$/);
});
test('Ninja 2023 keeps the qualifying Rainbow video separate from the faster title-only reference',()=>{
 const c=course('wii-rainbow-road'),d=compare(c);
 assert.equal(d.worldRecord.time,'1:15.60');assert.equal(d.documentedRecording.time,'1:15.83');
 assert.equal(d.documentedRecording.playerId,'wins');
 assert.equal(c.records.filter(r=>r.playerId==='wins'&&r.time==='1:15.83').length,1);
});
