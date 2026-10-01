"""Preserve original Ice Tour evidence without inventing dates for missing runs."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT / path).read_text())
def save(path, data):
    (ROOT / path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
def twitter(sid, player='tomegome_g'):
    return {'url': f'https://x.com/{player}/status/{sid}', 'channel': 'original Twitter post', 'messageId': sid}

course = 'gcn-dino-dino-jungle-r'
assets = read('archive/assets-manifest.json')
rows = []
for sid, time, date, image, laps in [
    ('1220842952085229569', '1:40.46', '2020-01-24T22:56:56.000Z', 'EPFOMSJVAAE9ycg', [None, None]),
    ('1220845903595986944', '1:40.18', '2020-01-24T23:08:40.000Z', 'EPFQ4JLU4AArjck', ['50.14', '50.04']),
]:
    url = f'https://pbs.twimg.com/media/{image}?format=jpg&name=small'
    dst = ROOT / f'public/assets/proof/ice-2020-{sid}.webp'
    Image.open(ROOT / f'archive/ice-2020-original-media/{sid}.jpg').convert('RGB').save(dst, 'WEBP', lossless=True)
    assets[url] = {'path': '/' + str(dst.relative_to(ROOT / 'public')), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes': dst.stat().st_size, 'contentType': 'image/webp'}
    rows.append({'messageId': 'ice-2020-' + sid, 'player': 'Tomegome', 'courseId': course,
                 'time': time, 'laps': laps, 'mushrooms': None, 'status': 'community-wr',
                 'submittedAt': date, 'source': twitter(sid), 'proofImage': url,
                 'proofImageVerified': True,
                 'notes': ['Original player screenshot visually read. Date is its verified public posting timestamp in UTC. Compared with the contemporaneous discussion reporting Kaguya at 1:40.74; earlier progression remains incomplete.']})
rows[1]['notes'].append('The original caption supplies 50.14 / 50.04. The separate January 26 video finishes in 1:40.32 and is not proof of this 1:40.18.')
held = [{**rows[0], 'messageId': 'ice-2020-tomegome-10056-previous-best',
         'time': '1:40.56', 'submittedAt': None, 'observedAt': rows[0]['submittedAt'],
         'dateUnresolved': True, 'includeInProgression': False, 'status': 'documented-submission',
         'notes': ['Previous best visibly printed on the 1:40.46 screenshot. Original publication date and position against competitors are unresolved.']}]
held.append({'messageId': 'ice-2020-kaguya-10074-report', 'player': 'Nu11', 'courseId': course,
             'time': '1:40.74', 'laps': [None, None], 'mushrooms': None,
             'submittedAt': None, 'observedAt': '2020-01-21T09:43:58.390Z',
             'dateUnresolved': True, 'includeInProgression': False, 'status': 'documented-submission',
             'source': {'url': 'https://discord.com/channels/629221606064914442/636461740162416640/669114961556930570', 'channel': 'tt-discussion', 'messageId': '669114961556930570'},
             'notes': ['Astre reports Kaguya’s best as 1:40.74 in surrounding discussion. The original result and exact record date remain missing. Kaguya is the historical alias of Nu11. This report prevents treating Astre’s slower 1:40.80 as a WR.']})
curated = read('archive/curated-runs.json')
for r in curated:
    if r.get('messageId') == 'halloween-2021-tome-original-1221415967315709952':
        r['notes'] = ['Original video visually checked: lap one 50.04, final 1:40.32, derived lap two 50.28. Posted January 26, after the January 24 1:40.18 screenshot. This is a verified non-WR run and must not be linked as proof of 1:40.18.']
castle = {'messageId': 'ice-2020-castle-tomegome-original', 'player': 'Tomegome',
          'courseId': 'gba-bowser-s-castle-1', 'time': '0:59.96', 'laps': ['30.16', '29.80'],
          'mushrooms': None, 'status': 'community-wr', 'submittedAt': '2020-01-15T19:20:10.000Z',
          'video': twitter('1217526911720493058')['url'], 'videoVerified': True,
          'source': twitter('1217526911720493058'),
          'notes': ['Original January 15 Twitter post and downloaded race visually verified: first lap 30.16, final 59.96, second lap 29.80. This is Tomegome’s run, not video evidence for the tied Kaguya result.']}
kaguya = {'messageId': 'ice-2020-castle-kaguya-proof-correction', 'player': 'Nu11',
          'courseId': 'gba-bowser-s-castle-1', 'time': '0:59.96', 'laps': [None, None],
          'mushrooms': None, 'status': 'documented-submission', 'submittedAt': None,
          'dateUnresolved': True, 'includeInProgression': False,
          'proofImage': 'https://cdn.discordapp.com/attachments/785125909446262814/785132399435579422/unknown.png',
          'source': {'url': 'https://discord.com/channels/629221606064914442/896050730216095765/896332374344867880', 'channel': 'wr-history', 'messageId': '896332374344867880'},
          'rejectedVideos': [{'url': 'https://twitter.com/tomegome_g/status/1217526911720493058?s=19', 'reason': 'This video is Tomegome’s tied run. It does not verify Kaguya’s run or its lap splits.'}],
          'notes': ['The announcement lists a tie, but the shared video belongs to Tomegome. Kaguya’s original date, splits and individual proof remain unresolved.']}
astre = {'messageId': 'ice-2020-astre-original-10135', 'player': 'Astre', 'courseId': course,
         'time': '1:41.35', 'laps': ['50.83', '50.52'], 'mushrooms': None,
         'status': 'documented-submission', 'includeInProgression': False,
         'submittedAt': '2020-01-20T20:14:13.000Z', 'video': twitter('1219352450899095552', 'Astre_HD')['url'],
         'videoVerified': True, 'source': twitter('1219352450899095552', 'Astre_HD'),
         'notes': ['Downloaded full race visually verified at the first-lap crossing and final timer. Historical WR status is unestablished; excluded from confirmed progression.']}
extra = [castle, kaguya, astre]
ids = {r['messageId'] for r in rows + held + extra}
save('archive/curated-runs.json', [r for r in curated if r.get('messageId') not in ids] + rows + held + extra)
save('archive/assets-manifest.json', assets)
ledger = read('archive/video-backup-files/downloads.json')
availability = read('archive/video-availability.json')
for sid, detail in [('1221415967315709952', {'time': '1:40.32', 'laps': ['50.04', '50.28'], 'classification': 'non-wr-full-race'}), ('1222321633588740096', {'lap1': '49.86', 'classification': 'isolated-lap-not-a-complete-race'})]:
    key = 'x:' + sid
    item = ledger[key]
    item.update(reviewStatus='visually-reviewed', backupStatus='queued-daily-upload-limit', evidence={'courseId': course, 'player': 'Tomegome', **detail})
    availability[key] = {'originalUrl': item['originalUrl'], 'status': 'available', 'checkedAt': '2026-10-01', 'bytes': item['bytes'], 'sha256': item['sha256']}
for row, sid in [(castle, '1217526911720493058'), (astre, '1219352450899095552')]:
    key = 'x:' + sid
    item = ledger[key]
    item.update(reviewStatus='visually-reviewed', backupStatus='queued-daily-upload-limit', runs=[{k: row[k] for k in ['courseId', 'player', 'time', 'laps', 'submittedAt']}])
    availability[key] = {'originalUrl': item['originalUrl'], 'status': 'available', 'checkedAt': '2026-10-01', 'bytes': item['bytes'], 'sha256': item['sha256']}
save('archive/video-backup-files/downloads.json', ledger)
save('archive/video-availability.json', availability)
save('archive/ice-2020-reconciliation.json', {
    'tour': 'Ice Tour', 'courseId': course, 'historyComplete': False,
    'status': 'Original final result dated and enriched; preceding result recovered; earlier progression still unresolved.',
    'confirmedChanges': rows + [castle], 'previousBestLeads': held,
    'proofCorrections': [kaguya], 'otherVerifiedSubmissions': [astre],
    'coverage': {'discussionMessagesInsideTour': 49, 'discussionMessagesWithBoundaries': 75, 'serverLinkSearchPagesRead': 3, 'serverImageSearchMessages': 219, 'serverImageSearchPages': 9, 'originalServerAttachmentImagesVisuallyReviewed': 181, 'imageReview': 'archive/ice-2020-server-image-review.json', 'originalPlayerTimelinesRead': ['tomegome_g', 'Astre_HD'], 'originalVideosPreservedAndRead': 4},
    'limitations': ['Kaguya 1:40.74 lacks its original screenshot/video and exact record date.', 'Tomegome 1:40.56 is an undated previous-best lead.', 'Astre 1:41.35 and 1:41.25 lack sufficient evidence to establish historical WR status; 1:40.80 was slower than the contemporaneously reported Kaguya time.', 'Astre’s January 15 Bowser’s Castle 1 1:01.45 predates the surviving 0:59.96 post but has unestablished WR status.', 'Search results cannot establish that deleted messages or deleted social posts have been recovered.'],
})
print({'confirmedOrEnriched': len(rows), 'openLeads': len(held)})
