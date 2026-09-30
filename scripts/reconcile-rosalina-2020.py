"""Reconcile visually read Rosalina Tour results and preserve unresolved evidence."""
import json, hashlib, datetime
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def save(p,d):(root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
sw='gba-sunset-wilds';cm='n64-choco-mountain'
rows=[
('788650096534749204','Nu11',sw,'1:13.75',[None,None]),
('788650961782046720','Nu11',sw,'1:12.63',[None,None]),
('788652157422403604','Nu11',sw,'1:12.09',[None,None]),
('788653908427407380','Nu11',sw,'1:11.89',['36.02','35.87']),
('788677518542110740','Nu11',sw,'1:11.51',['35.81','35.70']),
('789153501799645205','Nu11',sw,'1:11.45',['35.87','35.58']),
('789167476310147072','Wins',sw,'1:11.29',['35.74','35.55']),
('789251322338607104','Wins',sw,'1:11.28',[None,None]),
('789265195456659516','Wins',sw,'1:11.24',[None,None]),
('789429866697195550','Wins',sw,'1:11.19',['35.67','35.52']),
('789449855704498186','SuperFX',sw,'1:11.11',[None,None]),
('789523730572640266','Wins',sw,'1:11.06',['35.54','35.52']),
('789779248809771049','SuperFX',sw,'1:10.85',['35.56','35.29']),
('791380456343076894','lxnxr',sw,'1:10.84',['35.57','35.27']),
('792496243191971860','Kazuo',sw,'1:10.70',['35.49','35.21']),
('792520593043357721','Kazuo',sw,'1:10.68',['35.44','35.24']),
('792698257893490699','Kazuo',sw,'1:10.63',[None,None]),
('792699156602421258','Kazuo',sw,'1:10.58',[None,None]),
('793171134303698984','Kazuo',sw,'1:10.47',[None,None]),
('793173474495037450','Kazuo',sw,'1:10.43',['35.30','35.13']),
('793181766412140554','Kazuo',sw,'1:10.30',['35.24','35.06']),
('788650095876898816','Nu11',cm,'1:20.23',[None,None]),
('788659047057981450','Heriawsity',cm,'1:20.21',[None,None]),
('788663331040788510','zxflare',cm,'1:19.91',['40.05','39.86']),
('788673899470389258','Astre',cm,'1:19.54',[None,None]),
('788691391214911488','Tome',cm,'1:19.29',[None,None]),
('788728445562519562','Tome',cm,'1:18.99',['39.57','39.42']),
('788825119891783780','Nu11',cm,'1:18.97',['39.56','39.41']),
('789023960717197312','SuperFX',cm,'1:18.93',['39.50','39.43']),
('789120346434306058','Nu11',cm,'1:18.72',['39.32','39.40']),
('789153363454984252','Nu11',cm,'1:18.65',['39.36','39.29']),
('789162228397113365','Nu11',cm,'1:18.62',['39.28','39.34']),
('793313800823767120','Nu11',cm,'1:18.53',['39.14','39.39']),
]
new=[]
for aid,player,course,time,laps in rows:
 x=review[aid];assert x['time']==time,(aid,x['time'],time)
 dst=root/f'public/assets/proof/rosalina-2020-{aid}.webp'
 if not dst.exists():Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 r={'messageId':x['messageId']+'-'+course,'player':player,'courseId':course,'time':time,'laps':laps,'mushrooms':None,'status':'community-wr','submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read and compared with contemporary results and leaderboards. Exact UTC publication date; race completion instant is not claimed.']}
 if all(l is not None for l in laps):
  m,s=time.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100)
  r['notes'].append('Splits recovered from original message context or contemporary leaderboard; sum checked against total.')
 if player=='Nu11':r['notes'].append('Original account currently displays Enaga; contemporary replies identify Kaguya, archived as Nu11.')
 if player=='SuperFX':r['notes'].append('Wins reposted SuperFX’s screenshot and explicitly identified the runner. Date is the exact Discord publication day, not an inferred original screenshot timezone.')
 if player=='zxflare':r['notes'].append('Immediate follow-up gives lap 1 as 40.05; lap 2 is calculated as 79.91 minus 40.05 = 39.86.')
 if player=='Tome':
  original='1339128734582915072' if time=='1:19.29' else '1339169151764447234'
  published='2020-12-16T08:42:24.000Z' if time=='1:19.29' else '2020-12-16T11:23:00.000Z'
  r.update(submittedAt=published,repostedAt=x['postedAt'])
  r['additionalSources']=[{'url':f'https://x.com/tomegome_g/status/{original}','publishedAt':published}]
  r['notes'].append('Dated to original X result, before Wins’s Discord repost. Earlier publication establishes precedence over subsequent slower Discord submissions.')
  if time=='1:18.99':
   r.update(video='https://x.com/tomegome_g/status/1339171744762847232',videoVerified=True)
   r['notes'].append('Original full video downloaded and finish visually confirmed. Contemporary leaderboard corrects original result post’s 49.57 / 49.42 typo to 39.57 / 39.42.')
 if time=='1:10.30':
  r.update(video='https://twitter.com/KazuoMKT/status/1343692485390979075',videoVerified=True)
  r['notes'].append('Original screenshot December 28 precedes December 29 WR-history proof upload. Full original video downloaded; finish visually confirms 1:10.30.')
 if time=='1:18.93':r.update(video='https://youtu.be/aKBh5R2tbTQ',videoVerified=True);r['notes'].append('Original video linked by Wins in contemporary follow-up; channel SuperFX64 and 1:18.93 finish visually verified in the original player.')
 new.append(r);review[aid]['classification']='confirmed-world-record'
