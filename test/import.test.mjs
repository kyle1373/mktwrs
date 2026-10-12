import test from "node:test";
import assert from "node:assert/strict";
import {
  findCourse,
  centiseconds,
  mediaKind,
  attachmentDate,
  completeTwoLapSplit,
  verifiedSplitEvidence,
  recordAppearance,
  exactReviewedRecordSubmission,
  enrichRecordingEvidence,
  applySubmissionSourceEvidence,
  enrichOriginalProofReviews,
} from "../scripts/import-sources.mjs";
test("historical announcement tour wins over its later posting date", () => {
  const appearances = [
    {startDate:"2021-02-10",endDate:"2021-02-24"},
    {startDate:"2021-10-06",endDate:"2021-10-20"},
  ];
  assert.equal(recordAppearance({tourLabel:"Peach vs. Daisy Tour [10/02/21 - 23/02/21]",announcedAt:"2021-10-09T09:50:26.097Z"},appearances),appearances[0]);
  assert.equal(recordAppearance({announcedAt:"2021-10-09T09:50:26.097Z"},appearances),appearances[1]);
  assert.equal(recordAppearance({tourLabel:"Other Tour [10/02/20 - 23/02/20]",announcedAt:"2021-10-09T09:50:26.097Z"},appearances),undefined);
});
test("verified laps survive spreadsheet reposts of the same original image without transferring dates", () => {
  const sheet = {source:{url:"https://docs.google.com/sheet"},proofImage:"https://cdn.discordapp.com/attachments/1/2/result.jpg?ex=old",laps:[null,null],achievedAt:"2019-10-25"};
  const original = {source:{url:"https://discord.com/channels/1/3/4"},proofImage:"https://media.discordapp.net/attachments/1/2/result.jpg?width=500",laps:["32.49","32.42"],proofImageVerified:true,notes:[],achievedAt:"2019-10-26"};
  assert.equal(verifiedSplitEvidence({timeCs:6491},sheet,[sheet,original]),original);
  assert.equal(sheet.achievedAt,"2019-10-25");
  const rerun = {...original,proofImage:"https://cdn.discordapp.com/attachments/1/9/result.jpg"};
  assert.equal(verifiedSplitEvidence({timeCs:6491},sheet,[sheet,rerun]),sheet);
  assert.equal(verifiedSplitEvidence({timeCs:6491},sheet,[{...original,laps:["32.49","32.43"]}]),sheet);
});
test("missing lap is derived with centisecond arithmetic only for unambiguous two-lap runs", () => {
  assert.deepEqual(completeTwoLapSplit(6997, ["34.98", null]), {laps:["34.98","34.99"],derivedLap:2});
  assert.deepEqual(completeTwoLapSplit(6997, [null, "34.99"]), {laps:["34.98","34.99"],derivedLap:1});
  assert.equal(completeTwoLapSplit(6997, [null, null]), null);
  assert.equal(completeTwoLapSplit(6997, ["70.00", null]), null);
  assert.equal(completeTwoLapSplit(11949, ["33.77", null, "36.55"]), null);
});
test("Rainbow Road variants from different games never collapse together", () => {
  const courses = [
    { name: "SNES Rainbow Road R" },
    { name: "3DS Rainbow Road R" },
    { name: "Wii Rainbow Road" },
  ];
  assert.equal(
    findCourse(courses, "3DS Rainbow Road Reverse").name,
    "3DS Rainbow Road R",
  );
  assert.equal(findCourse(courses, "Rainbow Road R"), null);
});
test("historical time formats normalize without using broken MS helper cells", () => {
  assert.equal(centiseconds("1:02.62"), 6262);
  assert.equal(centiseconds("1:02:62"), 6262);
  assert.equal(centiseconds("01.02.62"), 6262);
  assert.equal(centiseconds(39.76), 3976);
  assert.equal(centiseconds("-"), null);
});
test("screenshots never become video links because their filename mentions YouTube", () => {
  assert.equal(
    mediaKind(
      "https://cdn.discordapp.com/attachments/1/2/Screenshot_com.youtube.jpg?ex=123",
    ),
    "image",
  );
  assert.equal(
    mediaKind(
      "https://pbs.twimg.com/media/EVeoT72UUAAWkff?format=jpg&name=large",
    ),
    "image",
  );
  assert.equal(mediaKind("https://youtu.be/8WMv6LzXt6k"), "video");
  assert.equal(mediaKind("https://discordapp.com/channels/1/2/3"), "reference");
});
test("proof upload dates decode only Discord attachment snowflakes", () => {
  assert.equal(
    attachmentDate(
      "https://cdn.discordapp.com/attachments/875784780573184010/920574054677757972/proof.jpg",
    ).slice(0, 10),
    "2021-12-15",
  );
  assert.equal(
    attachmentDate(
      "https://example.org/attachments/875784780573184010/920574054677757972/proof.jpg",
    ),
    null,
  );
});

