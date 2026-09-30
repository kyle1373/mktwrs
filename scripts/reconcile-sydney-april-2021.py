"""Restore Sydney April 2021 chronology from images, adjacent replies, and original footage."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def save(p,d):(root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
def proof(x):
 dst=root/f"public/assets/proof/sydney-april-2021-{x['id']}.webp"
 if not dst.exists():Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
def make(aid,player,time,laps,status='community-wr'):
 x=review[aid];assert x['reviewStatus']=='visually-reviewed';proof(x)
 if all(l is not None for l in laps):
  m,s=time.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100),(aid,time,laps)
 return {'messageId':'sydney-april-2021-'+aid+'-'+time.replace(':','').replace('.',''),'player':player,'courseId':x['courseId'],'time':time,'laps':laps,'mushrooms':None,'status':status,'submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read and compared with earlier records and surrounding messages. Date uses original evidence publication in UTC; an exact race-completion instant is not asserted.']}
rows=[
('834729553854857226','Saki7',['31.81','31.72']),
('835125440008028160','Nu11',['31.40','31.38']),
('835174265228754954','Wins',['31.42','31.22']),
('835498621390684230','Wins',['31.31','31.16']),
('837404066711601172','Wins',['31.17','31.24']),
('835257221251858502','Kazuo',['42.00','41.82']),
('836976017851678790','Kazuo',['41.93','41.84']),
('837019126357557248','Kazuo',['41.97','41.78']),
('837049269277818890','Kazuo',['41.97','41.73']),
('837051087965519903','Kazuo',['41.94','41.74'])]
replies={'835174265228754954':'835175136822820925','835257221251858502':'835257247201361921','836976017851678790':'836976036440047628','837019126357557248':'837019181353795595','837049269277818890':'837049307827273738','837051087965519903':'837051154307219486'}
videos={'837404066711601172':'https://twitter.com/winsmkt/status/1389842649012658176','837051087965519903':'https://twitter.com/kazuo_mk/status/1388610850978779138'}
new=[]
for aid,player,laps in rows:
 r=make(aid,player,review[aid]['time'],laps)
 if aid in replies:
  mid=replies[aid];r['additionalSources']=[{'url':'https://discord.com/channels/629221606064914442/636461740162416640/'+mid,'kind':'adjacent-lap-reply'}];r['notes'].append('Lap splits recovered from the runner’s following message, not from unrelated best-segment or hypothetical-run comments.')
 if aid in videos:r.update(video=videos[aid],videoVerified=True);r['notes'].append('Original Twitter footage downloaded and finish visually verified. Video publication is later than the original dated result; retain the submission date.')
 if aid=='837404066711601172':r['notes'].append('Original tweet supplies 31.17 / 31.24. The video and result show previous best 1:02.47; a nearby .42 reference from another player is not sufficient evidence of a separate 1:02.42 run.')
 if aid=='837051087965519903':r['notes'].append('Corrected from the later May 2 leaderboard date to the original April 28 result submission.')
 new.append(r);review[aid]['classification']='confirmed-world-record'
held=[]
r=make('835065834153705532','Unidentified player','1:03.05',['31.75','31.30'],'documented-submission');r.update(includeInProgression=False,identityUnresolved=True);r['additionalSources']=[{'url':'https://discord.com/channels/629221606064914442/636461740162416640/835065883352891444','kind':'adjacent-lap-reply'}];r['notes'].append('Deleted-account submission; the immediately following .75/.30 resolves to 31.75 / 31.30. Faster than the earlier 1:03.53 but original runner identity remains unresolved.');held.append(r)
for aid,player,time in [('834729553854857226','Saki7','1:03.54'),('835125440008028160','Nu11','1:03.11')]:
 r=make(aid,player,time,[None,None],'documented-submission');r.update(includeInProgression=False,dateUnresolved=True,observedAt=r['submittedAt'],submittedAt=None);r['notes']=['Previous-best field visually read. Original date and ordering relative to competing records are unresolved; not assigned the later image timestamp.'];held.append(r)
# Opening NBC R tour-leading claims are slower than the already-established 2020 1:23.88.
for aid,player in [('834310129826529280','Whiplash')]:
 r=make(aid,player,review[aid]['time'],[None,None],'documented-submission');r.update(includeInProgression=False);r['notes'].append('Opening-tour WR wording does not supersede the prior 2020 1:23.88 all-time record.');held.append(r)
fallback={'messageId':'sydney-april-2021-tome-video-1387722271297474563','player':'Tomegome','courseId':'rmx-choco-island-2','time':'1:02.83','laps':['31.39','31.44'],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':'2021-04-29T10:55:17.000Z','video':'https://twitter.com/tomegome_g/status/1387722271297474563','videoVerified':True,'source':{'url':'https://discord.com/channels/629221606064914442/636461740162416640/837282807214112778','channel':'tt-discussion','messageId':'837282807214112778'},'notes':['Original video finish is 1:02.83 with previous best 1:02.86. Lap-one overlay reads 31.39; lap two is 31.44 by subtraction. Do not attach this footage to the nearby 1:02.86 image.','Slower than Wins’s already submitted 1:02.47. Preserved as footage, not promoted into the WR progression.']}
# Original publication timestamp from the linked Twitter snowflake.
from datetime import datetime,timezone
fallback['submittedAt']=datetime.fromtimestamp(((1387722271297474563>>22)+1288834974657)/1000,timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
allrows=new+held+[fallback];ids={r['messageId'] for r in allrows};curated=[r for r in curated if r.get('messageId') not in ids]+allrows
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-04-21T06'<=x['postedAt']<'2021-05-05T06']
audit={'tour':'Sydney Tour April–May 2021','status':'Indexed images reviewed; original message census remains incomplete.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':sum(review.get(x['id'],{}).get('reviewStatus')=='visually-reviewed' for x in q),'wrSearchMatches':25,'linkSearchMatches':23},'confirmedChanges':new,'heldForReconciliation':held,'verifiedVideoFallbacks':[fallback],'limitations':['Full server message coverage is not established by the image index or keyword searches.','Deleted-account 1:03.05 identity is unresolved; the dated evidence and adjacent splits are retained.','Previous-best fields expose earlier 1:03.54 and 1:03.11 whose exact original dates remain unresolved.','Akisame CI2 video VZu5-ZPHOrM is unavailable in the signed-in browser.','Opening NBC R tour-leading WR claims are slower than the already established 2020 1:23.88.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/sydney-april-2021-reconciliation.json',audit)
print(json.dumps({'confirmed':len(new),'held':len(held),'coverage':audit['coverage']}))
