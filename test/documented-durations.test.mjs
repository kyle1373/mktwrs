import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {applyDocumentedDurations} from '../lib/documented-durations.mjs';
import {resolveFinalDate,applyFinalDates} from '../lib/final-dates.mjs';
const row=(id,timeCs,documentedAt,playerId=id)=>({id,timeCs,playerId,documentedAt,documentedDatePrecision:'timestamp'});
test('reigns pause between tours and tied holders end at the same faster submission',()=>{
 const c={records:[row('a',100,'2020-01-01T12:00:00Z'),row('b',100,'2020-01-02T12:00:00Z'),row('c',90,'2020-01-16T12:00:00Z')],submissions:[],candidates:[],appearances:[{startDate:'2020-01-01',endDate:'2020-01-03'},{startDate:'2020-01-15',endDate:'2020-01-17'}]};
 applyDocumentedDurations([c]);assert.equal(c.records[0].durationDays,3);assert.equal(c.records[1].durationDays,2);assert.equal(c.records[2].durationDays,.75);
});
test('same-timestamp previous best has no invented reign and a personal best earns no WR duration',()=>{
 const c={records:[row('a',100,'2020-01-01T12:00:00Z'),row('b',90,'2020-01-01T12:00:00Z')],submissions:[row('pb',110,'2020-01-02T12:00:00Z')],candidates:[],appearances:[{startDate:'2020-01-01',endDate:'2020-01-03'}]};applyDocumentedDurations([c]);assert.equal(c.records[0].durationDays,0);assert.equal(c.records[1].durationDays,1.75);assert.equal(c.submissions[0].durationDays,0);assert.equal(c.submissions[0].durationBasis,'no-documented-wr-reign');
});
test('date-only publications are explicit calculation boundaries; identical footage may inherit a preserved source clock',()=>{
 const r=resolveFinalDate({dateUnresolved:true,dateBasis:'first-screenshot-publication',recordDate:'2020-04-15',evidencePublishedAt:'2020-04-15T05:33:04.238Z',tourDateRange:{end:'2020-04-21'}});assert.equal(r.timestamp,'2020-04-15T05:33:04.238Z');
 const unknown={id:'sheet',playerId:'a',timeCs:100,video:'https://youtu.be/tdI5MQ9C0-Y'};
 assert.equal(resolveFinalDate(unknown,{records:[{...unknown,id:'source',submittedAt:'2020-07-29T12:03:41.178Z'}]}).sourceId,'source');
 assert.equal(resolveFinalDate({...unknown,video:null},{records:[{...unknown,id:'source',submittedAt:'2020-07-29T12:03:41.178Z'}]}).date,null);
 assert.equal(resolveFinalDate({recordDate:'2020-04-15'}).precision,'day');
});
test('Bowser Castle 2 missing reigns and Airship Fortress return are recomputed from preserved timestamps',()=>{
 const cs=JSON.parse(fs.readFileSync(new URL('../public/data/courses.json',import.meta.url)));const bc=cs.find(c=>c.id==='gba-bowser-s-castle-2');
 assert.equal(bc.records.find(r=>r.time==='1:19.66').durationDays,9.78073875);
 assert.equal(bc.records.find(r=>r.time==='1:19.65').durationDays,3.029859409722222);
 const airship=cs.find(c=>c.id==='ds-airship-fortress');assert.equal(airship.records.find(r=>r.time==='1:30.07').durationDays,4.180371446759259);
});

