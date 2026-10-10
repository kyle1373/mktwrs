import test from "node:test";
import assert from "node:assert/strict";
import { archive, routeData } from "../lib/data.mjs";
import { courseStatistics, historyEvents } from "../public/history.mjs";

const source = archive();
test("homepage ships only current records and stays under 150 KB of page data", () => {
  const props = routeData();
  assert(Buffer.byteLength(JSON.stringify(props)) < 150_000);
  assert.equal(props.tours.length, 0);
  assert.deepEqual(props.data.flatMap(c => c.currentHolders.map(r => r.id)), source.courses.flatMap(c => c.currentHolders.map(r => r.id)));
  for (const c of props.data) {
    assert.equal(c.submissions, undefined);
    assert.equal(c.current, undefined);
    for (const r of c.currentHolders) {
      assert(props.players.some(p => p.id === r.playerId));
      const original = source.courses.find(x => x.id === c.id).currentHolders.find(x => x.id === r.id);
      for (const key of ["time", "recordDate", "durationDays", "video", "proofImage", "proofImageLocal"]) assert.deepEqual(r[key], original[key]);
    }
  }
});
test("smaller course payloads preserve all WRs, tour boundaries and duration statistics", () => {
  for (const course of source.courses) {
    const props = routeData(["course", course.id]);
    assert.equal(props.data.submissions, undefined);
    assert.deepEqual(courseStatistics(props.data.records, props.players), courseStatistics(course.records, source.players));
    const events = (c, tours) => historyEvents(c, tours, source.manifest.updatedAt).map(({ record, ...event }) => event);
    assert.deepEqual(events(props.data, props.tours), events(course, source.tours));
    assert.deepEqual(props.data.records.map(r => [r.id, r.source.url, r.evidenceNote, r.laps]), course.records.map(r => [r.id, r.source.url, r.evidenceNote, r.laps]));
  }
});
test("player page retains chronological records, current-WR flags and profile identity", () => {
  const player = source.players.find(p => p.id === "tomegome");
  const props = routeData(["player", player.id]);
  assert.equal(props.data.avatar, player.avatar);
  assert.deepEqual(props.data.socials, player.socials);
  assert.equal(props.data.submissions, undefined);
  assert.equal(props.data.records.length, source.courses.flatMap(c => c.records.filter(r => r.playerId === player.id)).length);
  for (const r of props.data.records) {
    const course = source.courses.find(c => c.id === r.courseId);
    assert.equal(r.isCurrent, course.currentHolders.some(h => h.playerId === player.id && h.timeCs === r.timeCs));
  }
});

test("course presentation retains video share events separately from race dates", () => {
 const course=source.courses.find(c=>c.id==='3ds-toad-circuit');
 const props=routeData(['course',course.id]);
 for(const row of course.records){
  const display=props.data.records.find(r=>r.id===row.id);
  for(const key of ['submittedAt','videoSharedAt','videoShareSource','videoShareEvents'])
   assert.deepEqual(display[key],row[key]);
 }
});
