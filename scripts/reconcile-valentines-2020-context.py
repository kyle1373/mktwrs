"""Reconcile the early tour against continuous discussion and original player posts."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT / path).read_text())
def save(path, data):
    (ROOT / path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
def discord(mid):
    return {'url': f'https://discord.com/channels/629221606064914442/636461740162416640/{mid}', 'channel': 'tt-discussion', 'messageId': mid}

curated = read('archive/curated-runs.json')
record = next(r for r in curated if r['messageId'] == 'valentines-2020-tome-ktb-video-11386')
record.update(status='community-wr', includeInProgression=True)
record['additionalSources'] = [discord(mid) for mid in ['672464730270728203', '673023611136901142', '673024498605228051', '673024719955689472']]
record['notes'] = ['Original January 29 full recording visually verifies N64 Koopa Troopa Beach 1:13.86, first lap 37.07 and derived second lap 36.79.', 'Contemporaneous discussion answers a request for the best time with 1:13.89, immediately corrected to 1:13.86. Earlier adjacent discussion directs viewers to Tomegome. This establishes community WR context for the original run.', 'The later 1:13.83 tie remains undated; the original 1:13.86 video does not establish either tied player’s exact date or splits.']
assets = read('archive/assets-manifest.json')
observed = []
for sid, cid, time, laps, date, image, previous in [
    ('1222449810604806146', 'n64-koopa-troopa-beach', '1:14.72', ['37.30', '37.42'], '2020-01-29T09:22:01.000Z', 'EPcDnolWkAAzb4n', '1:14.75'),
    ('1222490661922004996', 'n64-koopa-troopa-beach', '1:14.17', ['37.14', '37.03'], '2020-01-29T12:04:21.000Z', 'EPcoxhzWAAA_qrN', '1:14.29'),
    ('1223712870816452609', '3ds-toad-circuit-r', '1:03.60', ['31.82', '31.78'], '2020-02-01T21:00:58.000Z', 'EPuAXhxX0AEcUD4', '1:03.82'),
]:
    url = f'https://pbs.twimg.com/media/{image}?format=jpg&name=small'
    dst = ROOT / f'public/assets/proof/valentines-2020-{sid}.webp'
    Image.open(ROOT / f'archive/valentines-2020-original-media/{sid}.jpg').convert('RGB').save(dst, 'WEBP', lossless=True)
    assets[url] = {'path': '/' + str(dst.relative_to(ROOT / 'public')), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes': dst.stat().st_size, 'contentType': 'image/webp'}
    observed.append({'messageId': 'valentines-2020-astre-' + sid, 'courseId': cid, 'player': 'Astre',
                     'time': time, 'laps': laps, 'mushrooms': None, 'submittedAt': date,
                     'status': 'documented-submission', 'includeInProgression': False,
                     'source': {'url': f'https://x.com/Astre_HD/status/{sid}', 'channel': 'original Twitter post', 'messageId': sid},
                     'proofImage': url, 'proofImageVerified': True,
                     'notes': [f'Original result image visually read; caption supplies both splits. Previous best shown: {previous}. Historical WR status and competitors at this instant are unresolved; not included in confirmed progression.']})
ids = {r['messageId'] for r in observed}
save('archive/curated-runs.json', [r for r in curated if r.get('messageId') not in ids] + observed)
save('archive/assets-manifest.json', assets)
ledger = read('archive/video-backup-files/downloads.json')
key = 'x:1222534288186298369'
item = ledger[key]
backup = read('archive/video-backups.json').get(key)
item.update(reviewStatus='visually-reviewed', backupStatus='available' if backup and backup.get('status') == 'available' else 'queued-daily-upload-limit', runs=[{k: record[k] for k in ['courseId', 'player', 'time', 'laps', 'submittedAt']}])
save('archive/video-backup-files/downloads.json', ledger)
availability = read('archive/video-availability.json')
availability[key] = {'originalUrl': item['originalUrl'], 'status': 'available', 'checkedAt': '2026-10-01', 'bytes': item['bytes'], 'sha256': item['sha256']}
save('archive/video-availability.json', availability)
save('archive/valentines-2020-context-reconciliation.json', {
    'tour': "Valentine's Tour", 'historyComplete': False, 'confirmedChanges': [record],
    'additionalDocumentedRuns': observed,
    'coverage': {'continuousDiscussionWindows': 7, 'discussionMessagesWithBoundaries': len(read('archive/valentines-2020-discussion-census.json')), 'indexedImagesVisuallyReviewed': 32, 'originalPlayerTimelinesRead': ['tomegome_g', 'Astre_HD']},
    'openLeads': [
        {'courseId': 'n64-koopa-troopa-beach', 'time': '1:13.83', 'players': ['Tomegome', 'Nu11'], 'issue': 'Both final tied records still lack original dates and individual run proof.'},
        {'courseId': '3ds-toad-circuit-r', 'player': 'Nu11', 'lap': '31.34', 'source': 'https://x.com/tomegome_g/status/1224097182493495296', 'issue': 'Contemporaneous reference to Kaguya’s lap, not a complete race total. Parent posts are deleted. Do not manufacture a race by combining splits.'},
    ],
    'limitations': ['Server-wide images outside the TT channel are not yet fully reviewed for this tour.', 'The dates of the later tied 1:13.83 runs remain unresolved, so a complete reign duration for 1:13.86 cannot be assigned.', 'The reviewed timeline and surviving discussion cannot establish recovery of deleted messages.'],
})
print({'newConfirmedWr': 1, 'additionalDocumentedRuns': len(observed)})
