import fs from 'node:fs';
import path from 'node:path';

// Publish outcomes without exposing local paths or full download logs.
const downloads = JSON.parse(fs.readFileSync('archive/video-backup-files/downloads.json'));
const report = {};
for (const [key, item] of Object.entries(downloads)) {
  const log = fs.readFileSync(path.join(item.folder, 'download.log'), 'utf8');
  const missing = /(?:video (?:is )?unavailable|video \S+ does not exist|no video could be found in this tweet)/i.test(log);
  report[key] = {
    originalUrl: item.originalUrl,
    status: item.status === 'downloaded' ? 'available' : missing ? 'unavailable' : 'check-failed',
    checkedAt: item.checkedAt,
    ...(item.status === 'downloaded' ? { bytes: item.bytes, sha256: item.sha256 } : {
      reason: missing ? 'The source did not provide an available video.' : 'Download failed; this does not establish that the video is lost.',
    }),
  };
}
fs.writeFileSync('archive/video-availability.json', JSON.stringify(report, null, 2) + '\n');
console.log(Object.values(report).reduce((counts, r) => ({ ...counts, [r.status]: (counts[r.status] || 0) + 1 }), {}));
