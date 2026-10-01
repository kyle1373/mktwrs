"""Reconcile Trick Tour result screenshots with the surrounding discussion."""
import json
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
def save(p,v):(R/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
messages={x['id'].removeprefix('search-result-'):x for x in read('archive/trick-2020-discussion-census.json')}
images={x['messageId']:x for x in read('archive/trick-2020-server-image-map.json')}
assets=read('archive/assets-manifest.json');curated=read('archive/curated-runs.json')
def source(mid):return {'url':f'https://discord.com/channels/629221606064914442/636461740162416640/{mid}','channel':'tt-discussion','messageId':mid}
def add(mid,player,total,laps,other=(),note='',image=True):
 r={'messageId':'trick-2020-'+mid,'player':player,'courseId':'3ds-neo-bowser-city-r','time':total,'laps':laps,'mushrooms':None,'status':'community-wr','submittedAt':messages[mid]['times'][0],'source':source(mid),'additionalSources':[source(m) for m in other],'notes':[note]}
 if image:
  x=images[mid];p=R/f'public/assets/proof/trick-2020-{x["attachmentId"]}.webp';im=Image.open(R/x['path']).convert('RGB');im.thumbnail((1080,2160));im.save(p,'WEBP',lossless=True);assets[x['url']]={'path':'/'+str(p.relative_to(R/'public'))};r.update(proofImage=x['url'],proofImageVerified=True)
 curated[:]=[x for x in curated if x.get('messageId')!=r['messageId']]+[r]
 return r
add('702773582522220654','BrandonSG','1:26.49',['43.34','43.15'],['702773779952173137','702773827075047461'],'Finish screenshot and both laps visually/contextually verified. Nearby players explicitly recognize the WR; subsequent discussion shows Kazuo beating this time.')
add('702843918844428289','Kazuo','1:26.03',['42.80','43.23'],['702843930156335184','702843955200655435'],'Original player reports total and lap 1 together, immediately after Brandon says his 1:26.49 still leads. Lap 2 is total minus lap 1. No result image recovered for this attempt.',False)
add('702845684172324944','Kazuo','1:25.92',[None,None],['702845740938166372','702869314482470972'],'Original player total report follows 1:26.03; subsequent 1:25.63 screenshot independently shows 1:25.92 as previous best. Exact splits not verified.',False)
add('702869314482470972','Kazuo','1:25.63',['42.84','42.79'],['702869277656744016'],'Finish screenshot visually verified. Author supplies lap 1 in the immediately preceding message; lap 2 is total minus lap 1.')
add('702928168742289488','Kazuo','1:25.08',['42.62','42.46'],['702928198580568084'],'Finish screenshot visually verified. Author supplies lap 1 in the immediately following message; lap 2 is total minus lap 1. Astre’s later 1:25.15 was slower and did not hold WR.')
add('703255583771590657','Astre','1:24.90',['42.65','42.25'],['703255572492976169','703255621092376596'],'Finish screenshot visually verified. Both laps supplied immediately before it; nearby discussion explicitly calls this the new WR.')
k=add('703314566536495136','Nu11','1:24.89',['42.43','42.46'],['703314848494125147','703322985506799626','704449192055144538','704449194500423741','704449781996453939'],'Contemporary report explicitly says Kaguya beat Astre by 0.01, followed by the exact .89 total. Later discussion gives both laps and corrects a 1:25.89 typo to 1:24.89. Original result screenshot not recovered. Date is the contemporary WR report date.',False)
k['dateEvidence']='contemporary-community-report'
add('703932279080353862','Kazuo','1:24.75',['42.38','42.37'],['703932410114474015','703932444474081280','704449441595392070'],'Finish screenshot visually verified, with both laps quoted immediately afterward and contemporary WR recognition. A next-day recap reverses the laps; the original run report supplies their ordering.')
add('704359760975102024','Astre','1:24.74',['42.37','42.37'],[],'Finish screenshot visually verified. Both laps are in the same message; this beats Kazuo’s preceding 1:24.75 before Astre’s 1:24.45 later that day.')
# Retrospective date is explicit, never replace it with the April 30 report date.
tome={'messageId':'trick-2020-tomegome-3472','player':'Tomegome','courseId':'snes-vanilla-lake-1','time':'0:34.72','laps':['17.51','17.21'],'mushrooms':None,'status':'community-wr','submittedAt':None,'achievedAt':'2020-04-25','datePrecision':'day','observedAt':messages['705365794720317470']['times'][0],'delayedSubmission':True,'dateEvidence':'retrospective-community-report','source':source('705365794720317470'),'additionalSources':[source('705365823941902346'),source('705365836227149854'),source('705367401012920362')],'notes':['Kazuo explicitly reports Tomegome 34.72 with 17.51/17.21 laps and says he set the time 04/25. This predates Kazuo 34.79 and 34.75. Original Tomegome proof not recovered; date comes from the retrospective discussion report, not the April 30 message timestamp.','Achievement time within April 25 is unknown.']}
curated=[r for r in curated if r.get('messageId')!=tome['messageId']]+[tome]
for r in curated:
 if r.get('messageId') in ['704103116332859432-verified','704306358438068365-verified']:
  r['status']='documented-submission';r['includeInProgression']=False
  r['notes']=['Finish-screen total visually verified. Subsequent review recovered an explicit report of Tomegome 34.72 achieved April 25; this slower run therefore did not hold the overall WR. Preserved as submission and video evidence.']
  r['additionalSources']=r.get('additionalSources',[])+[source('705365794720317470'),source('705367401012920362')]
  if r['time']=='0:34.79':r['laps']=['16.82','17.97'];r['additionalSources'].append(source('704103199312838697'))
  if r['time']=='0:34.75':r['videoVerified']=True
for r in curated:
 if r.get('video') in ['https://www.youtube.com/watch?v=XqLtwgDWLQE','https://www.youtube.com/watch?v=qOrSCFJmumY','https://www.youtube.com/watch?v=KZpAAQrVVYE']:r['videoVerified']=True
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets)
print('Restored nine Neo Bowser City R WR steps and Tomegome 34.72; retained two slower Kazuo attempts as submissions.')
