"""Restore Bowser vs. DK 2021 from visually reviewed results and surrounding replies."""
import json, hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p): return json.loads((root/p).read_text())
def save(p,d): (root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json'); curated=read('archive/curated-runs.json'); assets=read('archive/assets-manifest.json')
base='https://discord.com/channels/629221606064914442/636461740162416640/'
def make(aid,player,laps=(None,None),time=None):
 x=review[aid]; assert x['reviewStatus']=='visually-reviewed'
 dst=root/f'public/assets/proof/bowser-dk-2021-{aid}.webp'
 if not dst.exists(): Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
 t=time or x['time']
 if all(l is not None for l in laps):
  m,s=t.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100),(aid,laps,t)
 return {'messageId':'bowser-dk-2021-'+aid+'-'+t.replace(':','').replace('.',''),'player':player,'courseId':x['courseId'],'time':t,'laps':list(laps),'mushrooms':None,'status':'community-wr','submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':base+x['messageId'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read and compared chronologically with earlier records. Date is original evidence publication in UTC, not an asserted race-completion instant.']}
rows=[
('839523421477142639','Whiplash'),('839568624376741898','Heriawsity'),('839568727577329724','Whiplash'),
('839667210893000704','Nu11',('45.24','44.95')),('839879203344089138','Nu11',('45.07','44.94')),
('839979489261781007','Kazuo',('45.24','44.71')),('840246709250686996','Nu11',('45.01','44.84')),
('840521757307699210','N'),('840583388438986782','Nu11',('29.93','35.63')),('840596856202985512','N'),
('840610315615862807','N'),('840780520698937365','N'),('840786058983899146','N'),('840860716952453130','N'),
('840938726912819220','Wins'),('840947039206244352','N'),('840955639948902410','Kazuo'),('840958584153833502','Kazuo'),
('840983017819340811','Kazuo',('44.93','44.69')),('841014423035445331','Wins'),('841023729080860702','Wins'),
('841037135482322964','Kazuo'),('841038854273499196','Kazuo'),('841355478306258955','Nu11'),('841448774298763334','Kazuo'),
('842725160992899092','Kazuo',('29.10','35.37')),('842749811165495337','Kazuo',('29.12','35.31')),
('842757013984772156','Kazuo',('29.12','35.23')),('842859075687284736','Kazuo',('29.05','35.25'))]
new=[make(*r) for r in rows]
def at(aid):return next(r for r in new if r['messageId'].startswith('bowser-dk-2021-'+aid+'-'))
for aid,mid in [('842725160992899092','842726252200591380'),('842749811165495337','842749810787876904'),('842859075687284736','842859082741841960')]:
 r=at(aid);r['additionalSources']=[{'url':base+mid,'kind':'adjacent-lap-reply'}];r['notes'].append('Lap one supplied in an adjacent runner message; lap two calculated by subtracting lap one from the visually verified total.')
r=at('840983017819340811');r.update(video='https://twitter.com/Kazuo_MK/status/1391427025714438145',videoVerified=True);r['additionalSources']=[{'url':base+'840983090457608212','kind':'adjacent-lap-reply'}];r['notes'].append('Adjacent reply says 44.93 / 44.79, which does not sum to 1:29.62. Original downloaded video visibly confirms lap one 44.93 and total 1:29.62, so lap two is 44.69; also corroborated by the later leaderboard.')
r=at('842859075687284736');r.update(video='https://twitter.com/kazuo_mk/status/1393471129994547202',videoVerified=True);r['additionalSources'].append({'url':'https://twitter.com/Kazuo_MK/status/1393319499047317505','kind':'deleted-original-video-post'});r['notes'].append('The first video tweet is deleted. A surviving May 15 repost was downloaded; finish 1:04.30 and lap-one overlay 29.05 visually verified. Preserve the earlier May 14 result date.')
r=at('840246709250686996');r.update(video='https://www.youtube.com/watch?v=6NIqiF98Pi8');r['notes'].append('Original runner linked this video immediately afterward; it is now unavailable in signed-in YouTube. Result image and stated splits survive.')
r=at('839979489261781007');r.update(video='https://x.com/Kazuo_MK/status/1391428582883446792',videoVerified=True);r['notes'].append('Earlier Discord result supersedes the Twitter result timestamp by about three minutes; the already-preserved video remains attached.')
r=at('840947039206244352');r['notes'].append('Runner later says “Probably, 29.99/34.89”. Retain this qualified recollection in notes; do not publish it as verified exact splits.');r['additionalSources']=[{'url':base+'840950060644302859','kind':'qualified-lap-recollection'}]
r=at('840955639948902410');r['notes'].append('Runner explicitly says “we share WR” in the following message, confirming the tie with N.');r['additionalSources']=[{'url':base+'840955646807506945','kind':'tie-confirmation'}]
# A same-player retie is a distinct run, but not another record change.
held=[]
for aid,laps in [('842725897265348608',('29.17','35.30')),('842850761939353619',('29.09','35.26'))]:
 r=make(aid,'Kazuo',laps);r.update(status='documented-submission',includeInProgression=False);r['notes'].append('Same-player retie of his already-held time. Preserve distinct run and splits without adding another WR change.');held.append(r)
for aid,t in [('839667210893000704','1:30.73'),('839879203344089138','1:30.17')]:
 r=make(aid,'Nu11',time=t);r.update(status='documented-submission',includeInProgression=False,dateUnresolved=True,observedAt=r['submittedAt'],submittedAt=None);r['notes']=['Previous-best field visible in later result. Exact original date and order against competing records remain unresolved; not assigned the later screenshot timestamp.'];held.append(r)
rejected={'player':'FlashGTI','time':'1:29.34','courseId':'ds-airship-fortress','source':base+'841415994689454110','correction':base+'841416197023203439','admission':base+'841416518347915304','reason':'Poster explicitly identifies altered result as a joke and supplies the real 1:31.34. Excluded from WR history.'}
ids={r['messageId'] for r in new+held};curated=[r for r in curated if r.get('messageId') not in ids]+new+held
for aid,*_ in rows:review[aid]['classification']='confirmed-world-record'
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-05-05T06'<=x['postedAt']<'2021-05-19T06']
audit={'tour':'Bowser vs. DK Tour May 2021','status':'Indexed images and focused WR/link searches reviewed; complete message census remains unresolved.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':sum(review.get(x['id'],{}).get('reviewStatus')=='visually-reviewed' for x in q),'wrSearchMatches':54,'linkSearchMatches':28},'confirmedChanges':new,'heldForReconciliation':held,'rejectedClaims':[rejected],'limitations':['Image indexing and keyword searches do not establish complete server-message coverage.','Some previous-best dates and lap splits remain unresolved.','N’s qualified lap recollection is retained in notes, not treated as exact.','Two same-player reties are retained as submissions without inflating WR changes.','Original Nu 1:29.85 video and first Kazuo 1:04.30 video post are unavailable; the latter has a surviving preserved repost.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/bowser-dk-2021-reconciliation.json',audit)
print(json.dumps({'confirmed':len(new),'held':len(held),'coverage':audit['coverage']}))
