import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyDocumentedDurations} from '../lib/documented-durations.mjs';
const original=JSON.parse(fs.readFileSync(new URL('../public/data/courses/n64-frappe-snowland.json',import.meta.url)));
const id='curated-tomegome-2020-1243066579396386824-original-video-reviewed';
test('Tomegome 1:22.14 gets no reign because the same preserved recording shows an existing 1:22.08 PB; earlier evidence still ends at its posting',()=>{
 const c=structuredClone(original);applyDocumentedDurations([c]);const tome=c.submissions.find(r=>r.id===id);assert.equal(tome.time,'1:22.14');assert.equal(tome.fasterPersonalBestStandingReview.previousBestTimeCs,8208);assert.equal(tome.durationDays,0);assert.equal(tome.durationBounds.maxDays,0);
 const astre=c.submissions.find(r=>r.time==='1:22.40'&&r.recoveredLeaderEvidence);const expected=(Date.parse(tome.documentedAt)-Date.parse(astre.documentedAt))/86400000;assert.ok(Math.abs(astre.durationDays-expected)<1e-10);assert.equal(c.records[0].durationDays,12.791280208333333);
});
test('a no-reign claim cannot use previous-best evidence from a different preserved file',()=>{
 const c=structuredClone(original);c.submissions.find(r=>r.id===id).fasterPersonalBestStandingReview.videoSHA256='different-file';assert.throws(()=>applyDocumentedDurations([c]),/Invalid faster personal-best review/);
});
