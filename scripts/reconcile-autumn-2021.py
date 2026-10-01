"""Reconcile Autumn Tour results with original images and surrounding discussion."""
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
    dst = ROOT / f'public/assets/proof/autumn-2021-{name}.webp'
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
    return {'messageId': 'autumn-2021-' + aid, 'player': player, 'courseId': r['courseId'], 'time': r['time'], 'laps': laps or [None, None], 'mushrooms': None, 'status': 'community-wr', 'submittedAt': r['submittedAt'], 'proofImage': url, 'proofImageVerified': True, 'source': {'url': r['source'], 'channel': 'tt-submission', 'messageId': r['messageId']}, 'notes': ['Original result image visually read at enlarged size and reconciled with earlier submissions, linked posts and surrounding discussion. Timestamp is original evidence publication in UTC, not an asserted race-completion instant.']}

spec = [
 ('895191002141310986','N'),
 ('895193702434242600','N'),
 ('896538027214639104','Seboss',['30.64','30.74']),
 ('897133752180932658','DIT'),
 ('898936040738406480','DIT',['30.60','30.75']),
 ('899272670544281620','DIT',['30.70','30.63']),
 ('900258996697587762','Seboss',['30.66','30.67']),
 ('896864555530080327','SuperFX',['35.39','35.11']),
 ('896963241115279401','SuperFX'),
 ('899158226824740934','SuperFX',['35.02','35.22']),
]
rows = [make(*s) for s in spec]
image_url = 'https://pbs.twimg.com/media/FBAaREOVcAkI0eW?format=jpg&name=medium'
preserve('archive/autumn-discussion-images/kaguya-1445684365552283657.jpeg', image_url, 'kaguya-1445684365552283657')
kaguya = {'messageId':'autumn-2021-kaguya-1445684365552283657', 'player':'Nu11', 'courseId':'rmx-ghost-valley-1', 'time':'1:01.40', 'laps':[None,None], 'mushrooms':None, 'status':'community-wr', 'submittedAt':'2021-10-06T09:36:26.000Z', 'proofImage':image_url, 'proofImageVerified':True, 'source':{'url':'https://x.com/tangkai_0215/status/1445684365552283657','channel':'original Twitter post','messageId':'1445684365552283657'}, 'additionalSources':[{'url':base+'875784780573184010/895245554064437268','channel':'tt-submission','messageId':'895245554064437268'}], 'notes':['Original linked image visibly shows 1:01.40, previous best 1:01.86. Original post datetime is 2021-10-06T09:36:26.000Z; the Discord link was shared at 09:46:12 UTC. October 6–9 discussion explicitly identifies this as the time to beat. Later slower submissions must not enter WR progression. Wins speculates about possible splits but does not report Kaguya’s actual laps; leave laps unknown.']}
rows.append(kaguya)
by = {(r['player'],r['time']):r for r in rows}
by[('Seboss','1:01.33')].update(video='https://www.youtube.com/watch?v=FhZOgmYkANs',videoVerified=True)
by[('Seboss','1:01.33')]['notes'].append('Video visibly shows lap one 30.66 and final 1:01.33. Original submission at 05:47:51 UTC precedes the October 20 06:00 UTC tour reset. Discussion confirms the WR tie before reset.')
by[('DIT','1:01.33')]['rejectedVideos']=[{'url':'https://www.youtube.com/watch?v=FhZOgmYkANs','reason':'This is Seboss’s separately recorded 1:01.33 tie, not DIT’s run. Player attribution and 30.66/30.67 video splits differ from DIT’s 30.70/30.63 submission.'}]
by[('DIT','1:01.33')]['notes'].append('Original October 17 submission replaces the later October 19 announcement label. Do not use Seboss’s video for this tied time.')
by[('SuperFX','1:10.24')].update(video='https://www.youtube.com/watch?v=Qsb02witwSI',videoVerified=True)
by[('SuperFX','1:10.24')]['notes'].append('Full original video shows lap one 35.02 and final result 1:10.24, deriving lap two 35.22. Result submitted October 17, before the later final leaderboard announcement.')
clip = 'https://cdn.discordapp.com/attachments/636461740162416640/896913592841023539/video0.mov'
by[('SuperFX','1:10.50')].update(video=clip,videoVerified=True,videoCoverage='partial')
by[('SuperFX','1:10.50')]['notes'].append('Surviving Discord clip starts near the end of lap one, shows the frozen 35.39 lap-one split, all of lap two and the 1:10.50 finish. It is partial footage. Adjacent submission .39 .11 and discussion .11 lap 2 agree with 35.39/35.11. Original clip message: '+base+'636461740162416640/896913598734024825')
by[('SuperFX','1:10.40')]['notes'].append('Adjacent original message 896963260467773442 gives .95 .45. These fractional seconds and the total alone do not uniquely determine the integer seconds of each lap; preserve the fragments without claiming a fully established split.')

