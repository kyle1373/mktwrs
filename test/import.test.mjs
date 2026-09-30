import test from "node:test";
import assert from "node:assert/strict";
import {
  findCourse,
  centiseconds,
  mediaKind,
  attachmentDate,
} from "../scripts/import-sources.mjs";
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
