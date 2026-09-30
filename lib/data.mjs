import fs from "node:fs";
import path from "node:path";
import { courseStatistics } from "../public/history.mjs";
let cached;
export function archive() {
  if (cached && process.env.NODE_ENV === "production") return cached;
  const read = (n) =>
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "public/data", n + ".json"),
        "utf8",
      ),
    );
  cached = {
    courses: read("courses"),
    players: read("players"),
    tours: read("tours"),
    manifest: read("manifest"),
  };
  return cached;
}
export function routeData(slugs = []) {
  const a = archive();
  const [section, id] = slugs;
  const ranking = a.players.map((p) => {
    const records = a.courses.flatMap((c) =>
      c.records.filter((r) => r.playerId === p.id),
    );
    const stats = courseStatistics(records, a.players).players[0] || {
      days: 0,
      durationCount: 0,
      missingDays: 0,
    };
    return {
      ...p,
      ...stats,
      id: p.id,
      wrCount: records.length,
      bestCount: a.courses.filter((c) =>
        c.currentHolders.some((r) => r.playerId === p.id),
      ).length,
    };
  });
  const index = a.courses.map((c) => ({
    id: c.id,
    name: c.name,
    sortName: c.sortName,
    image: c.image,
    current: c.current,
    currentHolders: c.currentHolders,
    recordCount: c.records.length,
    submissionCount: c.submissions.length,
  }));
  let view = "home",
    data;
  if (!section) data = index;
  else if (section === "course") {
    view = "course";
    data = a.courses.find((c) => c.id === id);
  } else if (section === "player") {
    view = "player";
    const player = ranking.find((p) => p.id === id);
    data = player
      ? {
          ...player,
          records: a.courses.flatMap((c) =>
            c.records
              .filter((r) => r.playerId === id)
              .map((r) => ({ ...r, courseName: c.name })),
          ),
          submissions: a.courses.flatMap((c) =>
            c.submissions
              .filter((r) => r.playerId === id)
              .map((r) => ({ ...r, courseName: c.name })),
          ),
        }
      : null;
  } else if (section === "players" || section === "rankings") {
    view = section;
    data = ranking;
  } else if (section === "tours") {
    view = "tours";
    data = a.tours.map((t) => ({
      ...t,
      courses: a.courses
        .filter((c) => c.appearances.some((x) => x.tourId === t.id))
        .map((c) => ({ id: c.id, name: c.name })),
    }));
  } else if (section === "archive") {
    view = "archive";
    data = a.manifest;
  } else data = null;
  return {
    view,
    data,
    index: index.map(({ current, currentHolders, ...c }) => c),
    players: a.players.map(({ id, name, country }) => ({ id, name, country })),
    tours: a.tours,
    manifest: a.manifest,
  };
}