test("exact reviewed publication clock survives an equal-time undated spreadsheet row", () => {
  const record = {id:"curated-original",courseId:"toad",playerId:"superfx",timeCs:6651};
  const sheet = {...record,id:"sheet",achievedAt:"2019-10-23",submittedAt:null};
  const original = {...record,submittedAt:"2019-10-23T06:57:26.608Z",submissionSourceReview:{originalTextAndClockReviewed:true,reviewAudit:"archive/source.json"}};
  assert.equal(exactReviewedRecordSubmission(record,[sheet,original]),original);
  assert.equal(exactReviewedRecordSubmission(record,[sheet,{...original,id:"equal-time-rerun"}]),undefined);
  assert.equal(exactReviewedRecordSubmission(record,[{...original,timeCs:6602}]),undefined);
  assert.equal(exactReviewedRecordSubmission(record,[{...original,playerId:"other"}]),undefined);
  assert.equal(exactReviewedRecordSubmission(record,[{...original,courseId:"other"}]),undefined);
  assert.equal(exactReviewedRecordSubmission(record,[{...original,submissionSourceReview:{}}]),undefined);
});


test("exact recording evidence survives an equal-time sheet match and a later Discord share", () => {
  const record = {courseId:"nbc",playerId:"astre",timeCs:8570,video:"https://twitter.com/Astre_HD/status/1191841211063164929?s=19",achievedAt:"2019-11-05",submittedAt:null};
  const sheet = {...record,id:"sheet",video:null,submittedAt:"2020-04-23"};
  const original = {...record,video:"https://x.com/Astre_HD/status/1191841211063164929",videoPublishedAt:"2019-11-05T22:14:22Z",
    videoPublicationSource:{postId:"1191841211063164929"},videoShareEvents:[{sharedAt:"2019-11-06T17:47:31.249Z"}],
    videoScopeReview:{status:"full-race-continuity-review-pending",startToFinishContinuityVerified:false},fullRaceVideoVerified:false};
  assert.equal(enrichRecordingEvidence(record,[sheet,original]),true);
  assert.equal(record.videoPublishedAt,original.videoPublishedAt);
  assert.deepEqual(record.videoShareEvents,original.videoShareEvents);
  assert.equal(record.videoScopeReview.startToFinishContinuityVerified,false);
  assert.equal(record.fullRaceVideoVerified,false);
  assert.equal(record.achievedAt,"2019-11-05");
  assert.equal(record.submittedAt,null);
});

test("equal totals cannot transfer recording metadata across players, courses, or different videos", () => {
  const record = {courseId:"nbc",playerId:"astre",timeCs:8570,video:"https://twitter.com/Astre_HD/status/1191841211063164929"};
  const donor = {...record,videoPublishedAt:"2019-11-05",videoPublicationSource:{postId:"1191841211063164929"}};
  for (const change of [{playerId:"rival"},{courseId:"toad"},{timeCs:8571},{video:"https://twitter.com/Astre_HD/status/1191841211063164930"},{video:null}]) {
    const target = {...record};
    assert.equal(enrichRecordingEvidence(target,[{...donor,...change}]),false);
    assert.equal(target.videoPublishedAt,undefined);
  }
});


