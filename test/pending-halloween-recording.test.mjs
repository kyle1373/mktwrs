import test from 'node:test';
import assert from 'node:assert/strict';
import {routeData} from '../lib/data.mjs';
import {halloween2019RecordingComparison} from '../lib/video.mjs';
test('omitted opening NBC footage remains visible as pending without winning comparison',()=>{
 const c=routeData(['course','3ds-neo-bowser-city']).data;
 const run=c.halloween2019Recording.pendingRecordings.find(r=>r.id==='curated-original-2019-wr-row-29');
 assert.equal(run.time,'1:28.48');
 assert.equal(run.video,'https://www.youtube.com/watch?v=jeZCQCMQgPE');
 assert.equal(run.videoPublishedAt,'2019-10-23T15:02:49Z');
 assert.ok(run.videoShareEvents.some(e=>e.sharedAt==='2019-10-23T14:13:24.286Z'));
 assert.ok(!c.records.some(r=>r.id===run.id));
 assert.equal(c.halloween2019Recording.recording.time,'1:31.08');
});
test('pending footage deduplicates source identities and excludes known partial or photo sources',()=>{
 const run=(id,timeCs,video,more={})=>({id,timeCs,video,achievedAt:'2019-10-25',...more});
 const c=halloween2019RecordingComparison({submissions:[
 run('full',7000,'https://youtu.be/abcdefghijk',{videoScope:'full-run',videoVerified:true}),
 run('pending',6000,'https://youtu.be/12345678901'),
 run('duplicate',6000,'https://www.youtube.com/watch?v=12345678901'),
 run('partial',5000,'https://youtu.be/12345678902',{videoScope:'incomplete-first-lap'}),
 run('photo',4000,'https://x.com/u/status/1',{photoReferenceReview:{kind:'archived-original-result-photo-post'}}),
 run('reviewed-photo',3900,'https://x.com/u/status/2',{videoReferenceReview:{kind:'archived-original-result-photo-post'}}),
 ]});
 assert.deepEqual(c.pendingRecordings.map(r=>r.id),['pending']);
 assert.equal(c.recording.id,'full');
});

test('documented Hammer Bro recording is not duplicated or outranked by slower pending footage',()=>{
 const c=routeData(['course','gcn-yoshi-circuit-r']).data.hammer2020Recording;
 assert.equal(c.documentedRecording.time,'1:31.74');
 assert.ok(c.pendingRecordings.every(r=>r.timeCs < c.documentedRecording.timeCs));
 assert.ok(!c.pendingRecordings.some(r=>r.video===c.documentedRecording.video));
});
