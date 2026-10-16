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
test('retrospective attribution chooses final tour day instead of later announcement',()=>{
 assert.deepEqual(resolveFinalDate({announcedAt:'2021-10-09',tourDateRange:{start:'2020-03-25',end:'2020-04-07'}}),{date:'2020-04-07',basis:'estimated-attributed-tour-final-day',estimated:true});
 assert.equal(resolveFinalDate({recordDate:'2020-04-02',tourDateRange:{start:'2020-03-25',end:'2020-04-07'}}).date,'2020-04-02');
});
test('undated previous best precedes dated improvement; invalid date falls back',()=>{
 assert.equal(resolveFinalDate({dateUnresolved:true,proofField:'previous-best',relativeOrderBefore:'b'}, {},[{id:'b',recordDate:'2020-02-29'}]).date,'2020-02-28');
 assert.equal(resolveFinalDate({submittedAt:'2021-02-30'},{appearances:[{endDate:'2021-03-01'}]}).date,'2021-03-01');
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
