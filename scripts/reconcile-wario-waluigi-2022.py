"""Reconcile Wario vs. Waluigi Tour from original submissions and nearby discussion."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT/path).read_text())
def save(path, data): (ROOT/path).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
def stamp(mid): return datetime.fromtimestamp(((int(mid)>>22)+1420070400000)/1000, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
sub = read('archive/submission-visual-review.json')
indexed = {r['index']: aid for aid,r in sub.items()}
queue = {r['attachmentId']:r for r in read('archive/submission-image-map.json')['images']}
downloads = read('archive/submission-image-downloads.json')
assets = read('archive/assets-manifest.json')
audit = read('archive/wario-waluigi-2022-capture-audit.json')
base = 'https://discord.com/channels/629221606064914442/'
def source(channel, mid): return {'url':base+channel+'/'+mid,'channel':{'896050730216095765':'wr-history','875784780573184010':'tt-submission'}.get(channel,'tt-discussion'),'messageId':mid}
official = {'3ds-bowser-s-castle':source('896050730216095765','941770805384216628'),'rmx-rainbow-road-1r':source('896050730216095765','941770257905881178')}
def preserve(path,url,aid):
    dst=ROOT/f'public/assets/proof/wario-2022-{aid}.webp'
    if not dst.exists(): Image.open(ROOT/path).convert('RGB').save(dst,'WEBP',lossless=True)
    assets[url]={'path':'/'+str(dst.relative_to(ROOT/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
def make(index,player,laps=None):
    aid=indexed[index];r=sub[aid];assert r['reviewStatus']=='visually-reviewed'
    url=queue[aid]['imageUrl'];preserve(downloads[aid]['path'],url,aid)
    return {'messageId':'wario-2022-'+aid,'player':player,'courseId':r['courseId'],'time':r['time'],'laps':laps or [None,None],'mushrooms':None,'status':'community-wr','submittedAt':stamp(r['messageId']),'proofImage':url,'proofImageVerified':True,'source':source('875784780573184010',r['messageId']),'additionalSources':[official[r['courseId']]],'notes':['Original result image visually read and reconciled against fresh overlapping submissions and surrounding discussion. Date is exact Discord publication in UTC, not an asserted race-completion instant.']}
spec=[(1468,'Timaël'),(1469,'Timaël'),(1470,'Timaël'),(1471,'Timaël'),(1472,'Timaël',['49.00','48.91']),
      (1478,'Nu11',['37.42','39.33']),
      (1488,'Wins'),(1489,'newyork'),(1490,'Wins'),(1491,'Wins'),(1492,'newyork'),
      (1497,'Wins'),(1498,'Wins'),(1499,'Wins'),(1500,'Wins'),(1508,'Wins'),(1517,'Wins',['47.69','47.70'])]
rows=[make(*s) for s in spec]
by={(r['player'],r['time']):r for r in rows}
by['Wins','1:35.39'].update(video='https://twitter.com/winsmkt/status/1491313969277321221',videoVerified=True)
by['Wins','1:35.39']['additionalSources'].append(source('636461740162416640','940873527945465866'))
by['Wins','1:35.39']['notes'].append('Original Twitter video preserved locally and visually checked at lap crossing and finish: 47.69 + 47.70 = 1:35.39. February 9 video post does not replace February 3 submission date.')
by['Nu11','1:16.75'].update(video='https://www.youtube.com/watch?v=nDNgGMsrDIY',videoVerified=True)
by['Nu11','1:16.75']['notes'].append('Original video preserved and visually checked: lap 1 37.42, total 1:16.75, lap 2 39.33 by subtraction. Kaguya and Nu11 attribution follows the original submitter and existing canonical identity.')
by['Wins','1:36.31']['additionalSources'].append(source('636461740162416640','937679853828845648'))
by['Wins','1:36.31']['notes'].append('A nearby message mentions a .97 first lap but does not explicitly bind that lap to this completed run. Keep laps unresolved rather than treating a best-lap report as a verified run split.')

supporting=[make(1485,'Spart'),make(1486,'Spart'),make(1494,'Spart',['48.92','48.62'])]
for r in supporting:
    r.update(status='documented-submission',includeInProgression=False)
    r['additionalSources'].append(source('875784780573184010','937055362627010680'))
    r['notes'].append('Phillish replied to the 1:37.87 WR claim that they already had .5 but had not submitted it. This makes the WR status of Spart’s 1:37.87 and 1:37.76 unresolved; neither is promoted to confirmed progression.')
supporting[-1].update(video='https://youtu.be/BcGYgrQoHO0',videoVerified=True)
supporting[-1]['notes']=['Video visually checked: 1:37.54, lap 1 48.92 and lap 2 48.62 by subtraction. It was slower than the already posted 1:36.41. Recording begins several seconds into lap 1.']
supporting.append({'messageId':'wario-2022-speedy-video','player':'David Riedy','courseId':'3ds-bowser-s-castle','time':'1:35.86','laps':['47.86','48.00'],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':stamp('939255352522850333'),'source':source('636461740162416640','939255352522850333'),'video':'https://youtu.be/WzgLYFp-M_U','videoVerified':True,'notes':['Original full video preserved and visually checked at lap crossing and finish. Wins already held 1:35.39; this is supporting video evidence, not a WR.']})
held=[]
for player,parent,time in [('Timaël','1:37.91','1:38.42'),('Nu11','1:16.75','1:16.93'),('newyork','1:36.88','1:37.01'),('newyork','1:36.41','1:36.51'),('Wins','1:35.73','1:35.81')]:
    r={**by[player,parent],'messageId':by[player,parent]['messageId']+'-previous-best','time':time,'laps':[None,None],'submittedAt':None,'observedAt':by[player,parent]['submittedAt'],'dateUnresolved':True,'status':'documented-submission','includeInProgression':False,'notes':['Visible previous best proves an earlier run, but original publication date and competing-record order remain unresolved. Held outside confirmed progression.']}
    for key in ['video','videoVerified']:r.pop(key,None)
    held.append(r)
for r in rows+supporting:
    if all(x is not None for x in r['laps']):
        m,s=r['time'].split(':');assert sum(round(float(l)*100) for l in r['laps'])==int(m)*6000+round(float(s)*100),r
ids={r['messageId'] for r in rows+supporting+held}
save('archive/curated-runs.json',[r for r in read('archive/curated-runs.json') if r.get('messageId') not in ids]+rows+supporting+held)
save('archive/assets-manifest.json',assets)
confirmed={indexed[s[0]] for s in spec}
contested={indexed[1485],indexed[1486]}
for aid,r in sub.items():
    if 1463<=r['index']<=1534 or r['index']==1538:
        r.update(classification='reconciled-wr' if aid in confirmed else 'contested-wr-claim' if aid in contested else 'reviewed-non-wr-submission',reconciliation='archive/wario-waluigi-2022-reconciliation.json')
save('archive/submission-visual-review.json',sub)
videos=[]
for name,kind,note in [('wins','full-wr','3DS Bowser’s Castle 1:35.39, 47.69/47.70.'),('nu11','full-wr','RMX Rainbow Road 1R 1:16.75, 37.42/39.33.'),('spart','personal-best','Bowser’s Castle 1:37.54, 48.92/48.62; recording begins several seconds into lap 1.'),('speedy-full','full-personal-best','David Riedy Bowser’s Castle 1:35.86, 47.86/48.00.'),('speedy','single-lap','David Riedy Bowser’s Castle 47.99 first lap.'),('speedy-lap','single-lap','David Riedy Bowser’s Castle 47.75 first lap.'),('sucha-lap','single-lap','Sucha RMX Rainbow Road 1R 39.52 first lap, no items; not a full run.')]:
    folder='archive/video-backup-files/wario-2022-'+name;meta=read(folder+'/original.info.json')
    videos.append({'file':folder+'/original.mp4','originalUrl':meta['webpage_url'],'classification':kind,'notes':note})
for aid,mid,note in [('937693509064986704','937693510436544522','Wins ten-second second-lap opening technique; no completed run.'),('938457681696555089','938457683412013086','Sucha fifteen-second opening technique; no completed lap or run.')]:
    url=next(l['href'] for r in read('archive/wario-waluigi-2022-discussion-census.json') if r['id']==mid for l in r['links'] if aid in l['href'])
    videos.append({'file':'archive/wario-waluigi-2022-original-media/'+aid+'.mov','originalUrl':url,'classification':'technique','notes':note})
availability=read('archive/video-availability.json')
for v in videos:
    p=ROOT/v['file'];v.update(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size,reviewStatus='visually-reviewed',backupStatus='queued-daily-upload-limit')
    u=v['originalUrl'];vid=u.split('v=')[-1] if 'watch?v=' in u else u.split('/shorts/')[-1] if '/shorts/' in u else None
    key='youtube:'+vid if vid else 'twitter:'+u.split('/status/')[-1] if '/status/' in u else u
    availability[key]={'originalUrl':u,'status':'available','checkedAt':datetime.now(timezone.utc).isoformat(),'bytes':v['bytes'],'sha256':v['sha256'],'reason':'Downloaded and visually reviewed: '+v['notes']}
save('archive/video-availability.json',availability)
save('archive/wario-waluigi-2022-original-videos.json',videos)
save('archive/wario-waluigi-2022-reconciliation.json',{'tour':'Wario vs. Waluigi Tour','status':'Surviving submissions and surrounding discussion reconciled; unresolved claims and broader archive remain incomplete.','coverage':{'freshSubmissionWindows':len(audit['windows']),'freshMessagesIncludingBoundaryOverlap':audit['uniqueMessagesRecaptured'],'recoveredResultImages':1,'originalVideosAndClipsPreserved':len(videos),'newUnlistedBackupsVerified':0},'confirmedChanges':rows,'supportingEvidence':supporting,'previousBestLeads':held,'officialConfirmations':official,'limitations':['Spart’s 1:37.87 and 1:37.76 are held outside confirmed WR progression because Phillish’s nearby reply claims an earlier .5. Exact hundredths and date for that claimed run remain unresolved.','Five earlier previous-best runs lack independently established dates and ordering.','The nearby .97 first-lap message cannot securely be assigned to Wins’s 1:36.31; split fields remain empty.','The recovered Kirio 1:36.93 image is a late repost and slower than the standing WR.','Original media is preserved locally; unlisted backups are queued after the YouTube daily limit.','This tour-level review does not certify every historical record across all years or sources.']})
print({'confirmedOrEnriched':len(rows),'supporting':len(supporting),'held':len(held),'videos':len(videos)})
