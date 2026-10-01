"""Restore Summer Tour exchanges from visually read evidence and nearby replies."""
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
 x=review[aid];assert x['reviewStatus']=='visually-reviewed';dst=root/f'public/assets/proof/summer-2021-{aid}.webp'
 if not dst.exists():Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
 t=time or x['time'];laps=laps or [None,None]
 if all(l is not None for l in laps):
  m,s=t.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100),(aid,laps,t)
 return {'messageId':'summer-2021-'+aid+'-'+t.replace(':','').replace('.',''),'player':player,'courseId':x['courseId'],'time':t,'laps':list(laps),'mushrooms':None,'status':'community-wr','submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':base+x['messageId'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read and compared with earlier records and surrounding replies. Date is original evidence publication in UTC, not an asserted race-completion instant.']}
rows=[('859714626673704960','Nu11',['36.38','35.94']),('859719566618918912','Nu11',['36.25','36.03']),('861967576354258984','Tomegome',['36.17','36.07']),('864521677965623306','Nu11',['36.05','36.03'])]
new=[make(*r) for r in rows]
tome=new[2];tome['additionalSources']=[tome['source'],{'url':'https://x.com/tomegome_g/status/1412384717966508034','kind':'original-video-reply'}];tome.update(submittedAt='2021-07-06T12:00:05.000Z',source={'url':'https://x.com/tomegome_g/status/1412380830387773444','channel':'Twitter','messageId':'1412380830387773444'},video='https://x.com/tomegome_g/status/1412384717966508034',videoVerified=True);tome['notes'].append('Original result post recovered on X with exact UTC publication time, earlier than Wins’s Discord repost. Original 89-second video visually confirms first lap 36.17 and finish 1:12.24; 36.07 second lap agrees with the original result text.')
new[3]['additionalSources']=[{'url':base+'864521709126156319','kind':'adjacent-no-video-reply'}];new[3]['notes'].append('Runner immediately follows the result with “sry no vid”. Leave the video empty; the fastest earlier verified recording is shown separately.')
held=[make('864521677965623306','Nu11',time='1:12.23')]
held[0].update(status='documented-submission',includeInProgression=False,dateUnresolved=True,observedAt=held[0]['submittedAt'],submittedAt=None)
held[0]['notes']=['Previous-best 1:12.23 visually read in the later 1:12.08 result. Original achievement date and order against Tomegome’s 1:12.24 remain unresolved; do not assign July 13 as its achievement date.']
allrows=new+held;ids={r['messageId'] for r in allrows};curated=[r for r in curated if r.get('messageId') not in ids]+allrows
# Nearby July 1 discussion explains why the Paris current WR has no available video.
for r in curated:
 if r.get('messageId')=='paris-2021-859435728626909198-10040':
  source={'url':base+'860054333948952578','kind':'adjacent-deleted-video-explanation'}
  if source not in r.setdefault('additionalSources',[]):r['additionalSources'].append(source)
  note='In the July 1 follow-up to Kazuo’s request for the 1:00.40 video, N says the WR video was deleted because it was too laggy; N distinguishes the surviving 1:00.45 recording.'
  if note not in r['notes']:r['notes'].append(note)
for aid,*_ in rows:review[aid]['classification']='confirmed-world-record'
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-06-30T06'<=x['postedAt']<'2021-07-14T06']
audit={'tour':'Summer Tour July 2021','status':'Indexed images and focused WR/link/video searches reviewed; complete message census remains unresolved.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':sum(review.get(x['id'],{}).get('reviewStatus')=='visually-reviewed' for x in q),'wrSearchMatches':7,'linkSearchMatches':9,'videoSearchMatches':3},'confirmedChanges':new,'heldForReconciliation':held,'limitations':['Indexed-image and focused-search coverage does not establish a complete server-message census.','Isun’s July 9 indexed Twitter result image f27bdb9173b2f164b6e4d4cb cannot be retrieved; original tweet 1413514490587488264 also reports unavailable. No time is inferred from its surrounding conversation.','Nu11’s prior 1:12.23 requires an original dated source.','Kazuo’s older July 6, 2020 1:12.42 example-run Twitter link was rediscovered; downloader retrieval failed and requires follow-up.','July 14 search results after 06:00 UTC belong to Los Angeles Tour and are reviewed separately.'],'otherVideoEvidence':[{'url':'https://twitter.com/kaiteki_sun_777/status/1410299675115069454','status':'downloaded-and-visually-reviewed','classification':'short-starting-route-clip-not-full-run-proof'}],'airshipFortressR':'No new WR found among reviewed Summer submissions: fastest reviewed 1:36.47 is slower than the existing January 12 1:36.44.'}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/summer-2021-reconciliation.json',audit);print(json.dumps({'confirmed':len(new),'held':len(held),'coverage':audit['coverage']}))
