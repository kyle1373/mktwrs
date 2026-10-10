import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileReviewedSubmission} from '../scripts/import-sources.mjs';

test('reviewed source enriches its exact sheet row without duplicating or restoring disputed splits', () => {
  const sheet = {id:'sheet-KM19',courseId:'koopa',playerId:'heria',timeCs:5807,
    laps:['28.96','29.01'],source:{url:'sheet'},submittedAt:null};
  const other = {id:'later-rerun',courseId:'koopa',playerId:'heria',timeCs:5807};
  const course = {submissions:[sheet,other]};
  const proof = {id:'curated-original',courseId:'koopa',playerId:'heria',timeCs:5807,
    laps:[null,null],source:{url:'discord'},submittedAt:'2020-12-31T13:49:58.100Z',
    video:null,videoVerified:false,publicSubmissionReconciliation:{canonicalId:'sheet-KM19'}};
  assert.equal(reconcileReviewedSubmission(course,proof),sheet);
  assert.equal(course.submissions.length,2);
  assert.equal(sheet.id,'sheet-KM19');
  assert.deepEqual(sheet.laps,[null,null]);
  assert.equal(sheet.submittedAt,proof.submittedAt);
  assert.deepEqual(sheet.additionalSources,[{url:'sheet'}]);
  assert.equal(course.submissions[1],other);
  reconcileReviewedSubmission(course,proof);
  assert.equal(course.submissions.length,2);
  assert.equal(sheet.additionalSources.filter(s=>s.url==='sheet').length,1);
});

test('explicit reconciliation refuses wrong runner, total, course or missing canonical row', () => {
  const original={id:'sheet',courseId:'koopa',playerId:'heria',timeCs:5807};
  for (const change of [{playerId:'other'},{timeCs:5808},{courseId:'airship'},
    {publicSubmissionReconciliation:{canonicalId:'missing'}}]) {
    const course={submissions:[{...original}]};
    assert.throws(()=>reconcileReviewedSubmission(course,{...original,id:'curated',
      publicSubmissionReconciliation:{canonicalId:'sheet'},...change}),/mismatch/);
    assert.deepEqual(course.submissions,[original]);
  }
});

test('unreconciled equal-time reruns remain separate submissions', () => {
  const course={submissions:[{id:'old',playerId:'runner',timeCs:5807}]};
  const later={id:'new',playerId:'runner',timeCs:5807};
  reconcileReviewedSubmission(course,later);
  assert.equal(course.submissions.length,2);
});

test('explicit reviewed identities can originate in curated sources without name alias merging', async () => {
  const {reviewedPlayer}=await import('../scripts/import-sources.mjs');
  const players=new Map();
  const entry={playerId:'discord-123',player:'Ivan🔥',discordAccountId:'123'};
  const p=reviewedPlayer(entry,players,()=>{throw Error('unexpected alias lookup');});
  assert.equal(p.id,'discord-123');
  assert.equal(p.discordId,'123');
  assert.equal(reviewedPlayer(entry,players,()=>null),p);
  assert.throws(()=>reviewedPlayer({...entry,discordAccountId:'456'},players,()=>null),/account mismatch/);
});


test('reviewed video rejection preserves reported results and the correct recording', async () => {
  const {rejectReviewedVideo}=await import('../scripts/import-sources.mjs');
  const course={id:'koopa'};
  const sheet={id:'sheet',playerId:'wins',time:'0:57.76',video:'wrong-video',
    videoVerified:true,laps:['28.90','28.86'],submittedAt:null,status:'sheet-submission'};
  const recording={id:'verified',playerId:'wins',time:'0:57.99',video:'wrong-video',videoVerified:true};
  const review={sheet:{courseId:'koopa',playerId:'wins',reportedTime:'0:57.76',
    video:'wrong-video',videoSourceMismatch:{linkedRecordingTime:'0:57.99'}}};
  assert.equal(rejectReviewedVideo(course,sheet,review),true);
  assert.deepEqual(sheet,{id:'sheet',playerId:'wins',time:'0:57.76',video:null,
    videoVerified:false,laps:['28.90','28.86'],submittedAt:null,status:'sheet-submission',
    disputedVideoReference:'wrong-video',videoSourceMismatch:review.sheet.videoSourceMismatch});
  assert.equal(rejectReviewedVideo(course,recording,review),false);
  assert.equal(recording.videoVerified,true);
  for (const change of [{playerId:'other'},{time:'0:57.99'},{video:'replacement'}]) {
    const changed={...sheet,video:'wrong-video',...change};
    const before=structuredClone(changed);
    assert.throws(()=>rejectReviewedVideo(course,changed,review),/mismatch/);
    assert.deepEqual(changed,before);
  }
  assert.throws(()=>rejectReviewedVideo({id:'airship'},{...sheet,video:'wrong-video'},review),/mismatch/);
});
