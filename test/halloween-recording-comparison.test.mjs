import test from 'node:test';
import assert from 'node:assert/strict';
import {routeData} from '../lib/data.mjs';
import {halloween2019RecordingComparison} from '../lib/video.mjs';
for (const [course,wr,recording] of [
 ['3ds-toad-circuit','1:04.46','1:04.85'],
 ['3ds-neo-bowser-city','1:25.70','1:31.08'],
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
