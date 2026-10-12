import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeRecordingShareEvents} from '../scripts/import-sources.mjs';

test('an existing sheet share does not hide original and later shares of the exact recording', () => {
  const event = (url, sharedAt) => ({source:{url},sharedAt});
  const first = event('https://discord.com/channels/server/channel/1','2019-10-30T01:22:06Z');
  const original = event('https://twitter.com/player/status/2','2019-10-30T01:16:10Z');
  const later = event('https://discord.com/channels/server/channel/3','2020-10-08T08:14:52Z');
  const record = {playerId:'nu11',courseId:'3ds-toad-circuit',timeCs:6446,video:'https://www.youtube.com/watch?v=G1_Z2_9JICA',videoShareEvents:[first],achievedAt:'2019-10-29'};
  const match = extra => ({...record,video:'https://youtu.be/G1_Z2_9JICA',...extra});
  const matches = [match({videoShareEvents:[first]}),match({video:null,videoShareEvents:[{...original,video:record.video},{...later,video:record.video}]}),
    match({playerId:'other',videoShareEvents:[event('wrong-player','2020-01-01')]}),
    match({courseId:'other',videoShareEvents:[event('wrong-course','2020-01-01')]}),
    match({timeCs:6445,videoShareEvents:[event('wrong-result','2020-01-01')]}),
    match({video:'https://youtu.be/zyMlDQ5xeM0',videoShareEvents:[event('wrong-video','2020-01-01')]})];
  const before = structuredClone(matches);
  assert(mergeRecordingShareEvents(record,matches));
  assert.deepEqual(record.videoShareEvents,[first,{...original,video:record.video},{...later,video:record.video}]);
  assert.equal(record.achievedAt,'2019-10-29');
  assert.equal(record.video,'https://www.youtube.com/watch?v=G1_Z2_9JICA');
  assert.deepEqual(matches,before);
});
