import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeData} from '../lib/data.mjs';
import {isReviewedOpeningDay} from '../lib/opening-day.mjs';
const read=n=>JSON.parse(fs.readFileSync(`public/data/${n}.json`,'utf8'));
test('Autumn 2023 retains the stable kuRi WR and its earliest source date',()=>{
 const c=read('courses/los-angeles-laps-2');const r=c.records.find(r=>r.id==='1178887189124370537');
 assert.equal(r.time,'1:13.41');assert.equal(r.playerId,'kuri');assert.equal(r.recordDate,'2023-11-03');assert.equal(r.submittedAt,'2023-11-03T01:57:28.181Z');
 assert.equal(c.records.filter(r=>r.tourDateRange?.start==='2023-11-01').length,1);
 assert(read('players').find(p=>p.id==='kuri').records.includes(r.id));
 assert.match(r.videoBackup.url,/media\.mktwrs\.com\/assets\/video\/autumn2023-/);
});
test('Recovered original resolves the erroneous tie without awarding WR credit',()=>{
 const c=read('courses/los-angeles-laps-2');const id='discord-1173790873612472350';
 assert(!c.candidates.some(r=>r.id===id));assert(!c.records.some(r=>r.id===id));
 const r=c.submissions.find(r=>r.id===id);assert.equal(r.status,'erroneous-reported-input');assert.equal(r.reportedTime,'1:13.41');assert.equal(r.verifiedTime,'1:13.42');assert.equal(r.videoVerified,false);assert.equal(r.videoScope,'different-result');
 assert.match(r.proofImageLocal,/autumn2023-1173790904646111262-.*\.png$/);
 const d=routeData(['course',c.id]).data;assert.equal(d.autumn2023InputCorrection.verifiedTime,'1:13.42');assert(!d.autumn2023SupportingResults.some(r=>r.id===id));
});
test('Returning LA3 exposes its carried WR movie and slower current-tour results',()=>{
 const c=read('courses/los-angeles-laps-3');assert.equal(c.records.filter(r=>r.tourDateRange?.start==='2023-11-01').length,0);
 const d=routeData(['course',c.id]).data;assert.equal(d.autumn2023Recording.worldRecord.id,'1042970214414950400');assert.equal(d.autumn2023Recording.documentedRecording.time,'1:18.78');assert.equal(d.autumn2023Recording.recording,null);
 assert.equal(Math.min(...d.autumn2023SupportingResults.map(r=>r.timeCs)),7880);
});
test('First-day support retains only its final fastest result at the exact rollover',()=>{
 const d=routeData(['course','los-angeles-laps-2']).data;
 const opening=d.autumn2023SupportingResults.filter(r=>isReviewedOpeningDay(r,'2023-11-01'));
 assert.deepEqual(opening.map(r=>r.time),['1:13.54']);
 assert(!d.autumn2023SupportingResults.some(r=>r.time==='1:13.66'));
 assert(isReviewedOpeningDay({submittedAt:'2023-11-02T05:59:59Z',recordDate:'2023-11-02'},'2023-11-01'));
 assert(!isReviewedOpeningDay({submittedAt:'2023-11-02T06:00:00Z',recordDate:'2023-11-02'},'2023-11-01'));
});
test('Sucha movie publication remains distinct from the human share date',()=>{
 const c=read('courses/los-angeles-laps-2');const r=c.submissions.find(r=>r.id==='curated-1170962708825395241-autumn2023-video-reviewed');
 assert.equal(r.time,'1:13.42');assert.equal(r.submittedAt,'2023-11-06T05:47:45.219Z');assert.equal(r.videoSubmittedAt,r.submittedAt);assert(r.videoPublishedAt<r.submittedAt);
 assert.equal(r.videoScopeReview.startToFinishContinuityVerified,false);
});