# Preserve evidenced runs whose exact place in the WR progression remains unresolved.
holds=[('788648339305660427','Unidentified player','Opening 1:14.55 result posted by a deleted account; runner identity unresolved.'),('788688327615578122','SuperFX','1:19.47 repost is three minutes after Tome’s original 1:19.29. Wins says the result was from some time ago; exact original publication and precedence remain unresolved.'),('792521635663970314','SuperFX','1:10.81 repost follows Kazuo’s faster 1:10.70 and 1:10.68. Original timing could place this earlier, but has not been recovered.')]
held=[]
for aid,player,reason in holds:
 x=review[aid];held.append({'player':player,'time':x['time'],'courseId':x['courseId'],'source':x['source'],'postedAt':x['postedAt'],'reason':reason,'proofImage':x['url']});review[aid]['classification']='wr-status-or-identity-unresolved'
for h in held:
 x=next(x for x in review.values() if x.get('source')==h['source'] and x.get('time')==h['time'])
 dst=root/f"public/assets/proof/rosalina-2020-{x['id']}.webp"
 if not dst.exists():Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
 new.append({'messageId':'rosalina-held-'+x['id'],'player':h['player'],'courseId':h['courseId'],'time':h['time'],'laps':[None,None],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':None,'observedAt':h['postedAt'],'dateUnresolved':True,'identityUnresolved':h['player']=='Unidentified player','proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':[h['reason']]})
# The final WR-history entry explicitly has no video. The sheet's December 17 link
# predates the December 29 final result and cannot authenticate that later run.
new.append({'messageId':'rosalina-final-nu-video-correction','player':'Nu11','courseId':cm,'time':'1:18.51','laps':['39.17','39.34'],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':None,'source':{'url':'https://discord.com/channels/629221606064914442/896050730216095765/896333478650593311','channel':'wr-history','messageId':'896333478650593311'},'rejectedVideos':[{'url':'https://twitter.com/_kaguya_games/status/1339580609023279110?s=21','reason':'Final WR-history entry explicitly marks no video. This unavailable December 17 video reference predates the December 29 final result; retained as an unresolved source reference, not footage of 1:18.51.'}],'notes':['Existing final WR retained; no newly verified image or exact race date claimed.']})
ids={r['messageId'] for r in new};curated=[r for r in curated if r.get('messageId') not in ids]+new
q=[x for x in read('archive/early-image-index.json')['images'] if '2020-12-16T06'<=x['postedAt']<'2020-12-30T06']
audit={'tour':'Rosalina Tour 2020','status':'Captured images reviewed; capture is not exhaustive. An additional result was recovered from adjacent message context.','coverage':{'indexedImageAttachments':len(q),'indexedImagesVisuallyReviewed':sum(x['id'] in review for x in q),'additionalContextImagesReviewed':1},'confirmedChanges':[{'courseId':r['courseId'],'player':r['player'],'time':r['time'],'submittedAt':r['submittedAt'],'laps':r['laps'],'source':r['source']} for r in new if r['status']=='community-wr'],'heldForReconciliation':held,'limitations':['Three unavailable indexed external images have surviving Discord repost copies that were visually reviewed.','Previous-best values can reveal missing intermediate runs but do not prove their dates or precedence. Examples: Nu11 Sunset Wilds 1:11.75, Kazuo 1:10.82 and 1:10.57, Tome Choco Mountain 1:19.49.','SuperFX Choco Mountain 1:18.92 appears in a later leaderboard after Nu11 1:18.62; original submission date and WR status remain unresolved.','A Reddit 1:09.98 claim has no recovered image or video and was challenged for proof; it is not promoted.','Nu11 final 1:18.51 is retained from existing WR-history evidence. Its original image is currently unavailable and not newly visually verified.','Further uncaptured messages and originals may change this progression.'],'corrections':['Wins 1:11.19 image was absent from the earlier image index; recovered and visually read from adjacent original message.','Kazuo 1:10.30 corrected to original December 28 result date.','Tome result publication dates used rather than delayed Discord repost times.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/rosalina-2020-reconciliation.json',audit)
print(json.dumps({'coverage':audit['coverage'],'confirmedChanges':sum(r['status']=='community-wr' for r in new),'held':len(held)}))
