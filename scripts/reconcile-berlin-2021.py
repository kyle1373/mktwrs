"""Restore Berlin 2021 from visually reviewed images and preserved context.
Private review manifests are inputs; public evidence and explicit uncertainties
are retained in the curated runs and reconciliation report.
"""
import json, hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p): return json.loads((root/p).read_text())
def save(p,d): (root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json')
curated=read('archive/curated-runs.json')
assets=read('archive/assets-manifest.json')
courses={'kd':'n64-kalimari-desert-2','rrm':'3ds-rock-rock-mountain-r'}
rows=json.loads(r'''[["798798304438648842","Troy","kd","1:04.97",[null,null]], ["798799394509684756","Troy","kd","1:04.75",[null,null]], ["798801994575642685","Nu11","kd","1:04.41",[null,null]], ["798812522631004240","Nu11","kd","1:03.92",["29.69","34.23"]], ["798874516478623744","Phillish","kd","1:03.91",[null,null]], ["798886210683666472","Phillish","kd","1:03.86",["29.81","34.05"]], ["2f4eba3d1f35abb9a2156254","Astre","kd","1:03.84",["29.69","34.15"]], ["799026539140349984","Astre","kd","1:03.77",["29.72","34.05"]], ["799034054392545290","Astre","kd","1:03.75",["29.67","34.08"]], ["799254720128483328","Wins","kd","1:03.72",["29.69","34.03"]], ["799676501184086076","Wins","kd","1:03.66",["29.64","34.02"]], ["800451847353663538","Astre","kd","1:03.62",["29.59","34.03"]], ["800499005356376094","Astre","kd","1:03.57",["29.62","33.95"]], ["800857038539980840","Astre","kd","1:03.55",["29.59","33.96"]], ["800863252828651579","Astre","kd","1:03.50",["29.59","33.91"]], ["801538349801144340","Astre","kd","1:03.44",["29.64","33.80"]], ["d5aa7d440e4176ada3201809","Astre","kd","1:03.39",["29.45","33.94"]], ["799040950122708992","Kazuo","rrm","1:43.86",["51.85","52.01"]], ["799546263245946880","Nu11","rrm","1:43.64",["51.89","51.75"]], ["799994918364774481","Kazuo","rrm","1:43.37",["51.67","51.70"]], ["800040117782970388","Kazuo","rrm","1:43.33",["51.72","51.61"]], ["800061517050806332","Kazuo","rrm","1:43.00",["51.70","51.30"]], ["800116576816463942","Kazuo","rrm","1:42.88",["51.50","51.38"]], ["800129802056368158","Kazuo","rrm","1:42.87",["51.52","51.35"]], ["800303069328834560","Kazuo","rrm","1:42.85",["51.43","51.42"]], ["800305029432213524","Kazuo","rrm","1:42.84",["51.50","51.34"]], ["800307946189619200","Kazuo","rrm","1:42.80",["51.63","51.17"]], ["800315150518452245","Kazuo","rrm","1:42.77",["51.45","51.32"]], ["800780902157254737","Kazuo","rrm","1:42.43",["51.48","50.95"]]]
''')
def proof(x):
    src=x.get('path') or read('archive/early-image-downloads.json')[x['id']]['path']
    dst=root/f"public/assets/proof/berlin-2021-{x['id']}.webp"
    if not dst.exists(): Image.open(root/src).convert('RGB').save(dst,'WEBP',lossless=True)
    assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
new=[]
for aid,player,course,time,laps in rows:
    x=review[aid]
    assert x['reviewStatus']=='visually-reviewed' and x['time']==time
    if all(l is not None for l in laps):
        m,s=time.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100)
    proof(x)
    r={'messageId':x['messageId']+'-'+courses[course],'player':player,'courseId':courses[course],'time':time,'laps':laps,'mushrooms':None,'status':'community-wr','submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Original result image visually read and compared with contemporary submissions. UTC date records the preserved publication; race completion instant is not claimed.']}
    if all(l is not None for l in laps):r['notes'].append('Both laps recovered from the original submission or adjacent messages; sum checked against the total.')
    if player=='Nu11':r['notes'].append('Original account now displays Enaga; contemporary Kaguya identity archived as Nu11.')
    if player=='Astre':r['notes'].append('Astre result reposted by a community member; the submitter is not substituted for the runner.')
    if time=='1:03.62':
        r.update(dateUnresolved=True,delayedSubmission=True)
        r['notes'].append('Repost dated January 17; embedded original message says Yesterday. Original timezone/date is unresolved, so no exact achievement date or duration is asserted.')
    if time=='1:03.84':r['additionalSources']=[{'url':'https://twitter.com/Astre_HD/status/1349398358159478794','kind':'original-result'}]
    if time=='1:03.57':r['additionalSources']=[{'url':'https://twitter.com/Astre_HD/status/1350941292990259201','kind':'original-result'}]
    if time=='1:03.39':r['additionalSources']=[{'url':'https://twitter.com/Astre_HD/status/1353610052515602434','kind':'original-result'}]
    if course=='kd' and time=='1:03.92':r['video']='https://www.youtube.com/watch?v=9EbXaIeSJO8'
    if time=='1:03.66':r.update(video='https://www.youtube.com/watch?v=QALze8wNxBk',videoVerified=True)
    if time=='1:42.43':r.update(video='https://twitter.com/KazuoMKT/status/1351224583848927237',videoVerified=True)
    new.append(r);review[aid]['classification']='confirmed-world-record'
