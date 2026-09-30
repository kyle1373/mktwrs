import fs from "node:fs";
import crypto from "node:crypto";
const courses = JSON.parse(fs.readFileSync("public/data/courses.json")),
  players = JSON.parse(fs.readFileSync("public/data/players.json"));
const manifestPath = "archive/assets-manifest.json";
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath))
  : {};
const urls = new Map();
for (const c of courses) {
  if (c.imageSource || c.image) urls.set(c.imageSource || c.image, "courses");
  if (c.fallbackImage) urls.set(c.fallbackImage, "courses");
  for (const r of c.records) if (r.proofImage) urls.set(r.proofImage, "proof");
}
for (const p of players)
  if (p.avatarSource || p.avatar)
    urls.set(p.avatarSource || p.avatar, "players");
const queue = [...urls.entries()];
let successes = 0,
  failures = 0;
async function worker() {
  while (queue.length) {
    const [url, kind] = queue.shift();
    if (manifest[url]?.path && fs.existsSync("public" + manifest[url].path)) {
      successes++;
      continue;
    }
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") throw Error("Unsupported URL");
      let res = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: { "User-Agent": "MKTWRs/1.0 community archival project" },
      });
      if (!res.ok) throw Error("HTTP " + res.status);
      const type = res.headers.get("content-type")?.split(";")[0];
      const ext = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
        "image/gif": "gif",
      }[type];
      if (!ext) throw Error("Not an image: " + type);
      const b = Buffer.from(await res.arrayBuffer());
      if (b.length > 12000000) throw Error("Image over 12 MB");
      const hash = crypto.createHash("sha256").update(b).digest("hex");
      const path = "/assets/" + kind + "/" + hash.slice(0, 24) + "." + ext;
      fs.mkdirSync("public/assets/" + kind, { recursive: true });
      fs.writeFileSync("public" + path, b);
      manifest[url] = {
        path,
        sha256: hash,
        bytes: b.length,
        contentType: type,
        retrievedAt: new Date().toISOString(),
      };
      successes++;
    } catch (e) {
      manifest[url] = { error: e.message, checkedAt: new Date().toISOString() };
      failures++;
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(JSON.stringify({ total: urls.size, successes, failures }));
