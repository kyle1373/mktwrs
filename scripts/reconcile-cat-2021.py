"""Reconcile visually read Cat Tour evidence without inventing missing dates."""
import json, hashlib
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p): return json.loads((root/p).read_text())
def save(p,d): (root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json'); curated=read('archive/curated-runs.json'); assets=read('archive/assets-manifest.json')
course={'mt':'wii-maple-treeway-r','rr':'rmx-rainbow-road-1'}
rows=json.loads('''[
["803875363327180840","Romain","mt","1:53.15",[null,null]],
["803875591840727040","Troy","mt","1:53.07",[null,null]],
["803882563839459369","Romain","mt","1:51.95",["55.69","56.26"]],
["803887665577459742","Nu11","mt","1:51.41",["55.96","55.45"]],
["82948f8b4f3d4651a03b1f8a","Astre","mt","1:50.92",["55.57","55.35"]],
["803974653809786931","saki7","mt","1:50.74",["55.55","55.19"]],
["7615f086d07108c5e62c1447","Astre","mt","1:50.59",["55.35","55.24"]],
["804321541802033172","Nu11","mt","1:50.57",["55.33","55.24"]],
["804343922423496714","Nu11","mt","1:50.43",["55.03","55.40"]],
["804359015060602890","Astre","mt","1:50.35",["55.20","55.15"]],
["804502288198008912","Nu11","mt","1:50.09",["55.03","55.06"]],
["807514106985840670","DIT","mt","1:49.98",["55.30","54.68"]],
["803896657623515216","DIT","rr","1:20.20",["40.22","39.98"]],
["803964111464431646","DIT","rr","1:20.13",["40.02","40.11"]],
["803969194655350805","Nu11","rr","1:19.84",["40.03","39.81"]],
["804836681953705994","SuperFX","rr","1:19.83",[null,null]],
["805000092464578590","Wakinyo","rr","1:19.36",["39.81","39.55"]],
["805032619472977940","SuperFX","rr","1:19.34",[null,null]],
["805280754732105758","SuperFX","rr","1:19.21",["39.65","39.56"]],
["805332997699797022","Wakinyo","rr","1:19.14",["39.61","39.53"]],
["805377165318291456","Wakinyo","rr","1:19.09",["39.61","39.48"]],
["805397056697008148","Wakinyo","rr","1:19.02",["39.61","39.41"]],
["805437778942754856","Wakinyo","rr","1:19.01",["39.64","39.37"]],
["805740987917139978","Nu11","rr","1:19.01",["39.57","39.44"]],
["805754844643459082","Wakinyo","rr","1:18.97",["39.59","39.38"]],
["805780755305332786","Nu11","rr","1:18.96",["39.62","39.34"]],
["807818485404663858","Nu11","rr","1:18.95",["39.52","39.43"]]
]''')
def proof(x):
    dst=root/f"public/assets/proof/cat-2021-{x['id']}.webp"
    if not dst.exists(): Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
    assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
def make(aid,player,c,time,laps,status='community-wr'):
    x=review[aid]; assert x['reviewStatus']=='visually-reviewed';proof(x)
    if status=='community-wr':assert x['time']==time
    if all(l is not None for l in laps):
        m,s=time.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100)
    return {'messageId':'cat-2021-'+aid+'-'+time.replace(':','').replace('.',''),'player':player,'courseId':course[c],'time':time,'laps':laps,'mushrooms':None,'status':status,'submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Original result image visually read and compared with contemporary submissions. UTC date is the preserved publication date; race completion instant is not claimed.']}
