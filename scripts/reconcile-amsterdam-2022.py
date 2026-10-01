"""Restore Amsterdam Tour exchanges from reviewed images and adjacent messages."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return json.loads((ROOT / path).read_text())

def save(path, value):
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def stamp(mid):
    return datetime.fromtimestamp(((int(mid) >> 22) + 1420070400000) / 1000, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

def source(mid, channel='tt-submission'):
    cid = {'tt-submission': '875784780573184010', 'tt-discussion': '636461740162416640', 'wr-history': '896050730216095765'}[channel]
    return {'url': f'https://discord.com/channels/629221606064914442/{cid}/{mid}', 'channel': channel, 'messageId': mid}

review = read('archive/submission-visual-review.json')
by_index = {r['index']: aid for aid, r in review.items()}
queue = {r['attachmentId']: r for r in read('archive/submission-image-map.json')['images']}
downloads = read('archive/submission-image-downloads.json')
assets = read('archive/assets-manifest.json')
ledger = read('archive/video-backup-files/downloads.json')
availability = read('archive/video-availability.json')
discussion = read('archive/amsterdam-2022-discussion-census.json')
spec = [(1961, 'Retro', None), (1964, 'Nu11', ['40.74', '40.69']),
        (1969, 'Nu11', ['20.53', '20.47']), (1975, 'Nu11', ['20.56', '20.23']),
        (1982, 'Nu11', ['20.41', '20.28']), (1992, 'Wins', ['20.46', '20.20']),
        (2016, 'すいそ🐺', ['40.73', '40.65']), (2025, 'すいそ🐺', ['40.59', '40.78'])]
rows = []
for index, player, laps in spec:
    aid = by_index[index]
    r = review[aid]
    assert r['reviewStatus'] == 'visually-reviewed'
    url = queue[aid]['imageUrl']
    dst = ROOT / f'public/assets/proof/amsterdam-2022-{aid}.webp'
    if not dst.exists():
        Image.open(ROOT / downloads[aid]['path']).convert('RGB').save(dst, 'WEBP', lossless=True)
    assets[url] = {'path': '/' + str(dst.relative_to(ROOT / 'public')), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes': dst.stat().st_size, 'contentType': 'image/webp'}
    rows.append({'messageId': 'amsterdam-2022-' + aid, 'player': player,
                 'courseId': r['courseId'], 'time': r['time'], 'laps': laps or [None, None],
                 'mushrooms': None, 'status': 'community-wr', 'submittedAt': stamp(r['messageId']),
                 'source': source(r['messageId']), 'proofImage': url, 'proofImageVerified': True,
                 'notes': ['Original result image visually read and compared with the earlier standing WR, overlapping submissions and surrounding discussion. Dates document verified publication, not an assumed private completion time.']})
by = {(r['player'], r['time']): r for r in rows}

# These cancelled bot rows were replaced by matching submissions, not invalid runs.
for player, time, mid in [('Nu11', '1:21.43', '967427286997536839'), ('Nu11', '0:41.00', '967703345869492224'), ('Wins', '0:40.66', '968226654935740516')]:
    r = by[player, time]
    r['additionalSources'] = [r['source']]
    r.update(submittedAt=stamp(mid), source=source(mid))
    if player == 'Nu11':
        r['notes'].append('Earliest surviving bot entry has matching total and splits. Its cancelled status was followed by the same run resubmitted with a video; the later surviving image and downloaded video verify the result. The deleted earlier attachment was not visually read.')

r = by['すいそ🐺', '1:21.38']
r['additionalSources'] = [r['source'], source('970636213855846440', 'tt-discussion')]
r.update(submittedAt=stamp('969894027648466944'), source=source('969894027648466944', 'tt-discussion'))
r['notes'].append('Spartacurt reposted Sucha’s screenshot in discussion before submissions. Written .73/.65 resolves to 40.73/40.65, independently confirmed by the subsequent leaderboard. Previous best is 1:21.57, a slower non-WR, not 1:21.47.')

intermediate = {'messageId': 'amsterdam-2022-nu11-8152', 'player': 'Nu11',
    'courseId': 'rmx-rainbow-road-2', 'time': '1:21.52', 'laps': ['40.79', '40.73'],
    'mushrooms': None, 'status': 'community-wr', 'submittedAt': stamp('967396122303811614'),
    'source': source('967396122303811614'), 'proofImage': None,
    'additionalSources': [source('967397554457301012', 'tt-discussion'), source('967413393701089292', 'tt-discussion'), source('967429848995860551')],
    'notes': ['Original attachment is unavailable and was not visually read. The timestamped bot preserves 1:21.52 and 40.79/40.73; contemporaneous congratulations and Nu11’s response precede the improvement to 1:21.43. That surviving result image visibly lists 1:21.52 as the previous best. The earlier standing WR was 1:21.65. Bot cancellation occurred after the replacement submission, so it does not erase this intermediate record.']}
rows.append(intermediate)

videos = [('Nu11', '1:21.43', 'youtube:quUMrlAlYa8'), ('Nu11', '0:41.00', 'youtube:vCez_Nt5zXA'),
          ('Nu11', '0:40.79', 'youtube:-GQIuAYykms'), ('Nu11', '0:40.69', 'youtube:I9e9yu-woyI'),
          ('Wins', '0:40.66', 'x:1521752102640439298'), ('すいそ🐺', '1:21.37', 'youtube:mqWqIACClpY')]
for player, time, key in videos:
    r = by[player, time]
    item = ledger[key]
    assert item['status'] == 'downloaded'
    r.update(video=item['originalUrl'], videoVerified=True)
    meta = read(item['folder'] + '/original.info.json')
    published = datetime.fromtimestamp(meta['timestamp'], timezone.utc).isoformat().replace('+00:00', 'Z')
    if published < r['submittedAt']:
        r.setdefault('additionalSources', []).append(r['source'])
        r.update(submittedAt=published, source={'url': r['video'], 'channel': 'original-video', 'publishedAt': published})
    r['notes'].append('Downloaded race visually verified at the first-lap crossing and final timer. Lap 2 equals final time minus the displayed first lap and agrees with the written splits.')
    item.update(reviewStatus='visually-reviewed', backupStatus='queued-daily-upload-limit', runs=[{'courseId': r['courseId'], 'time': time, 'player': player, 'date': r['submittedAt'][:10], 'laps': r['laps'], 'source': r['source']['url']}])
    availability[key] = {'originalUrl': r['video'], 'status': 'available', 'checkedAt': '2026-10-01', 'bytes': item['bytes'], 'sha256': item['sha256']}
by['Wins', '0:40.66'].setdefault('additionalSources', []).extend([source('971311163730182154', 'tt-discussion'), source('971934202390020136', 'wr-history')])
by['すいそ🐺', '1:21.37'].setdefault('additionalSources', []).append(source('971932178369876018', 'wr-history'))

held = []
for player, parent, time in [('Retro', '0:41.98', '0:42.04'), ('Nu11', '0:41.00', '0:41.17'), ('Nu11', '0:40.79', '0:40.82'), ('Nu11', '0:40.69', '0:40.77')]:
    p = by[player, parent]
    r = {**p, 'messageId': p['messageId'] + '-previous-best', 'time': time, 'laps': [None, None],
         'submittedAt': None, 'observedAt': p['submittedAt'], 'dateUnresolved': True,
         'status': 'documented-submission', 'includeInProgression': False,
         'notes': ['Previous best visually read. Its exact date and order against competitors remain unresolved; retained outside the confirmed WR progression.']}
    r.pop('video', None)
    r.pop('videoVerified', None)
    held.append(r)

for key, classification in [('youtube:Bcs0A33q9_o', 'completed-non-wr-1:21.74'), ('youtube:f3FXugN5FFU', 'isolated-lap-40.72')]:
    ledger[key].update(reviewStatus='visually-reviewed', classification=classification, backupStatus='queued-daily-upload-limit')

def centiseconds(t):
    minute, second = t.split(':')
    return int(minute) * 6000 + round(float(second) * 100)

for r in rows:
    if all(r['laps']):
        assert sum(round(float(x) * 100) for x in r['laps']) == centiseconds(r['time'])
ids = {r['messageId'] for r in rows + held}
save('archive/curated-runs.json', [r for r in read('archive/curated-runs.json') if r.get('messageId') not in ids] + rows + held)
save('archive/assets-manifest.json', assets)
save('archive/video-backup-files/downloads.json', ledger)
save('archive/video-availability.json', availability)
confirmed = {by_index[i] for i, _, _ in spec}
for aid, r in review.items():
    if 1943 <= r['index'] <= 2026 or r['index'] == 2029:
        r.update(classification='reconciled-wr' if aid in confirmed else 'reviewed-non-wr-submission', reconciliation='archive/amsterdam-2022-reconciliation.json')
save('archive/submission-visual-review.json', review)
audit = read('archive/amsterdam-2022-capture-audit.json')
report = {'tour': 'Amsterdam Tour', 'status': 'Surviving tour submissions and surrounding discussion reconciled; deleted evidence and undated previous bests remain explicitly identified.',
          'coverage': {'submissionWindows': len(audit['windows']), 'submissionMessagesIncludingBoundaries': audit['uniqueMessagesRecaptured'], 'discussionMessagesIncludingBoundaries': len(discussion), 'indexedImagesVisuallyReviewed': 81, 'additionalSubmissionImagesRecoveredAndRead': 1, 'discussionImagesPreservedAndRead': 4, 'unreadDeletedSubmissionAttachments': 4, 'fullRaceVideosPreservedAndReviewed': 7, 'isolatedLapVideosPreservedAndReviewed': 1, 'newSuperFX64BackupsVerified': 0},
          'confirmedChanges': rows, 'previousBestLeads': held,
          'limitations': ['Four cancelled/deleted submission attachments remain unread. Surviving replacements verify the 1:21.43 and 0:41.00 runs; the 1:21.52 record uses explicitly described corroboration rather than a recovered original image.', 'The bot reset its leaderboard to the current tour; 1:21.66 was a tour leader but did not beat the earlier all-time 1:21.65.', 'Four previous-best leads do not yet have exact dates or verified positions in the WR sequence.', 'Sucha’s 1:21.38 video was promised in discussion but no original link was present in the reviewed window.', 'YouTube unlisted copies remain queued after the channel’s daily upload limit.', 'This tour-level pass does not establish complete coverage of the entire game or deleted messages.']}
save('archive/amsterdam-2022-reconciliation.json', report)
print({'confirmedOrEnriched': len(rows), 'held': len(held)})
