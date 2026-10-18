import test from 'node:test';
import assert from 'node:assert/strict';
import {applyDocumentedDurations} from '../lib/documented-durations.mjs';

test('reviewed post-reset publication preserves tour attribution and the preceding reign', () => {
  const sourceUrl='https://discord.com/channels/1/2/1214815461817196585';
  const timestamp='2024-03-06T06:02:56.277Z';
  const prior={id:'prior',timeCs:8721,documentedAt:'2023-03-07T05:10:58.000Z',documentedDatePrecision:'timestamp'};
  const faster={id:'faster',timeCs:8716,documentedAt:timestamp,documentedDatePrecision:'timestamp',
    source:{url:sourceUrl},tourDateRange:{start:'2024-02-21',end:'2024-03-05'}};
  const course={id:'peach',records:[prior,faster],submissions:[],candidates:[],
    appearances:[{startDate:'2023-02-22',endDate:'2023-03-08'},{startDate:'2024-02-21',endDate:'2024-03-06'}]};
  applyDocumentedDurations([course]);
  assert.equal(prior.durationPrecision,'range');
  faster.standingPublicationReview={timestamp,sourceUrl,reviewArtifact:'review.json'};
  applyDocumentedDurations([course]);
  assert.equal(prior.durationPrecision,'timestamp');
  assert.equal(prior.durationEnd,timestamp);
  assert.ok(Math.abs(prior.durationDays-15.034050925925927)<1e-10);
  assert.deepEqual(faster.tourDateRange,{start:'2024-02-21',end:'2024-03-05'});
  assert.equal(faster.durationDays,0);
  assert.equal(faster.documentedAt,timestamp);
});

test('reviewed standing publication rejects a mismatched clock or source', () => {
  const timestamp='2024-03-06T06:02:56.277Z',sourceUrl='https://discord.com/channels/1/2/3';
  const row={id:'r',timeCs:100,documentedAt:timestamp,documentedDatePrecision:'timestamp',source:{url:sourceUrl},
    standingPublicationReview:{timestamp,sourceUrl:'https://discord.com/channels/1/2/4',reviewArtifact:'review.json'}};
  const course={id:'c',records:[row],submissions:[],candidates:[],appearances:[]};
  assert.throws(()=>applyDocumentedDurations([course]),/Invalid reviewed standing publication/);
  row.standingPublicationReview={timestamp:'2024-03-06T06:03:00.000Z',sourceUrl,reviewArtifact:'review.json'};
  assert.throws(()=>applyDocumentedDurations([course]),/Invalid reviewed standing publication/);
});
