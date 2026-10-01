"""Restore Trick Tour 2021 chronology from visually read results and adjacent replies."""
import json, hashlib
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p): return json.loads((root/p).read_text())
def save(p,d): (root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json'); curated=read('archive/curated-runs.json'); assets=read('archive/assets-manifest.json')
base='https://discord.com/channels/629221606064914442/636461740162416640/'
def make(aid,player,laps=None,time=None):
 x=review[aid]; assert x['reviewStatus']=='visually-reviewed'
 dst=root/f'public/assets/proof/trick-2021-{aid}.webp'
 if not dst.exists(): Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
 t=time or x['time']; laps=laps or ([None]* (3 if x['courseId']=='3ds-rainbow-road-r' else 2))
 if all(l is not None for l in laps):
  m,s=t.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100),(aid,laps,t)
 return {'messageId':'trick-2021-'+aid+'-'+t.replace(':','').replace('.',''),'player':player,'courseId':x['courseId'],'time':t,'laps':list(laps),'mushrooms':None,'status':'community-wr','submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':base+x['messageId'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read and compared with earlier records and surrounding replies. Date is original evidence publication in UTC, not an asserted race-completion instant.']}
rows=[
 ('844455618705752064','Haruru'),('844526178253275146','DIT',['37.97','37.98']),('844570514152357888','Nu11'),('844572129676361738','Nu11'),
 ('847603405890781224','NHSpeedy',['37.69','37.79']),('847710757424201748','NHSpeedy',['37.69','37.78']),('849275393058799667','Nu11',['37.67','37.66']),
 ('844457281403355156','Haruru'),('844457970510856214','N'),('844458333489987604','Troy'),('844459188943192092','Troy'),('844459429155831818','N'),('844460144900702208','DIT'),('844467136118128670','N'),('844482243945824286','DIT'),('844544256450625556','DIT'),('844570513673945109','Nu11'),('844572278578216960','Saki7',['36.37',None,None]),('844595354144997463','Nu11'),('844885758904369192','DIT'),('844914475349704714','Nu11',['36.72','42.33','34.34']),('845207451481407498','Nu11'),('845212723339984906','Nu11'),('845271980243550259','Nu11'),('847453553592369192','DIT'),('848115026711543828','DIT'),('848184144801431582','Nu11',['36.82','41.93','33.94']),
 ('846384862851760159','DIT',['20.00','19.92']),('847224569080971294','lxnxr',['20.01','19.87']),('847319813583929364','DIT',['19.97','19.91']),('849269646817361950','DIT',['20.00','19.87']),('849295508056965120','kNo2',['19.96','19.80'])]
new=[make(*r) for r in rows]
def at(aid):return next(r for r in new if r['messageId'].startswith('trick-2021-'+aid+'-'))
r=at('847710757424201748');r['additionalSources']=[{'url':base+'847710782309269504','kind':'adjacent-lap-reply'}];r['notes'].append('Immediately following runner message supplies 37.69 / 37.78; surrounding messages explicitly identify the new WR holder.')
r=at('844572278578216960');r['notes'].append('Runner writes 36.37 / 1:08.7x. Only the exact first-section 36.37 is retained; ambiguous cumulative shorthand is insufficient to reconstruct the other two sections.')
for aid in ['844570514152357888','844570513673945109']:at(aid)['notes'].append('Runner explicitly says they do not know the lap times; no splits inferred from unrelated nearby messages.')
r=at('847453553592369192');r['additionalSources']=[{'url':base+'847460584291434547','kind':'video-status-reply'}];r['notes'].append('Runner explicitly says no video in the subsequent discussion.')
r=at('849295508056965120');r['notes'].append('Runner subsequently says the 39.76 WR has no video and a 39.83 recorded run will be uploaded after the tour. Preserve the two runs separately.')
held=[]
for aid in ['844455804740042782','844458425554305024']:
 r=make(aid,'Unidentified player');r.update(status='documented-submission',includeInProgression=False,identityUnresolved=True);r['notes'].append('Dated deleted-account result falls between known record improvements, but original player identity remains unresolved. Retained without assigning it to a guessed player.');held.append(r)
for aid,player,t in [('849275393058799667','Nu11','1:15.37'),('848184144801431582','Nu11','1:52.93'),('844914475349704714','Nu11','1:53.55'),('844467136118128670','N','1:54.66'),('849295508056965120','kNo2','0:39.82')]:
 r=make(aid,player,time=t);r.update(status='documented-submission',includeInProgression=False,dateUnresolved=True,observedAt=r['submittedAt'],submittedAt=None);r['notes']=['Previous-best field visually read in a later result. Original date and order against competing records remain unresolved; do not assign the later screenshot timestamp.'];held.append(r)
r=make('849295076524818472','10mp',['19.96','19.86']);r.update(status='documented-submission',includeInProgression=False,video='https://www.youtube.com/watch?v=yGoyv5TVuzI',videoVerified=True);r['additionalSources']=[{'url':base+'849295391014387732','kind':'adjacent-standing-reply'}];r['notes'].extend(['The .96/.86 shorthand resolves to 19.96 / 19.86 and sums to the visually read 39.82. Downloaded video confirms both lap one and finish.','Before kNo2 publishes the 39.76 screenshot, 10mp says “But I’m 2nd”. Exact preceding order is unresolved; do not promote this as a WR change.','Discord’s historical video preview says 38.82 (19.96/18.86), while the current YouTube title and actual footage show 39.82 (19.96/19.86).']);held.append(r)
# Preserve actual recorded runs separately from the faster unrecorded WRs.
fallbacks=[]
for name,player,cid,time,laps,mid in [
 ('trick-kno2-3983','kNo2','snes-ghost-valley-1','0:39.83',['19.97','19.86'],'849583608481972244'),
 ('trick-wins-rr-15383','Wins','3ds-rainbow-road-r','1:53.83',['36.94','42.19','34.70'],'846843776877068359'),
 ('trick-nhspeedy-11555','NHSpeedy','n64-koopa-troopa-beach-r','1:15.55',['37.74','37.81'],'846906619395964949')]:
 meta=read('archive/video-backup-files/'+name+'/original.info.json')
 timestamp=datetime.fromtimestamp(meta['timestamp'],timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
 fallbacks.append({'messageId':'trick-2021-video-'+name,'player':player,'courseId':cid,'time':time,'laps':laps,'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':timestamp,'video':meta['webpage_url'],'videoVerified':True,'source':{'url':base+mid,'channel':'tt-discussion','messageId':mid},'notes':['Original video downloaded; finish and visible section/lap overlays reviewed. Exact original video publication timestamp retained. Slower than an already-established WR; preserved as footage rather than another WR change.']})
fallbacks[0]['notes'].append('Result panel visibly shows 39.83 and previous best 39.76; original tweet explicitly says best recorded run.')
allrows=new+held+fallbacks;ids={r['messageId'] for r in allrows};curated=[r for r in curated if r.get('messageId') not in ids]+allrows
for aid,*_ in rows:review[aid]['classification']='confirmed-world-record'
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-05-19T06'<=x['postedAt']<'2021-06-02T06']
audit={'tour':'Trick Tour May–June 2021','status':'Indexed images and focused WR/link/video searches reviewed; complete message census remains unresolved.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':sum(review.get(x['id'],{}).get('reviewStatus')=='visually-reviewed' for x in q),'brokenIndexedAttachments':1,'wrSearchMatches':44,'linkSearchMatches':26,'videoSearchMatches':33},'confirmedChanges':new,'heldForReconciliation':held,'verifiedVideoFallbacks':fallbacks,'unverifiedTextClaims':[{'player':'Kazuo','time':'1:51.98','courseId':'3ds-rainbow-road-r','source':base+'845278169884131339','reason':'Unsubstantiated text claim amid joking replies. No matching result or footage found; not added to WR progression.'}],'limitations':['Image indexing and focused searches do not establish full server-message coverage.','Attachment 844464872828829706 is broken in live Discord and returns 404; it has not been visually read.','Two deleted-account results have unresolved identities.','Previous-best fields reveal potential intermediate runs without exact original dates.','The original Nu11 1:52.69 YouTube video RQ8FAnqakFc is retained but unavailable in signed-in YouTube; earlier footage mentioned in discussion has not been located.','Saki7’s cumulative section shorthand is ambiguous; only the exact first section is published.','10mp 39.82 is preserved as a video submission without asserting that it held WR.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/trick-2021-reconciliation.json',audit)
print(json.dumps({'confirmed':len(new),'held':len(held),'fallbacks':len(fallbacks),'coverage':audit['coverage']}))
