// Refresh only identity-matched portraits from preserved tt-submission captures.
import fs from 'node:fs';
import crypto from 'node:crypto';
const byId = {};
for (const file of fs.readdirSync('archive/raw').filter(f => /^tt-submission-\d+\.json$/.test(f)).sort()) {
  const capture = JSON.parse(fs.readFileSync(`archive/raw/${file}`));
  for (const m of capture.messages || []) for (const image of m.images || []) {
    const match = image.src?.match(/^https:\/\/cdn\.discordapp\.com\/avatars\/(\d+)\/([^?]+)/);
    if (!match) continue;
    const id = match[1], capturedAt = capture.capturedAt || '';
    if (!byId[id] || capturedAt > byId[id].capturedAt) byId[id] = {
      url: `https://cdn.discordapp.com/avatars/${id}/${match[2]}?size=160`,
      capturedAt, messageId: m.id.split('-').at(-1), capture: file,
    };
  }
}
const players = JSON.parse(fs.readFileSync('public/data/players.json'));
const portraits = {};
const manifest = JSON.parse(fs.readFileSync('archive/assets-manifest.json'));
const queue = players.filter(p => p.discordId);
await Promise.all(Array.from({length: 6}, async () => {
  while (queue.length) {
    const p = queue.shift();
    let source = byId[p.discordId];
    const previous = p.avatarSource || p.avatar;
    if (!source && previous?.includes(`/avatars/${p.discordId}/`)) source = {url: previous, capturedAt: null};
    if (!source) continue;
    const entry = {...source, discordId: p.discordId};
    try {
      if (manifest[source.url]?.path && fs.existsSync('public' + manifest[source.url].path)) entry.path = manifest[source.url].path;
      else {
        const res = await fetch(source.url, {signal: AbortSignal.timeout(20000)});
        if (!res.ok) throw Error(`HTTP ${res.status}`);
        const type = res.headers.get('content-type')?.split(';')[0];
        const ext = {'image/webp':'webp','image/png':'png','image/gif':'gif','image/jpeg':'jpg'}[type];
        if (!ext) throw Error('Not an image');
        const bytes = Buffer.from(await res.arrayBuffer());
        const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
        entry.path = `/assets/players/${sha256.slice(0,24)}.${ext}`;
        fs.writeFileSync('public' + entry.path, bytes);
        manifest[source.url] = {path:entry.path,sha256,bytes:bytes.length,contentType:type,retrievedAt:new Date().toISOString()};
      }
    } catch (e) { entry.error = e.message; }
    portraits[p.id] = entry;
  }
}));
fs.writeFileSync('archive/player-portraits.json', JSON.stringify(portraits,null,2));
fs.writeFileSync('archive/assets-manifest.json', JSON.stringify(manifest,null,2));
console.log({matched: Object.keys(portraits).length, preserved: Object.values(portraits).filter(p=>p.path).length, failed: Object.values(portraits).filter(p=>p.error).length});
