"""Merge visually reviewed Yoshi Tour evidence without inventing achievement dates."""
import json,hashlib
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
def save(p,x):(R/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
base='https://discord.com/channels/629221606064914442/636461740162416640/'
imgs={x['attachmentId']:x for x in read('archive/yoshi-2020-server-image-map.json')}
assets=read('archive/assets-manifest.json')
def proof(aid):
 p=R/f'public/assets/proof/yoshi-2020-{aid}.webp';im=Image.open(R/imgs[aid]['path']).convert('RGB');im.thumbnail((1080,2160));im.save(p,'WEBP',lossless=True)
 original=imgs[aid]['url'];assets[original]={'path':'/'+str(p.relative_to(R/'public'))};return original
def source(mid,channel='636461740162416640'):
 return {'url':f'https://discord.com/channels/629221606064914442/{channel}/{mid}','messageId':mid,'channel':'tt-discussion' if channel=='636461740162416640' else 'server-image-search'}
runs=[]
def add(key,player,course,total,mid,date=None,aid=None,laps=None,notes=None,wr=True,achieved=None):
 r={'messageId':'yoshi-2020-'+key,'player':player,'courseId':course,'time':total,'laps':laps or [None,None],'mushrooms':None,'status':'community-wr' if wr else 'documented-submission','source':source(mid),'notes':notes or []}
 if date:r['submittedAt']=date
 if achieved:r['achievedAt']=achieved;r['datePrecision']='day'
 if aid:r['proofImage']=proof(aid);r['proofImageVerified']=True
 if not wr:r['includeInProgression']=False
 runs.append(r);return r
kd='n64-kalimari-desert';dh='3ds-daisy-hills-r'
r=add('astre-kalimari-7552','Astre',kd,'1:15.52','697574762817388684','2020-04-08T22:33:03.768Z','697574762389700668',['37.77','37.75'],['Original finish screenshot visually read. Nearby discussion states Astre beat Kaguya, whose 1:15.63 was reported earlier that day; Retort Curry’s faster time was reported later.','Lap splits are quoted by Astre’s original Twitter embed; no playable video was recovered for this image tweet.'])
r['additionalSources']=[source('697573354755981332'),source('700710004776370287'),{'url':'https://twitter.com/Astre_HD/status/1248015535217840129','kind':'original-player-lap-report'}]
add('kaguya-daisy-8179','Nu11',dh,'1:21.79','698499578332184597','2020-04-11T11:47:56.969Z','698499577736724548',notes=['Original player finish screenshot visually read. Contemporary discussion identifies this as the standing WR before Tomegome’s improvements.','No exact splits verified for this run. The later 1:21.34 demonstration is a different run.'])
for n,total in enumerate(['1:21.69','1:21.54','1:21.48']):
 r=add('tomegome-daisy-'+total.replace(':','').replace('.',''),'Tomegome',dh,total,'699239613151182928',aid='699239612572237844',achieved='2020-04-13',notes=['Original tweet screenshot visually read, including April 13, 2020 date and the three successive finish images. Previous-best values establish 1:21.69 → 1:21.54 → 1:21.48.','Exact day is supported by the tweet and first screenshot. Intra-day achievement timestamps and lap splits are not known.'])
 r['observedAt']='2020-04-13T12:48:35.019Z';r['additionalSources']=[source('699236741000724520'),{'url':'https://twitter.com/tomegome_g/status/1249652486790471685','kind':'original-three-result-images'},source('700453277636231219','630498270992400394')]
r=add('kaguya-kalimari-7529','Nu11',kd,'1:15.29','698499578332184597','2020-04-11T11:47:56.969Z','698499578210811914',['37.66','37.63'],['Original player finish screenshot visually read. The player confirms both laps on April 16.','Original X video is referenced in discussion, but the downloader did not recover it; this image is the verified proof.'])
r['additionalSources']=[source('700491017056419972'),source('700367876150001684')]
curated=read('archive/curated-runs.json');ids={r['messageId'] for r in runs};curated=[r for r in curated if r.get('messageId') not in ids]+runs
for mid,aid in [('699574207603802163-verified','699574207100485662'),('699737973456896060-verified','699737973054242887'),('699854788443111475-verified','699854788006772806')]:
 r=next(r for r in curated if r.get('messageId')==mid);r['proofImage']=proof(aid);r['proofImageVerified']=True
 if mid.startswith('699737'):
  r['videoVerified']=True
  note='Original Kazuo recording downloaded and visually reviewed: 40.60 at lap transition and 1:21.28 at finish; lap 2 is 40.68. Backup upload remains pending.'
  if note not in r['notes']:r['notes'].append(note)
save('archive/curated-runs.json',curated)
# Preserve genuine unresolved predecessor evidence separately until original dates/order are established.
unresolved=[]
for player,course,total,mid,date,aid,laps,reason in [
 ('Nu11',kd,'1:15.83','697374422826221639','2020-04-08T09:16:58.992Z',None,None,'Contemporary Astre report; original proof and achievement time not recovered.'),
 ('Nu11',kd,'1:15.63','697381430447308847','2020-04-08T09:44:49.739Z',None,None,'Contemporary report and nearby attribution; predates Astre 1:15.52.'),
 ('Retort Curry',kd,'1:15.48','697593158078300273','2020-04-08T23:46:09.540Z',None,None,'Contemporary WR report; original submission date unknown.'),
 ('Retort Curry',kd,'1:15.47','700452717424017480','2020-04-16T21:09:01.616Z','700452717000261762',['37.82','37.65'],'Screenshot shows previous best 1:15.48 and relative tweet age 6 days. Do not turn that relative age into an exact date; by the repost Kaguya was faster.'),
 ('Nu11',kd,'1:15.36','698499578332184597','2020-04-11T11:47:56.969Z','698499578210811914',None,'Previous-best value in 1:15.29 screenshot; exact achievement date/order unknown.'),
 ('Nu11',dh,'1:21.18','699854788443111475','2020-04-15T05:33:04.238Z','699854788006772806',None,'Previous-best value in 1:20.94 screenshot; missing intermediate WR, exact achievement date unknown.')]:
 row={'player':player,'courseId':course,'time':total,'observedAt':date,'source':source(mid,'630498270992400394' if aid=='700452717000261762' else '636461740162416640'),'laps':laps,'reason':reason,'publishedAsDatedRecord':False}
 if aid:row['proofImage']=proof(aid)
 unresolved.append(row)
save('archive/yoshi-2020-unresolved-records.json',unresolved)
curated=read('archive/curated-runs.json')
for row in unresolved:
 if row['time']=='1:15.47':continue
 r={'messageId':'yoshi-2020-undated-'+row['courseId']+'-'+row['time'].replace(':','').replace('.',''),'player':'Retort Curry' if row['player']=='Retort Curry' else 'Nu11','courseId':row['courseId'],'time':row['time'],'laps':[None,None],'mushrooms':None,'status':'community-wr','submittedAt':None,'observedAt':row['observedAt'],'source':row['source'],'dateUnresolved':True,'delayedSubmission':True,'tourDateRange':{'start':'2020-04-08','end':'2020-04-21'},'notes':[row['reason'],'Preserved as an undated intermediate WR. The surrounding record chain establishes an improvement; no achievement date or reign duration is asserted.']}
 if row.get('proofImage'):r['proofImage']=row['proofImage'];r['proofImageVerified']=True;r['proofField']='previous-best'
 curated=[x for x in curated if x.get('messageId')!=r['messageId']]+[r]
save('archive/curated-runs.json',curated)

progress=read('archive/yoshi-2020-review-progress.json');progress.update({'imageReviewComplete':True,'historyComplete':False,'serverImageSearchMessagesCaptured':750,'serverImageMessagesFullyRead':750,'serverAttachmentsDownloaded':810,'serverAttachmentsVisuallyReviewed':810,'externalImagesDownloaded':15,'externalImagesVisuallyReviewed':15,'newConfirmedHistoryRows':10,'existingRowsEnriched':4,'nextSteps':['Recover original dates/proof for unresolved Kaguya and Retort Curry intermediate records.','Capture social/video-only server searches for the period and review remaining original videos.','Continue Trick Tour and all remaining pre-2021 tours.']});save('archive/yoshi-2020-review-progress.json',progress)
vid=R/'archive/yoshi-2020-original-media/Z5zwcLad-Fo.webm';save('archive/yoshi-2020-video-review.json',{'historyComplete':False,'videos':[{'url':'https://www.youtube.com/watch?v=Z5zwcLad-Fo','player':'Kazuo','courseId':dh,'time':'1:21.28','laps':['40.60','40.68'],'status':'preserved-and-visually-reviewed','sha256':hashlib.sha256(vid.read_bytes()).hexdigest(),'bytes':vid.stat().st_size,'backupUpload':'pending'},{'url':'https://twitter.com/tomegome_g/status/1249844149752172546','status':'preserved-partial-run','notes':['Recording ends during lap 2 at 1:07.43. It cannot prove a final total.']}]})
save('archive/assets-manifest.json',assets)
print('Merged five dated and five undated confirmed WR rows, enriched four existing records, preserved six unresolved predecessors without invented dates.')