test('date-only evidence yields bounds instead of inventing a 06:00 achievement',()=>{
 const c={records:[{...row('a',100,'2020-01-01T06:00:00.000Z'),finalDate:'2020-01-01',documentedDatePrecision:'day',documentedDateTimezone:'UTC'},row('b',90,'2020-01-02T12:00:00.000Z')],submissions:[],candidates:[],appearances:[{startDate:'2020-01-01',endDate:'2020-01-03'}]};applyDocumentedDurations([c]);assert.equal(c.records[0].durationBounds.minDays,.5);assert.equal(c.records[0].durationBounds.maxDays,1.25);assert.equal(c.records[0].durationPrecision,'range');assert.equal(c.records[0].durationBounds.start.earliest,'2020-01-01T00:00:00.000Z');
});
test('retrospective report retains its factual date while the attributed reign and its predecessor are bounded',()=>{
 const c={records:[row('a',100,'2020-01-02T12:00:00.000Z'),{...row('b',90,'2021-10-09T12:00:00.000Z'),tourDateRange:{start:'2020-01-01',end:'2020-01-02'}}],submissions:[],candidates:[],appearances:[{startDate:'2020-01-01',endDate:'2020-01-03'}]};applyDocumentedDurations([c]);assert.equal(c.records[1].documentedAt,'2021-10-09T12:00:00.000Z');assert.equal(c.records[1].durationBounds.minDays,0);assert.equal(c.records[1].durationBounds.maxDays,2);assert.equal(c.records[0].durationBounds.minDays,0);assert.equal(c.records[0].durationBounds.maxDays,.75);
});
test('statistics union guaranteed and possible intervals without double-counting tied nations',async()=>{
 const {courseStatistics}=await import('../public/history.mjs');const c={records:[{...row('a',100,'2020-01-01T06:00:00.000Z'),status:'announced',finalDate:'2020-01-01',documentedDatePrecision:'day',documentedDateTimezone:'UTC'},{...row('b',100,'2020-01-01T12:00:00.000Z'),status:'community-wr'}],submissions:[],candidates:[],appearances:[{startDate:'2020-01-01',endDate:'2020-01-03'}]};applyDocumentedDurations([c]);const s=courseStatistics(c.records,[{id:'a',country:'us'},{id:'b',country:'us'}]);assert.equal(s.players[0].daysMinimum,1.25);assert.equal(s.players[0].daysMaximum,2);assert.equal(s.nations[0].daysMinimum,1.75);assert.equal(s.nations[0].daysMaximum,2);
});
test('conservative intervals contain every sampled exact chronology, including ties and pauses',()=>{
 const at=h=>new Date(Date.UTC(2020,0,1)+h*3600000).toISOString();
 const appearances=[{startDate:'2020-01-01',endDate:'2020-01-02'},{startDate:'2020-01-03',endDate:'2020-01-04'}];
 // Tour end boundaries are at 06:00 UTC, so use their actual intervals below.
 const tourWindows=[{start:6,end:30},{start:54,end:78}];
 const c={id:'matrix',records:[{...row('a',100,at(6)),finalDate:'2020-01-01',documentedDatePrecision:'day',documentedDateTimezone:'UTC'},row('tie',100,at(12)),{...row('fast',90,at(54)),finalDate:'2020-01-03',documentedDatePrecision:'day',documentedDateTimezone:'UTC'}],submissions:[],candidates:[],appearances};
 applyDocumentedDurations([c]);
 for(const startA of [0,6,12,23.999])for(const fastAt of [48,54,60,71.999]){
  const clocks=[startA,12,fastAt];
  for(let i=0;i<3;i++){
   const r=c.records[i],faster=c.records.map((p,j)=>({p,t:clocks[j]})).filter(x=>x.p.timeCs<r.timeCs);
   let actual=0;
   if(!faster.some(x=>x.t<=clocks[i])){const end=Math.min(100000,...faster.map(x=>x.t));actual=tourWindows.reduce((sum,w)=>sum+Math.max(0,Math.min(w.end,end)-Math.max(w.start,clocks[i])),0)/24;}
   assert.ok(actual>=r.durationBounds.minDays-1e-10&&actual<=r.durationBounds.maxDays+1e-10,`${r.id} ${clocks} actual ${actual}`);
  }
 }
});
test('a calendar date with no source timezone covers UTC offsets from +14 to -12',async()=>{
 const {standingBounds}=await import('../lib/documented-durations.mjs');
 const r={id:'unknown-zone',finalDate:'2020-01-02',documentedAt:null,documentedDatePrecision:'day',documentedDateTimezone:'unspecified'};
 const b=standingBounds(r,{id:'zone',appearances:[{startDate:'2020-01-01',endDate:'2020-01-04'}]});
 assert.equal(b.earliest,'2020-01-01T10:00:00.000Z');assert.equal(b.latest,'2020-01-03T12:00:00.000Z');assert.equal(b.exact,false);
});

