import { archive } from "../lib/data.mjs";
export default function sitemap() {
  const a = archive();
  const paths = ["", "players", "rankings", "tours", "archive", ...a.courses.map(c => `course/${c.id}`), ...a.players.map(p => `player/${p.id}`)];
  return paths.map(path => ({ url: `https://mktwrs.com/${path}` }));
}
