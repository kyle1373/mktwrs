import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveFinalDate,applyFinalDates} from '../lib/final-dates.mjs';
import {recordedBest} from '../lib/recorded-best.mjs';
test('posting date is definite while original clocks remain intact',()=>{
 const r={id:'a',playerId:'x',timeCs:9100,submittedAt:'2021-10-09T01:02:03Z'};
 const c={records:[r],submissions:[],candidates:[],appearances:[],currentHolders:[{...r}]};
 const original=structuredClone(r);applyFinalDates([c]);
 assert.equal(r.finalDate,'2021-10-09');for(const [k,v] of Object.entries(original))assert.deepEqual(r[k],v);
 assert.equal(c.currentHolders[0].finalDate,r.finalDate);
});
test('retrospective evidence uses the actual report date, never a guessed tour end',()=>{
 const r=resolveFinalDate({announcedAt:'2021-10-09',tourDateRange:{start:'2020-03-25',end:'2020-04-07'}});
 assert.equal(r.date,'2021-10-09');assert.equal(r.estimated,false);
 assert.equal(resolveFinalDate({recordDate:'2020-04-02',tourDateRange:{start:'2020-03-25',end:'2020-04-07'}}).date,'2020-04-02');
});
test('undated predecessors and invalid dates remain unknown rather than acquiring invented dates',()=>{
 assert.equal(resolveFinalDate({dateUnresolved:true,proofField:'previous-best',relativeOrderBefore:'b'}, {},[{id:'b',recordDate:'2020-02-29'}]).date,null);
 assert.equal(resolveFinalDate({submittedAt:'2021-02-30'},{appearances:[{endDate:'2021-03-01'}]}).date,null);
});
test('best total and playable movie are independent; incomplete and rejected claims cannot win',()=>{
 const c={records:[{id:'a',playerId:'a',timeCs:9000}],submissions:[
 {id:'b',playerId:'b',timeCs:8900,proofImageVerified:true},
 {id:'c',playerId:'c',timeCs:8950,videoVerified:true,video:'https://example.com/movie'},
 {id:'d',playerId:'d',timeCs:5000,videoVerified:true,videoScope:'single-lap-clip',video:'https://example.com/lap'},
 {id:'e',playerId:'e',timeCs:8800,videoVerified:true,status:'rejected',video:'https://example.com/rejected'}]};
 const original=structuredClone(c);const result=recordedBest(c);
 assert.equal(result.best.id,'b');assert.equal(result.recording.id,'c');assert.deepEqual(c,original);
});
test('tied holders are preserved and surviving backup supplies video proof',()=>{
 const c={records:[{id:'a',playerId:'a',timeCs:9000},{id:'b',playerId:'b',timeCs:9000}],submissions:[{id:'v',playerId:'a',timeCs:9000,videoVerified:true,videoAvailability:'unavailable',videoBackup:{status:'available',url:'https://media.example.com/a.mp4'}}]};
 const result=recordedBest(c);assert.equal(result.bestHolders.length,2);assert.equal(result.bestHolders[0].videoBackup.url,'https://media.example.com/a.mp4');assert.equal(result.recording.id,'v');
});
test('duplicate URL variants cannot turn a known lap clip into a complete recording',()=>{
 const c={records:[{id:'wr',playerId:'a',timeCs:9000}],submissions:[
 {id:'lap',playerId:'b',timeCs:8000,video:'https://youtu.be/x6kNnKr29Zg',videoVerified:true,videoScope:'single-lap-clip'},
 {id:'duplicate',playerId:'b',timeCs:8000,video:'https://www.youtube.com/watch?v=x6kNnKr29Zg',videoVerified:true},
 {id:'full',playerId:'c',timeCs:9100,proofVideoUrl:'https://youtu.be/9Q3Czv54-jo',proofVideoVerified:true}]};
 const result=recordedBest(c);assert.equal(result.best.id,'wr');assert.equal(result.recording.id,'full');assert.equal(result.recording.video,'https://youtu.be/9Q3Czv54-jo');
});
test('a faster screenshot total remains eligible when its accompanying movie is incomplete',()=>{
 const c={records:[{id:'wr',playerId:'a',timeCs:9000}],submissions:[{id:'image',playerId:'b',timeCs:8900,proofImageVerified:true,videoVerified:true,video:'https://example.com/lap',videoCoverage:'lap-1'}]};
 assert.equal(recordedBest(c).best.id,'image');assert.equal(recordedBest(c).recording,null);
});
test('title mismatch and cancelled receipts never become the best recording',()=>{
 const c={records:[{id:'wr',playerId:'a',timeCs:9000}],submissions:[
 {id:'wrong',playerId:'b',timeCs:8500,videoVerified:true,video:'https://example.com/wrong',videoAudit:{status:'title-time-mismatch'}},
 {id:'cancelled',playerId:'b',timeCs:8400,proofImageVerified:true,status:'cancelled'}]};
 assert.equal(recordedBest(c).best.id,'wr');assert.equal(recordedBest(c).recording,null);
});
test('an earlier reviewed original recording proves publication before a later screenshot submission',()=>{
 const r={submittedAt:'2022-09-07T08:44:58.935Z',videoPublishedAt:'2022-09-04T04:17:26Z',videoVerified:true,videoAudit:{status:'title-time-matches'},dateUnresolved:true,recordDate:'2022-09-07',dateBasis:'first-screenshot-publication'};
 assert.equal(resolveFinalDate(r).date,'2022-09-04');
 assert.equal(resolveFinalDate({...r,videoScope:'single-lap-clip'}).date,'2022-09-07');
 assert.equal(resolveFinalDate({...r,videoAudit:{status:'title-time-mismatch'}}).date,'2022-09-07');
});
test('reviewed dated evidence is tied to the exact course, player and total',()=>{
 const r={id:'a',time:'1:25.86',playerId:'nu11',submittedAt:'2022-09-07T08:44:58.935Z'};
 const c={id:'bc3',records:[r],submissions:[],candidates:[]};
 const e={courseId:'bc3',id:'a',playerId:'nu11',time:'1:25.86',timestamp:'2022-09-02T19:54:18.079Z',basis:'reviewed-first-standing-publication',sourceUrl:'https://discord.com/channels/629221606064914442/636461740162416640/1015348967313252443'};
 applyFinalDates([c],[e]);assert.equal(r.finalDate,'2022-09-02');assert.equal(r.documentedDateSourceUrl,e.sourceUrl);
 assert.throws(()=>applyFinalDates([c],[{...e,time:'1:25.98'}]),/does not match/);
});
