"""Restore Yoshi 2021 exchanges from visually reviewed evidence and adjacent replies."""
import json,hashlib
from pathlib import Path
from datetime import datetime,timezone
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def save(p,d):(root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
def proof(x):
 dst=root/f"public/assets/proof/yoshi-2021-{x['id']}.webp"
 if not dst.exists():Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
def make(aid,player,time,laps,status='community-wr'):
 x=review[aid];assert x['reviewStatus']=='visually-reviewed';proof(x)
 if all(l is not None for l in laps):
  m,s=time.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100),(aid,time,laps)
 return {'messageId':'yoshi-2021-'+aid+'-'+time.replace(':','').replace('.',''),'player':player,'courseId':x['courseId'],'time':time,'laps':laps,'mushrooms':None,'status':status,'submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read and compared with dated submissions and adjacent messages. Date uses original evidence publication in UTC; an exact race-completion instant is not asserted.']}
rows=[
('824165202307055686','Timaël',[None,None]),
('824168821631483914','Nu11',['25.06','22.40']),
('824173189722406912','Troy',['24.66','22.43']),
('824182108364079134','Nu11',['24.68','22.23']),
('824273334136995890','Tomegome',[None,None]),
('824566566283903006','Tomegome',[None,None]),
('02667544b861d893272e5949','Tomegome',['24.44','22.13']),
('826845710275051560','Tomegome',['24.42','22.09']),
('828495725209583647','Nu11',['24.40','22.07']),
('7620c6ce9389629e736f6341','Tomegome',['24.36','22.11']),
('824201310345625650','Nu11',['53.42','53.49']),
('824239951632924732','N',['52.95','53.88']),
('826721322158522378','DIT',['53.43','53.32']),
('827221560502779914','N',[None,None]),
('827777726114562098','DIT',['53.32','53.36']),
('80fb64bb3d09cd93736b1d47','Tomegome',['53.38','53.15']),
('828423518898487356','DIT',['53.17','53.36']),
('828428939914379284','DIT',['53.12','53.34']),
('828558333279469588','Nu11',['53.11','53.10'])]
new=[]
for aid,player,laps in rows:
 r=make(aid,player,review[aid]['time'],laps)
 if all(l is not None for l in laps):r['notes'].append('Splits read from the submission, original tweet or adjacent reply and checked against the total.')
 if aid=='824173189722406912':r['notes'].append('Troy supplies 24.66 / 22.43 in the immediately following message, 13 seconds after the image.')
 if aid=='824165202307055686':r['notes'].append('The runner explicitly claims WR in the next message two seconds later.')
 if aid=='824566566283903006':r['notes'].append('Reposted March 25; nested screenshot shows March 24 but its timezone is not established. Publication date is retained rather than inventing an exact race timestamp. Previous best is 46.82, not 46.88.')
 if aid in ['824273334136995890','824566566283903006','826845710275051560']:r['notes'].append('Wins reposted Tomegome evidence. Runner attribution remains Tomegome.')
 if aid=='02667544b861d893272e5949':r['additionalSources']=[{'url':'https://twitter.com/tomegome_g/status/1375034751128530944','kind':'original-tweet'}];r['submittedAt']='2021-03-25T10:40:11.889Z';r['notes'].append('Exact tweet publication timestamp decoded from the linked Twitter snowflake, consistent with the visible embed date.')
 if aid=='826845710275051560':r.update(video='https://twitter.com/tomegome_g/status/1377274485729034242',videoVerified=True,submittedAt='2021-03-31T15:00:00Z');r['notes'].append('Original video downloaded and finish visually verified; publication timestamp from downloaded source metadata.')
 if aid=='80fb64bb3d09cd93736b1d47':r['additionalSources']=[{'url':'https://twitter.com/tomegome_g/status/1378664281068036096','kind':'original-tweet'}];r['notes'].append('Original tweet states 53.38 / 53.15. Separate technique video shows the earlier 1:46.72 run and is not attached to 1:46.53.')
 if aid=='828558333279469588':r['additionalSources']=[{'url':'https://youtu.be/TEGsEDoLazE','kind':'original-video-unavailable'}]
 if aid=='7620c6ce9389629e736f6341':
  r['additionalSources']=[{'url':'https://twitter.com/tomegome_g/status/1378948613636689920','kind':'original-image-tweet'}]
  r['rejectedVideos']=[{'url':'https://twitter.com/_Kaguya_Games/status/1378936513040318466?s=20','reason':'This is Nu11’s video, not Tomegome’s tied 46.47 run. Tomegome has his own image tweet and different splits.'}]
  r['notes'].append('Kazuo explicitly confirms Tomegome ties Kaguya in the next message. The reposted original tweet supplies 24.36 / 22.11.')
 new.append(r);review[aid]['classification']='confirmed-world-record'
