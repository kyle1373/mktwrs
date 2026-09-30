import test from 'node:test';
import assert from 'node:assert/strict';
import { videoKey, fastestVideo, recordChronology } from '../lib/video.mjs';
const run = (timeCs, extra={}) => ({playerId:'runner', timeCs, video:'https://youtu.be/X_wkkweScJU', videoAudit:{status:'title-time-matches'}, ...extra});
test('fastest footage falls back from unavailable WR and excludes unverified submissions', () => {
 const current=run(9000,{videoAudit:{status:'metadata-unavailable'}});
 const prior=run(9200);
 const course={records:[current,prior],currentHolders:[current],submissions:[run(9100),run(9150,{videoVerified:true})]};
 assert.equal(fastestVideo(course).timeCs,9150);
 assert.equal(fastestVideo(course).isCurrent,false);
 assert.equal(course.records.length,2);
});
test('available backup preserves original and restores footage after original loss',()=>{
 const current=run(9000,{videoAvailability:'unavailable',videoAudit:{status:'metadata-unavailable'},videoBackup:{url:'https://youtu.be/backup12345',status:'available'}});
 const selected=fastestVideo({records:[current,run(9200)],currentHolders:[current]});
 assert.equal(selected.isCurrent,true);
 assert.equal(selected.video,current.video);
 assert.equal(selected.videoBackup.url,current.videoBackup.url);
 assert.equal(fastestVideo({records:[run(8800,{videoAudit:{status:'title-time-mismatch'},videoVerified:true})]}),null);
});
test('video IDs deduplicate original URL variants',()=>{
 assert.equal(videoKey('https://www.youtube.com/watch?v=X_wkkweScJU&feature=emb_logo'),videoKey('https://youtu.be/X_wkkweScJU'));
 assert.equal(videoKey('https://twitter.com/tome/status/123?s=19'),videoKey('https://x.com/tome/status/123'));
});
test('profiles order known chronology oldest first without inventing dates',()=>{
 const rows=[{recordDate:'2024-01-02'},{tourDateRange:{start:'2019-10-23'}},{recordDate:'2020-10-01',timeCs:9200},{recordDate:'2020-10-01',timeCs:9100}];
 rows.sort(recordChronology);
 assert.equal(rows[0].recordDate,undefined);
 assert.equal(rows[1].timeCs,9200);
 assert.equal(rows.at(-1).recordDate,'2024-01-02');
});
