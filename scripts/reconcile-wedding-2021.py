"""Restore Wedding Tour exchanges from visually read evidence and nearby replies."""
import json, hashlib, subprocess
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def save(p,d):(root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
base='https://discord.com/channels/629221606064914442/636461740162416640/'
def snow(mid):return datetime.fromtimestamp(((int(mid)>>22)+1420070400000)/1000,timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
def make(aid,player,laps=None,time=None):
 x=review[aid];assert x['reviewStatus']=='visually-reviewed';dst=root/f'public/assets/proof/wedding-2021-{aid}.webp'
 if not dst.exists():Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
 t=time or x['time'];laps=laps or [None,None]
 if all(l is not None for l in laps):
  m,s=t.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100),(aid,laps,t)
 return {'messageId':'wedding-2021-'+aid+'-'+t.replace(':','').replace('.',''),'player':player,'courseId':x['courseId'],'time':t,'laps':list(laps),'mushrooms':None,'status':'community-wr','submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':base+x['messageId'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read and compared with earlier records and surrounding replies. Date is original evidence publication in UTC, not an asserted race-completion instant.']}
rows=[
 ('849565872090775563','SuperFX'),('849586995109691403','SuperFX',['47.65','47.66']),('849589772653821952','SuperFX',['47.60','47.63']),('849756538042056754','SuperFX',['47.54','47.63']),('849947660613058591','SuperFX',['47.57','47.55']),('850248145241636864','SuperFX'),('850864498121768960','SuperFX',['47.49','47.50']),('851864610114109460','SuperFX'),('851880077699711006','SuperFX',['47.02','47.74']),('851884587528486962','SuperFX'),('851887407322234920','SuperFX',['47.14','47.36']),('851936897722744872','Nu11',['47.29','47.15']),('852440772758601758','SuperFX'),('854579254956523530','Nu11',['46.95','46.99']),
 ('850283806921457714','Starin',['41.12','41.25']),('850691467164385321','DIT',['41.04','41.13']),('850697256369782794','Phillish',['41.04','41.06']),('850721089671921674','DIT',['41.20','40.90']),('850770124746522644','Wins',['40.99','41.10']),('850819433852698694','Phillish',['41.01','41.04']),('851033399748722698','Nu11'),('851056408974721034','Nu11',['40.84','40.90']),('851069273397133354','Nu11',['40.87','40.82'])]
new=[make(*r) for r in rows]
def at(aid):return next(r for r in new if r['messageId'].startswith('wedding-2021-'+aid+'-'))
for aid,mid,explanation in [
 ('849756538042056754','849756573911482379','Runner’s .54 .63 resolves to 47.54 / 47.63 against the 1:35.17 total.'),
 ('849947660613058591','849947699985383444','Runner’s .57 .55 resolves to 47.57 / 47.55 against the 1:35.12 total.'),
 ('850864498121768960','850864511514443826','Adjacent runner reply gives 47.49 / 47.50; preserved full video confirms the run.'),
 ('851880077699711006','851880094120411177','Runner’s .02 .74 resolves to 47.02 / 47.74 against the 1:34.76 total.'),
 ('851884587528486962','851884658966396958','Adjacent .22 .31 would sum to 1:34.53, not the image’s 1:34.55. Preserve the claim without guessing which split was mistyped.'),
 ('851887407322234920','851887426154004531','Runner’s .14 .36 resolves to 47.14 / 47.36 against the 1:34.50 total.'),
 ('850770124746522644','850770144557006910','Immediately following .99 / .1 resolves to 40.99 / 41.10. The later .99 / .13 describes a different 1:22.12 run, not this 1:22.09 WR.'),
 ('850819433852698694','850819499955453972','Immediately following runner message supplies 41.01 / 41.04.')]:
 r=at(aid);r['additionalSources']=[{'url':base+mid,'kind':'adjacent-lap-reply'}];r['notes'].append(explanation)
for aid,folder in [('849586995109691403','wedding-sf-849587749660000266'),('849589772653821952','wedding-sf-849590577912610836')]:
 r=at(aid);s=read('archive/video-backup-files/'+folder+'/source.json');r.update(video=s['originalUrl'],videoVerified=True);r.setdefault('additionalSources',[]).append({'url':base+s['messageId'],'kind':'adjacent-full-video'});r['notes'].append('Original Discord recording downloaded and visually checked at the first-lap overlay and finish; second lap calculated from the total.')
r=at('850864498121768960');r.update(video='https://twitter.com/_superfx/status/1401337428170838018',videoVerified=True)
r=at('854579254956523530');r.update(video='https://www.youtube.com/watch?v=Gz3Napklgzk');r['notes'].append('Original YouTube URL retained. Video is unavailable in signed-in YouTube; the result image supplies the total and splits.')
held=[]
# Early claims are preserved, but the winner/order gap is not a made-up reign.
for aid,laps in [('849584216818843668',None),('849584953288818738',None),('850078526937104474',None),('850079580433022996',None),('850102265066291291',None),('850263214310948895',['42.10','41.87']),('850271781344378891',['41.71','41.67']),('850275619665215499',None),('850276419208740895',['41.40','41.59'])]:
 r=make(aid,'Timaël',laps);r.update(status='documented-submission',includeInProgression=False,standingUnresolved=True);r['additionalSources']=[{'url':base+'849584149001404416','kind':'initial-wr-claim'},{'url':base+'849685348975771709','kind':'later-standing-discussion'}];r['notes'].append('Initial runner WR claim and later “Bye my wr” discussion do not establish the intervening winner, time, or sequence. Exact image dates are retained, but these are held from WR progression until that gap is reconciled.');held.append(r)
for aid,mid in [('850263214310948895','850264087195549736'),('850271781344378891','850271997807427594'),('850276419208740895','850276591430926347')]:
 r=next(r for r in held if aid in r['messageId']);r['additionalSources'].append({'url':base+mid,'kind':'adjacent-lap-reply'});r['notes'].append('Lap shorthand read in the adjacent runner reply; resolved splits sum exactly to the displayed total.')
for aid,player,t in [('851936897722744872','Nu11','1:35.14'),('854579254956523530','Nu11','1:34.14'),('852440772758601758','SuperFX','1:34.47'),('850283806921457714','Starin','1:22.60'),('850721089671921674','DIT','1:22.12'),('851033399748722698','Nu11','1:22.04')]:
 r=make(aid,player,time=t);r.update(status='documented-submission',includeInProgression=False,dateUnresolved=True,observedAt=r['submittedAt'],submittedAt=None);r['notes']=['Previous-best field visually read in a later image. Original date and order against competing records remain unresolved; do not assign the later image timestamp.'];held.append(r)
# Twitter-only tied WR: preserve both full video and an extracted finish frame.
meta=read('archive/video-backup-files/wedding-tome-9435/original.info.json');dst=root/'public/assets/proof/wedding-2021-tome-9435.webp'
if not dst.exists():
 frame=root/'artifacts/wedding-tome-9435-finish.png';subprocess.run(['ffmpeg','-v','error','-y','-ss','104.248','-i',str(root/'archive/video-backup-files/wedding-tome-9435/original.mp4'),'-frames:v','1',str(frame)],check=True);Image.open(frame).convert('RGB').save(dst,'WEBP',lossless=True)
tome={'messageId':'wedding-2021-tome-twitter-1404728947196055555','player':'Tomegome','courseId':'3ds-mario-circuit','time':'1:34.35','laps':['47.21','47.14'],'mushrooms':None,'status':'community-wr','submittedAt':datetime.fromtimestamp(meta['timestamp'],timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z'),'video':meta['webpage_url'],'videoVerified':True,'proofImageLocal':'/assets/proof/'+dst.name,'source':{'url':meta['webpage_url'],'channel':'Twitter','messageId':'1404728947196055555'},'additionalSources':[{'url':base+'854288354177974272','kind':'discord-video-share'}],'notes':['Original tweet and downloaded full recording confirm 1:34.35 (47.21 / 47.14), tying SuperFX’s June 10 record. Exact timestamp is original tweet publication; the image is a preserved video finish frame.']};new.append(tome)
# The exact June 16 video-sharing message survives despite both original media being lost.
mid='854585789202563092';new.append({'messageId':'wedding-2021-nu11-12165-video-post','player':'Nu11','courseId':'rmx-rainbow-road-2','time':'1:21.65','laps':['40.82','40.83'],'mushrooms':None,'status':'community-wr','submittedAt':snow(mid),'video':'https://www.youtube.com/watch?v=mjgcJcGE4Aw','source':{'url':base+mid,'channel':'tt-discussion','messageId':mid},'notes':['Contemporaneous Discord video preview explicitly identifies 1:21.65, RMX Rainbow Road 2, and Wedding Tour WR. Original YouTube video is now unavailable; linked original Discord image also says content no longer available. Existing archived sheet supplies 40.82 / 40.83; those splits could not be independently rechecked from lost media.']})
allrows=new+held;ids={r['messageId'] for r in allrows};curated=[r for r in curated if r.get('messageId') not in ids]+allrows
for aid,*_ in rows:review[aid]['classification']='confirmed-world-record'
for r in held:
 for aid in review:
  if r['messageId'].startswith('wedding-2021-'+aid+'-') and not r.get('dateUnresolved'):review[aid]['classification']='held-standing-unresolved'
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-06-02T06'<=x['postedAt']<'2021-06-16T06']
audit={'tour':'Wedding Tour June 2021','status':'Indexed images and focused WR/link/video searches reviewed; complete message census remains unresolved.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':sum(review.get(x['id'],{}).get('reviewStatus')=='visually-reviewed' for x in q),'wrSearchMatches':27,'linkSearchMatches':18,'videoSearchMatches':19},'confirmedChanges':new,'heldForReconciliation':held,'preservedVideos':['https://www.youtube.com/watch?v=pPek5tziViM','https://www.youtube.com/watch?v=XSOOFt2veI4','https://www.youtube.com/watch?v=sGUfz13K-0E','https://www.youtube.com/watch?v=itx8KWMWtHI'],'limitations':['Indexed images and focused searches do not establish complete server-message coverage.','Timaël’s early claimed WR and later improvements remain held because the intervening standing is unresolved.','Previous-best fields reveal potential intermediate runs with unknown original dates.','SuperFX 1:34.55 adjacent lap shorthand conflicts with its total; both splits remain unknown.','Nu11’s final two WR videos are unavailable; RMX Rainbow Road 2 original result image is also unavailable.','Single-lap strategy recordings and short clips are preserved privately, not attached as full-run video proof.','Remaining non-WR YouTube recordings require visual review and preservation.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/wedding-2021-reconciliation.json',audit)
print(json.dumps({'confirmed':len(new),'held':len(held),'coverage':audit['coverage']}))
