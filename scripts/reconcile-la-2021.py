"""Restore Los Angeles Tour exchanges from visually read evidence and nearby replies."""
import json, hashlib, subprocess
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def save(p,d):(root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
base='https://discord.com/channels/629221606064914442/636461740162416640/'
def snow(mid):return datetime.fromtimestamp(((int(mid)>>22)+1420070400000)/1000,timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
def make(aid,player,laps=None,time=None):
 x=review[aid];assert x['reviewStatus']=='visually-reviewed';dst=root/f'public/assets/proof/la-2021-{aid}.webp'
 if not dst.exists():Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
 t=time or x['time'];laps=laps or [None,None]
 if all(l is not None for l in laps):
  m,s=t.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100),(aid,laps,t)
 return {'messageId':'la-2021-'+aid+'-'+t.replace(':','').replace('.',''),'player':player,'courseId':x['courseId'],'time':t,'laps':list(laps),'mushrooms':None,'status':'community-wr','submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':base+x['messageId'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read and compared with earlier records and surrounding replies. Date is original evidence publication in UTC, not an asserted race-completion instant.']}
rows=[('864756668722446376','Nu11',['33.56','33.55']),('864777915669544970','Saki7'),('864794262285058058','Nu11',['33.28','33.31']),('864888354499854367','Nu11',['33.23','33.30']),('868301787495551036','Tomegome',['33.21','33.23']),('864767500524584970','N'),('865072961148289054','N'),('865499044977967154','Nu11',['39.98','38.88']),('866263848339767306','DIT',['39.95','38.83']),('866275178114842654','DIT',['40.05','38.65']),('867179975194836992','DIT',['39.95','38.73']),('867309042648612874','Nu11'),('867309677011927050','Nu11',['39.80','38.70']),('868422152033038397','DIT',['39.90','38.53']),('869555904088006676','DIT',['39.90','38.50']),('869808198700367892','N',['39.87','38.46'])]
new=[make(*r) for r in rows]
tome=new[4];tome['additionalSources']=[tome['source']];tome.update(submittedAt='2021-07-24T01:16:39.000Z',source={'url':'https://x.com/tomegome_g/status/1418741887960158209','channel':'Twitter','messageId':'1418741887960158209'});tome['notes'].append('Original Twitter result recovered with exact publication timestamp, five minutes before Starin’s Discord repost. The nearby video is a different 1:06.61 run, not proof of this 1:06.44.')
new[-1]['additionalSources']=[{'url':base+'869808319513124884','kind':'adjacent-lap-reply'},{'url':base+'869809149154832464','kind':'adjacent-no-video-reply'}];new[-1]['notes'].append('Immediately following the result, N states 39.87/38.46 and then says in Japanese that the video was not recorded. Do not attach the older 1:18.48 recording to this time.')
held=[]
for aid,player,t in [('864777915669544970','Saki7','1:07.06'),('864794262285058058','Nu11','1:06.68'),('864767500524584970','N','1:20.79'),('865499044977967154','Nu11','1:19.03'),('867309042648612874','Nu11','1:18.70')]:
 r=make(aid,player,time=t);r.update(status='documented-submission',includeInProgression=False,dateUnresolved=True,observedAt=r['submittedAt'],submittedAt=None);r['notes']=['Previous-best field visually read in a later result. Original date and exact order against competitors remain unresolved; do not use the later image publication as an achievement date.'];held.append(r)
# A linked video's original publication establishes an intermediate WR absent from the later repost chronology.
def fromvideo(vid,player,course,t,laps):
 meta=read(f'archive/video-backup-files/la-{vid}/original.info.json')
 return {'messageId':'la-2021-video-'+vid,'player':player,'courseId':course,'time':t,'laps':laps,'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':datetime.fromtimestamp(meta['timestamp'],timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z'),'video':meta['webpage_url'],'videoVerified':True,'source':{'url':meta['webpage_url'],'channel':'Twitter' if vid.isdigit() else 'YouTube','messageId':vid},'notes':['Original video downloaded and visually verified at first-lap overlay and finish. Date is original video publication, not the later Discord repost or an asserted race-completion instant.']}
r=fromvideo('G22Slvrb4W4','N','n64-kalimari-desert-r','1:18.48',['40.05',None]);r.update(status='community-wr',includeInProgression=True);r['notes'].append('Original July 22 YouTube publication predates DIT’s July 24 1:18.43 and the July 28 Discord repost. This is a real intermediate WR following Nu11’s 1:18.50. Second lap derives to 38.43.');new.append(r)
fallbacks=[fromvideo('1418743649798529026','Tomegome','snes-mario-circuit-3','1:06.61',['33.29',None]),fromvideo('5Gzx90h0480','Wins','snes-mario-circuit-3','1:07.14',['33.61','33.53']),fromvideo('oPT0vLUKPr8','Wins','n64-kalimari-desert-r','1:18.88',['39.99','38.89'])]
fallbacks[0]['notes'].append('Creator explicitly identifies this footage as 1:06.61; it is not the faster adjacent 1:06.44 screenshot. Second lap derives to 33.32.')
# Preserve a video finish image for the recovered WR, without relying on a later retie screenshot.
dst=root/'public/assets/proof/la-2021-n-video-11848.webp'
if not dst.exists():Image.open('/tmp/la-G22Slvrb4W4-87.jpg').convert('RGB').save(dst,'WEBP',lossless=True)
new[-1].update(proofImageLocal='/assets/proof/la-2021-n-video-11848.webp',proofImageVerified=True)
allrows=new+held+fallbacks;ids={r['messageId'] for r in allrows};curated=[r for r in curated if r.get('messageId') not in ids]+allrows
for aid,*_ in rows:review[aid]['classification']='confirmed-world-record'
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-07-14T06'<=x['postedAt']<'2021-07-28T06']
audit={'tour':'Los Angeles Tour July 2021','status':'Indexed images and focused WR/link/video searches reviewed; complete message census remains unresolved.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':sum(review.get(x['id'],{}).get('reviewStatus')=='visually-reviewed' for x in q),'wrSearchMatches':11,'linkSearchMatches':5,'videoSearchMatches':3,'originalVideosDownloadedAndVisuallyReviewed':4},'confirmedChanges':new,'heldForReconciliation':held,'verifiedVideoFallbacks':fallbacks,'limitations':['Indexed-image and focused-search coverage does not establish a full message census.','Earlier Mario Circuit 3 1:07.18 still lacks its original achievement date.','Five previous-best times lack original dated evidence.','Nu11’s July 14 Twitter recording 1415236314283220999 is unavailable; surrounding replies identify the newly posted 1:06.59, but footage cannot be checked.','Later per-tour leaderboard claims of Summer Airship 1:36.47 are slower than the surviving January 1:36.44; they do not reset the all-time WR progression.','The July 22 Royal Raceway R standings show Sucha 1:33.47; original achievement date and whether it preceded SuperFX’s faster results remain unresolved.','A 10mp RMX Choco Island 1 screenshot posted after the July 14 reset was recognized as a late prior-tour submission from its artwork and thresholds, not mapped to the new tour solely by date.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/la-2021-reconciliation.json',audit);print(json.dumps({'confirmed':len(new),'held':len(held),'fallbacks':len(fallbacks),'coverage':audit['coverage']}))
