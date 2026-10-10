import test from 'node:test';
import assert from 'node:assert/strict';
import {attachReviewedVideoShares} from '../scripts/reviewed-video-shares.mjs';
const review={courseId:'toad',playerId:'nova',timeCs:6499,video:'https://youtu.be/oW-jyVSXs8s',event:{sharedAt:'2019-10-25T10:04:59.041Z',source:{url:'discord-source'}}};
test('share events match exact performance and normalized video without changing race clocks',()=>{
 const row={playerId:'nova',timeCs:6499,video:'https://www.youtube.com/watch?v=oW-jyVSXs8s',achievedAt:'2019-10-24',submittedAt:null};
 attachReviewedVideoShares({id:'toad'},row,[review]);
 attachReviewedVideoShares({id:'toad'},row,[review]);
 assert.deepEqual(row.videoShareEvents,[review.event]);
 assert.equal(row.achievedAt,'2019-10-24');assert.equal(row.submittedAt,null);
 for(const change of [{playerId:'sharer'},{timeCs:6500},{video:'https://youtu.be/other'}]){
  const wrong={...row,...change};delete wrong.videoShareEvents;
  attachReviewedVideoShares({id:'toad'},wrong,[review]);assert.equal(wrong.videoShareEvents,undefined);
 }
 const other={...row};delete other.videoShareEvents;attachReviewedVideoShares({id:'other'},other,[review]);assert.equal(other.videoShareEvents,undefined);
});
test('documented shares may accompany withheld references without restoring or verifying footage',()=>{
 const row={playerId:'nova',timeCs:6499,video:null,videoReference:review.video,videoVerified:false};
 attachReviewedVideoShares({id:'toad'},row,[review]);
 assert.deepEqual(row.videoShareEvents,[review.event]);assert.equal(row.video,null);assert.equal(row.videoVerified,false);
});