# Multiple contemporary witnesses identify this deleted submission and its time.
# Preserve the missing source/date explicitly instead of inventing an attachment.
new.append({'messageId':'berlin-baseballclub-14340','player':'Baseball Club','courseId':courses['rrm'],'time':'1:43.40','laps':['51.85','51.55'],'derivedLap':2,'mushrooms':None,'status':'community-wr','submittedAt':'2021-01-16T13:36:41.927Z','dateUnresolved':True,'delayedSubmission':True,'source':{'url':'https://discord.com/channels/629221606064914442/636461740162416640/799995548357623848','channel':'tt-discussion','messageId':'799995548357623848'},'additionalSources':[{'url':'https://discord.com/channels/629221606064914442/636461740162416640/799962680861130763','kind':'deleted-original-context'}],'notes':['Original result was deleted. Troy and Phillish explicitly acknowledge the deleted Baseball Club submissions on January 16; Wins, Phillish and Kazuo identify 1:43.40 in the subsequent discussion.','Kazuo supplies 51.85 for lap 1; lap 2 is calculated as 1:43.40 minus 51.85.','Achievement date and original proof remain unresolved. The discussion timestamp is context only, not an asserted submission or race timestamp. Earlier chronology may change if the original run is recovered.']})
held=[]
x=review['798794876116402216'];proof(x)
held.append({'messageId':'berlin-unidentified-10511','player':'Unidentified player','courseId':courses['kd'],'time':'1:05.11','laps':[None,None],'status':'documented-submission','includeInProgression':False,'identityUnresolved':True,'submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Opening result from a deleted account. Runner identity remains unresolved.']})
for vid,time,reason in [('OlrMDlL4bEo','1:03.59','Finish visually verified; former-WR title is a claim, but the upload follows the documented 1:03.57. Achievement date and WR chronology remain unresolved.'),('dXCC3NPM8CQ','1:03.49','Finish and results screen visually verified. Previous best is 1:03.44, so this recording does not establish a WR break. Retained for fastest surviving video fallback.')]:
    meta=read('archive/video-backup-files/berlin-astre-'+time.replace(':','').replace('.','')+'/original.info.json')
    from datetime import datetime,timezone
    held.append({'messageId':'berlin-video-'+vid,'player':'Astre','courseId':courses['kd'],'time':time,'laps':[None,None],'status':'documented-submission','includeInProgression':False,'dateUnresolved':True,'delayedSubmission':True,'submittedAt':datetime.fromtimestamp(meta['timestamp'],timezone.utc).isoformat(),'video':'https://www.youtube.com/watch?v='+vid,'videoVerified':True,'source':{'url':'https://www.youtube.com/watch?v='+vid,'channel':'original-video'},'notes':[reason,'Original upload timestamp retained separately from the unknown race date.']})
# The newly recovered Astre 1:03.84 precedes Wins 1:03.86 and 1:03.84.
# Neither Wins submission can be promoted to a WR tie.
for r in new+held:r.setdefault('mushrooms',None)
ids={r['messageId'] for r in new+held}
curated=[r for r in curated if r.get('messageId') not in ids]+new+held
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-01-13T06'<=x['postedAt']<'2021-01-27T06']
missing=[{'id':x['id'],'source':x['url']} for x in q if review.get(x['id'],{}).get('reviewStatus')!='visually-reviewed']
audit={'tour':'Berlin Tour 2021','status':'Indexed available images reviewed; exhaustive source coverage is not established.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':len(q)-len(missing),'unreviewedOrUnavailable':missing,'additionalContextImagesVisuallyReviewed':6,'linkSearchResultsReviewed':29},'confirmedChanges':new,'heldForReconciliation':held,'limitations':['Baseball Club 1:43.40 is corroborated in contemporary text; original result was deleted. Its date and the earlier chronology remain unresolved.','Astre 1:03.62 repost is delayed; no exact achievement date assigned.','Astre 1:03.59 video is preserved but WR chronology remains unresolved. Astre 1:03.49 recording shows a faster previous best and is only a video fallback.','Two Nu11 Twitter images remain unavailable; their written 1:03.47 and 1:42.87 totals are slower than already documented records.','Earlier previous-best values, including Nu11 1:04.01 and Astre 1:03.90, lack original dated submissions.','New image importer recovers encoded Twitter image URLs previously skipped; this review does not prove every Discord message was captured.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/berlin-2021-reconciliation.json',audit)
print(json.dumps({'confirmedChanges':len(new),'held':len(held),'coverage':audit['coverage']}))