test("reviewed sheet video publication survives rebuilding without changing race dates or footage scope", () => {
  const row = {id:"sheet-AH33",courseId:"toad",playerId:"edd",time:"1:09.71",video:"https://youtu.be/q12wOiA8qlQ",achievedAt:"2019-10-23",submittedAt:null};
  const review = {courseId:row.courseId,playerId:row.playerId,time:row.time,video:row.video,evidence:{videoPublishedAt:"2019-10-23T22:34:53Z",videoReferenceReview:{fullRaceVerified:false}}};
  assert.equal(applySubmissionSourceEvidence(row,{[row.id]:review}),true);
  assert.equal(row.videoPublishedAt,review.evidence.videoPublishedAt);
  assert.equal(row.videoReferenceReview.fullRaceVerified,false);
  assert.equal(row.achievedAt,"2019-10-23");
  assert.equal(row.submittedAt,null);
  assert.throws(()=>applySubmissionSourceEvidence({...row,time:"1:09.70"},{[row.id]:review}),/mismatch/);
  assert.throws(()=>applySubmissionSourceEvidence({...row},{[row.id]:{...review,evidence:{achievedAt:"2019-10-24"}}}),/Unsupported/);
});


test("retained result reports and video shares keep their own clocks with exact sheet-source guards", () => {
 const row={id:"sheet-AH13",courseId:"toad",playerId:"nova",time:"1:04.99",video:"https://youtu.be/oW-jyVSXs8s",source:{url:"https://example.org/sheet#AH13"},submittedAt:null};
 const report={reportedAt:"2019-10-25T10:04:36.476Z",originalRunnerSubmission:false};
 const review={...row,sourceUrl:row.source.url,evidence:{resultReportEvents:[report],additionalSources:[{url:"https://discord.com/report"}]}};
 assert.equal(applySubmissionSourceEvidence(row,{[row.id]:review}),true);
 assert.deepEqual(row.resultReportEvents,[report]);assert.equal(row.submittedAt,null);
 assert.throws(()=>applySubmissionSourceEvidence({...row,source:{url:"https://example.org/other"}},{[row.id]:review}),/mismatch/);
});


test("original proof reviews retain separate original and repost clocks without dating previous best",()=>{
 const record={courseId:"ddj",playerId:"tome",timeCs:9416,proofImageLocal:"/original.webp",achievedAt:null,dateUnresolved:true};
 const evidence={...record,proofImageVerified:true,originalPostSourceReview:{postedAt:"2019-11-04T18:21:02Z"},laterOriginalScreenshotRepostReview:{evidenceSharedAt:"2020-07-15T13:16:07.517Z"}};
 assert.equal(enrichOriginalProofReviews(record,evidence),true);
 assert.deepEqual(record.originalPostSourceReview,evidence.originalPostSourceReview);
 assert.deepEqual(record.laterOriginalScreenshotRepostReview,evidence.laterOriginalScreenshotRepostReview);
 assert.equal(record.achievedAt,null);assert.equal(record.dateUnresolved,true);
 for(const change of [{playerId:"other"},{courseId:"other"},{timeCs:9423},{proofImageLocal:"/rerun.webp"},{proofImageVerified:false}])
  assert.equal(enrichOriginalProofReviews({...record},{...evidence,...change}),false);
});


test("result reports follow exact original proof identity without inventing submission clocks",()=>{
 const record={courseId:"tc",playerId:"nu",timeCs:6446,proofImageLocal:"/nu-result.webp",submittedAt:null};
 const report={reportedAt:"2019-10-30T01:03:49Z",reviewAudit:"archive/halloween2019-report.json",source:{url:"https://twitter.com/_Kaguya_Games/status/1189347136720310272"}};
 const evidence={...record,proofImageVerified:true,resultReportEvents:[report]};
 assert.equal(enrichOriginalProofReviews(record,evidence),true);
 assert.deepEqual(record.resultReportEvents,[report]);assert.equal(record.submittedAt,null);
 for(const change of [{playerId:"other"},{courseId:"other"},{timeCs:6451},{proofImageLocal:"/different.webp"},{proofImageVerified:false}]){
  const candidate={...record};delete candidate.resultReportEvents;
  assert.equal(enrichOriginalProofReviews(candidate,{...evidence,...change}),false);
  assert.equal(candidate.resultReportEvents,undefined);
 }
});
