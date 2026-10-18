import test from 'node:test';
import assert from 'node:assert/strict';
import {applyDocumentedDurations} from '../lib/documented-durations.mjs';
test('a separately reviewed later run with the same runner and total does not inherit an earlier WR reign',()=>{
 const original={id:'old',playerId:'neko',timeCs:9570,documentedAt:'2023-12-29T10:11:25.056Z',documentedDatePrecision:'timestamp'};
 const later={id:'later',playerId:'neko',timeCs:9570,documentedAt:'2024-12-25T17:19:21.009Z',distinctPerformanceReview:{priorRecordId:'old',reviewArtifact:'review.json'}};
 const receipt={...original,id:'receipt'};
 const c={id:'koopa',records:[original,{id:'faster',playerId:'neko',timeCs:9565,documentedAt:'2024-01-02T11:32:29.256Z',documentedDatePrecision:'timestamp'}],submissions:[later,receipt],appearances:[{startDate:'2023-12-27',endDate:'2024-01-10'},{startDate:'2024-12-25',endDate:'2025-01-08'}]};
 applyDocumentedDurations([c]);assert.ok(original.durationDays>0);assert.equal(later.durationDays,0);assert.deepEqual(later.durationIntervals,[]);assert.equal(receipt.durationDays,original.durationDays);
 assert.throws(()=>applyDocumentedDurations([{...c,submissions:[{...later,distinctPerformanceReview:{priorRecordId:'missing',reviewArtifact:'review.json'}}]}]),/Invalid distinct performance review/);
});
