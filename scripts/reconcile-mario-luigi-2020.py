"""Reconcile visually read Mario vs. Luigi Tour results with original Discord context."""
import json, hashlib, datetime
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def save(p,d):(root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json'); curated=read('archive/curated-runs.json'); assets=read('archive/assets-manifest.json')
mc='snes-mario-circuit-2'; rr='3ds-rainbow-road'; new=[]
rows=[
('778940939334582302','Kazuo',mc,'0:59.08',[None,None]),
('779027366839975946','Nu11',mc,'0:58.75',['29.07','29.68']),
('779031583918915634','Nu11',mc,'0:57.95',['28.83','29.12']),
('779038207366135808','Nu11',mc,'0:57.91',['28.91','29.00']),
('779174733312294912','Nu11',mc,'0:57.72',['28.83','28.89']),
('779233783550574612','Nu11',mc,'0:57.67',['28.83','28.84']),
('779371627531206686','Nu11',mc,'0:57.56',['28.66','28.90']),
('779419140011851806','Kazuo',mc,'0:57.50',['28.74','28.76']),
('779516399658729512','Kazuo',mc,'0:57.40',['28.62','28.78']),
('780732532076970000','Kazuo',mc,'0:57.28',['28.52','28.76']),
('778502039826989066','BrandonSG',rr,'2:03.54',['34.55','50.92','38.07']),
('778503962995064862','Phillish',rr,'2:02.09',[None,None,None]),
('778507116516212757','zxflare',rr,'2:01.43',[None,None,None]),
('778508911987916800','Nu11',rr,'2:00.26',[None,None,None]),
('778512653038780416','Nu11',rr,'1:59.80',[None,None,None]),
('778552183817109504','Nu11',rr,'1:59.50',[None,None,None]),
('778610243407314945','Astre',rr,'1:59.49',['33.77','49.17','36.55']),
('778617849354387456','Nu11',rr,'1:59.26',['33.87','48.75','36.64']),
('780071609888931840','Nu11',rr,'1:59.24',['33.81','48.89','36.54']),
('780084827134230538','Kazuo',rr,'1:59.21',['33.74','49.18','36.29']),
('780176701082697738','Astre',rr,'1:59.09',['33.79','49.01','36.29']),
('780219366368608326','Kazuo',rr,'1:59.01',['33.74','49.03','36.24']),
('780231340511330344','Kazuo',rr,'1:58.96',['33.89','48.83','36.24']),
('780896118401269840','Kazuo',rr,'1:58.93',['33.80','48.98','36.15']),
('781548980009173022','Kazuo',rr,'1:58.81',['33.77','48.81','36.23']),
('781616441300484146','Kazuo',rr,'1:58.80',['33.75','48.80','36.25']),
]
videos={
 '0:57.28':('https://twitter.com/KazuoMKT/status/1331175100310315008',True),
 '1:58.80':('https://twitter.com/KazuoMKT/status/1332070490572197888',True),
 '1:59.21':('https://twitter.com/kazuomkt/status/1330541072959877132?s=21',False),
 '1:58.81':('https://twitter.com/kazuomkt/status/1331992282887827461?s=21',False),
 '1:59.50':('https://youtu.be/5ZFVrC7psrs',False),
}
def make(aid,player,course,time,laps,status='community-wr'):
 x=review[aid];url=x['url'];dst=root/f'public/assets/proof/mario-luigi-2020-{aid}.webp'
 Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[url]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 return {'messageId':x['messageId'],'player':player,'courseId':course,'time':time,'laps':laps,'mushrooms':None,'status':status,'submittedAt':x['postedAt'],'proofImage':url,'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read and compared with the captured tour-wide submissions and contemporary leaderboard images. Date is the exact UTC submission date; it does not claim an exact race completion time.']}
for aid,player,course,time,laps in rows:
 r=make(aid,player,course,time,laps)
 if all(l is not None for l in laps):
  total=sum(round(float(l)*100) for l in laps); minutes,seconds=time.split(':'); assert total==int(minutes)*6000+round(float(seconds)*100),(time,laps)
  r['notes'].append('Splits recovered from the original message or immediately adjacent follow-up; three sections are retained for 3DS Rainbow Road.')
 if player=='Nu11':r['notes'].append('The original account now displays Enaga; contemporary replies identify Kaguya, archived under Nu11.')
 if time=='0:59.08':r['notes'].append('Adjacent message gives 29.44 / 29.54, which sum to 58.98 and do not sum to the screenshot result 59.08. Both lap fields remain unknown; no split is guessed.')
 if time=='1:59.24':r['notes'].append('Runner says “sry... already...” in response to Kazuo’s 1:59.26 tie. Publication is exact, but the earlier completion time is unknown; the disputed tie remains separate evidence.')
 if time in videos:
  url,verified=videos[time];r.update(video=url,videoVerified=verified)
  if verified:r['notes'].append('Surviving original video downloaded and finish time visually checked; an unlisted SuperFX64 backup is linked separately.')
  else:r['notes'].append('Contemporary message explicitly identifies the original video and time, but the source currently provides no available video; its original URL is retained.')
 if time=='1:59.01':
  frag=read('archive/raw/mario-luigi-2020-rainbow-15901-fragment.json')
  r['additionalSources']=[{'url':frag['url'],'kind':'video-fragment','description':'Seven-second section-3 tunnel excerpt, explicitly identified by Kazuo as from the 1:59.01 run. Does not show the finish.'}]
  r['videoFragments']=[{'originalUrl':frag['url'],'backupUrl':'https://www.youtube.com/watch?v=JVB12VPJSSg','description':'Seven-second tunnel excerpt; does not show the finish.'}]
  r['notes'].append('A surviving 7.318-second clip from this run is preserved locally. It shows the section-3 tunnel, not a complete run or finish; it is not substituted for full video proof.')
 new.append(r);review[aid]['classification']='confirmed-world-record'
