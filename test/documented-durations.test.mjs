import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {applyDocumentedDurations} from '../lib/documented-durations.mjs';
import {resolveFinalDate} from '../lib/final-dates.mjs';
const row=(id,timeCs,documentedAt,playerId=id)=>({id,timeCs,playerId,documentedAt,documentedDatePrecision:'timestamp'});
test('reigns pause between tours and tied holders end at the same faster submission',()=>{
 const c={records:[row('a',100,'2020-01-01T12:00:00Z'),row('b',100,'2020-01-02T12:00:00Z'),row('c',90,'2020-01-16T12:00:00Z')],submissions:[],candidates:[],appearances:[{startDate:'2020-01-01',endDate:'2020-01-03'},{startDate:'2020-01-15',endDate:'2020-01-17'}]};
 applyDocumentedDurations([c]);assert.equal(c.records[0].durationDays,3);assert.equal(c.records[1].durationDays,2);assert.equal(c.records[2].durationDays,.75);
});
test('same-timestamp previous best has no invented reign and a personal best earns no WR duration',()=>{
 const c={records:[row('a',100,'2020-01-01T12:00:00Z'),row('b',90,'2020-01-01T12:00:00Z')],submissions:[row('pb',110,'2020-01-02T12:00:00Z')],candidates:[],appearances:[{startDate:'2020-01-01',endDate:'2020-01-03'}]};applyDocumentedDurations([c]);assert.equal(c.records[0].durationDays,0);assert.equal(c.records[1].durationDays,1.75);assert.equal(c.submissions[0].durationDays,0);assert.equal(c.submissions[0].durationBasis,'not-a-world-record');
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
