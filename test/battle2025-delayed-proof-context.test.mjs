import test from 'node:test';
import assert from 'node:assert/strict';
import {routeData} from '../lib/data.mjs';
for(const [cid,time,posted,uploaded,sha,header] of [
 ['wii-dry-dry-ruins','1:21.39','2025-10-06T14:39:01.236Z','2025-10-06T14:39:01.177Z','431e8aa3620e2653ea86','July 10'],
 ['piranha-plant-cove-2r','1:34.16','2025-10-06T14:37:49.929Z','2025-10-06T14:37:49.904Z','71002fda71ddaf2d436f','July 14']]){
 test(cid+' exposes the preserved repost with source clocks and no WR promotion',()=>{
  const c=routeData(['course',cid]).data;assert.equal(c.battle2025DelayedOtherTourResults.length,1);const r=c.battle2025DelayedOtherTourResults[0];assert.equal(r.time,time);assert.equal(r.submittedAt,posted);assert.equal(r.proofUploadedAt,uploaded);assert(r.proofImageLocal.startsWith('https://media.mktwrs.com/'));assert(r.proofImageLocal.includes(sha));assert(r.evidenceNote.includes(header));assert.match(r.evidenceNote,/original race date remains unresolved/);assert.match(r.evidenceNote,/no new WR credit/);assert(!c.records.some(x=>x.id===r.id));
 });
}
