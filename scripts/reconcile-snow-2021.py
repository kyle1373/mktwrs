"""Reconcile Snow Tour records from visually reviewed images and nearby replies."""
import json, hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p): return json.loads((root/p).read_text())
def save(p,d): (root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
rows=json.loads('''[
["814020789875245146","Wakinyo",["45.31","45.25"]],
["814062314864771122","DIT",["45.30","45.05"]],
["814109827022061598","DIT",["45.12","45.11"]],
["814482396107505684","DIT",["45.10","45.09"]],
["814492260750065744","DIT",["45.05","45.07"]],
["814498977859764234","Nu11",["45.14","44.97"]],
["815374603307319296","Nu11",["45.02","44.89"]],
["816951701227438080","DIT",["45.03","44.84"]],
["814100931368058960","Timaël",[null,null]],
["814102616782274599","Timaël",[null,null]],
["814112172984369173","Timaël",[null,null]],
["814133372796272700","Timaël",[null,null]],
["814145981003333642","Timaël",[null,null]],
["814149506114781194","Timaël",[null,null]],
["814384127955435551","heria",[null,null]],
["814385223717355550","heria",["38.90","39.46"]],
["814403477953576990","heria",["38.86","39.36"]],
["814407177439281182","heria",["38.89","39.25"]],
["814414917686919209","Nu11",["38.49","38.78"]],
["815980856086495232","Nu11",["37.60","39.53"]]
]''')
def proof(x):
    dst=root/f"public/assets/proof/snow-2021-{x['id']}.webp"
    if not dst.exists():Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
    assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
def make(aid,player,time,laps,status='community-wr'):
    x=review[aid];assert x['reviewStatus']=='visually-reviewed';proof(x)
    if status=='community-wr':assert x['time']==time
    if all(l is not None for l in laps):
        m,s=time.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100)
    return {'messageId':'snow-2021-'+aid+'-'+time.replace(':','').replace('.',''),'player':player,'courseId':x['courseId'],'time':time,'laps':laps,'mushrooms':None,'status':status,'submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Original image visually read and compared with dated submissions. UTC date is the preserved publication date; race completion instant is not asserted.']}
new=[]
for aid,player,laps in rows:
    r=make(aid,player,review[aid]['time'],laps)
    if all(l is not None for l in laps):r['notes'].append('Laps recovered from the submission or surrounding replies and checked against the total.')
    if player=='Nu11':r['notes'].append('Original account now displays Enaga; contemporary Kaguya identity archived as Nu11.')
    if aid=='814100931368058960':
        r['additionalSources']=[r['source']];r['submittedAt']='2021-02-24T11:41:33.837Z';r['source']={'url':'https://discord.com/channels/629221606064914442/636461740162416640/814099700486504508','channel':'tt-discussion','messageId':'814099700486504508'}
        r['notes'].append('Text-only 1:30:30 WR claim precedes the matching result image by five minutes. The earlier original post timestamp is retained.')
    if aid=='814385223717355550':r['notes'].append('Adjacent reply gives 38.9 / 39.46, resolving to 38.90 / 39.46.')
    if aid=='814407177439281182':r['notes'].append('At 08:19 UTC, the runner replies to the original image with 38.89 / 39.25; these splits belong to this 1:18.14 run.')
    if aid=='814492260750065744':r['video']='https://twitter.com/dit_mkt/status/1364935495977869312'
    if aid=='815374603307319296':r['video']='https://www.youtube.com/watch?v=gZ_1Jg-HxVQ'
    if aid=='815980856086495232':r['video']='https://www.youtube.com/watch?v=tyOa2UjADqY'
    new.append(r);review[aid]['classification']='confirmed-world-record'
held=[]
r=make('814019744487178270','Unidentified player','1:31.87',[None,None],'documented-submission');r.update(includeInProgression=False,identityUnresolved=True);r['notes']=['Original opening result from a deleted account; runner identity remains unresolved.'];held.append(r)
for aid,player,time in [
    ('814020789875245146','Wakinyo','1:31.11'),
    ('814100931368058960','Timaël','1:36.26'),
    ('814414917686919209','Nu11','1:17.55'),
    ('815374603307319296','Nu11','1:30.04'),
    ('815980856086495232','Nu11','1:17.17'),
    ('816951701227438080','DIT','1:30.10')]:
    r=make(aid,player,time,[None,None],'documented-submission');r.update(includeInProgression=False,dateUnresolved=True,observedAt=r['submittedAt'],submittedAt=None);r['notes']=['Previous best visually read in a later image; original date and place in the record exchange are unresolved. Retained separately without assigning the later result date.'];held.append(r)
fallbacks=[]
for aid,player,laps,video in [
    ('816519927833296956','spartacurtYT',[None,None],'https://www.youtube.com/watch?v=gqFpVBAZrDM'),
    ('818243631583461448','NHSpeedy',['45.36','44.90'],'https://www.youtube.com/watch?v=qsVIIeFtD38')]:
    r=make(aid,player,review[aid]['time'],laps,'documented-submission')
    r.update(includeInProgression=False,video=video,videoVerified=True)
    r['notes'].append('Downloaded original video result visually verified. This run was slower than the standing record; preserve its footage without adding it to WR progression.')
    fallbacks.append(r)
held+=fallbacks
ids={r['messageId'] for r in new+held};curated=[r for r in curated if r.get('messageId') not in ids]+new+held
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-02-24T06'<=x['postedAt']<'2021-03-10T06']
unread=[x['id'] for x in q if review.get(x['id'],{}).get('reviewStatus')!='visually-reviewed']
audit={'tour':'Snow Tour 2021','status':'Indexed images reviewed and dated exchanges reconciled; exhaustive source coverage remains unproven.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':len(q)-len(unread),'unreviewed':unread,'linkSearchResultsReviewed':20,'wrTextSearchResultsReviewed':29},'confirmedChanges':new,'verifiedVideoFallbacks':fallbacks,'heldForReconciliation':[r for r in held if not r.get('videoVerified')],'limitations':['The one unavailable indexed image is Kaguya’s delayed Peach vs Daisy 1:17.87 tweet, not an unread Snow result. Its image could not be recovered; surrounding text was reconciled separately.','Six previous-best values may hide intermediate records; original dates need recovery.','Opening deleted-account 1:31.87 identity is unresolved.','Both original Kaguya YouTube links are preserved, but their signed-in pages say the videos are no longer available. No backup has been recovered for those videos.','All twenty-nine matches from the dated WR query were read using a narrower date query for the final four matches; these refer to the delayed Peach vs Daisy record. This keyword search is not a complete message census.','Indexed images and search results do not establish complete message coverage.'],'excluded':['The 0.00/0.00 joke refers to a challenge-selection image with no result, not a WR.','Nu11 1:30.44 was posted after DIT 1:30.35 and is not a WR.','Wakinyo 1:30.23 follows DIT 1:30.19; it is not a WR tie.','Reposted Michinori results are attributed to Michinori, not the posting member. They are slower than already documented records.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/snow-2021-reconciliation.json',audit)
print(json.dumps({'confirmedChanges':len(new),'held':len(held),'coverage':audit['coverage']}))
