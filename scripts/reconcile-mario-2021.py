"""Reconcile Mario Tour 2021 from visually read images and surrounding messages."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def save(p,d):(root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
rows=[
('819097057197293598','Timaël',[None,None]),
('819098898814730280','N',[None,None]),
('819106338855714846','marumo',[None,None]),
('819106548713259029','Troy',[None,None]),
('819107160922390558','Troy',['42.52','42.12']),
('819112687832137748','Nu11',['41.71','41.91']),
('819115519214223370','N',[None,None]),
('819135668973338644','N',[None,None]),
('819223749731155988','Wins',[None,None]),
('819230717393240125','Wins',['41.56','41.73']),
('819244423002062868','Wins',['41.61','41.62']),
('819326492144173076','Wins',['41.67','41.54']),
('819328359921614868','Wins',['41.59','41.60']),
('819516298232070144','Wins',['41.57','41.52']),
('819546708995735572','Wins',['41.56','41.40']),
('819946193152507905','Nu11',['41.49','41.40']),
('820003372005457930','Wins',['41.49','41.35']),
('822093019025113128','Nu11',['41.40','41.35']),
('819107872793165874','Nu11',['29.63','30.25']),
('819217311068061706','Nu11',['29.62','30.20']),
('819435532182487080','runa',['30.10','29.72']),
('819492695641817108','DIT',['30.09','29.63']),
('819526328230739968','Nu11',['29.60','30.08']),
('819856974107770890','Nu11',['29.57','30.06']),
('821396897771290644','Nu11',['30.02','29.57']),
('823499634966003712','DIT',['29.99','29.56']),
('819859532955648019','NHSpeedy',[None,None]),
('820205795768795146','heria',[None,None]),
('820206256614277140','Troy',[None,None]),
('820226261472509972','Wins',['21.67','25.17']),
('820238297838256128','Nu11',['21.53','25.04']),
('820297626334396436','Nu11',['21.44','24.91']),
('823865901711228959','Nu11',['21.50','24.81']),
]
def proof(x):
 dst=root/f"public/assets/proof/mario-2021-{x['id']}.webp"
 if not dst.exists():Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
def make(aid,player,time,laps,status='community-wr'):
 x=review[aid];assert x['reviewStatus']=='visually-reviewed';proof(x)
 if all(l is not None for l in laps):
  m,s=time.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100),(aid,time,laps)
 return {'messageId':'mario-2021-'+aid+'-'+time.replace(':','').replace('.',''),'player':player,'courseId':x['courseId'],'time':time,'laps':laps,'mushrooms':None,'status':status,'submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Original result visually read and compared with dated submissions. Date uses original Discord publication in UTC; an exact race-completion instant is not asserted.']}
new=[]
for aid,player,laps in rows:
 r=make(aid,player,review[aid]['time'],laps)
 if all(l is not None for l in laps):r['notes'].append('Laps recovered from the submission or surrounding context; omitted whole seconds in shorthand are resolved against the final total.')
 if aid=='820226261472509972':r['notes'].append('The runner supplies 21.67 / 25.17 in the following message two minutes after the result image.')
 if aid=='819223749731155988':r['notes'].append('Message .66 .63 does not add to the screenshot total 1:23.39. Surrounding replies contain no correction. Both splits remain unknown.')
 if aid=='819217311068061706':
  r['video']='https://twitter.com/_kaguya_games/status/1369658121111576584';r['additionalSources']=[{'url':r['video'],'kind':'original-tweet'}]
  r['notes'].append('Discord has 29.62 / 29.20, but the immediately following original tweet explicitly states 29.62 / 30.20, matching 59.82.')
 if aid=='819435532182487080':
  r['video']='https://twitter.com/wboqyjlynabc7wu/status/1369879011250245637';r['notes'].append('Discord account posts its own linked video; the same Twitter account later displays runa. This 59.82 ties the standing record.')
 if aid=='819492695641817108':r['video']='https://twitter.com/dit_mkt/status/1371609207464550405'
 if aid=='823499634966003712':r['video']='https://twitter.com/dit_mkt/status/1374216431131185158'
 if aid in ['819097057197293598','819098898814730280','819106338855714846','819106548713259029']:r['notes'].append('Opening WR claims confirmed in surrounding March 9 Pacific / March 10 UTC messages; marumo explicitly describes holding the WR for one minute.')
 new.append(r);review[aid]['classification']='confirmed-world-record'
held=[]
r=make('820190962533400596','Unidentified player','0:47.48',[None,None],'documented-submission');r.update(includeInProgression=False,identityUnresolved=True);r['notes'].append('Deleted-account result lies between the 47.64 and 47.26 submissions. Identity unresolved; not silently assigned to another player.');held.append(r)
for aid,player,time in [
 ('819106548713259029','Troy','1:25.21'),
 ('819106338855714846','marumo','1:25.58'),
 ('819115519214223370','N','1:23.87'),
 ('819516298232070144','Wins','1:23.18'),
 ('819546708995735572','Wins','1:23.08'),
 ('822093019025113128','Nu11','1:22.83'),
 ('819859532955648019','NHSpeedy','0:48.04'),
 ('820205795768795146','heria','0:47.53'),
 ('820206256614277140','Troy','0:47.06'),
 ('820226261472509972','Wins','0:47.07'),
 ('820238297838256128','Nu11','0:46.69')]:
 r=make(aid,player,time,[None,None],'documented-submission');r.update(includeInProgression=False,dateUnresolved=True,observedAt=r['submittedAt'],submittedAt=None);r['notes']=['Previous-best value visually read in a later result. Original date and WR position unresolved; not assigned the later screenshot date.'];held.append(r)
video='https://twitter.com/winsmkt/status/1372898731717189632'
fallback={'messageId':'mario-2021-wins-original-12279','player':'Wins','courseId':'ds-luigi-s-mansion-r','time':'1:22.79','laps':['41.41','41.38'],'derivedLap':2,'mushrooms':None,'status':'documented-submission','includeInProgression':False,'dateUnresolved':True,'submittedAt':None,'observedAt':'2021-03-19T13:12:19Z','video':video,'videoVerified':True,'source':{'url':video,'platform':'Twitter/X'},'notes':['Downloaded original video visually verified: lap transition 41.41; finish 1:22.79, previous best 1:22.84. Lap 2 calculated as 82.79 minus 41.41.','Later Discord image is a separate tied run with previous best 1:22.79. Original achievement date and ordering against Nu11 1:22.83 and 1:22.75 remain unresolved; preserve footage without promoting an uncertain WR entry.']}
allrows=new+held+[fallback];ids={r['messageId'] for r in allrows};curated=[r for r in curated if r.get('messageId') not in ids]+allrows
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-03-10T06'<=x['postedAt']<'2021-03-24T06']
audit={'tour':'Mario Tour 2021','status':'Indexed images reviewed and dated exchanges reconciled; complete message coverage remains unproven.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':sum(review.get(x['id'],{}).get('reviewStatus')=='visually-reviewed' for x in q),'wrTextSearchResultsReviewed':20,'linkSearchResultsReviewed':25},'confirmedChanges':new,'heldForReconciliation':held,'verifiedVideoFallbacks':[fallback],'limitations':['Previous-best fields reveal potential missing intermediate runs; dates must be recovered from original evidence.','Wins 1:22.79 original video survives, but its race date and relation to Nu11 1:22.83 and 1:22.75 remain unresolved.','One deleted-account Tokyo Blur 4 47.48 remains unattributed.','Wins 1:23.39 has conflicting lap shorthand, so no exact splits are asserted.','Twenty-five of twenty-six link-query matches were captured in this query. Earlier Chris95 video appears in the Snow closing search.','Several original Twitter links failed download; that alone does not establish that the media is lost.','Indexed image coverage and keyword queries do not establish an exhaustive message census.'],'excluded':['Wins segmented Tokyo Blur 4 demonstration combines laps from different runs and is not proof of a complete race.','Michinori screenshots posted by Wins retain Michinori attribution; they are slower than standing records.','Nu11 59.58 follows DIT 59.55 and is not a WR.','Take Them Out Quick results are a different challenge.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/mario-2021-reconciliation.json',audit)
print(json.dumps({'confirmed':len(new),'held':len(held),'coverage':audit['coverage']}))
