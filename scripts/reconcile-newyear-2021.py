"""Restore New Year's 2021 exchanges from manually reviewed original images."""
import json,hashlib,datetime
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def save(p,d):(root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
ktb='snes-koopa-troopa-beach-2';afr='ds-airship-fortress-r'
rows=[
('793723525001117706','Troy',ktb,'1:00.34',[None,None]),
('793725248955613184','Phillish',ktb,'0:59.56',[None,None]),
('793725666381266994','zxflare',ktb,'0:59.51',[None,None]),
('793726357988442112','SuperFX',ktb,'0:58.95',[None,None]),
('793731599509356564','Phillish',ktb,'0:58.90',['29.61','29.29']),
('793732081939251221','Nu11',ktb,'0:58.31',['29.38','28.93']),
('793746600773681182','Nu11',ktb,'0:58.10',['29.14','28.96']),
('793816479924748308','Nu11',ktb,'0:57.88',['29.11','28.77']),
('794233043408650240','Nu11',ktb,'0:57.82',['28.86','28.96']),
('794250111105630268','Nu11',ktb,'0:57.59',['28.83','28.76']),
('793748451913236490','Nu11',afr,'1:37.98',['48.86','49.12']),
('793786340315627520','Access',afr,'1:37.72',[None,None]),
('793795063620698172','Access',afr,'1:37.69',['48.80','48.89']),
('793818517853700106','Access',afr,'1:37.61',['48.79','48.82']),
('793819974728024085','Access',afr,'1:37.57',['48.87','48.70']),
('793821521708974141','Access',afr,'1:37.46',['48.77','48.69']),
('793932211107790938','Access',afr,'1:37.38',['48.64','48.74']),
('794179654478331934','Nu11',afr,'1:37.21',[None,None]),
('794238377762357268','Wins',afr,'1:37.11',['48.79','48.32']),
('794432590219706438','Nu11',afr,'1:37.08',['48.67','48.41']),
('794564753292525598','Nu11',afr,'1:36.96',['48.57','48.39']),
('796013253137661972','Nu11',afr,'1:36.87',['48.57','48.30']),
('796017340911321139','Nu11',afr,'1:36.86',['48.54','48.32']),
('796026697987522580','Nu11',afr,'1:36.74',['48.43','48.31']),
('796698844884369438','Nu11',afr,'1:36.71',['48.44','48.27']),
('796911637675900928','Nu11',afr,'1:36.66',['48.44','48.22']),
('797064107323949066','Nu11',afr,'1:36.61',['48.37','48.24']),
('798570848389955604','Nu11',afr,'1:36.58',['47.96','48.62']),
('798578226745442334','Nu11',afr,'1:36.57',['48.32','48.25']),
('798579233131593748','Nu11',afr,'1:36.55',['48.29','48.26']),
('798582797392019537','Nu11',afr,'1:36.44',['48.26','48.18']),
]
def proof(x):
 src=x.get('path') or read('archive/early-image-downloads.json')[x['id']]['path']
 dst=root/f"public/assets/proof/newyear-2021-{x['id']}.webp"
 if not dst.exists():Image.open(root/src).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
new=[]
for aid,player,course,time,laps in rows:
 x=review[aid];assert x['reviewStatus']=='visually-reviewed' and x['time']==time,(aid,x.get('time'),time);proof(x)
 if all(l is not None for l in laps):
  m,s=time.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100)
 r={'messageId':x['messageId']+'-'+course,'player':player,'courseId':course,'time':time,'laps':laps,'mushrooms':None,'status':'community-wr','submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Original result image visually read and compared in chronological order with contemporary submissions. Exact UTC publication date; race completion instant is not claimed.']}
 if all(l is not None for l in laps):r['notes'].append('Splits from original submission or adjacent follow-up; sum checked against total.')
 if player=='Nu11':r['notes'].append('Original account now displays Enaga; contemporary replies identify Kaguya, archived as Nu11.')
 if player=='Access':
  r['notes'].append('Deleted account identified as Access by Kazuo’s December 30 direct address, the immediate original upload under the Access YouTube channel, and contemporary leaderboards. Other deleted accounts are not merged into this identity.')
  r['additionalSources']=[{'url':'https://www.youtube.com/watch?v=YWPEpKk9d9Y','kind':'runner-identity-context-only'}]
 if time=='1:37.38':r['notes'].append('48.64 / 48.74 recovered from contemporary leaderboard; December 31 screenshot is a repost of this December 30 finish.')
 if time=='1:37.21':r['notes'].append('Runner wrote 48.71 / 48.50 with “maybe”; uncertain splits are retained in source notes rather than asserted as exact.')
 if time=='1:36.66':r['notes'].append('Attachment was missing from the earlier search capture; recovered directly from original message context, with both lap times.')
 videoIds={'0:58.31':'blSFJnIPKf8','1:37.21':'M0OuZZBpOwc','1:36.96':'DG_4n7xUc7o','1:36.74':'tEQZORfSSlk','0:57.59':'sG4q2Ok0Sf4'}
 if time in videoIds:r['video']='https://www.youtube.com/watch?v='+videoIds[time]
 if time=='1:36.44':r['video']='https://www.youtube.com/watch?v=wr1HIt9xzjU'
 new.append(r);review[aid]['classification']='confirmed-world-record'
