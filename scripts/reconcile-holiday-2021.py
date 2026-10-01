"""Reconcile Holiday Tour results with original images and surrounding discussion."""
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
    dst = ROOT / f'public/assets/proof/holiday-2021-{name}.webp'
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
    return {'messageId': 'holiday-2021-' + aid, 'player': player, 'courseId': r['courseId'], 'time': r['time'], 'laps': laps or [None, None], 'mushrooms': None, 'status': 'community-wr', 'submittedAt': r['submittedAt'], 'proofImage': url, 'proofImageVerified': True, 'source': {'url': r['source'], 'channel': 'tt-submission', 'messageId': r['messageId']}, 'notes': ['Original result image visually read at enlarged size and reconciled with earlier submissions, linked posts and surrounding discussion. Timestamp is original evidence publication in UTC, not an asserted race-completion instant.']}

from datetime import datetime,timezone
indexed={r['index']:aid for aid,r in sub.items()}
rows=[make(indexed[1033],'NHSpeedy',['52.78','53.14']),make(indexed[1103],'NHSpeedy',['52.92','52.83'])]
# This original post's text survives in Discord, while its image and X account are gone.
rows.insert(1,{'messageId':'holiday-2021-dit-10588','player':'DIT','courseId':'wii-maple-treeway','time':'1:45.88','laps':['52.78','53.10'],'mushrooms':None,'status':'community-wr','submittedAt':'2021-12-03T08:59:23.267Z','source':{'url':base+'875784780573184010/916252265617182731','channel':'tt-submission','messageId':'916252265617182731'},'additionalSources':[{'url':'https://twitter.com/dit_mkt/status/1466689015542083590','channel':'original-post'},{'url':'https://pbs.twimg.com/media/FFq54eNaAAEb5Nq.jpg:large','channel':'unavailable-original-image'}],'notes':['Surviving Discord embed of DIT’s original post explicitly states 52.78/53.10 (+1); sum is 1:45.88, beating NHSpeedy 1:45.92 before NHSpeedy 1:45.75. Timestamp is exact Discord publication, not an asserted race instant.','Original X page says the account no longer exists, and linked image returns HTTP 404. No recovered image or video is claimed. Attribution is DIT from the original embed, not Romain who shared it.']})
supporting=[]
sucha=make(indexed[1112],'Sucha',['53.92','53.87']);sucha.update(status='documented-submission',includeInProgression=False,video='https://www.youtube.com/watch?v=Udm4G22UIJY',videoVerified=True);sucha['notes'].append('Original full run visually checked. No-item category video uses neither mushroom; 1:47.79 is not a main-category WR. Video and adjacent submission agree on 53.92/53.87.');supporting.append(sucha)
nu={'messageId':'holiday-2021-nu11-7790','player':'Nu11','courseId':'n64-choco-mountain-r','time':'1:17.90','laps':['38.79','39.11'],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':'2021-12-09T11:41:03.000Z','video':'https://twitter.com/_kaguya_games/status/1468908639646019585','videoVerified':True,'source':{'url':'https://twitter.com/_kaguya_games/status/1468908639646019585','channel':'original-video'},'additionalSources':[{'url':base+'875784780573184010/920610416919478272','channel':'tt-submission','messageId':'920610416919478272'}],'notes':['Full video visually verified: lap-one 38.79, final 1:17.90, derived lap-two 39.11. Original December 9 post was shared after the tour; do not date the run December 15. Slower than Nu11’s February 1:17.87, so not a WR.']}
# Use the original downloader metadata publication timestamp, never invent sub-minute precision.
meta=read('archive/video-backup-files/holiday-2021-nu11-cmr/original.info.json')
nu['submittedAt']=datetime.fromtimestamp(meta['timestamp'],timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z') if meta.get('timestamp') else None
original=make(indexed[1131],'Nu11',['38.79','39.11'])
nu.update({k:original[k] for k in ['proofImage','proofImageVerified']})
nu['additionalSources'].append(original['source'])
supporting.append(nu)
allrows=rows+supporting;ids={r['messageId'] for r in allrows}
save('archive/curated-runs.json',[r for r in curated if r.get('messageId') not in ids]+allrows)
save('archive/assets-manifest.json',assets)
for aid,r in sub.items():
 if 1027<=r['index'] and r['submittedAt']<'2021-12-16' and r['courseId'] in ['wii-maple-treeway','n64-choco-mountain-r']:
  r.update(classification='reconciled-wr' if r['index'] in [1033,1103] else 'reviewed-non-wr-submission',reconciliation='archive/holiday-2021-reconciliation.json')
save('archive/submission-visual-review.json',sub)
vid=[]
for name,url,note in [('sucha-glider','https://youtube.com/shorts/dK4puEIacIA','Choco Mountain R opening segment to 20.20, no complete lap or final result.'),('sucha-nita','https://www.youtube.com/watch?v=Udm4G22UIJY','Sucha Maple Treeway 1:47.79 no-item full run, 53.92/53.87.'),('nu11-cmr',nu['video'],'Nu11 Choco Mountain R 1:17.90 full PB video, 38.79/39.11.')]:
 p=ROOT/f'archive/video-backup-files/holiday-2021-{name}/original.mp4';vid.append({'originalUrl':url,'file':str(p.relative_to(ROOT)),'notes':note})
vid.append({'originalUrl':'https://cdn.discordapp.com/attachments/636461740162416640/917017509796917258/RPReplay_Final1638704360.mov','file':'archive/holiday-2021-original-media/RPReplay_Final1638704360.mov','notes':'Cabotsikalut controls technique clip from 37.02 through approximately 54.17; no result.'})
availability=read('archive/video-availability.json')
for v in vid:
 p=ROOT/v['file'];v.update(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size,reviewStatus='visually-reviewed',backupStatus='queued-daily-upload-limit')
 u=v['originalUrl'];key='youtube:'+u.split('v=')[-1] if 'watch?v=' in u else 'youtube:'+u.split('/shorts/')[-1] if '/shorts/' in u else 'x:'+u.split('/status/')[-1] if 'twitter.com' in u else u
 availability[key]={'originalUrl':u,'status':'available','checkedAt':datetime.now(timezone.utc).isoformat(),'bytes':v['bytes'],'sha256':v['sha256'],'reason':'Downloaded and visually reviewed. '+v['notes']}
save('archive/holiday-2021-original-videos.json',vid)
save('archive/video-availability.json',availability)
messages={}
for p in (ROOT/'archive/raw').glob('holiday-2021-window-*.json'):
 for r in json.loads(p.read_text())['data']['messages']:
  if len(r.get('text',''))>=len(messages.get(r['id'],{}).get('text','')):messages[r['id']]=r
for r in read('archive/space-2021-discussion-census.json')['messages']:
 if r.get('times') and r['times'][0]>='2021-12-01T06' and r['id'] not in messages:messages[r['id']]=r
save('archive/holiday-2021-discussion-census.json',{'messages':sorted(messages.values(),key=lambda r:int(r['id']))})
save('archive/holiday-2021-reconciliation.json',{'tour':'Holiday Tour 2021','status':'Original submission images and text reviewed; original DIT media unavailable, surviving embedded text preserved. Global archive remains incomplete.','coverage':{'submissionImagesVisuallyReviewed':sum(1 for r in sub.values() if r.get('reconciliation')=='archive/holiday-2021-reconciliation.json'),'submissionMessagesRead':len(read('archive/holiday-2021-submission-messages.json')),'discussionUniqueMessagesRead':len(messages),'discussionImagesVisuallyReviewed':4,'originalVideosDownloadedAndVisuallyReviewed':4,'newUnlistedBackupsVerified':0},'confirmedChanges':rows,'supportingEvidence':supporting,'limitations':['DIT original image is lost; original embedded lap text survives in tt-submission and establishes the intermediate total.','Nu11’s hop-cancellation tutorial eyGInGqKK1E is unavailable.','Wins December 1 post is a repost linking to his 2020 video 1339106433351159808, already preserved with its original date and unlisted backup. It is not a new 2021 record.','Sucha 1:47.79 is a no-item category run, not a main-category WR.','All reviewed Choco Mountain R totals are slower than the existing February 1:17.87; no new main-category WR added.','Four recovered videos await unlisted backup after YouTube daily upload limit.','Later post-reset Holiday results remain supporting submissions; no post-reset timestamp is assigned as a race date.']})
print({'confirmedOrEnriched':len(rows),'supporting':len(supporting),'discussion':len(messages)})
