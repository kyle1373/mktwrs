import test from 'node:test';
import assert from 'node:assert/strict';
import { videoKey, fastestVideo, recordChronology, tourRecordingComparison } from '../lib/video.mjs';
const run = (timeCs, extra={}) => ({playerId:'runner', timeCs, video:'https://youtu.be/X_wkkweScJU', videoAudit:{status:'title-time-matches'}, videoVerified:true, ...extra});
test('fastest footage falls back from unavailable WR and excludes unverified submissions', () => {
 const current=run(9000,{videoAvailability:'unavailable',videoAudit:{status:'metadata-unavailable'}});
 const prior=run(9200);
 const course={records:[current,prior],currentHolders:[current],submissions:[run(9100,{videoVerified:false}),run(9150,{videoVerified:true})]};
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
test('a dead original cannot outrank the next playable video despite cached title metadata',()=>{
 const dead=run(9000,{videoAvailability:'unavailable',videoVerified:true});
 assert.equal(fastestVideo({records:[dead,run(9200)]}).timeCs,9200);
});
test('profiles order known chronology oldest first without inventing dates',()=>{
 const rows=[{recordDate:'2024-01-02'},{tourDateRange:{start:'2019-10-23'}},{recordDate:'2020-10-01',timeCs:9200},{recordDate:'2020-10-01',timeCs:9100}];
 rows.sort(recordChronology);
 assert.equal(rows[0].recordDate,undefined);
 assert.equal(rows[1].timeCs,9200);
 assert.equal(rows.at(-1).recordDate,'2024-01-02');
});

test('video titles alone cannot qualify a record as fastest verified footage',()=>{
 const unreviewed=run(8800,{videoVerified:false});
 const verified=run(9000);
 assert.equal(fastestVideo({records:[unreviewed,verified]}).timeCs,9000);
 assert.equal(fastestVideo({records:[unreviewed]}),null);
});

test('verified partial recordings remain evidence but cannot supply fastest complete footage',()=>{
 const excerpt=run(8321,{videoScope:'finish-excerpt',videoBackup:{url:'https://youtu.be/backup12345',status:'available'}});
 const partial=run(8322,{videoCoverage:'partial'});
 const fragment=run(8323,{videoCoverage:'finish-fragment'});
 const complete=run(8330,{videoScope:'full-run',video:'https://youtu.be/zyMlDQ5xeM0'});
 const course={records:[excerpt,partial],submissions:[fragment,complete],currentHolders:[excerpt]};
 assert.equal(fastestVideo(course).timeCs,8330);
 assert.equal(fastestVideo(course).isCurrent,false);
 assert.equal(course.records[0],excerpt);
 assert.equal(fastestVideo({records:[excerpt,partial,fragment]}),null);
 assert.equal(fastestVideo({records:[run(8340,{videoCoverage:'full'})]}).timeCs,8340);
});


test('pending full-race review excludes result-verified footage and its sheet duplicate',()=>{
 const pending=run(8570,{id:'curated-astre',videoScopeReview:{startToFinishContinuityVerified:false}});
 const duplicate=run(8570,{id:'sheet-astre',video:'https://www.youtube.com/watch?v=X_wkkweScJU'});
 const complete=run(9108,{id:'reviewed-full',video:'https://youtu.be/zyMlDQ5xeM0',videoScope:'full-run'});
 const course={records:[pending],submissions:[duplicate,complete],currentHolders:[pending]};
 const before=structuredClone(course);
 assert.equal(fastestVideo(course).id,complete.id);
 assert.equal(fastestVideo(course).isCurrent,false);
 assert.deepEqual(course,before);
});

test('partial footage exclusions apply across equivalent original URL variants',()=>{
 const partial=run(8500,{videoScope:'partial'});
 const duplicate=run(8500,{video:'https://www.youtube.com/watch?v=X_wkkweScJU&feature=share'});
 assert.equal(fastestVideo({records:[partial],submissions:[duplicate]}),null);
});


test('Animal final announcement belongs to its declared tour despite a later publication clock',()=>{
 const announced={id:'final',playerId:'nu11',timeCs:9047,announcedAt:'2022-12-17T03:57:02.355Z',tourDateRange:{start:'2022-11-15',end:'2022-11-29'}};
 const earlier={id:'earlier',playerId:'wins',timeCs:9064,submittedAt:'2022-11-26T15:37:46.550Z'};
 const nextTour={id:'next',playerId:'runner',timeCs:9040,recordDate:'2022-11-30',submittedAt:'2022-11-30T06:00:00Z'};
 const course={records:[announced,earlier,nextTour],submissions:[]};
 const before=structuredClone(course);
 assert.equal(tourRecordingComparison(course,'tour-83','2022-11-16','2022-11-30').worldRecord.id,'final');
 assert.equal(tourRecordingComparison(course,'tour-84','2022-11-30','2022-12-14').worldRecord.id,'next');
 assert.deepEqual(course,before);
});
