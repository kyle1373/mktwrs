import test from 'node:test';
import assert from 'node:assert/strict';
import {routeData} from '../lib/data.mjs';
import {halloween2019RecordingComparison} from '../lib/video.mjs';
for (const [course,wr,recording] of [
 ['3ds-toad-circuit','1:04.46','1:04.85'],
 ['3ds-neo-bowser-city','1:25.70','1:25.70'],
 ['gcn-dino-dino-jungle','1:34.16','1:34.43'],
]) test(`${course} separates Halloween WR from reviewed full-race recording`,()=>{
 const page=routeData(['course',course]);
 const c=page.data.halloween2019Recording;
 assert.equal(c.worldRecord.time,wr);
 assert.equal(c.recording.time,recording);
 assert.equal(c.complete,false);
 assert.ok(c.recording.video || c.recording.videoBackup?.url);
 assert.ok(page.players.some(p=>p.id===c.recording.playerId));
});
test('later tours and footage without explicit full-run scope cannot win Halloween comparison',()=>{
 const run=(id,timeCs,day,scope)=>({id,timeCs,time:String(timeCs),achievedAt:day,playerId:'p',video:'https://youtu.be/abcdefghijk',videoVerified:true,videoScope:scope});
 const c=halloween2019RecordingComparison({records:[run('wr',6000,'2019-10-25')],submissions:[run('later',5000,'2020-10-25','full-run'),run('reviewed',6100,'2019-10-25','full-run')]});
 assert.equal(c.worldRecord.id,'wr');
 assert.equal(c.recording.id,'reviewed');
});

test('exact achievement timestamps use 06:00 UTC tour rollover',()=>{
 const run=(id,achievedAt,timeCs)=>({id,achievedAt,timeCs,playerId:'p',video:'https://youtu.be/abcdefghijk',videoScope:'full-run',videoVerified:true});
 const c=halloween2019RecordingComparison({records:[],submissions:[
  run('before-opening','2019-10-23T05:59:59Z',4000),
  run('final-hours','2019-11-06T05:59:59Z',6000),
  run('at-close','2019-11-06T06:00:00Z',5000),
  run('date-only-close','2019-11-06',4500)
 ]});
 assert.equal(c.recording.id,'final-hours');
});
test('submission clock alone does not invent achievement timestamp or tour assignment',()=>{
 const c=halloween2019RecordingComparison({submissions:[{id:'report',submittedAt:'2019-11-06T05:00:00Z',timeCs:6000,videoScope:'full-run',videoVerified:true,video:'https://youtu.be/abcdefghijk'}]});
 assert.equal(c.recording,null);
});