# Anonymous leading times remain attributable only to a deleted account, not a guessed player.
for aid,time,laps in [('778502363647967232','2:02.29',[None,None,None]),('778504668334260224','2:01.96',[None,None,None]),('778508000624902154','2:01.30',['34.78','50.05','36.47'])]:
 r=make(aid,'Unidentified deleted account',rr,time,laps,'documented-submission');r.update(includeInProgression=False,identityUnresolved=True)
 r['notes'].append('Faster than the preceding captured submission at tour opening, but the author is now Deleted User. Identity remains unresolved; do not merge this person with another player or invent attribution.')
 new.append(r);review[aid]['classification']='leading-time-identity-unresolved'
r=make('780067333518393354','Kazuo',rr,'1:59.26',['33.77','49.10','36.39'],'documented-submission');r.update(includeInProgression=False)
r['notes'].append('Nu11 replies “sry... already...” with 1:59.24. This leaves whether Kazuo actually tied the standing WR unresolved. The adjacent cumulative 1:23.87 is inconsistent; the individual splits sum correctly to 1:59.26.')
new.append(r);review['780067333518393354']['classification']='tie-chronology-unresolved'
# Screenshot previous bests document extra runs without proving their exact date/order.
for aid,player,time,course in [('778940939334582302','Kazuo','0:59.25',mc),('779031583918915634','Nu11','0:58.33',mc),('779174733312294912','Nu11','0:57.73',mc),('779233783550574612','Nu11','0:57.68',mc)]:
 x=review[aid];new.append({'messageId':'mario-luigi-2020-previous-'+aid,'player':player,'courseId':course,'time':time,'laps':[None,None],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':None,'observedAt':x['postedAt'],'dateUnresolved':True,'proofImage':x['url'],'source':{'url':x['source'],'channel':'tt-discussion'},'notes':['Previous best visually read in a later result image. Retained as evidence; its completion date and place in the WR exchange are unresolved.']})
ids={r['messageId'] for r in new};curated=[r for r in curated if r.get('messageId') not in ids]+new
q=[x for x in read('archive/early-image-index.json')['images'] if '2020-11-18T06'<=x['postedAt']<'2020-12-02T06']
audit={'tour':'Mario vs. Luigi Tour 2020','status':'Available captured images reviewed; unresolved identities and missing sources remain','coverage':{'capturedImageAttachmentsInTour':len(q),'visuallyReviewed':sum(x['id'] in review for x in q)},'confirmedChanges':[{'courseId':r['courseId'],'player':r['player'],'time':r['time'],'submittedAt':r['submittedAt'],'laps':r['laps'],'source':r['source'],'change':'Recovered exact date, splits and proof' if r['time'] in ['0:57.28','1:59.49','1:58.80'] else 'Restored missing WR'} for r in new if r['status']=='community-wr'],'limitations':['Three opening Rainbow Road leading times are preserved with unresolved deleted-account attribution, excluded from named-player WR history pending identification.','Kazuo 1:59.26 tie chronology is disputed by Nu11’s immediate response; not promoted.','Nine captured images remain unavailable, including three avatar images; their original URLs remain in the capture index.','Mario Circuit 2 previous-best times 59.25, 58.33, 57.73 and 57.68 have no confirmed exact chronology.','Kazuo 59.08 has inconsistent written splits (29.44 + 29.54 = 58.98); laps withheld.','This is a reconciliation of captured evidence, not proof that the entire server has been exhausted.'],'excluded':['Romain reposted Nu11’s 1:59.26 screenshot; not a second runner’s tie.','Astre 1:59.38, Kazuo 1:59.13, Astre 1:59.00 and 1:58.97, Nu11 1:58.99 were submitted after faster records.','Kazuo MC2 57.83 and 58.02 were slower than Nu11’s standing record.'],'preservedFragment':{'run':'Kazuo 3DS Rainbow Road 1:59.01','file':'archive/video-backup-files/kazuo-rainbow-road-15901-fragment.mov','durationSeconds':7.318345,'source':read('archive/raw/mario-luigi-2020-rainbow-15901-fragment.json')['url']}}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/mario-luigi-2020-reconciliation.json',audit)
print(json.dumps({'coverage':audit['coverage'],'confirmedChanges':len(audit['confirmedChanges'])}))
