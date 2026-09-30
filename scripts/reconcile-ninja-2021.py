"""Restore Ninja 2021 chronology from images, adjacent replies, and original footage."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def save(p,d):(root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
def proof(x):
 dst=root/f"public/assets/proof/ninja-2021-{x['id']}.webp"
 if not dst.exists():Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
def make(aid,player,time,laps,status='community-wr'):
 x=review[aid];assert x['reviewStatus']=='visually-reviewed';proof(x)
 if all(l is not None for l in laps):
  m,s=time.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100),(aid,time,laps)
 return {'messageId':'ninja-2021-'+aid+'-'+time.replace(':','').replace('.',''),'player':player,'courseId':x['courseId'],'time':time,'laps':laps,'mushrooms':None,'status':status,'submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read and compared with earlier records and surrounding messages. Date uses original evidence publication in UTC; an exact race-completion instant is not asserted.']}
rows=[
('829266413533134908','Kura',[None,None]),
('829269292783632415','Kura',[None,None]),
('829270119678607360','Astre',['48.77','49.00']),
('829273084061548574','Romain',['48.76','48.84']),
('829276136403632139','Starin',['48.63','48.85']),
('829280700531998750','Nu11',['29.43','30.15']),
('829282568532525076','Wins',[None,None]),
('829292831205883924','Nu11',['29.33','29.95']),
('829300193643724840','Wins',[None,None]),
('829319440507207731','Wins',['48.41','48.40']),
('829371482136248390','Wins',['48.36','48.27']),
('829651657519529984','Nu11',['48.12','48.14']),
('830147250851545199','Wins',['48.19','48.04']),
('830272035297034270','SuperFX',['48.02','48.12']),
('830472826410237972','Wins',['48.11','48.03']),
('831017586250088468','Nu11',['47.96','48.15']),
('831526244852039736','Astre',['29.27','29.98']),
('831846956954943528','Astre',['29.32','29.88']),
('832412307208405022','SuperFX',['47.82','48.10']),
('832507847140179988','SuperFX',['47.94','47.90']),
('833292407713169418','Nu11',['29.23','29.76'])]
adjacent={
 '829270119678607360':('829270168743706656','48.77 / 49.00 in the next message eleven seconds later.'),
 '829371482136248390':('829371871932842024','48.36 / 48.27 in the following reply.'),
 '830147250851545199':('830147543350378557','48.19 / 48.04 in the following reply.'),
 '831846956954943528':(None,'29.32 / 29.88 in the following reply seventeen seconds later.'),
 '832412307208405022':('832428038783762482','Adjacent reply .82 .10 resolves to 47.82 / 48.10, summing exactly to 1:35.92.'),
 '832507847140179988':('832507889788780565','The next reply .94 .90 resolves to 47.94 / 47.90, summing exactly to 1:35.84. Nearby hypothetical .77 .75 is not a completed run.')}
videos={'829319440507207731':'https://twitter.com/winsmkt/status/1379763582997520385','830472826410237972':'https://www.youtube.com/watch?v=q0adev5AKqI','832507847140179988':'https://www.youtube.com/watch?v=O_ByD9fz4tU'}
new=[]
for aid,player,laps in rows:
 r=make(aid,player,review[aid]['time'],laps)
 if aid in adjacent:
  mid,note=adjacent[aid];r['notes'].append(note)
  if mid:r['additionalSources']=[{'url':'https://discord.com/channels/629221606064914442/636461740162416640/'+mid,'kind':'adjacent-lap-reply'}]
 if aid in videos:r.update(video=videos[aid],videoVerified=True);r['notes'].append('Original footage downloaded and the finish visually verified; credited unlisted preservation copy linked separately.')
 if aid=='833292407713169418':r.update(video='https://www.youtube.com/watch?v=J6qWL0dDQC0');r['notes'].append('Original YouTube link is unavailable in the signed-in browser. The dated result image establishes the run.')
 if aid=='830272035297034270':r['notes'].append('48.02 / 48.12 confirmed by the April 10 leaderboard screenshot.')
 if aid=='830472826410237972':r['notes'].append('Tied SuperFX’s standing 1:36.14; both players retained in the progression.')
 new.append(r);review[aid]['classification']='confirmed-world-record'
held=[]
for aid,player,time,laps in [
 ('829266413533134908','Kura','1:38.08',[None,None]),
 ('829280700531998750','Nu11','0:59.91',[None,None]),
 ('829651657519529984','Nu11','1:36.40',[None,None]),
 ('831017586250088468','Nu11','1:36.24',['48.18','48.06']),
 ('831846956954943528','Astre','0:59.24',[None,None]),
 ('832507847140179988','SuperFX','1:35.89',[None,None]),
 ('833292407713169418','Nu11','0:59.18',[None,None])]:
 r=make(aid,player,time,laps,'documented-submission');r.update(includeInProgression=False,dateUnresolved=True,observedAt=r['submittedAt'],submittedAt=None)
 r['notes']=['Previous-best field visually read, but its original date and ordering against other players remain unresolved. Not assigned the date of the later result.']
 if time=='1:36.24':r['notes'].append('Also shown on the April 10 leaderboard with 48.18 / 48.06. It may predate or follow Wins’s 1:36.23; ordering is not established.')
 if time=='1:35.89':r['notes']=['Previous best 1:35.89 is visible in the original 1:35.84 video, not its submitted screenshot. Exact original submission timestamp is unresolved.'];r['additionalSources']=[{'url':videos[aid],'kind':'previous-best-in-video'}]
 held.append(r)
# This surviving footage was slower than Nu11's already submitted 59.28.
fallback={'messageId':'ninja-2021-video-mz_N_X9aBqs','player':'Astre','courseId':'snes-rainbow-road','time':'0:59.49','laps':[None,None],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':'2021-04-11T17:54:51.818Z','video':'https://www.youtube.com/watch?v=mz_N_X9aBqs','videoVerified':True,'source':{'url':'https://discord.com/channels/629221606064914442/636461740162416640/830863486245535764','channel':'tt-discussion','messageId':'830863486245535764'},'notes':['Original video downloaded; finish visually verified as 59.49. Preserved as surviving footage, not a WR: Nu11 already submitted 59.28 on April 7.']}
allrows=new+held+[fallback];ids={r['messageId'] for r in allrows};curated=[r for r in curated if r.get('messageId') not in ids]+allrows
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-04-07T06'<=x['postedAt']<'2021-04-21T06']
audit={'tour':'Ninja Tour 2021','status':'Indexed images reviewed; original message census remains incomplete.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':sum(review.get(x['id'],{}).get('reviewStatus')=='visually-reviewed' for x in q),'wrSearchMatches':43,'linkSearchMatches':22},'confirmedChanges':new,'heldForReconciliation':held,'verifiedVideoFallbacks':[fallback],'limitations':['Full server message coverage is not established by the image index or keyword searches.','Previous-best fields expose additional intermediate runs whose original dates remain unresolved.','Nu11 58.99 original YouTube video is unavailable in the signed-in browser.','N’s April 21 Twitter post is protected and unavailable to the signed-in browser; it has not been archived.','Slower Rainbow Road tour-opening times do not supersede the pre-existing Vancouver Tour 59.94.','Several early submissions omit splits; nearby replies were read without inventing unprovided lap times.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/ninja-2021-reconciliation.json',audit)
print(json.dumps({'confirmed':len(new),'held':len(held),'coverage':audit['coverage']}))
