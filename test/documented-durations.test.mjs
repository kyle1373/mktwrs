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
test('an already superseded result ends at the known faster evidence rather than a later record',()=>{
 const first='2020-04-11T11:47:56.969Z',later='2022-01-01T16:55:39.778Z';
 const c={id:'kalimari',records:[row('previous',7536,first),row('faster',7529,first),row('later',7519,later)],submissions:[row('alias',7536,first,'previous')],candidates:[],appearances:[{startDate:'2020-04-08',endDate:'2020-04-22'},{startDate:'2021-12-29',endDate:'2022-01-12'}]};
 applyDocumentedDurations([c]);
 assert.equal(c.records[0].durationDays,0);assert.equal(c.records[0].durationEnd,first);
 assert.deepEqual(c.records[0].durationBounds.end,{earliest:first,latest:first});
 assert.equal(c.submissions[0].durationEnd,first);
 assert.equal(c.records[1].durationEnd,later);
});
test('a later retrospective posting retains its source date and the earlier known supersession boundary',()=>{
 const c={id:'report',records:[row('old-result',100,'2020-01-02T12:00:00.000Z'),row('faster',90,'2020-01-01T12:00:00.000Z'),row('later',80,'2020-01-03T12:00:00.000Z')],submissions:[],candidates:[],appearances:[{startDate:'2020-01-01',endDate:'2020-01-04'}]};
 applyDocumentedDurations([c]);assert.equal(c.records[0].documentedAt,'2020-01-02T12:00:00.000Z');
 assert.equal(c.records[0].durationEnd,'2020-01-01T12:00:00.000Z');assert.equal(c.records[0].durationDays,0);
 assert.deepEqual(c.records[0].durationIntervals,[]);
});
test('Tomegome original three-result tweet precedes the repost and adjusts both credited reigns',()=>{
 const courses=JSON.parse(fs.readFileSync(new URL('../public/data/courses.json',import.meta.url)));
 const c=courses.find(c=>c.id==='3ds-daisy-hills-r');
 const evidence=JSON.parse(fs.readFileSync(new URL('../scripts/documented-date-evidence.json',import.meta.url))).filter(e=>e.courseId===c.id);
 const ids=['12169','12154','12148'].map(s=>'curated-yoshi-2020-tomegome-daisy-'+s);
 const originals=c.records.filter(r=>ids.includes(r.id)).map(r=>({id:r.id,source:structuredClone(r.source),submittedAt:r.submittedAt,achievedAt:r.achievedAt}));
 applyFinalDates([c],evidence);applyDocumentedDurations([c]);
 for(const original of originals){const r=c.records.find(r=>r.id===original.id);
  assert.equal(r.finalDate,'2020-04-13');assert.equal(r.documentedAt,'2020-04-13T10:55:44.928Z');
  assert.equal(r.documentedDateSourceUrl,'https://twitter.com/tomegome_g/status/1249652486790471685');
  assert.deepEqual(r.source,original.source);assert.equal(r.submittedAt,original.submittedAt);assert.equal(r.achievedAt,original.achievedAt);
 }
 const prior=c.records.find(r=>r.id==='curated-yoshi-2020-kaguya-daisy-8179'),best=c.records.find(r=>r.id===ids[2]);
 assert.equal(Math.floor(prior.durationDays),1);assert.equal(Math.floor(best.durationDays),1);
 assert.equal(prior.durationEnd,best.documentedAt);
 assert.equal(best.durationEnd,'2020-04-14T10:58:08.553Z');
 assert.equal(c.records.find(r=>r.id===ids[0]).durationDays,0);assert.equal(c.records.find(r=>r.id===ids[1]).durationDays,0);
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

test('runner-reported morning preserves the date and narrows both the reign and its predecessor without inventing an exact clock',()=>{
 const r={id:'r',playerId:'nu11',time:'1:17.87',timeCs:7787,achievedAt:'2021-02-19'};
 const previous={id:'p',playerId:'kazuo',time:'1:18.27',timeCs:7827,submittedAt:'2021-02-16T15:00:00.000Z'};
 const c={id:'choco-r',records:[previous,r],submissions:[],candidates:[],appearances:[{startDate:'2021-02-10',endDate:'2021-02-24'},{startDate:'2021-12-01',endDate:'2021-12-15'}]};
 const e={courseId:'choco-r',id:'r',playerId:'nu11',time:'1:17.87',localWindow:{start:'2021-02-19T00:00',end:'2021-02-19T12:00',label:'morning'},basis:'reviewed-runner-reported-morning'};
 applyFinalDates([c],[e]);applyDocumentedDurations([c]);
 assert.equal(r.finalDate,'2021-02-19');assert.equal(r.documentedAt,null);assert.equal(r.documentedDatePrecision,'period');
 assert.equal(r.durationBounds.start.earliest,'2021-02-18T10:00:00.000Z');assert.equal(r.durationBounds.start.latest,'2021-02-20T00:00:00.000Z');assert.equal(r.durationDays,18.25);
 for(const offset of [-12,0,9,14])for(const hour of [0,6,11.999]){
  const run=Date.parse('2021-02-19T00:00:00Z')+(hour-offset)*3600000;
  const actual=(Date.parse('2021-02-24T06:00:00Z')-run)/86400000+14;
  assert.ok(actual>=r.durationBounds.minDays&&actual<=r.durationBounds.maxDays);
  const prior=(run-Date.parse(previous.submittedAt))/86400000;
  assert.ok(prior>=previous.durationBounds.minDays&&prior<=previous.durationBounds.maxDays);
 }
 assert.throws(()=>applyFinalDates([c],[{...e,localWindow:{start:'2021-02-19T12:00',end:'2021-02-19T00:00'}}]),/does not match/);
 assert.throws(()=>applyFinalDates([c],[{...e,localWindow:{start:'2021-02-30T00:00',end:'2021-02-30T12:00'}}]),/does not match/);
});

test('reviewed supporting post dates are scoped and preserve original upload clocks',()=>{
 const c={id:'course',records:[{id:'same',playerId:'a',time:'1:00.00',recordDate:'2020-04-08'}],submissions:[{id:'same',playerId:'b',time:'1:01.00',proofUploadedAt:'2020-04-08T10:00:00.001Z'}],candidates:[]};
 const e={courseId:'course',collection:'submissions',id:'same',playerId:'b',time:'1:01.00',timestamp:'2020-04-08T10:00:00.101Z',basis:'reviewed-original-attachment-message-publication',sourceUrl:'https://example.com/post',reviewArtifact:'review.json'};
 applyFinalDates([c],[e]);
 assert.equal(c.records[0].documentedAt,null);assert.equal(c.records[0].finalDate,'2020-04-08');
 assert.equal(c.submissions[0].documentedAt,e.timestamp);assert.equal(c.submissions[0].proofUploadedAt,'2020-04-08T10:00:00.001Z');
 assert.equal(c.submissions[0].documentedDateSourceUrl,e.sourceUrl);
 assert.throws(()=>applyFinalDates([c],[{...e,collection:'records'}]),/does not match/);
 assert.throws(()=>applyFinalDates([c],[{...e,playerId:'wrong'}]),/does not match/);
 assert.throws(()=>applyFinalDates([c],[{...e,collection:'invalid'}]),/Invalid documented/);
});

test('unavailable Yoshi sheet image retains only its documented proof upload date and zero WR credit',()=>{
 const courses=JSON.parse(fs.readFileSync(new URL('../public/data/courses.json',import.meta.url)));
 const c=courses.find(c=>c.id==='n64-kalimari-desert'),r=c.submissions.find(r=>r.id==='sheet-C82');
 const evidence=JSON.parse(fs.readFileSync(new URL('../scripts/documented-date-evidence.json',import.meta.url))).filter(e=>e.courseId===c.id);
 const original=structuredClone(r.source);applyFinalDates([c],evidence);applyDocumentedDurations([c]);
 assert.equal(r.finalDate,'2020-04-08');assert.equal(r.documentedAt,r.proofUploadedAt);
 assert.equal(r.finalDateBasis,'reviewed-preserved-proof-attachment-upload');
 assert.equal(r.submittedAt,null);assert.equal(r.achievedAt,null);assert.equal(r.durationDays,0);assert.deepEqual(r.source,original);
});

test('reviewed faster supporting finish ends older credit without granting the submission a WR reign',()=>{
 const c={id:'course',appearances:[{startDate:'2020-04-22',endDate:'2020-05-06'}],records:[{id:'old',playerId:'a',time:'1:00.00',timeCs:6000,finalDate:'2020-04-22',documentedAt:'2020-04-22T07:00:00.000Z'}],submissions:[{id:'proof',playerId:'a',time:'0:59.00',timeCs:5900,finalDate:'2020-04-22',documentedAt:'2020-04-22T08:00:00.000Z',status:'documented-submission',proofImageVerified:true,source:{url:'https://example.com/proof'}}]};
 const e={courseId:'course',id:'old',playerId:'a',time:'1:00.00',sourceId:'proof',sourcePlayerId:'a',sourceTime:'0:59.00',sourceStatus:'documented-submission',timestamp:'2020-04-22T08:00:00.000Z',sourceUrl:'https://example.com/proof',reviewArtifact:'review.json'};
 applyDocumentedDurations([c],[e]);assert.equal(c.records[0].durationEnd,e.timestamp);assert.equal(c.records[0].durationDays,1/24);assert.equal(c.submissions[0].durationDays,0);assert.equal(c.submissions[0].status,'documented-submission');
 assert.throws(()=>applyDocumentedDurations([c],[{...e,sourceTime:'0:58.00'}]),/does not match/);
 assert.throws(()=>applyDocumentedDurations([c],[e,e]),/does not match/);
 c.submissions[0].proofImageVerified=false;assert.throws(()=>applyDocumentedDurations([c],[e]),/does not match/);
});

test('Trick 2020 earliest original tweet dates the explicit sheet crosswalk and ends the previous reign',()=>{
 const c=JSON.parse(fs.readFileSync(new URL('../public/data/courses.json',import.meta.url))).find(c=>c.id==='snes-vanilla-lake-1');
 const evidence=JSON.parse(fs.readFileSync(new URL('../scripts/documented-date-evidence.json',import.meta.url))).filter(e=>e.courseId===c.id);
 const ends=JSON.parse(fs.readFileSync(new URL('../scripts/documented-supersession-evidence.json',import.meta.url))).filter(e=>e.courseId===c.id);
 const r=c.records.find(r=>r.id==='896332633972277268'),sheet=c.submissions.find(r=>r.id==='sheet-R71'),source=structuredClone(r.source);
 applyFinalDates([c],evidence);applyDocumentedDurations([c],ends);
 assert.equal(r.documentedAt,'2020-05-03T06:27:40.186Z');assert.equal(r.finalDate,'2020-05-03');assert.equal(sheet.documentedAt,r.documentedAt);assert.equal(sheet.finalDate,r.finalDate);
 assert.equal(Date.parse(r.submittedAt)-Date.parse(r.documentedAt),303701);assert.deepEqual(r.source,source);
 assert.equal(c.records.find(r=>r.id==='curated-704795880389214269-verified').durationEnd,r.documentedAt);
 assert.equal(c.records.find(r=>r.id==='curated-702425239707189252-702425239426170991-2020-proof-review').durationEnd,'2020-04-22T08:11:15.473Z');
});