test('an earlier matching video share corrects the posting date without inventing a post-reset achievement time',()=>{
 const courses=JSON.parse(fs.readFileSync(new URL('../public/data/courses.json',import.meta.url)));
 const c=courses.find(c=>c.id==='wii-coconut-mall');
 const evidence=JSON.parse(fs.readFileSync(new URL('../scripts/documented-date-evidence.json',import.meta.url)));
 const r=c.records.find(r=>r.id==='1000615548633227364');const rawClock=r.announcedAt;
 applyFinalDates([c],evidence.filter(e=>e.courseId===c.id));applyDocumentedDurations([c]);
 assert.equal(r.finalDate,'2022-07-13');assert.equal(r.documentedAt,'2022-07-13T06:37:17.055Z');
 assert.equal(r.announcedAt,rawClock);assert.equal(r.durationPrecision,'range');
 assert.ok(r.durationBounds.maxDays>r.durationBounds.minDays);assert.equal(r.durationBounds.start.exact,false);
 assert.equal(r.documentedDateSourceUrl,'https://discord.com/channels/629221606064914442/875784780573184010/996666610255417414');
});

test('a visible original-post minute narrows duration bounds while its timezone remains unconfirmed',()=>{
 const c={id:'choco',records:[{...row('a',100,null),time:'1:18.38',achievedAt:'2021-08-08'},{...row('b',90,'2021-08-10T12:00:00.000Z'),submittedAt:'2021-08-10T12:00:00.000Z'}],submissions:[],candidates:[],appearances:[{startDate:'2021-07-28',endDate:'2021-08-11'}]};
 const e={courseId:'choco',id:'a',playerId:'a',time:'1:18.38',localTimestamp:'2021-08-08T17:07',basis:'reviewed-original-post-local-minute'};
 applyFinalDates([c],[e]);applyDocumentedDurations([c]);const r=c.records[0];
 assert.equal(r.finalDate,'2021-08-08');assert.equal(r.documentedAt,null);assert.equal(r.documentedDateTimezone,'unspecified');
 assert.equal(r.documentedLocalTimestamp,'2021-08-08T17:07');assert.equal(r.documentedDatePrecision,'minute');
 assert.equal(r.durationBounds.start.earliest,'2021-08-08T03:07:00.000Z');assert.equal(r.durationBounds.start.latest,'2021-08-09T05:08:00.000Z');
 for(const offset of [-12,0,2,14])for(const second of [0,59.999]){
  const clock=Date.parse(e.localTimestamp+':00Z')-offset*3600000+second*1000;
  const actual=(Date.parse('2021-08-10T12:00:00.000Z')-clock)/86400000;
  assert.ok(actual>=r.durationBounds.minDays && actual<=r.durationBounds.maxDays);
 }
 assert.throws(()=>applyFinalDates([c],[{...e,localTimestamp:'2021-08-08T25:07'}]),/does not match/);
 assert.throws(()=>applyFinalDates([c],[{...e,localTimestamp:'2021-02-30T17:07'}]),/does not match/);
 assert.throws(()=>applyFinalDates([c],[{...e,timestamp:'2021-08-08T17:07:00Z'}]),/does not match/);
});

test('a local publication minute after the attributed tour preserves its factual date and retrospective bounds',()=>{
 const c={id:'late',records:[{id:'a',timeCs:100,finalDate:'2021-08-12',documentedAt:null,documentedLocalTimestamp:'2021-08-12T17:07',documentedDatePrecision:'minute',tourDateRange:{start:'2021-07-28',end:'2021-08-10'}}],submissions:[],candidates:[],appearances:[{startDate:'2021-07-28',endDate:'2021-08-11'}]};
 applyDocumentedDurations([c]);assert.equal(c.records[0].durationBounds.start.basis,'attributed-tour-window');assert.equal(c.records[0].finalDate,'2021-08-12');
});
