import json,hashlib,datetime
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p): return json.loads((root/p).read_text())
def save(p,d): (root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json'); originals=read('archive/anniversary-2020-original-image-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
byid={x['id']:x for x in originals};new=[]
def mirror(url,p):
 digest=hashlib.sha256(url.encode()).hexdigest()[:24];dst=root/f'public/assets/proof/anniversary-2020-{digest}.webp'
 Image.open(root/p).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[url]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
def add(mid,player,time,laps,posted,url,path,source,notes,**extra):
 mirror(url,path)
 r={'messageId':mid,'player':player,'courseId':'3ds-toad-circuit','time':time,'laps':laps,'mushrooms':None,'status':'community-wr','submittedAt':posted,'proofImage':url,'proofImageVerified':True,'source':source,'notes':notes,**extra};new.append(r);return r
for aid,player,time,laps,splitid in [
 ('763703920916430898','Nu11','1:04.33',['32.13','32.20'],None),
 ('764455937619656704','Kazuo','1:04.30',['32.15','32.15'],'764455968896843816'),
 ('764465036009537566','Kazuo','1:04.27',['32.12','32.15'],'764465045877948447'),
 ('764657435017084928','Nu11','1:04.13',['32.07','32.06'],None)]:
 x=review[aid];s={'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']}
 notes=['Finish image visually read and matched to the original Discord message timestamp. Compared with contemporary tour leaderboards and the surrounding original submissions.']
 if player=='Nu11': notes+=['The Discord account now displays Enaga; contemporary leaderboards name Kaguya, archived under Nu11.','Lap splits appear in the same original message.']
 else:notes+=['Lap splits appear in the immediately following message: '+splitid+'. The later self-tie of 1:04.30 with 32.14/32.16 is not a new WR and does not supply these laps.']
 r=add(x['messageId'],player,time,laps,x['postedAt'],x['url'],x['path'],s,notes)
 if splitid:r['additionalSources']=[{'url':'https://discord.com/channels/629221606064914442/636461740162416640/'+splitid,'kind':'original-lap-message'}]
 review[aid]['classification']='confirmed-world-record';review[aid]['notes']+=' Reconciled against original posts and contemporary leaderboards.'
for oid,time,laps in [('9c50ffac5d520c4089b196f9','1:04.31',['32.09','32.22']),('9c0b11196183e7ac636b4561','1:04.08',['32.06','32.02']),('b4b70c5051a3c9d5283a6fd3','1:03.96',['31.99','31.97'])]:
 x=byid[oid];add('anniversary-2020-original-'+oid,'Tomegome',time,laps,x['datetime'],x['src'],x['path'],{'url':x['url'],'platform':'Twitter/X'},['Original finish image visually read. Lap splits are written in the original post. The UTC timestamp is the original publication date, not a later Discord repost or the exact race-completion instant.'])
x=review['765203266644082718']
add('anniversary-2020-original-1315638884223442944','Tomegome','1:04.04',['32.02','32.02'],'2020-10-12T13:02:08.000Z',x['url'],x['path'],{'url':'https://x.com/tomegome_g/status/1315638884223442944','platform':'Twitter/X'},['Troy’s preserved screenshot shows Tome’s original result and 32.02/32.02 splits. Original post timestamp independently recovered.','Original video finish visually verified at 1:12: timer reads 1:04.04 on Toad Circuit.'],video='https://x.com/tomegome_g/status/1315641292928372736',videoVerified=True,additionalSources=[{'url':x['source'],'kind':'contemporary-screenshot-repost'}])
review[x['id']]['classification']='confirmed-world-record'
# Keep visible previous bests without inventing their dates or promoting them.
for oid,time in [('f00c3d906aa715b9e6e942ee','1:04.26'),('9c0b11196183e7ac636b4561','1:04.12')]:
 x=byid[oid];mirror(x['src'],x['path']);new.append({'messageId':'anniversary-2020-undated-'+time.replace(':','').replace('.',''),'player':'Tomegome','courseId':'3ds-toad-circuit','time':time,'laps':[None,None],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'dateUnresolved':True,'submittedAt':None,'observedAt':x['datetime'],'proofImage':x['src'],'source':{'url':x['url'],'platform':'Twitter/X'},'notes':['Visible previous best in a later result screenshot. Exact chronology and WR status remain unresolved; the later post date is not assigned to this earlier run.']})
ids={r['messageId'] for r in new};curated=[r for r in curated if r.get('messageId') not in ids]+new
for x in originals:x['reviewStatus']='visually-reviewed';x['classification']='confirmed-world-record' if x['id'] in ['9c50ffac5d520c4089b196f9','9c0b11196183e7ac636b4561','b4b70c5051a3c9d5283a6fd3'] else 'personal-best-after-faster-known-record'
images=[x for x in read('archive/early-image-index.json')['images'] if '2020-10-07T06'<=x.get('postedAt','')<'2020-10-21T06']
audit={'tour':'Anniversary Tour 2020','status':'captured image sequence reconciled; complete server history and undated previous bests still under review','coverage':{'capturedImageAttachmentsInTour':len(images),'visuallyReviewed':sum(x['id'] in review for x in images),'originalPostImagesReviewed':len(originals)},'confirmedChanges':[{'player':r['player'],'time':r['time'],'courseId':r['courseId'],'submittedAt':r['submittedAt'],'laps':r['laps'],'source':r['source'],'change':'Original date and proof recovered for existing WR' if r['time']=='1:03.96' else 'Restored missing world record'} for r in new if r['status']=='community-wr'],'unresolved':[r['time'] for r in new if r.get('dateUnresolved')],'excluded':['Tour opening times slower than Nu11’s existing 2019 1:04.46 are not all-time WRs.','Kazuo’s 1:04.33 came after Tome’s 1:04.31 and is not a WR tie.','Tome’s 1:04.16 was posted after Nu11’s 1:04.13 and is not a WR.','Kazuo’s later self-tie of 1:04.30 is not a new WR.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/anniversary-2020-original-image-review.json',originals);save('archive/anniversary-2020-reconciliation.json',audit)
print(json.dumps(audit,indent=2))