# This earlier time is established by both the contemporary reply and the later image.
r=make('824173189722406912','Troy','0:47.39',[None,None]);r['submittedAt']='2021-03-24T06:34:41.049Z';r['source']={'url':'https://discord.com/channels/629221606064914442/636461740162416640/824169331894124584','channel':'tt-discussion','messageId':'824169331894124584'};r['notes']=['Troy says his first attempt was 0.07 faster than the immediately discussed Nu11 47.46. His later 47.09 result visually confirms previous best 47.39. Date uses the contemporary claim, not the later screenshot.'];new.append(r)
# Use original tweet publication dates, not repost dates, when a source tweet is available.
for r in new:
 for s in r.get('additionalSources',[]):
  if s.get('kind') in ['original-tweet','original-image-tweet']:
   tid=int(s['url'].rsplit('/',1)[-1]);r['submittedAt']=datetime.fromtimestamp(((tid>>22)+1288834974657)/1000,timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
held=[]
r=make('824170557670293504','Unidentified player','0:47.39',['25.28','22.11'],'documented-submission');r.update(includeInProgression=False,identityUnresolved=True);r['notes'].append('Splits recovered in the following message. Deleted-account identity is unresolved; this ties Troy’s previously reported 47.39.');held.append(r)
# Early tour-leading claims conflict with the older 1:47.31 record and are preserved for review.
for aid,player in [('824169969226612756','Nu11'),('824178240347176990','N'),('824179515697397760','DIT'),('824182940463529984','Nu11'),('824191933375053884','DIT'),('824195497207005225','N')]:
 r=make(aid,player,review[aid]['time'],[None,None],'documented-submission');r.update(includeInProgression=False);r['notes'].append('Opening Yoshi Tour lead/WR claims conflict with the already announced New Year 2020 Tomegome 1:47.31. Preserve the evidence; do not promote a slower all-time record without resolving that discrepancy.');held.append(r)
for aid,player,time in [('824273334136995890','Tomegome','0:46.90'),('824641663119917106','Tomegome','0:46.72'),('826845710275051560','Tomegome','0:46.52'),('826721322158522378','DIT','1:46.82'),('828423518898487356','DIT','1:46.61'),('828558333279469588','Nu11','1:46.33')]:
 r=make(aid,player,time,[None,None],'documented-submission');r.update(includeInProgression=False,dateUnresolved=True,observedAt=r['submittedAt'],submittedAt=None);r['notes']=['Previous-best field visually read. Exact original date and ordering against other players remain unresolved; not assigned the later screenshot date.'];held.append(r)
fallback=make('75d4bcbaa588b03a034b0fb0','Tomegome','1:46.72',['53.34','53.38'],'documented-submission');fallback.update(includeInProgression=False,video='https://twitter.com/tomegome_g/status/1378668362151038976',videoVerified=True);fallback['notes']=['Original technique video visually verified: first lap 53.34; finish 1:46.72. The post discusses a subsequent 1:46.53 but the attached footage is the 1:46.72 run.','Submitted after DIT 1:46.68; preserved as available footage, not promoted into WR history.']
allrows=new+held+[fallback];ids={r['messageId'] for r in allrows};curated=[r for r in curated if r.get('messageId') not in ids]+allrows
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-03-24T06'<=x['postedAt']<'2021-04-07T06']
audit={'tour':'Yoshi Tour 2021','status':'Indexed images reviewed; original message census remains incomplete.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':sum(review.get(x['id'],{}).get('reviewStatus')=='visually-reviewed' for x in q),'wrSearchMatches':25,'linkSearchMatches':27},'confirmedChanges':new,'heldForReconciliation':held,'verifiedVideoFallbacks':[fallback],'limitations':['Full server message coverage is not established by the image index or keyword searches.','Several early Pinball tour-leading claims are slower than the older announced all-time record; discrepancy remains unresolved.','Deleted-account 47.39 attribution remains unknown.','Previous-best fields expose additional intermediate runs whose original dates remain unresolved.','Tomegome 46.74 is a delayed repost; an exact original timestamp remains unavailable.','Nu11 Pinball 1:46.21 YouTube upload is unavailable in the signed-in browser.','Twitter 46.47 image tweet is not video proof and Nu11 footage must not be assigned to Tomegome.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/yoshi-2021-reconciliation.json',audit)
print(json.dumps({'confirmed':len(new),'held':len(held),'coverage':audit['coverage']}))
