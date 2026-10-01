"""Reconcile Kamek Tour images, adjacent replies, and original recordings."""
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
    dst = ROOT / f'public/assets/proof/kamek-2021-{aid}.webp'
    if not dst.exists(): Image.open(ROOT / path).convert('RGB').save(dst, 'WEBP', lossless=True)
    assets[url] = {'path': '/' + str(dst.relative_to(ROOT / 'public')), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes': dst.stat().st_size, 'contentType': 'image/webp'}
    t = time or r['time']
    if laps and all(l is not None for l in laps):
        m, s = t.split(':')
        assert sum(round(float(l)*100) for l in laps) == int(m)*6000 + round(float(s)*100)
    channel = '636461740162416640' if is_early else '875784780573184010'
    return {'messageId': 'kamek-2021-' + aid + '-' + t.replace(':', '').replace('.', ''), 'player': player, 'courseId': r['courseId'], 'time': t, 'laps': laps or [None, None], 'mushrooms': None, 'status': 'community-wr', 'submittedAt': r['postedAt'] if is_early else r['submittedAt'], 'proofImage': url, 'proofImageVerified': True, 'source': {'url': base + channel + '/' + r['messageId'], 'channel': 'tt-discussion' if is_early else 'tt-submission', 'messageId': r['messageId']}, 'notes': ['Result visually read and compared with earlier results and nearby messages. Timestamp is original evidence publication in UTC, not an asserted race-completion instant.']}

spec = [
 ('879997129387544609','shiraui'),
 ('880055294644858880','Wins'),
 ('880079718832042054','Wins'),
 ('880091313574395954','Wins',['31.56','31.23']),
 ('880119094286905364','Wins',['31.56','31.16']),
 ('880734763453935657','DIT',['31.47','31.20']),
 ('880754832552628254','Nu11',['31.40','31.26']),
 ('881493370084663316','Wins',['31.42','31.22']),
 ('881565832843493426','Wins',['31.41','31.18']),
 ('882985162168733706','Wins',['31.39','31.15']),
 ('883388818756079666','Wins',['31.38','31.14']),
 ('881531482210983976','Nu11',['29.95','30.15']),
 ('881532192663162990','Nu11',['29.94','30.15']),
 ('882981010583748638','Nu11',['29.92','30.14']),
 ('884417132656472064','Nu11',['29.75','30.19']),
]
rows=[make(*s) for s in spec]
by={(r['courseId'],r['time']):r for r in rows}
by[('rmx-vanilla-lake-1','1:03.12')]['notes'].append('Adjacent .72/.40 reply includes probably; preserve that tentative report in source notes without asserting verified splits.')
by[('rmx-vanilla-lake-1','1:03.12')]['additionalSources']=[{'url':base+'875784780573184010/879997442295234600','kind':'tentative-lap-reply'}]
by[('rmx-vanilla-lake-1','1:02.52')]['additionalSources']=[{'url':base+'875784780573184010/883389387180757062','kind':'adjacent-lap-reply'}]
by[('rmx-vanilla-lake-1','1:02.52')]['notes'].append('Same runner’s adjacent .38/.14 reply yields 31.38/31.14, summing exactly to 1:02.52.')
for k,url in {
 ('rmx-vanilla-lake-1','1:02.79'):'https://twitter.com/winsmkt/status/1430536075857039367',
 ('snes-rainbow-road-r','0:59.94'):'https://twitter.com/_Kaguya_Games/status/1434900061943570434',
}.items():
 by[k].update(video=url,videoVerified=True)
 by[k]['notes'].append('Original downloaded recording visually verifies the full run and first lap; second lap also checked against total. Earlier original image-submission date retained.')

# The surrounding message identifies the runner, not the account reposting the image.
nu=make('883844937450418217','Nu11')
nu.update(submittedAt=None,dateUnresolved=True,observedAt=nu['submittedAt'],tourDateRange={'start':'2021-08-25','end':'2021-09-07'})
nu['notes']=['Wins’s preceding message explicitly identifies Kaguya as the runner who forgot to post. Screenshot shows Kaguya’s 0:59.99, previous best 1:00.06. Credit Nu11/Kaguya rather than Wins.', 'September 4 is the repost timestamp, not a verified original run date. Screenshot device date September 3 is retained as a clue; no exact original publication date established. This result was already documented before N’s September 6 1:00.00, which is not a WR.']
nu['additionalSources']=[{'url':base+'636461740162416640/883844918089490463','kind':'runner-identification'}]
rows.append(nu)

late=make('885051008588345394','Wins',['31.31','31.13'])
late.update(submittedAt=None,dateUnresolved=True,observedAt=late['submittedAt'],tourDateRange={'start':'2021-08-25','end':'2021-09-07'},video='https://twitter.com/WinsMkt/status/1435501802645041157',videoVerified=True)
late['notes']=['Original full recording visually verifies 1:02.44, 31.31/31.13 and previous best 1:02.52.', 'Image posted September 8 at 06:36:44 UTC with Sorry late, after tour reset; video posted at 07:14:34 UTC. Neither is a verified race date. Keep the exact original run date unknown within the Kamek Tour.']
rows.append(late)

adri=make('881513268219371540','Adrishi')
adri.update(submittedAt=None,dateUnresolved=True,observedAt=adri['submittedAt'])
adri['notes']=['Astre explicitly labels this screenshot Former WR by Adri. Credit Adrishi rather than Astre; August 29, 2021 is the repost date only.', 'Image filename includes 20200308, but a filename alone does not verify an original record date. Keep the date unresolved.']
rows.append(adri)

held=[make('884417132656472064','Nu11',time='0:59.96')]
held[0].update(submittedAt=None,dateUnresolved=True,observedAt='2021-09-06T12:37:57.069Z',status='documented-submission',includeInProgression=False)
held[0]['notes']=['Previous-best 0:59.96 visible in Nu11’s later 0:59.94 screenshot and original video. Original dated evidence and WR chronology not independently established; retained for reconciliation.']

fallbacks=[]
for aid,player,laps,vid in [
 ('881130424993198080','N',['31.57','31.28'],'HzMDBE7tjcY'),
 ('881636860777078784','N',['29.59','30.54'],'FGMVQfcwJLk'),
 ('881925417093705758','Sucha',['30.17','30.23'],'_cD8bOtXI_0'),
]:
 r=make(aid,player,laps)
 r.update(status='documented-submission',includeInProgression=False,video='https://www.youtube.com/watch?v='+vid,videoVerified=True)
 r['notes'].append('Full original recording visually reviewed. Personal best slower than the already established world record at publication; preserve footage without inserting it into WR history.')
 fallbacks.append(r)
r={'messageId':'kamek-2021-youtube-Uv0ADJC80Zk','player':'N','courseId':'snes-rainbow-road-r','time':'1:00.23','laps':['29.97','30.26'],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':'2021-08-28T13:29:39.000Z','video':'https://www.youtube.com/watch?v=Uv0ADJC80Zk','videoVerified':True,'source':{'url':'https://www.youtube.com/watch?v=Uv0ADJC80Zk','kind':'original-video'},'notes':['Complete original video visually confirms 1:00.23, first lap 29.97, second lap 30.26 by subtraction. Publication timestamp is not asserted as race time. Slower than the standing 1:00.16; excluded from WR history.']}
fallbacks.append(r)
allrows=rows+held+fallbacks
ids={r['messageId'] for r in allrows}
curated=[r for r in curated if r.get('messageId') not in ids]+allrows
save('archive/curated-runs.json',curated)
save('archive/assets-manifest.json',assets)
audit={'tour':'Kamek Tour 2021','status':'Captured submission images and messages reconciled; full discussion message census remains unresolved.','coverage':{'submissionImagesVisuallyReviewed':155,'capturedSubmissionMessagesRead':173,'discussionImageSearchMatches':16,'discussionWrMatches':4,'discussionLinkMatches':10,'discussionVideoMatches':13,'fullOriginalVideosDownloadedAndVisuallyReviewed':7,'shortDiscordClipsDownloadedAndVisuallyReviewed':6},'confirmedChanges':rows,'heldForReconciliation':held,'verifiedPersonalBestVideos':fallbacks,'limitations':['Image and keyword searches do not establish a full discussion message census.','Nu11 0:59.99, Wins 1:02.44 and Adrishi 1:00.16 original record dates remain unresolved.','Tentative shiraui lap report remains in source notes; no guessed verified splits.','Attachment 881577530358910996 was re-read at full resolution as 1:02.89, not 1:02.58; it is not a world record.','Six Discord technique clips (4–10 seconds) were downloaded and visually reviewed; they are not proof of completed runs.']}
save('archive/kamek-2021-reconciliation.json',audit)
print(json.dumps({'confirmedChanges':len(rows),'held':len(held),'personalBestVideos':len(fallbacks)}))
