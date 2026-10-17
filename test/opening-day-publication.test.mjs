import test from 'node:test';
import assert from 'node:assert/strict';
import {openingDayPublication,isHalloween2019OpeningDay,isReviewedOpeningDay} from '../lib/opening-day.mjs';
test('opening day keeps the fastest tie and later history without creating profiles from superseded opening results',()=>{
 const row=(id,playerId,timeCs,achievedAt)=>({id,playerId,timeCs,achievedAt});
 const records=[row('early','early',7000,'2019-10-23'),row('best','best',6500,'2019-10-23'),row('tie','tie',6500,'2019-10-23'),row('later','later',6400,'2019-10-24'),{...row('unknown','unknown',6600,null),dateUnresolved:true}];
 const courses=[{id:'toad',appearances:[{tourId:'tour-3'}],records,submissions:[records[0]]}];
 const players=records.map(r=>({id:r.playerId}));const result=openingDayPublication(courses,players);
 assert.deepEqual(result.courses[0].records.map(r=>r.id),['best','tie','later','unknown']);
 assert.deepEqual(result.omittedProfileIds,['early']);
 assert.equal(courses[0].records.length,5);assert.equal(result.courses[0].submissions.length,1);
});
test('exact opening day uses 06 UTC rollover and unrelated dates stay untouched',()=>{
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


test('Paris opening day retains only its fastest run while preserving later records',()=>{
 const records=[{id:'early',playerId:'a',timeCs:4867,achievedAt:'2019-11-06'},
  {id:'best',playerId:'b',timeCs:4850,achievedAt:'2019-11-06'},
  {id:'later',playerId:'c',timeCs:4847,achievedAt:'2019-11-07'}];
 assert.deepEqual(openingDayPublication([{records,appearances:[{tourId:'tour-4'}]}],[]).courses[0].records.map(r=>r.id),['best','later']);
});

test('Yoshi 2020 uses reconciled publication clocks across the complete opening 24 hours',()=>{
 const row=(id,timeCs,clock)=>({id,playerId:id,timeCs,achievedAt:clock.slice(0,10),documentedAt:clock});
 const records=[row('before',7100,'2020-04-08T05:59:59Z'),row('early',7000,'2020-04-08T06:00:00Z'),row('best',6900,'2020-04-09T05:59:59Z'),row('next',6800,'2020-04-09T06:00:00Z')];
 assert.deepEqual(records.map(r=>isReviewedOpeningDay(r,'2020-04-08')),[false,true,true,false]);
 assert.deepEqual(openingDayPublication([{records,appearances:[{tourId:'tour-15'}]}],[]).courses[0].records.map(r=>r.id),['before','best','next']);
 assert.equal(isReviewedOpeningDay({...records[1],dateUnresolved:true},'2020-04-08'),false);
});

test('Trick 2020 uses reconciled source clocks through the following 06 UTC',()=>{
 const records=[{id:'early',playerId:'a',timeCs:3500,recordDate:'2020-04-22',documentedAt:'2020-04-22T06:00:00.000Z'},
  {id:'best',playerId:'b',timeCs:3400,recordDate:'2020-04-23',documentedAt:'2020-04-23T05:59:59.000Z'},
  {id:'next',playerId:'c',timeCs:3300,recordDate:'2020-04-23',documentedAt:'2020-04-23T06:00:00.000Z'}];
 assert.deepEqual(openingDayPublication([{records,appearances:[{tourId:'tour-16'}]}],[]).courses[0].records.map(r=>r.id),['best','next']);
});


test('Flower opening display uses known screenshot publication despite an unknown previous-best race date',()=>{
 const records=[{id:'previous',playerId:'a',timeCs:10217,dateUnresolved:true,finalDateBasis:'evidencePublishedAt',documentedAt:'2020-05-06T07:59:25.520Z'},
  {id:'best',playerId:'b',timeCs:9942,documentedAt:'2020-05-06T14:26:08.746Z'},
  {id:'next',playerId:'c',timeCs:9910,documentedAt:'2020-05-07T06:00:00.000Z'}];
 assert.equal(isReviewedOpeningDay(records[0],'2020-05-06'),true);
 assert.deepEqual(openingDayPublication([{records,appearances:[{tourId:'tour-17'}]}],[]).courses[0].records.map(r=>r.id),['best','next']);
 assert.equal(isReviewedOpeningDay({...records[0],documentedAt:null},'2020-05-06'),false);
});
