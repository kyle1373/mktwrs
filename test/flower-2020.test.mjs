import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const course=()=>JSON.parse(fs.readFileSync(new URL('../public/data/courses/3ds-shy-guy-bazaar-r.json',import.meta.url)));
test('Flower opening exchange preserves exact corrected times before the later 1:39.10 tie',()=>{
 const c=course(),r=c.records.filter(x=>x.messageId?.startsWith('flower-2020-'));
 assert.deepEqual(r.map(x=>x.time),['1:39.96','1:39.77','1:39.63','1:39.55','1:39.42']);
 assert(r.every(x=>x.recordDate==='2020-05-06'));
 assert(!c.records.some(x=>x.time==='1:38.63'&&x.recordDate==='2020-05-06'));
 for(const x of r.filter(x=>x.proofImageLocal))assert(fs.existsSync(new URL('../public'+x.proofImageLocal,import.meta.url)));
 assert(r.find(x=>x.time==='1:39.63').additionalSources.some(x=>x.messageId==='707595268253810709'));
});
test('slower strategy recordings are not substituted for Kazuo’s unrecorded 1:39.00',()=>{
 const r=course().records.find(x=>x.time==='1:39.00'&&x.playerId==='kazuo');
 assert.equal(r.video,null);
 assert(r.additionalSources.some(x=>x.messageId==='709484699197636749'));
});
