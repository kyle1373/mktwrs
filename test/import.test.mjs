import test from "node:test";
import assert from "node:assert/strict";
import { findCourse, centiseconds } from "../scripts/import-sources.mjs";
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
