import test from 'node:test';
import assert from 'node:assert/strict';
import {applyReviewedPublicationPatches} from '../scripts/reviewed-publication-patches.mjs';
test('retains reviewed evidence fields and restores a matching unresolved candidate', () => {
 const row={id:'a',time:'1:23.30',playerId:'dit',notes:['raw']};
 const courses=[{id:'berlin',records:[],submissions:[row],candidates:[]}];
 applyReviewedPublicationPatches(courses,{rows:[{courseId:'berlin',collection:'submissions',id:'a',time:row.time,playerId:row.playerId,set:{notes:['reviewed'],videoSubmittedAt:'2026-08-23'},unset:['video']},{courseId:'berlin',collection:'candidates',id:'a',time:row.time,playerId:row.playerId,restoreCandidate:true,set:{...row,status:'reconstructed-contender'}}]});
 assert.equal(row.videoSubmittedAt,'2026-08-23');assert.deepEqual(row.notes,['reviewed']);assert.equal(courses[0].candidates[0].status,'reconstructed-contender');
});
test('fails if a reviewed patch would attach evidence to a different result', () => {
 const courses=[{id:'berlin',records:[{id:'a',time:'1:23.31',playerId:'dit'}]}];
 assert.throws(()=>applyReviewedPublicationPatches(courses,{rows:[{courseId:'berlin',collection:'records',id:'a',time:'1:23.30',playerId:'dit',set:{}}]}),/mismatch/);
});
