"""Reconcile Halloween Tour results with original images and surrounding discussion."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT / path).read_text())
def save(path, value): (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
sub = read('archive/submission-visual-review.json')
downloads = read('archive/submission-image-downloads.json')
queue = {r['attachmentId']: r for r in read('archive/submission-image-map.json')['images']}
assets = read('archive/assets-manifest.json')
curated = read('archive/curated-runs.json')
base = 'https://discord.com/channels/629221606064914442/'

def preserve(path, url, name):
    dst = ROOT / f'public/assets/proof/halloween-2021-{name}.webp'
    if not dst.exists(): Image.open(ROOT / path).convert('RGB').save(dst, 'WEBP', lossless=True)
    assets[url] = {'path': '/' + str(dst.relative_to(ROOT / 'public')), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes': dst.stat().st_size, 'contentType': 'image/webp'}

def make(aid, player, laps=None):
    r = sub[aid]
    assert r['reviewStatus'] == 'visually-reviewed'
    url = queue[aid]['imageUrl']
    preserve(downloads[aid]['path'], url, aid)
    if laps:
        m, s = r['time'].split(':')
        assert sum(round(float(l)*100) for l in laps) == int(m)*6000 + round(float(s)*100)
    return {'messageId': 'halloween-2021-' + aid, 'player': player, 'courseId': r['courseId'], 'time': r['time'], 'laps': laps or [None, None], 'mushrooms': None, 'status': 'community-wr', 'submittedAt': r['submittedAt'], 'proofImage': url, 'proofImageVerified': True, 'source': {'url': r['source'], 'channel': 'tt-submission', 'messageId': r['messageId']}, 'notes': ['Original result image visually read at enlarged size and reconciled with earlier submissions, linked posts and surrounding discussion. Timestamp is original evidence publication in UTC, not an asserted race-completion instant.']}

# Enlarged original and video both read 1:30.05; correct the initial contact-sheet transcription.
sub['904399740265955348']['time']='1:30.05'
sub['904399740265955348']['notes']='Enlarged result and original full video confirm 1:30.05, previous best 1:31.08.'

spec = [
 ('900284110986174484','DIT'),
 ('900291903558393866','DIT'),
 ('900617262896132106','DIT',['49.73','49.88']),
 ('901055238583222303','DIT',['49.87','49.66']),
 ('901460401697476628','DIT',['49.62','49.74']),
 ('902505799098703892','DIT',['49.62','49.70']),
 ('902558572917948446','DIT',['49.67','49.58']),
 ('904920802841985084','Sucha',['44.95','44.90']),
 ('905083403366465546','DIT',['44.88','44.95']),
 ('905092966606061578','DIT',['44.84','44.94']),
]
rows=[make(*s) for s in spec]
by={(r['player'],r['time']):r for r in rows}
by[('DIT','1:39.61')]['notes'].append('Adjacent original message 900617486045679649 gives 49.73/49.88.')
by[('DIT','1:39.36')]['notes'].append('Original .62/.74 lap fragments interpreted as 49.62/49.74, consistent with neighboring complete split reports and the 1:39.36 total.')
by[('Sucha','1:29.85')].update(video='https://www.youtube.com/watch?v=GhooxrUVLuY',videoVerified=True)
by[('Sucha','1:29.85')]['notes'].append('Original video visibly shows lap one 44.95 and finish 1:29.85. Adjacent submission 904920948308852748 gives 44.95/44.90. This beats the March 2021 1:29.87 baseline; DIT retakes WR later November 2.')
by[('DIT','1:39.25')].update(video='https://twitter.com/dit_mkt/status/1453651328916332548',videoVerified=False)
by[('DIT','1:29.78')].update(video='https://twitter.com/dit_mkt/status/1455900270009847813',videoVerified=False)
for key in [('DIT','1:39.25'),('DIT','1:29.78')]:
 by[key]['notes'].append('Original video link retained from contemporary discussion, but the original Twitter account no longer exists and retrieval failed. The result image and original submission splits remain preserved; do not claim a recovered video.')

supporting=[]
for aid,r in sub.items():
 if r['index']==757:
  item=make(aid,'Sucha',['44.95','45.10']);item.update(status='documented-submission',includeInProgression=False,video='https://www.youtube.com/watch?v=1heArYzp5yk',videoVerified=True)
  item['notes'].append('Original full video visibly shows 44.95 lap one and 1:30.05 finish. Slower than the standing 1:29.87 record. Reply 904531368292274206 provides the same splits. Preserve as supporting media, not WR.')
  supporting.append(item)
tome_source='https://x.com/tomegome_g/status/1221415967315709952'
supporting.append({'messageId':'halloween-2021-tome-original-1221415967315709952','player':'Tomegome','courseId':'gcn-dino-dino-jungle-r','time':'1:40.32','laps':['50.04','50.28'],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':'2020-01-26T12:53:54.000Z','video':tome_source,'videoVerified':True,'source':{'url':tome_source,'channel':'original Twitter post','messageId':'1221415967315709952'},'additionalSources':[{'url':base+'636461740162416640/900484011871318077','channel':'tt-discussion','messageId':'900484011871318077'}],'notes':['Original video downloaded and visually read: lap one 50.04, final 1:40.32, derived lap two 50.28. Original post datetime read from the post itself. This is not proof of the later 1:40.18; its historical WR standing remains unresolved.']})
held=[]
for parent,time in [(by[('DIT','1:39.93')],'1:40.16'),(by[('DIT','1:39.53')],'1:39.60')]:
 item={**parent,'messageId':parent['messageId']+'-previous-best','time':time,'laps':[None,None],'submittedAt':None,'observedAt':parent['submittedAt'],'dateUnresolved':True,'status':'documented-submission','includeInProgression':False}
 item['notes']=['Earlier personal best visibly established in the result image. Its original date and chronology against other players need corroboration. Do not assign the later screenshot publication as its record date.']
 held.append(item)
allrows=rows+supporting+held
ids={r['messageId'] for r in allrows}
save('archive/curated-runs.json',[r for r in curated if r.get('messageId') not in ids]+allrows)
save('archive/assets-manifest.json',assets)
confirmed={s[0] for s in spec}
for aid,r in sub.items():
 if 686 <= r['index'] <= 771:
  r['classification']='reconciled-wr' if aid in confirmed else 'reviewed-non-wr-submission'
  r['reconciliation']='archive/halloween-2021-reconciliation.json'
save('archive/submission-visual-review.json',sub)
save('archive/halloween-2021-reconciliation.json',{
 'tour':'Halloween Tour 2021',
 'status':'86 submission images visually reviewed and 90 submission messages read; continuous surrounding discussion reviewed through final boards and corrections. Early historical gaps and previous-best dates remain unresolved.',
 'coverage':{'submissionImagesVisuallyReviewed':86,'submissionMessagesRead':90,'discussionUniqueMessagesRead':len(read('archive/halloween-discussion-census.json')['messages']),'discussionWindowsReadIncludingReusedOctober20':16,'newDiscussionImagesVisuallyReviewed':4,'originalVideosDownloadedAndVisuallyReviewed':7,'newUnlistedBackupsVerified':3},
 'confirmedChanges':rows,'supportingEvidence':supporting,'previousBestLeads':held,
 'limitations':[
  'DIT 1:40.16 and 1:39.60 previous best fields establish earlier runs but not exact original dates or ordering against other players.',
  'DIT’s two final WR video links currently lead to a deleted Twitter account. Failed downloads are recorded, not counted as preserved videos.',
  'January 26, 2020 Tome Twitter video 1221415967315709952 shows 1:40.32, lap one 50.04 and lap two 50.28. It is not proof of the later 1:40.18. Its original WR standing remains unresolved.',
  'November 3 message 905335934634049536 reports an unsaved SuperFX WR. Attached IMG_8101 shows error 805-1414 over Rosalina’s Ice World without a readable result time. Preserve as unresolved lead; no invented record value.',
  'Final Rosalina board IMG_6642 shows Spart 1:29.99 with 45.04/45.95, which sums to 1:30.99. Discussion explicitly flags this one-second typo; do not copy the bad split.',
  'Sucha’s 44.92 lap clip, Spart’s underwater technique clip and two Wins clips do not establish a two-lap WR result.',
  'Seven recovered original videos are preserved locally. Sucha 1:29.85, Sucha 1:30.05 and Tome 1:40.32 have verified unlisted backups. Four partial clips remain queued after YouTube reported its daily upload limit; originals are preserved locally.',
  'Reading this tour cohort does not establish complete coverage of all earlier tours or channels.'
 ]})
print({'confirmed':len(rows),'supporting':len(supporting),'held':len(held)})
