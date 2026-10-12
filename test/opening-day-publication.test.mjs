import test from 'node:test';
import assert from 'node:assert/strict';
import {openingDayPublication,isHalloween2019OpeningDay} from '../lib/opening-day.mjs';
test('opening day keeps the fastest tie and later history without creating profiles from superseded opening results',()=>{
 const row=(id,playerId,timeCs,achievedAt)=>({id,playerId,timeCs,achievedAt});
 const records=[row('early','early',7000,'2019-10-23'),row('best','best',6500,'2019-10-23'),row('tie','tie',6500,'2019-10-23'),row('later','later',6400,'2019-10-24'),{...row('unknown','unknown',6600,null),dateUnresolved:true}];
 const courses=[{id:'toad',appearances:[{tourId:'tour-3'}],records,submissions:[records[0]]}];
 const players=records.map(r=>({id:r.playerId}));const result=openingDayPublication(courses,players);
 assert.deepEqual(result.courses[0].records.map(r=>r.id),['best','tie','later','unknown']);
 assert.deepEqual(result.omittedProfileIds,['early']);
 assert.equal(courses[0].records.length,5);assert.equal(result.courses[0].submissions.length,1);
});
test('exact opening day uses 06 UTC rollover and other tours stay untouched',()=>{
 const records=[{id:'first',playerId:'a',timeCs:7000,achievedAt:'2019-10-24T05:59:59Z'},{id:'best',playerId:'b',timeCs:6500,achievedAt:'2019-10-23T06:00:00Z'},{id:'next',playerId:'c',timeCs:6400,achievedAt:'2019-10-24T06:00:00Z'}];
 const course={records,appearances:[{tourId:'tour-3'}]};
 assert.deepEqual(openingDayPublication([course],[]).courses[0].records.map(r=>r.id),['best','next']);
 assert.equal(openingDayPublication([{...course,appearances:[{tourId:'tour-4'}]}],[]).courses[0].records.length,3);
});


test('actual publication omits opening-only profile routes while supporting evidence can retain names', async()=>{
 const {routeData,publicationArchive,archive}=await import('../lib/data.mjs');
 const a=publicationArchive();
 assert.ok(a.omittedRecordIds.length>0);
 for(const id of a.omittedProfileIds){
   assert.equal(routeData(['player',id]).data,null);
   assert.ok(archive().players.some(p=>p.id===id));
   assert.ok(!routeData(['players']).data.some(p=>p.id===id));
 }
 for(const course of a.courses){
   assert.ok(!course.records.some(r=>a.omittedRecordIds.includes(r.id)));
 }
});

test('supporting results and WR history share exact opening-day boundary without using post clocks',()=>{
 assert.equal(isHalloween2019OpeningDay({achievedAt:'2019-10-23T05:59:59Z'}),false);
 assert.equal(isHalloween2019OpeningDay({achievedAt:'2019-10-23T06:00:00Z'}),true);
 assert.equal(isHalloween2019OpeningDay({achievedAt:'2019-10-24T05:59:59Z'}),true);
 assert.equal(isHalloween2019OpeningDay({achievedAt:'2019-10-24T06:00:00Z'}),false);
 assert.equal(isHalloween2019OpeningDay({achievedAt:'2019-10-23',dateUnresolved:true}),false);
 assert.equal(isHalloween2019OpeningDay({submittedAt:'2019-10-23T12:00:00Z'}),false);
});
