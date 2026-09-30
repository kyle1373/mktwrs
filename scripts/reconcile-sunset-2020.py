"""Restore the Sunset Tour exchange from visually read results and original messages."""
import json,hashlib,datetime
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def save(p,d):(root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json');new=[]
nbc='3ds-neo-bowser-city';rr='n64-royal-raceway'
rows=[
('773465662528946196','Saki7',nbc,'1:25.53',['42.79','42.74']),
('773470178512076810','Saki7',nbc,'1:25.51',['42.74','42.77']),
('773480795796275210','Nu11',nbc,'1:25.14',['42.52','42.62']),
('774800546392703026','Kazuo',nbc,'1:25.13',['42.55','42.58']),
('775008476714893333','Kazuo',nbc,'1:24.93',['42.49','42.44']),
('775381211610218536','Kazuo',nbc,'1:24.88',['42.60','42.28']),
('775779074756182026','Kazuo',nbc,'1:24.83',['42.50','42.33']),
('775785747244122112','Kazuo',nbc,'1:24.70',['42.32','42.38']),
('775003734627188736','Nu11',rr,'1:33.97',['46.90','47.07']),
]
for aid,player,course,time,laps in rows:
 x=review[aid];url=x['url'];dst=root/f'public/assets/proof/sunset-2020-{aid}.webp';Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[url]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 r={'messageId':x['messageId'],'player':player,'courseId':course,'time':time,'laps':laps,'mushrooms':None,'status':'community-wr','submittedAt':x['postedAt'],'proofImage':url,'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read from the original image and compared with the captured tour-wide submissions and contemporary leaderboards. Exact UTC submission timestamp; lap splits recovered from the original message or adjacent follow-up.']}
 if player=='Nu11':r['notes']+=['Original account now displays Enaga; contemporary leaderboard and replies call the player Kaguya, archived under Nu11.']
 if time=='1:25.13':r['notes']+=['Runner explicitly writes WR by .01 in the next message.']
 if time=='1:25.51':
  r.update(video='https://twitter.com/saki728472383/status/1323911097305325569?s=21',videoVerified=True,achievedAt='2020-11-04T08:52:57.000Z',datePrecision='day',additionalSources=[{'url':'https://twitter.com/saki728472383/status/1323911097305325569?s=21','kind':'original-video'}]);r['notes']+=['Original video was published at 08:52:57 UTC, before the 08:54 Discord submission. Downloaded footage visually checked at the result screen: 1:25.51, previous best 1:25.53.']
 if time=='1:24.70':r.update(video='https://twitter.com/kazuomkt/status/1326228675520552960?s=21',videoVerified=True);r['notes']+=['Downloaded original footage visually checked at the finish: 1:24.70.']
 new.append(r);review[aid]['classification']='confirmed-world-record'
# The earlier personal best is real evidence, but its timestamp is not known.
x=review['773480795796275210'];new.append({'messageId':'sunset-2020-nu11-undated-12540','player':'Nu11','courseId':nbc,'time':'1:25.40','laps':[None,None],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'dateUnresolved':True,'submittedAt':None,'observedAt':x['postedAt'],'proofImage':x['url'],'source':{'url':x['source'],'channel':'tt-discussion'},'notes':['Previous best 1:25.40 visually read in the later 1:25.14 result. Exact placement relative to Saki’s records is not proven; retained as evidence without inventing a date or WR status.']})
x=review['774999700113588224'];x.update(time='1:25.13',courseId=nbc,classification='duplicate-context',notes='Stream title card showing the existing 1:25.13; individual best laps 42.50/42.58 are not the record splits.')
ids={x['messageId'] for x in new};curated=[x for x in curated if x.get('messageId') not in ids]+new
q=[x for x in read('archive/early-image-index.json')['images'] if '2020-11-04T06'<=x['postedAt']<'2020-11-18T06']
audit={'tour':'Sunset Tour 2020','status':'Captured available images reconciled; server-wide archive remains incomplete','coverage':{'capturedImageAttachmentsInTour':len(q),'visuallyReviewed':sum(x['id'] in review for x in q)},'confirmedChanges':[{'courseId':r['courseId'],'player':r['player'],'time':r['time'],'submittedAt':r['submittedAt'],'laps':r['laps'],'source':r['source'],'change':'Recovered exact date and proof' if r['time'] in ['1:24.70','1:33.97'] else 'Restored missing WR'} for r in new if r['status']=='community-wr'],'limitations':['One embedded Wakinyo image (EmM5IZ3VgAAUK0A) returns 404. Its surviving post text gives 47.42/47.50 (1:34.92), slower than the standing 1:34.04 Royal Raceway WR; the missing image itself remains unreviewed.','Nu11 previous best 1:25.40 is preserved as unresolved evidence; its chronology is not established.','Dates are original source publication or submission dates, not a claim of the exact instant the race finished.'],'excluded':['Astre 1:25.62 and 1:25.22 were submitted after Nu11 1:25.14; not WRs.','Saki 1:25.09 and Troy 1:24.88 came after faster Kazuo records; not WRs.','Kazuo Royal Raceway 1:34.38 is slower than Nu11 1:33.97; not a WR.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/sunset-2020-reconciliation.json',audit)
print(json.dumps(audit['coverage']))
