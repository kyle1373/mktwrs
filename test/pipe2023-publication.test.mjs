import test from 'node:test';
import assert from 'node:assert/strict';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
import {routeData} from '../lib/data.mjs';
test('Pipe opening day uses the exact 06:00 rollover',()=>{
 assert.equal(isReviewedOpeningDay({submittedAt:'2023-07-13T05:59:59Z',recordDate:'2023-07-13'},'2023-07-12'),true);
 assert.equal(isReviewedOpeningDay({submittedAt:'2023-07-13T06:00:00Z',recordDate:'2023-07-13'},'2023-07-12'),false);
});
test('Dry Dry Ruins publishes six leaders and the matching final recording',()=>{
 const c=routeData(['course','wii-dry-dry-ruins']).data;
 assert.deepEqual(c.records.filter(r=>r.tourDateRange?.start==='2023-07-12').map(r=>r.time),['1:19.40','1:18.61','1:18.38','1:18.25','1:17.95','1:17.90']);
 assert.equal(c.pipe2023Recording.worldRecord.time,'1:17.90');
 assert.equal(c.pipe2023Recording.recording,null);
 assert.equal(c.pipe2023Recording.documentedRecording.time,'1:17.90');
 assert.match(c.pipe2023Recording.documentedRecording.videoBackup.url,/media\.mktwrs\.com/);
 assert.equal(c.pipe2023Recording.worldRecord.videoPublishedAt,'2023-07-17T14:35:00Z');
 assert.equal(c.pipe2023Recording.worldRecord.submittedAt,'2023-07-17T14:47:35.892Z');
});
test('Cove 2R retains the dated tie and final recording',()=>{
 const c=routeData(['course','piranha-plant-cove-2r']).data;
 assert.deepEqual(c.records.filter(r=>r.tourDateRange?.start==='2023-07-12').map(r=>[r.playerId,r.time]),[['kuri','1:32.62'],['kuri','1:32.25'],['kuri','1:31.83'],['newyork','1:31.72'],['nekozuki','1:31.64'],['phillish','1:31.64'],['phillish','1:31.45'],['phillish','1:31.41']]);
 assert.equal(c.pipe2023Recording.recording,null);
 assert.equal(c.pipe2023Recording.documentedRecording.time,'1:31.41');
 assert.match(c.pipe2023Recording.documentedRecording.videoBackup.url,/media\.mktwrs\.com/);
 assert.ok(c.pipe2023SupportingResults.every(r=>Date.parse(r.submittedAt)<Date.parse('2023-07-26T06:00:00Z')));
});