held=[]
for aid in ['793721323825528872','793721961393684500']:
 x=review[aid];proof(x);reason='Opening Koopa Troopa Beach 2 result submitted by a deleted account; identity not established. Preserved as evidence, excluded from confirmed progression.'
 held.append({'messageId':'newyear-held-'+aid,'player':'Unidentified player','courseId':ktb,'time':x['time'],'laps':[None,None],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':x['postedAt'],'identityUnresolved':True,'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':[reason]});review[aid]['classification']='identity-unresolved'
# Surviving footage of a slower PB can supply the course video fallback without
# falsely adding that PB to the world-record progression.
x=review['796045516676530226'];proof(x)
held.append({'messageId':'newyear-video-wins-13691','player':'Wins','courseId':afr,'time':'1:36.91','laps':['48.64','48.27'],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'video':'https://youtu.be/6dLatix8LUs','videoVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'additionalSources':[{'url':'https://discord.com/channels/629221606064914442/636461740162416640/796047973058215937','kind':'original-video-post'}],'notes':['Original Martijn G video visually verified at finish: 1:36.91. Video title supplies 48.64 / 48.27.','Posted after Nu11 1:36.74; this is a personal best, excluded from WR history. It remains eligible as fastest surviving video.','Original is playable; backup download has not succeeded.']})
ids={x['messageId'] for x in new+held};curated=[x for x in curated if x.get('messageId') not in ids]+new+held
q=[x for x in read('archive/early-image-index.json')['images'] if '2020-12-30T06'<=x['postedAt']<'2021-01-13T06']
audit={'tour':"New Year's Tour 2021",'status':'All 322 indexed images visually reviewed; this does not establish exhaustive capture of the Discord history.','coverage':{'indexedImageAttachments':len(q),'indexedImagesVisuallyReviewed':sum(review.get(x['id'],{}).get('reviewStatus')=='visually-reviewed' for x in q),'additionalContextImagesReviewed':3},'confirmedChanges':[{'courseId':x['courseId'],'player':x['player'],'time':x['time'],'submittedAt':x['submittedAt'],'laps':x['laps'],'source':x['source']} for x in new],'heldForReconciliation':[x for x in held if x.get('identityUnresolved')],'verifiedVideoFallbacks':[x for x in held if x.get('videoVerified')],'captureGapReview':[{'messageId':'793743746399207444','finding':'Recovered course-intro screenshot, no result.'},{'messageId':'796784527414394910','finding':'Recovered Access 0:58.20, slower than standing WR.'},{'messageId':'796911638383951882','finding':'Recovered Nu11 1:36.66 WR and both laps.'},{'messageId':'797109963402510336','finding':'Original message links Toy Story reaction GIF, not a submission.'}],'limitations':['Previous-best fields reveal additional potential intermediate runs whose original submissions remain missing: Nu11 KTB2 0:58.69, 0:58.22, 0:58.03, 0:57.79; AFR 1:37.07 and 1:36.85. These are not assigned invented timestamps.','Opening KTB2 deleted-account results remain unattributed.','Nu11 1:37.21 lap annotation includes “maybe”; splits are left blank.','Both original final-tour YouTube links show “This video isn’t available anymore”. Keep original references; do not claim a backup exists.','Further uncaptured messages and original sources may alter this progression.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/newyear-2021-reconciliation.json',audit)
print(json.dumps({'confirmedChanges':len(new),'held':len(held),'coverage':audit['coverage']}))
