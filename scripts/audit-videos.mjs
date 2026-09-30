import fs from "node:fs";
const courses = JSON.parse(fs.readFileSync("public/data/courses.json"));
const file = "archive/video-metadata.json";
const metadata = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
const urls = [
  ...new Set(
    courses
      .flatMap((c) => [...c.records, ...c.submissions])
      .map((r) => r.video || r.videoReference)
      .filter(Boolean),
  ),
].filter((url) => {
  try {
    return /(^|\.)(youtube\.com|youtu\.be)$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
});
const queue = urls.filter((url) => !metadata[url]);
async function worker() {
  while (queue.length) {
    const url = queue.shift();
    try {
      const endpoint =
        "https://www.youtube.com/oembed?" +
        new URLSearchParams({ url, format: "json" });
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw Error("HTTP " + response.status);
      const result = await response.json();
      metadata[url] = {
        title: result.title,
        author: result.author_name,
        authorUrl: result.author_url,
        retrievedAt: new Date().toISOString(),
        source: endpoint,
      };
    } catch (error) {
      metadata[url] = {
        error: error.message,
        checkedAt: new Date().toISOString(),
      };
    }
    fs.writeFileSync(file, JSON.stringify(metadata, null, 2));
  }
}
await Promise.all(Array.from({ length: 5 }, worker));
console.log({
  urls: urls.length,
  available: urls.filter((url) => metadata[url]?.title).length,
});
