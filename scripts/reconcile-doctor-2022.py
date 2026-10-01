"""Reconcile Doctor Tour images, surrounding discussion and original race videos."""
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
spec = [(2038, 'Nu11', ['35.92', '35.83']), (2052, 'Wins', ['40.54', '40.34']),
        (2068, 'Wins', ['40.37', '40.45']), (2069, 'Wins', None),
        (2078, 'Nu11', ['40.29', '40.31']), (2085, 'Wins', ['40.28', '40.25']),
        (2086, 'Wins', ['40.21', '40.17']), (2101, 'Wins', None),
        (2102, 'Wins', ['40.11', '40.10']), (2131, 'Wins', ['40.08', '40.01']),
        (2138, 'Fireball', ['40.00', '39.95'])]
rows = []
for index, player, laps in spec:
    aid = by_index[index]
    r = review[aid]
    assert r['reviewStatus'] == 'visually-reviewed'
    url = queue[aid]['imageUrl']
    dst = ROOT / f'public/assets/proof/doctor-2022-{aid}.webp'
    if not dst.exists():
        Image.open(ROOT / downloads[aid]['path']).convert('RGB').save(dst, 'WEBP', lossless=True)
    assets[url] = {'path': '/' + str(dst.relative_to(ROOT / 'public')), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes': dst.stat().st_size, 'contentType': 'image/webp'}
    rows.append({'messageId': 'doctor-2022-' + aid, 'player': player,
                 'courseId': r['courseId'], 'time': r['time'], 'laps': laps or [None, None],
                 'mushrooms': None, 'status': 'community-wr', 'submittedAt': stamp(r['messageId']),
                 'source': source(r['messageId']), 'proofImage': url, 'proofImageVerified': True,
                 'notes': ['Original image visually read and compared with prior all-time records, overlapping submissions and adjacent discussion. Date is the earliest verified public submission; an unannounced private completion is not assigned a guessed date.']})
by = {(r['player'], r['time']): r for r in rows}

for time, mid in [('1:20.78', '972515406839414805'), ('1:20.53', '973284737961570354'), ('1:20.38', '973340191416799232')]:
    r = by['Wins', time]
    r['additionalSources'] = [r['source']]
    r.update(submittedAt=stamp(mid), source=source(mid))
    r['notes'].append('The original player message precedes the bot row preserving the same screenshot. Both source messages are retained.')
by['Wins', '1:20.21']['notes'].append('The screenshot is the Morton Cup selection screen showing 1:20.21. The original Twitter race independently verifies the time and written splits.')

videos = [('Nu11', '1:11.75', 'youtube:HCwv7Mz_41k'),
          ('Wins', '1:20.21', 'x:1524705707051868161'),
          ('Wins', '1:20.09', 'youtube:lmAiDVHqHwg'),
          ('Fireball', '1:19.95', 'youtube:CDzFP6xTxlY')]
for player, time, key in videos:
    r = by[player, time]
    item = ledger[key]
    assert item['status'] == 'downloaded'
    r.update(video=item['originalUrl'], videoVerified=True)
    r['notes'].append('Downloaded original video visually checked at the first-lap crossing and final timer. Lap 2 is the difference and matches the submitted splits.')
    item.update(reviewStatus='visually-reviewed', backupStatus='queued-daily-upload-limit', runs=[{'courseId': r['courseId'], 'time': time, 'player': player, 'date': r['submittedAt'][:10], 'laps': r['laps'], 'source': r['source']['url']}])
    availability[key] = {'originalUrl': r['video'], 'status': 'available', 'checkedAt': '2026-10-01', 'bytes': item['bytes'], 'sha256': item['sha256']}
by['Nu11', '1:11.75'].setdefault('additionalSources', []).append(source('977979960255979631', 'wr-history'))
by['Wins', '1:20.21'].setdefault('additionalSources', []).extend([source('974264994956984320', 'tt-discussion'), source('974727133140226098', 'tt-discussion')])
by['Wins', '1:20.09'].setdefault('additionalSources', []).append(source('976388182927110204', 'tt-discussion'))
fireball = by['Fireball', '1:19.95']
fireball['additionalSources'] = [source('976364699706855424'), source('976367172177780747'), source('976365697812803624', 'tt-discussion'), source('976366107675992124', 'tt-discussion'), source('977977786604073020', 'wr-history')]
fireball['notes'].append('YouTube metadata has a May 13 upload timestamp, but contemporaneous May 18 discussion explicitly describes the strategy being withheld until the tour ended. The first verified public submission is May 18 at 05:55:34 UTC. The private upload date is not substituted for public WR history; Wins’s May 17 record remains in the progression.')

held = []
for player, parent, time in [('Nu11', '1:20.60', '1:20.75'), ('Wins', '1:20.53', '1:20.71'), ('Wins', '1:20.26', '1:20.36'), ('Fireball', '1:19.95', '1:20.11')]:
    p = by[player, parent]
    r = {**p, 'messageId': p['messageId'] + '-previous-best', 'time': time, 'laps': [None, None],
         'submittedAt': None, 'observedAt': p['submittedAt'], 'dateUnresolved': True,
         'status': 'documented-submission', 'includeInProgression': False,
         'notes': ['Previous best visually read from this later result image. The time is preserved as a lead, but its exact date and position against competitors remain unresolved, so it is outside confirmed WR progression.']}
    r.pop('video', None)
    r.pop('videoVerified', None)
    held.append(r)

for r in rows:
    if all(r['laps']):
        minute, second = r['time'].split(':')
        assert sum(round(float(x) * 100) for x in r['laps']) == int(minute) * 6000 + round(float(second) * 100)
ids = {r['messageId'] for r in rows + held}
save('archive/curated-runs.json', [r for r in read('archive/curated-runs.json') if r.get('messageId') not in ids] + rows + held)
save('archive/assets-manifest.json', assets)
save('archive/video-backup-files/downloads.json', ledger)
save('archive/video-availability.json', availability)
confirmed = {by_index[i] for i, _, _ in spec}
reviewed = []
for aid, r in review.items():
    if (2027 <= r['index'] <= 2138 and r['index'] != 2029) or r['index'] in [2140, 2141]:
        if r['reviewStatus'] == 'visually-reviewed':
            reviewed.append(aid)
            r.update(classification='reconciled-wr' if aid in confirmed else 'reviewed-non-wr-or-duplicate', reconciliation='archive/doctor-2022-reconciliation.json')
save('archive/submission-visual-review.json', review)
audit = read('archive/doctor-2022-capture-audit.json')
report = {'tour': 'Doctor Tour', 'status': 'Surviving tour submissions and adjacent discussion reconciled; undated previous bests remain open leads.',
          'coverage': {'submissionWindows': len(audit['windows']), 'submissionMessagesIncludingBoundaries': audit['uniqueMessagesRecaptured'], 'discussionMessagesIncludingBoundaries': len(read('archive/doctor-2022-discussion-census.json')), 'indexedImagesVisuallyReviewed': len(reviewed), 'additionalSubmissionImagesRecoveredAndRead': 6, 'discussionImagesPreservedAndRead': 8, 'strategyClipsPreservedAndRead': 1, 'fullRaceVideosPreservedAndReviewed': 4, 'newSuperFX64BackupsVerified': 0},
          'confirmedChanges': rows, 'previousBestLeads': held,
          'limitations': ['Four previous-best leads lack exact dates and verified positions in the WR sequence.', 'One cancelled bot attachment remains unread; the next surviving screenshot corrects its malformed 0:01.12 time to 1:12.10, which is not a WR.', 'Six submission screenshots absent from the original image index were recovered and read. None beats the standing WR.', 'The downloaded 2020 Reddit video linked in discussion is a separate, older non-WR evidence item.', 'YouTube unlisted copies remain queued after the daily upload limit.', 'This tour-level pass does not establish complete coverage of the whole game or deleted messages.']}
save('archive/doctor-2022-reconciliation.json', report)
print({'confirmedOrEnriched': len(rows), 'held': len(held), 'imagesReviewed': len(reviewed)})
