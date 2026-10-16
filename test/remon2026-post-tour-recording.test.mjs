import test from 'node:test';
import assert from 'node:assert/strict';
import {routeData} from '../lib/data.mjs';
test('REMON post-tour recording exposes preserved proof and separate publication/share clocks',()=>{
 const c=routeData(['course','singapore-speedway-2r']).data;
 assert.equal(c.laterSingapore2026Results.length,1);const r=c.laterSingapore2026Results[0];assert.equal(r.time,'1:24.32');assert.equal(r.submittedAt,'2026-07-10T14:14:39Z');assert.equal(r.videoPublishedAt,'2026-07-10T14:14:39Z');assert.equal(r.videoSharedAt,'2026-10-04T14:12:30.203Z');assert.match(r.videoBackup.url,/media\.mktwrs\.com\/assets\/video\/remon-O6PQyoc156E-playback-/);assert.match(r.proofImageLocal,/review-106/);assert.equal(c.fastestVideo.time,'1:24.32');assert.equal(c.night2026Recording.documentedRecording.time,'1:24.54');assert(!c.night2026SupportingResults.some(x=>x.id===r.id));assert(!c.records.some(x=>x.id===r.id));assert.match(r.evidenceNote,/race date remains unresolved/);
});
