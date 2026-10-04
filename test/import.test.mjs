import test from "node:test";
import assert from "node:assert/strict";
import {
  findCourse,
  centiseconds,
  mediaKind,
  attachmentDate,
  completeTwoLapSplit,
  verifiedSplitEvidence,
} from "../scripts/import-sources.mjs";
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