supporting = [make('896890874825412679','spartacurtYT',['30.80','30.80'])]
supporting[0].update(status='documented-submission',includeInProgression=False,video='https://www.youtube.com/watch?v=TsJANdigz-k',videoVerified=True)
supporting[0]['notes'].append('Original video and result show 1:01.60, lap one 30.80 and therefore lap two 30.80. Personal best slower than the already-published 1:01.38; preserve the recording without promoting it to WR.')

held=[]
for source,player,time in [(by[('N','1:01.87')],'N','1:02.00'),(kaguya,'Nu11','1:01.86'),(by[('Seboss','1:01.33')],'Seboss','1:01.35')]:
    r={**source,'messageId':source['messageId']+'-previous-best','time':time,'laps':[None,None],'status':'documented-submission','includeInProgression':False,'observedAt':source['submittedAt'],'submittedAt':None,'dateUnresolved':True}
    for key in ['video','videoVerified','rejectedVideos']: r.pop(key,None)
    r['notes']=['Previous-best field visually read. An earlier personal best is established, but its original chronology against rivals is not. Do not assign the later screenshot time or infer a WR/tie.']
    held.append(r)
allrows=rows+supporting+held
ids={r['messageId'] for r in allrows}
save('archive/curated-runs.json',[r for r in curated if r.get('messageId') not in ids]+allrows)
save('archive/assets-manifest.json',assets)

confirmed_aids={s[0] for s in spec}
for aid,r in sub.items():
    if 537 <= r['index'] <= 685 and r['index'] not in (541,542):
        r['classification']='reconciled-wr' if aid in confirmed_aids else 'reviewed-non-wr-submission'
        r['reconciliation']='archive/autumn-2021-reconciliation.json'
save('archive/submission-visual-review.json',sub)
save('archive/autumn-2021-reconciliation.json',{
 'tour':'Autumn Tour 2021',
 'status':'147 current-tour submission images visually reviewed, original linked Kaguya image recovered, and continuous discussion read through final boards and follow-ups. Earlier previous-best chronology remains unresolved; not a claim of complete history.',
 'coverage':{'currentTourSubmissionImagesVisuallyReviewed':147,'latePreviousTourImagesReviewedSeparately':2,'capturedSubmissionMessagesRead':163,'discussionUniqueMessagesRead':len(read('archive/autumn-discussion-census.json')['messages']),'discussionWindowsReadIncludingReusedOctober6':40,'newDiscussionImagesVisuallyReviewed':11,'linkedOriginalImagesVisuallyReviewed':1,'originalYouTubeVideosDownloadedAndVisuallyReviewed':4,'originalDiscordVideosDownloadedAndVisuallyReviewed':4,'newUnlistedBackupsVerified':4},
 'confirmedChanges':rows,'supportingEvidence':supporting,'previousBestLeads':held,
 'limitations':[
  'Kaguya 1:01.40 was already published October 6. Slower DIT/Wins/Seboss submissions before Seboss 1:01.38 are personal bests, not intermediate WRs.',
  'The same old SuperFX 1:10.53 screenshot was reposted by Nick, Wins and Haruru with clown context. These are not three new tied records.',
  'Spart 1:10.90 screenshot is 1:10.90, not 1:09.90; enlarged original and explicit 35.39/35.51 final-board splits agree.',
  'SuperFX 1:10.40 fractional split message .95 .45 is retained in notes; integer lap seconds need corroboration.',
  'N 1:02.00, Kaguya 1:01.86 and Seboss 1:01.35 previous-best fields have no established original chronology against opponents.',
  'October 20 discussion reposts an old Dino Dino Jungle R 1:40.18 image while recalling January 2020. Player and original date need further research; do not assign the repost date.',
  'The old Snow Tour Rosalina Ice World leaderboard repost is historical context, not new Autumn results.'
  ,'Sucha’s 30.84 lap-one video and two Wins jump-comparison clips are preserved locally. They do not establish a completed two-lap result; their unlisted uploads remain pending.'
 ]})
print(json.dumps({'confirmedChanges':len(rows),'supporting':len(supporting),'held':len(held)}))
