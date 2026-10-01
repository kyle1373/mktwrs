"""Reconcile September Sydney Tour images, adjacent replies, and original recordings."""
import hashlib
import json
import subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT / path).read_text())
def save(path, value): (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
early = read('archive/early-visual-review.json')
sub = read('archive/submission-visual-review.json')
downloads = read('archive/submission-image-downloads.json')
queue = {r['attachmentId']: r for r in read('archive/submission-image-map.json')['images']}
assets = read('archive/assets-manifest.json')
curated = read('archive/curated-runs.json')
base = 'https://discord.com/channels/629221606064914442/'

def make(aid, player, laps=None, time=None):
    r = early.get(aid) or sub[aid]
    assert r['reviewStatus'] == 'visually-reviewed'
    is_early = aid in early
    path = r['path'] if is_early else downloads[aid]['path']
    url = r['url'] if is_early else queue[aid]['imageUrl']
    dst = ROOT / f'public/assets/proof/sydney-september-2021-{aid}.webp'
    if not dst.exists(): Image.open(ROOT / path).convert('RGB').save(dst, 'WEBP', lossless=True)
    assets[url] = {'path': '/' + str(dst.relative_to(ROOT / 'public')), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes': dst.stat().st_size, 'contentType': 'image/webp'}
    t = time or r['time']
    if laps and all(l is not None for l in laps):
        m, s = t.split(':')
        assert sum(round(float(l)*100) for l in laps) == int(m)*6000 + round(float(s)*100)
    channel = '636461740162416640' if is_early else '875784780573184010'
    return {'messageId': 'sydney-september-2021-' + aid + '-' + t.replace(':', '').replace('.', ''), 'player': player, 'courseId': r['courseId'], 'time': t, 'laps': laps or [None, None], 'mushrooms': None, 'status': 'community-wr', 'submittedAt': r['postedAt'] if is_early else r['submittedAt'], 'proofImage': url, 'proofImageVerified': True, 'source': {'url': base + channel + '/' + r['messageId'], 'channel': 'tt-discussion' if is_early else 'tt-submission', 'messageId': r['messageId']}, 'notes': ['Result visually read and compared with earlier results and nearby messages. Timestamp is original evidence publication in UTC, not an asserted race-completion instant.']}

spec = [
 ('885055935695974410', 'Wakinyo'),
 ('885108086505889792', 'Phillish'),
 ('885109865708650556', 'Phillish', ['46.33','46.50']),
 ('885123090844094514', 'Wins', ['46.23','46.59']),
 ('885157485105791036', 'Nu11', ['46.02','46.33']),
 ('885517209181507594', 'Nu11', ['45.96','46.02']),
 ('890092411659878430', 'Nu11', ['45.89','45.90']),
 ('886137281180753950', 'shiraui'),
 ('886148103420399626', 'saki7'),
 ('886333562821951558', 'Wins'),
 ('886337041296654436', 'Wins'),
 ('889884481161404486', 'Wins', ['30.76','30.56']),
]
rows=[make(*s) for s in spec]
by={(r['courseId'],r['time']):r for r in rows}
by[('gcn-yoshi-circuit','1:33.68')]['notes'].append('Wakinyo ties the existing Nu11 London Tour 2019 record. This is Wakinyo’s original 2021 submission, not a date for Nu11’s older result.')
ph=by[('gcn-yoshi-circuit','1:32.83')]
ph.update(video='https://www.youtube.com/watch?v=YNv5Hzc8RTc',videoVerified=True)
ph['additionalSources']=[{'url':base+'875784780573184010/885109941285818420','kind':'adjacent-lap-reply'}]
ph['notes'].append('Original video title incorrectly says 1:32.84. The recording visibly finishes in 1:32.83; lap one freezes at 46.33. Description and adjacent Discord reply give 46.33/46.50. Preserve the actual result, not the title typo.')
by[('gcn-yoshi-circuit','1:32.82')]['notes'].append('Same submission’s .23/.59 lap shorthand resolves to 46.23/46.59, summing to 1:32.82. Nearby discussion asks why the second lap lost approximately four tenths.')
nu=by[('gcn-yoshi-circuit','1:31.79')]
nu.update(submittedAt='2021-09-21T12:36:04.000Z',video='https://twitter.com/_Kaguya_Games/status/1440294269751758853',videoVerified=True)
nu['additionalSources']=[{'url':'https://x.com/tangkai_0215/status/1440293753965613056','kind':'original-result-post'},{'url':'https://twitter.com/_Kaguya_Games/status/1440294269751758853','kind':'original-video'}]
nu['notes'].append('Original Twitter result image was published September 21 at 12:36:04 UTC, before the 12:38:07 video and September 22 04:29:29 Discord submission. Use earliest verified evidence publication. The screenshot’s device date says September 18; this alone does not establish the race-completion date.')
nu['notes'].append('Full original recording visually verifies 1:31.79, lap one 45.89 and previous best 1:31.98; lap two 45.90 also appears in the original post and Discord message.')
original_photo='https://pbs.twimg.com/media/E_zziK3VkAYk_1l?format=jpg&name=medium'
dst=ROOT/'public/assets/proof/sydney-september-2021-nu-original.webp'
Image.open(ROOT/'archive/sydney-nu-original-result.jpg').convert('RGB').save(dst,'WEBP',lossless=True)
assets[original_photo]={'path':'/assets/proof/'+dst.name,'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
nu['additionalProofImages']=[original_photo]
wins=by[('rmx-vanilla-lake-1r','1:01.32')]
wins.update(video='https://twitter.com/winsmkt/status/1440569502891057159',videoVerified=True)
wins['notes'].append('Full original recording confirms 1:01.32, lap one 30.76 and previous best 1:01.51. Lap two 30.56 matches total and original video caption. September 21 image submission predates the September 22 video.')

held=[]
for aid,player,t in [('885517209181507594','Nu11','1:32.14'),('886148103420399626','saki7','1:02.13'),('886137281180753950','shiraui','1:03.60')]:
 r=make(aid,player,time=t)
 r.update(status='documented-submission',includeInProgression=False,submittedAt=None,dateUnresolved=True,observedAt=r['submittedAt'])
 r['notes']=['Previous-best field in a later result screenshot. Exact original publication and position against rivals have not been independently established. Retain for reconciliation rather than assign the later submission date.']
 held.append(r)
allrows=rows+held
ids={r['messageId'] for r in allrows}
save('archive/curated-runs.json',[r for r in curated if r.get('messageId') not in ids]+allrows)
save('archive/assets-manifest.json',assets)
audit={'tour':'Sydney Tour September 2021','status':'Captured submission images and continuous discussion windows reviewed; previous-best and unavailable external evidence remain unresolved.','coverage':{'submissionImagesVisuallyReviewed':118,'capturedSubmissionMessagesRead':131,'discussionSearchReportedMessages':292,'discussionContinuousWindowUniqueMessagesRead':299,'discussionImageSearchMatches':10,'discussionImagesVisuallyReviewed':23,'fullOriginalVideosDownloadedAndVisuallyReviewed':3},'confirmedChanges':rows,'heldForReconciliation':held,'limitations':['The continuous discussion windows include preceding-tour and following-tour messages. Search counts and visible channel counts differ; retain the raw message IDs rather than claim the entire server is complete.','Nu11 1:32.14, saki7 1:02.13 and shiraui 1:03.60 are previous-best leads without independently verified original publication chronology.','Choco Mountain leaderboard 1:18.37 is a typo: the previously reviewed original screenshot and announcement establish 1:18.38. September discussion confirms Kaguya was the holder despite omission from the leaderboard.','An incorrect Mario Circuit 3 graphic was subsequently corrected; a joke Vanilla Lake leaderboard was excluded.','Manzinma tweet 1435643834063458307 is unavailable. Nozomi’s linked image shows a slower Yoshi Circuit 1:34.52; it is not a WR. Shoronpo’s linked post restricts access.','Single-lap and technique clips are not proof of a completed two-lap record.']}
save('archive/sydney-september-2021-reconciliation.json',audit)
print(json.dumps({'confirmedChanges':len(rows),'held':len(held)}))
