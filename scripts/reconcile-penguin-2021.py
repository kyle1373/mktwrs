"""Reconcile Penguin Tour results with original images and surrounding discussion."""
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
    dst = ROOT / f'public/assets/proof/penguin-2021-{name}.webp'
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
    return {'messageId': 'penguin-2021-' + aid, 'player': player, 'courseId': r['courseId'], 'time': r['time'], 'laps': laps or [None, None], 'mushrooms': None, 'status': 'community-wr', 'submittedAt': r['submittedAt'], 'proofImage': url, 'proofImageVerified': True, 'source': {'url': r['source'], 'channel': 'tt-submission', 'messageId': r['messageId']}, 'notes': ['Original result image visually read at enlarged size and reconciled with earlier submissions, linked posts and surrounding discussion. Timestamp is original evidence publication in UTC, not an asserted race-completion instant.']}

from datetime import datetime, timezone
indexed={r['index']:aid for aid,r in sub.items()}
spec=[(1116,'Timaël'),(1117,'Timaël'),(1118,'cabotsikalut'),(1121,'Astre'),(1130,'Phillish',['16.37','15.87']),(1146,'Wins',['15.97','15.55']),(1157,'Nu11',['15.66','15.56']),(1226,'Nu11',['39.44','39.73'])]
rows=[make(indexed[s[0]],*s[1:]) for s in spec]
by={(r['player'],r['time']):r for r in rows}
nu=by[('Nu11','0:31.22')]
nu.update(video='https://twitter.com/_kaguya_games/status/1471492448967073797',videoVerified=True)
meta=read('archive/video-backup-files/penguin-2021-nu11-3122/original.info.json')
nu['submittedAt']=datetime.fromtimestamp(meta['timestamp'],timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
nu['notes'].append('Original video publication precedes the Discord screenshot by several minutes. Full video confirms 15.66/15.56 and 31.22, with previous best 31.58.')
w=by[('Wins','0:31.52')];w.update(video='https://www.youtube.com/watch?v=FXhATi20bio',videoVerified=True)
w['notes'].append('Full video confirms lap one 15.97 and total 31.52; lap two is 15.55 by subtraction. Video was posted later; exact December 15 screenshot timestamp is retained.')
bc=by[('Nu11','1:19.17')];bc.update(video='https://www.youtube.com/watch?v=zdbTLeAIezg')
bc['notes'].append('Original YouTube video is now unavailable. Original result image and message explicitly preserve 39.44/39.73. Final board confirms this accepted WR; unverified Nintendo claims and parody footage are excluded.')
def source(mid,channel='636461740162416640'):
 return {'url':base+channel+'/'+mid,'channel':'tt-discussion' if channel=='636461740162416640' else 'tt-submission','messageId':mid}
for r in rows:
 if r['courseId']=='snes-vanilla-lake-2':r.setdefault('additionalSources',[]).append(source('925977245401628743'))
bc['additionalSources']=[source('925977327706456105'),source('925348682818281523')]
by[('cabotsikalut','0:32.69')]['additionalSources'].append(source('920568149747843113','875784780573184010'))
by[('cabotsikalut','0:32.69')]['notes'].append('Adjacent original message explicitly says WR. Final board lists a matching 32.69 under Hilton; the Discord account identity is unresolved, so this entry retains its directly observed submitter name rather than merging profiles on time alone.')
by[('Phillish','0:32.24')]['additionalSources'].append(source('920609327167991808','875784780573184010'))
by[('Phillish','0:32.24')]['notes'].append('A surviving Nu11 post at 09:39 UTC says he had already broken 32 seconds. Its exact total is lost. Later 32.13 and 32.10 submissions are therefore not WRs. The missing intermediate Nu11 total is explicitly retained as an unresolved lead.')
supporting=[]
for idx,player,laps,video,note in [
 (1193,'Wins',['39.54','39.94'],'https://www.youtube.com/watch?v=quxB8oqiVrE','Full 1:19.48 video visually checked. December 19 original submission predates December 26 video repost; slower than existing Tomegome 1:19.29.'),
 (1184,'Spart',['39.67','39.97'],'https://www.youtube.com/watch?v=S5d-z0XfWk4','Full 1:19.64 video visually checked. Slower than existing Tomegome 1:19.29.'),
 (1153,'Nu11',['15.93','15.65'],None,'31.58 is a personal best after Wins 31.52, not a WR.'),
 (1143,'Wins',None,None,'31.87 result is genuine, but its WR ordering against Nu11’s earlier sub-32 post cannot be established because the earlier total is lost. Held outside WR progression.')]:
 r=make(indexed[idx],player,laps);r.update(status='documented-submission',includeInProgression=False)
 if video:r.update(video=video,videoVerified=True)
 r['notes'].append(note);supporting.append(r)
held=[]
for parent,time in [(by[('Astre','0:32.28')],'0:32.52'),(supporting[-1],'0:32.00'),(supporting[-2],'0:31.80')]:
 r={**parent,'messageId':parent['messageId']+'-previous-best','time':time,'laps':[None,None],'submittedAt':None,'observedAt':parent['submittedAt'],'dateUnresolved':True,'status':'documented-submission','includeInProgression':False,'notes':['Visible previous best proves an earlier run but not its original date or WR ordering. Held until independently dated.']}
 for k in ['video','videoVerified']:r.pop(k,None)
 held.append(r)
allrows=rows+supporting+held;ids={r['messageId'] for r in allrows}
save('archive/curated-runs.json',[r for r in curated if r.get('messageId') not in ids]+allrows)
save('archive/assets-manifest.json',assets)
confirmed={indexed[s[0]] for s in spec}
for aid,r in sub.items():
 if 1116<=r['index']<=1235 and r.get('courseId') in ['snes-vanilla-lake-2','gba-bowser-s-castle-2r']:
  r.update(classification='reconciled-wr' if aid in confirmed else 'reviewed-non-wr-submission',reconciliation='archive/penguin-2021-reconciliation.json')
sub[indexed[1143]]['classification']='wr-order-unresolved'
for idx in [1224,1225,1227]:
 sub[indexed[idx]].update(classification='unverified-or-parody-excluded',reconciliation='archive/penguin-2021-reconciliation.json')
save('archive/submission-visual-review.json',sub)
messages={}
for pattern in ['penguin-2021-window-*.json','holiday-2021-window-*.json']:
 for p in (ROOT/'archive/raw').glob(pattern):
  for r in json.loads(p.read_text())['data']['messages']:
   if r.get('times') and r['times'][0]>='2021-12-15T06' and len(r.get('text',''))>=len(messages.get(r['id'],{}).get('text','')):messages[r['id']]=r
save('archive/penguin-2021-discussion-census.json',{'messages':sorted(messages.values(),key=lambda r:int(r['id']))})
vid=[]
for name,url,note in [
 ('nu11-3122',nu['video'],'Full Vanilla Lake 2 WR 31.22; 15.66/15.56.'),
 ('wins-3152',w['video'],'Full Vanilla Lake 2 WR 31.52; 15.97/15.55.'),
 ('wins-7948','https://www.youtube.com/watch?v=quxB8oqiVrE','Full Bowser’s Castle 2R PB 1:19.48; 39.54/39.94, not WR.'),
 ('spart-bc','https://www.youtube.com/watch?v=S5d-z0XfWk4','Full Bowser’s Castle 2R PB 1:19.64; 39.67/39.97, not WR.'),
 ('wins-strat','https://twitter.com/WinsMkt/status/1471103306403618817','Vanilla Lake 2 opening and lap one 15.85; incomplete run.'),
 ('tome-thwomp','https://twitter.com/tomegome_g/status/1475830681519685636','Bowser’s Castle 2R thwomp technique clip through 30 seconds; no full lap or result.'),
 ('spart-joke','https://www.youtube.com/watch?v=9zCb2s8FToo','Parody response to disputed offsite 1:18.58 claim, titled 1:18.57 new WR with clown emoji. Footage shows 1:18.57 but is not accepted by the final community board; exclude as WR proof.')]:
 vid.append({'originalUrl':url,'file':f'archive/video-backup-files/penguin-2021-{name}/original.mp4','notes':note,'classification':'parody-not-wr-proof' if name=='spart-joke' else 'reviewed-run-or-technique'})
for filename,aid,note in [
 ('RPReplay_Final1639564640.mov','920626565568692224','Sucha Vanilla Lake 2 opening technique through 16 seconds, no lap or total.'),
 ('ScreenRecording_12-15-2021_15-12-04_1.mov','920692306846285884','Wins Vanilla Lake 2 lap-one crossing 15.67; short excerpt with no total.'),
 ('RPReplay_Final1639580490.mov','920692359648407602','Wins slow-motion technique excerpt in lap two around 19–20 seconds, no total.')]:
 vid.append({'originalUrl':f'https://cdn.discordapp.com/attachments/636461740162416640/{aid}/{filename}','file':'archive/penguin-2021-original-media/'+filename,'notes':note,'classification':'reviewed-run-or-technique'})
availability=read('archive/video-availability.json')
for v in vid:
 p=ROOT/v['file'];v.update(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size,reviewStatus='visually-reviewed',backupStatus='excluded-parody' if v['classification']=='parody-not-wr-proof' else 'queued-daily-upload-limit')
 u=v['originalUrl'];key='youtube:'+u.split('v=')[-1] if 'watch?v=' in u else 'x:'+u.split('/status/')[-1] if 'twitter.com' in u else u
 availability[key]={'originalUrl':u,'status':'available','checkedAt':datetime.now(timezone.utc).isoformat(),'bytes':v['bytes'],'sha256':v['sha256'],'reason':'Downloaded and visually reviewed. '+v['notes']}
save('archive/penguin-2021-original-videos.json',vid)
save('archive/video-availability.json',availability)
ims=[]
for file,mid,aid,note in [
 ('IMG_3801.png','920654734287843338','920654733268635688','Wins lap one 15.85, no final time.'),
 ('IMG_3808.png','920690999905361930','920690997845954640','Wins lap one 15.67, no final time.'),
 ('IMG_5042.png','921996958304972840','921996956920872970','Sucha no-item 1:20.12 finish; slower than 1:19.29 standing WR.'),
 ('IMG_5897.png','925287177674428506','925287175942176798','Screenshot of Nu11 original 31.22 post dated December 16, previous 31.58.'),
 ('IMG_0051.png','925356136620777522','925356135362469898','Thwomp technique annotation at 22.71, no final result.'),
 ('disputed-board.png','925442657835180133','925442656866304040','Anonymous offsite 1:18.58 claim; data collected December 22, no player or original run proof.'),
 ('IMG_7233.png','925641876504215583','925641874499321876','New Year Fire Bro Cup with Kalimari Desert TT; not Penguin result.'),
 ('penguin-cups.png','920589511405215745','920587517760241724','Penguin Tour cups, Donkey Kong Cup contains Bowser’s Castle 2R TT.'),
 ('IMG_0160.png','925977245401628743','925977243656798248','Final Vanilla Lake 2 board, Nu11 31.22 and Wins 31.52.'),
 ('IMG_0161.png','925977245401628743','925977244025905172','Continuation of final Vanilla Lake 2 board.'),
 ('IMG_0162.png','925977327706456105','925977325332471859','Final Bowser’s Castle 2R board, Nu11 1:19.17.'),
 ('IMG_0163.png','925977327706456105','925977325688979496','Continuation of final Bowser’s Castle 2R board.')]:
 p=ROOT/'archive/penguin-2021-original-media'/file
 ims.append({'file':str(p.relative_to(ROOT)),'messageId':mid,'attachmentId':aid,'source':source(mid)['url'],'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'reviewStatus':'visually-reviewed','notes':note})
save('archive/penguin-2021-discussion-images.json',ims)
missing={'player':'Nu11','courseId':'snes-vanilla-lake-2','time':None,'timeConstraint':'less than 0:32.00','publishedAt':'2021-12-15T09:39:00Z','datePrecision':'minute','source':'https://twitter.com/_Kaguya_Games/status/1471052187031990274','discordSource':base+'875784780573184010/920617953366528060','status':'exact-total-unavailable','notes':'Surviving embedded text says sub-32 on first day. Original post no longer exists and image returns 404. Do not invent an exact total or count later 32-second submissions as WRs.'}
save('archive/penguin-2021-reconciliation.json',{'tour':'Penguin Tour 2021','status':'Original image cohort and surrounding discussion reviewed. Missing Nu11 opening total and some prior-best ordering remain unresolved; global archive remains incomplete.','coverage':{'submissionImagesVisuallyReviewed':sum(r.get('reconciliation')=='archive/penguin-2021-reconciliation.json' for r in sub.values()),'submissionMessagesRead':len(read('archive/penguin-2021-submission-messages.json')),'discussionUniqueMessagesRead':len(messages),'discussionImagesVisuallyReviewed':len(ims),'originalVideosDownloadedAndVisuallyReviewed':len(vid),'newUnlistedBackupsVerified':0},'confirmedChanges':rows,'supportingEvidence':supporting,'previousBestLeads':held,'missingRecordLeads':[missing],'limitations':['Nu11 opening sub-32 exact total is lost. Wins 31.87 WR ordering remains unresolved; later Phillish 32.13 and Lélé 32.10 are not WRs.','Astre 32.52, Wins 32.00 and Nu11 31.80 previous-best timestamps are unknown.','cabotsikalut submission matches Hilton 32.69 on final board, but profile identity remains unresolved.','Original Nu11 1:19.17 YouTube zdbTLeAIezg is unavailable; image and explicit lap text survive.','Anonymous offsite 1:18.58 / 31.21 claims are unverified; no real player attribution or accepted proof was recovered. Offsite 20211228_123126.jpg failed to download.','FEX-obscured image, explicitly fake 1:11.11, unresolved 1:00.42 and parody 1:18.57 are excluded from WR progression.','Nine real run/technique originals await unlisted backup after YouTube daily upload limit; parody is preserved locally but excluded from the proof-backup queue.']})
print({'confirmedOrEnriched':len(rows),'supporting':len(supporting),'held':len(held),'discussion':len(messages)})
