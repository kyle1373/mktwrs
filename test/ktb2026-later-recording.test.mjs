import test from 'node:test';
import assert from 'node:assert/strict';
import {routeData} from '../lib/data.mjs';
test('Later KTB recording preserves separate publication and report clocks outside Sunshine comparison',()=>{
 const c=routeData(['course','snes-koopa-troopa-beach-2r']).data;
 assert.equal(c.laterKtb2026Results.length,1);assert.equal(c.fastestVideo.time,'0:57.15');assert.equal(c.sunshine2026Recording.documentedRecording.time,'0:57.33');
 const r=c.laterKtb2026Results[0];assert.equal(r.time,'0:57.15');assert.equal(r.submittedAt,'2026-10-06T17:08:35.817Z');assert.equal(r.videoPublishedAt,'2026-08-22T20:24:42Z');assert.equal(r.videoSharedAt,'2026-10-06T17:08:35.817Z');assert.match(r.videoBackup.url,/playback-/);assert.match(r.proofImageLocal,/media\.mktwrs\.com/);assert.match(r.evidenceNote,/race date remains unresolved/);assert(!c.records.some(x=>x.id===r.id));assert(!c.sunshine2026SupportingResults.some(x=>x.id===r.id));assert.notEqual(c.sunshine2026Recording.documentedRecording.id,r.id);
});