new=[]
for aid,player,c,time,laps in rows:
    r=make(aid,player,c,time,laps)
    if all(l is not None for l in laps):r['notes'].append('Laps transcribed from the original post or adjacent messages; their sum was checked against the result image.')
    if player=='Nu11':r['notes'].append('Original account now displays Enaga; contemporary Kaguya identity archived as Nu11.')
    if aid in ['82948f8b4f3d4651a03b1f8a','7615f086d07108c5e62c1447']:
        tid={'82948f8b4f3d4651a03b1f8a':'1354363263698546689','7615f086d07108c5e62c1447':'1354432005010825219'}[aid]
        r['additionalSources']=[r['source']];r['source']={'url':'https://twitter.com/Astre_HD/status/'+tid,'platform':'Twitter/X'}
        ms=(int(tid)>>22)+1288834974657
        r['submittedAt']=datetime.fromtimestamp(ms/1000,timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
        r['notes'].append('Astre is the runner; Discord contains a later repost. Original tweet publication timestamp decoded from its ID and checked against the visible embedded date; this predates the Discord repost.')
    if aid=='803882563839459369':r['notes'].append('Ties a 1:51.95 posted earlier by an unidentified deleted account. That original image is retained separately pending runner identification.')
    if aid=='804836681953705994':r['notes'].append('Image contains an original SuperFX conversation and result reposted the same day. The preserved repost provides January 29; precise race time is unknown.')
    if aid=='805280754732105758':r['notes'].append('SuperFX supplies .65 / .56 in the adjacent discussion, giving 39.65 / 39.56.')
    if aid=='804502288198008912':r['video']='https://twitter.com/_kaguya_games/status/1354944212110741511'
    if aid=='807818485404663858':r['video']='https://twitter.com/_kaguya_games/status/1358262309232144388'
    new.append(r);review[aid]['classification']='confirmed-world-record'
new.append({'messageId':'cat-2021-superfx-12032','player':'SuperFX','courseId':course['rr'],'time':'1:20.32','laps':[None,None],'mushrooms':None,'status':'community-wr','submittedAt':'2021-01-27T06:39:19.851Z','source':{'url':'https://discord.com/channels/629221606064914442/636461740162416640/803876780800475166','channel':'tt-discussion','messageId':'803876780800475166'},'notes':['Original text-only submission: "1:20.32 rr idk what are strats". Replies discuss the glider respawn mushroom location, corroborating the Cat Tour RMX Rainbow Road course.','Predates the later Timael 1:22.29, saki7 1:20.74 and Nu11 1:20.38 images. No image, video or split is invented.']})
held=[]
r=make('803875635989839932','Unidentified player','mt','1:51.95',[None,None],'documented-submission');r.update(includeInProgression=False,identityUnresolved=True);r['notes']=['Original opening 1:51.95 cup-menu image from a deleted account. Runner identity remains unresolved; preserved separately rather than assigned to another deleted account.'];held.append(r)
for aid,player,c,time in [
 ('82948f8b4f3d4651a03b1f8a','Astre','mt','1:51.27'),
 ('804321541802033172','Nu11','mt','1:50.77'),
 ('804502288198008912','Nu11','mt','1:50.18'),
 ('803969194655350805','Nu11','rr','1:20.05'),
 ('805000092464578590','Wakinyo','rr','1:19.48'),
 ('805332997699797022','Wakinyo','rr','1:19.34'),
 ('805740987917139978','Nu11','rr','1:19.02'),
 ('805780755305332786','Nu11','rr','1:19.00')]:
    r=make(aid,player,c,time,[None,None],'documented-submission');r.update(includeInProgression=False,dateUnresolved=True,observedAt=r['submittedAt'],submittedAt=None)
    r['notes']=['Previous best visually read in a later result. Original completion/publication date and its place in the WR exchange are unresolved. Retained as evidence without inventing a date or WR status.'];held.append(r)
ids={r['messageId'] for r in new+held};curated=[r for r in curated if r.get('messageId') not in ids]+new+held
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-01-27T06'<=x['postedAt']<'2021-02-10T06']
unread=[x['id'] for x in q if review.get(x['id'],{}).get('reviewStatus')!='visually-reviewed']
audit={'tour':'Cat Tour 2021','status':'Currently indexed images visually reviewed and dated exchanges reconciled; exhaustive message coverage is not established.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':len(q)-len(unread),'unreviewed':unread,'linkSearchResultsReviewed':24,'wrTextSearchResultsReviewed':33},'confirmedChanges':new,'heldForReconciliation':held,'excluded':['Phillish 1:51.39 follows the original Astre 1:50.92 tweet despite preceding its Discord repost.','saki7 1:50.68 follows the original Astre 1:50.59 tweet despite preceding its Discord repost.','Timael 1:22.29, saki7 1:20.74 and Nu11 1:20.38 follow the text-only SuperFX 1:20.32.','Wins coffee-break image reads 1:51.01, not 1:50.01; full-resolution image verified.','SuperFX 1:19.43 follows Wakinyo 1:19.36 and is not a WR.'],'limitations':['Deleted-account opening 1:51.95 identity unresolved.','Previous-best values may reveal more intermediate records or ties; original dates must still be recovered.','Search for numeric time strings does not reliably return known messages; empty numeric searches do not establish absence.','Original Nu11 Twitter video links are retained, but backup download attempts failed; no backup or playback verification is claimed.','Discord discussions and uncaptured sources may still change this chronology.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/cat-2021-reconciliation.json',audit)
print(json.dumps({'confirmedChanges':len(new),'held':len(held),'coverage':audit['coverage']}))
