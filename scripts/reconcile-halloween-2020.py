"""Reconcile visually reviewed Halloween results against original timestamps."""
import json, hashlib, datetime
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p): return json.loads((root/p).read_text())
def save(p,d): (root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json'); originals=read('archive/halloween-2020-original-image-review.json'); curated=read('archive/curated-runs.json'); assets=read('archive/assets-manifest.json'); new=[]
af='ds-airship-fortress';bc='gba-bowser-s-castle-2r';byid={x['id']:x for x in originals}
def mirror(url,p):
 digest=hashlib.sha256(url.encode()).hexdigest()[:24];dst=root/f'public/assets/proof/halloween-2020-{digest}.webp'
 Image.open(root/p).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[url]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
def add(mid,player,course,time,laps,posted,url,path,source,notes,**extra):
 mirror(url,path)
 r={'messageId':mid,'player':player,'courseId':course,'time':time,'laps':laps,'mushrooms':None,'status':'community-wr','submittedAt':posted,'proofImage':url,'proofImageVerified':True,'source':source,'notes':notes,**extra};new.append(r);return r
rows=[
 ('768360574584750080','Nu11',af,'1:31.67',['45.82','45.85']),
 ('768493832769634344','Nu11',af,'1:30.96',['45.20','45.76']),
 ('768515047495434240','Kazuo',af,'1:30.92',['45.35','45.57']),
 ('769197740172509184','Kazuo',af,'1:30.75',['45.30','45.45']),
 ('769246558855757864','Kazuo',af,'1:30.72',['45.23','45.49']),
 ('769330131461341204','Kazuo',af,'1:30.67',['45.27','45.40']),
 ('769419734277292082','Nu11',af,'1:30.42',['45.04','45.38']),
 ('769940292290740233','Kazuo',af,'1:30.25',['45.39','44.86']),
 ('771739213838286868','Kazuo',af,'1:30.20',['45.42','44.78']),
 ('772509984226803732','Kazuo',af,'1:30.07',['45.47','44.60']),
 ('768415387640528936','Kura',bc,'1:20.82',[None,None]),
 ('768419576567300106','Kura',bc,'1:20.31',[None,None]),
 ('768475248235380746','Kura',bc,'1:20.20',['40.09','40.11']),
 ('768490609509400606','Phillish',bc,'1:20.15',['40.09','40.06']),
 ('768523067353595924','Wins',bc,'1:20.08',['40.02','40.06']),
 ('768545286166544424','Wins',bc,'1:20.06',['40.02','40.04']),
 ('768673679986655242','Wakinyo',bc,'1:19.89',['39.92','39.97']),
 ('768729056035733544','Nu11',bc,'1:19.83',['39.87','39.96']),
 ('768758249012068352','Wakinyo',bc,'1:19.81',['39.84','39.97']),
 ('769513056480788480','Nu11',bc,'1:19.48',['39.54','39.94']),
]
for aid,player,course,time,laps in rows:
 x=review[aid];notes=['Finish image visually read and matched to the original Discord submission timestamp. Compared with the tour-wide captured images and contemporary leaderboards.']
 if player=='Nu11':notes+=['The Discord account now displays Enaga; contemporary leaderboards name Kaguya, archived under Nu11.']
 if player=='Kazuo':notes+=['Run splits recovered from the adjacent original message, not individual best laps displayed on the video layout.']
 elif player=='Wins' and time=='1:20.08':notes+=['Adjacent original message gives .02 / .06, reconstructed as 40.02 / 40.06 from the overall time.']
 elif player=='Wins' and time=='1:20.06':notes+=['Splits transcribed from the contemporary course leaderboard: 40.02 / 40.04.']
 elif laps[0]:notes+=['Splits transcribed from the original submission.']
 else:notes+=['Lap splits not yet recovered.']
 if time=='1:19.48':notes+=['Tie of Tome’s standing 1:19.48. Original message says 39.54 / 39.94; the later leaderboard’s 39.96 is a typo and is not used.']
 r=add(x['messageId'],player,course,time,laps,x['postedAt'],x['url'],x['path'],{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},notes)
 if time=='1:30.07':
  r.update(video='https://www.twitch.tv/videos/788919389',videoVerified=True,additionalSources=[{'url':'https://www.reddit.com/r/MarioKartTour/comments/jm6zx3/time_trial_world_record_on_airship_fortress_by/','kind':'surviving-original-video-repost'}])
  r['notes']+=['Twitch source is unavailable. The runner’s same-day Reddit upload survives; its downloaded footage was visually checked at the finish (1:30.07) and the runner’s comment independently confirms both laps.']
 review[aid]['classification']='confirmed-world-record'
for oid,course,time,laps,video in [
 ('06317d3f0746389b39ce0de1',af,'1:31.38',[None,None],None),
 ('d7283b78df42cda7264762d2',bc,'1:19.69',['39.72','39.97'],None),
 ('22e15f332dccba39a33056b5',bc,'1:19.54',['39.56','39.98'],'https://x.com/tomegome_g/status/1319697796547497984'),
 ('ed98d7480c3b8839c07ac050',bc,'1:19.48',['39.61','39.87'],None),
 ('8593fec4a379bc5155801800',bc,'1:19.29',['39.47','39.82'],'https://x.com/tomegome_g/status/1322866432498036738')]:
 x=byid[oid];notes=['Original finish image visually read. Date is the exact UTC original publication date, not a later Discord repost or a claim of the exact race-completion instant.']
 if time=='1:31.38':notes+=['The post mistypes laps as 35.57 / 35.81; a follow-up acknowledges tens-digit mistakes. Splits remain unset rather than silently correcting the source.']
 else:notes+=['Lap splits are written in the original post.']
 r=add('halloween-2020-original-'+oid,'Tomegome',course,time,laps,x['postedAt'],x['imageUrl'],x['path'],{'url':x['originalUrl'],'platform':'Twitter/X'},notes)
 if video:r.update(video=video,videoVerified=True);r['notes']+=['Downloaded original footage visually checked at the finish; course and total match.']
 x.update(reviewStatus='visually-reviewed',classification='confirmed-world-record')
# Preserve evidence of possible intervening records without assigning later dates.
for oid,course,time,kind in [
 ('06317d3f0746389b39ce0de1',af,'1:31.66','previous-best'),
 ('22e15f332dccba39a33056b5',bc,'1:19.61','previous-best'),
 ('ed98d7480c3b8839c07ac050',bc,'1:19.49','previous-best'),
 ('3b2ac32e48f4ae89ab2eb66a',bc,'1:19.44','earlier-result'),
 ('8593fec4a379bc5155801800',bc,'1:19.33','previous-best')]:
 x=byid[oid];mirror(x['imageUrl'],x['path']);new.append({'messageId':'halloween-2020-undated-'+time.replace(':','').replace('.',''),'player':'Tomegome','courseId':course,'time':time,'laps':[None,None],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'dateUnresolved':True,'submittedAt':None,'observedAt':x['postedAt'],'proofImage':x['imageUrl'],'source':{'url':x['originalUrl'],'platform':'Twitter/X'},'notes':[f'Visually read {kind} in a later original post. Exact chronology and WR status need reconciliation; the later publication date is not assigned to this earlier run.']})
for x in originals:
 if x['reviewStatus']=='pending':x.update(reviewStatus='visually-reviewed',classification='undated-earlier-result' if x['id']=='3b2ac32e48f4ae89ab2eb66a' else 'personal-best-or-non-result')
ids={r['messageId'] for r in new};curated=[r for r in curated if r.get('messageId') not in ids]+new
images=[x for x in read('archive/early-image-index.json')['images'] if '2020-10-21T06'<=x.get('postedAt','')<'2020-11-04T06']
audit={'tour':'Halloween Tour 2020','status':'Captured images reconciled; entire server history and undated previous bests remain under review','coverage':{'capturedImageAttachmentsInTour':len(images),'visuallyReviewed':sum(x['id'] in review for x in images),'originalPostImagesReviewed':len(originals)},'confirmedChanges':[{'courseId':r['courseId'],'player':r['player'],'time':r['time'],'submittedAt':r['submittedAt'],'laps':r['laps'],'source':r['source'],'change':'Recovered exact date and proof' if r['time'] in ['1:30.07','1:19.29'] else 'Restored missing WR or WR tie'} for r in new if r['status']=='community-wr'],'unresolved':[{'courseId':r['courseId'],'time':r['time'],'observedAt':r['observedAt']} for r in new if r.get('dateUnresolved')],'limitations':['One embedded Wakinyo image URL and its avatar return 404. The original post restricts viewing; the matching 1:30.76 Discord result and 45.34/45.42 message survive.','An intermediate leaderboard lists Kazuo 1:30.57 with 45.27/45.30; original 1:30.67 message says 45.27/45.40. Possible typo or missing run; not promoted without original proof.','Opening previous bests and Nu11’s previous 1:31.02 lack original dates and may reveal further records.'],'excluded':['Kazuo 1:30.55 came after Nu11 1:30.42; not a WR.','Tome 1:31.13 and 1:30.95 came after Kazuo 1:30.92; not WRs.','Lxnxr 1:19.48/1:19.47 and Saki 1:19.69/1:19.66/1:19.57 came after Tome 1:19.29; not WRs.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/halloween-2020-original-image-review.json',originals);save('archive/halloween-2020-reconciliation.json',audit)
print(json.dumps({'confirmed':len(audit['confirmedChanges']),'unresolved':len(audit['unresolved']),'coverage':audit['coverage']}))
