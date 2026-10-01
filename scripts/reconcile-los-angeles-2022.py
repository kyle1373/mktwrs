"""Reconcile Los Angeles Tour 2022 from visually reviewed original evidence."""
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
audit = read('archive/los-angeles-2022-capture-audit.json')
base = 'https://discord.com/channels/629221606064914442/'
def source(channel, mid): return {'url':base+channel+'/'+mid,'channel':{'896050730216095765':'wr-history','875784780573184010':'tt-submission'}.get(channel,'tt-discussion'),'messageId':mid}
official = {'3ds-wario-shipyard':source('896050730216095765','949247837768646667'),'wii-dk-summit-r':source('896050730216095765','949318334300692590')}
def preserve(path,url,aid):
    dst=ROOT/f'public/assets/proof/la-2022-{aid}.webp'
    if not dst.exists(): Image.open(ROOT/path).convert('RGB').save(dst,'WEBP',lossless=True)
    assets[url]={'path':'/'+str(dst.relative_to(ROOT/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
def make(r,aid,player,laps,url,path):
    assert r['reviewStatus']=='visually-reviewed'
    preserve(path,url,aid)
    return {'messageId':'la-2022-'+aid,'player':player,'courseId':r['courseId'],'time':r['time'],'laps':laps or [None,None],'mushrooms':None,'status':'community-wr','submittedAt':stamp(r['messageId']),'proofImage':url,'proofImageVerified':True,'source':source('875784780573184010',r['messageId']),'additionalSources':[official[r['courseId']]],'notes':['Original result image visually read and reconciled with fresh overlapping submissions and surrounding discussion. Exact date is Discord publication in UTC; race completion may precede publication.']}
spec=[(1535,'Timaël'),(1536,'Y146'),(1537,'N'),(1544,'Wins'),(1546,'Wins'),(1548,'Wakinyo',['47.02','47.01']),(1549,'Wakinyo',['47.04','46.98']),(1553,'Wins',['47.06','46.93']),(1554,'Nu11'),(1557,'N'),(1562,'Nu11'),(1572,'Nu11'),(1573,'Nu11',['48.49','48.97'])]
rows=[]
for index,player,*laps in spec:
    aid=indexed[index];rows.append(make(sub[aid],aid,player,laps[0] if laps else None,queue[aid]['imageUrl'],downloads[aid]['path']))
for r in audit['missingFromOriginalIndex']:
    if r.get('classification') in ['wr-candidate','reconciled-wr']:
        rows.append(make(r,r['attachmentId'],r['player'],r.get('laps'),r['url'],r['localPath']))
rows.sort(key=lambda r:r['submittedAt'])
by={(r['player'],r['time']):r for r in rows}
for player,time,url,mid in [('Wins','1:33.99','https://www.youtube.com/watch?v=vWkR6pKoUhA','941122762053931128'),('Nu11','1:33.59','https://www.youtube.com/watch?v=FEvf5EMYg-Y','943335853365809152'),('Nu11','1:37.46','https://www.youtube.com/watch?v=fyBuj_BxMuk','946169689405542420')]:
    r=by[player,time];r.update(video=url,videoVerified=True);r['additionalSources'].append(source('636461740162416640',mid));r['notes'].append('Original video downloaded and visually checked at lap crossing and finish; both splits agree with the final time. The later video post does not replace the earlier result submission date.')
by['Nu11','1:33.82'].update(video='https://www.youtube.com/watch?v=S1VUA9oAu9Q',videoVerified=False)
by['Nu11','1:33.82']['additionalSources'].append(source('636461740162416640','941343676108513321'))
by['Nu11','1:33.82']['notes'].append('Original video is unavailable at review; the original result image and posted splits survive.')
by['Wins','1:33.91']['notes'].append('Tie with Wakinyo’s earlier 1:33.91. Posted .02/.89 resolves to 47.02/46.89 and sums to the screenshot total.')
by['Wins','1:33.85']['notes'].append('Posted .97/.88 resolves to 46.97/46.88 and sums to the screenshot total.')
# Explicitly retain only confirmed improvements and ties in the main chronology.
for course in official:
    best=None
    for r in [r for r in rows if r['courseId']==course]:
        m,s=r['time'].split(':');cs=int(m)*6000+round(float(s)*100)
        assert best is None or cs<=best,(r,best)
        best=cs
held=[]
for player,parent,time in [('Y146','1:34.86','1:35.04'),('N','1:34.62','1:35.38'),('Wakinyo','1:34.03','1:34.08'),('Wins','1:33.99','1:34.06'),('Nu11','1:33.94','1:34.04'),('N','1:38.98','1:39.08'),('Nu11','1:33.82','1:33.89'),('Nu11','1:33.76','1:33.81'),('Nu11','1:37.59','1:37.68'),('Nu11','1:37.51','1:37.56')]:
    parentrow=by[player,parent]
    r={**parentrow,'messageId':parentrow['messageId']+'-previous-best','time':time,'laps':[None,None],'submittedAt':None,'observedAt':parentrow['submittedAt'],'dateUnresolved':True,'status':'documented-submission','includeInProgression':False,'notes':['Visible previous best establishes an earlier run but not its original publication date or order against competing records. Held outside confirmed progression.']}
    for key in ['video','videoVerified']:r.pop(key,None)
    held.append(r)
supporting=[{'messageId':'la-2022-sucha-9750-video','player':'Sucha','courseId':'wii-dk-summit-r','time':'1:37.50','laps':['48.49','49.01'],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':stamp('944415148242767872'),'source':source('636461740162416640','944415148242767872'),'video':'https://www.youtube.com/watch?v=2KZlFILZ_Uc','videoVerified':True,'notes':['Full original video visually checked at lap crossing and finish. 48.49 + 49.01 = 1:37.50. Slower than Nu11’s already posted 1:37.46; retained as supporting video, not a WR.']}]
for r in rows+supporting:
    if all(x is not None for x in r['laps']):
        m,s=r['time'].split(':');assert sum(round(float(l)*100) for l in r['laps'])==int(m)*6000+round(float(s)*100),r
ids={r['messageId'] for r in rows+supporting+held}
save('archive/curated-runs.json',[r for r in read('archive/curated-runs.json') if r.get('messageId') not in ids]+rows+supporting+held)
save('archive/assets-manifest.json',assets)
confirmed={indexed[s[0]] for s in spec}
for aid,r in sub.items():
    if 1535<=r['index']<=1605 and r['courseId'] in official:
        r.update(classification='reconciled-wr' if aid in confirmed else 'reviewed-non-wr-submission',reconciliation='archive/los-angeles-2022-reconciliation.json')
for r in audit['missingFromOriginalIndex']:
    if r.get('classification')=='wr-candidate':r['classification']='reconciled-wr'
save('archive/submission-visual-review.json',sub)
save('archive/los-angeles-2022-capture-audit.json',audit)
report={'tour':'Los Angeles Tour (2022)','status':'Surviving tour submissions and nearby discussion reconciled; undated earlier runs and broader archive remain incomplete.','coverage':{'freshSubmissionWindows':len(audit['windows']),'freshMessagesIncludingBoundaryOverlap':audit['uniqueMessagesRecaptured'],'recoveredResultImages':50,'recoveredImagesContributingWRs':13,'discussionMessagesIncludingBoundaryOverlap':len(read('archive/los-angeles-2022-discussion-census.json')),'newUnlistedBackupsVerified':0},'confirmedChanges':rows,'supportingEvidence':supporting,'previousBestLeads':held,'officialConfirmations':official,'limitations':['Ten visible previous-best runs lack independently established publication dates and competing-record order; they remain outside confirmed progression.','Nozomi’s 1:34.78 message gives 37.33/37.45; those splits conflict with the image. Seboss’s 1:33.96 message also has conflicting splits. Neither is a confirmed WR.','The original 1:33.82 video is unavailable, but its image and posted lap splits survive.','Single-lap demonstrations and no-item runs are preserved separately and do not count as overall WRs.','Original video backups are queued after the YouTube daily upload limit; none are falsely marked uploaded.','This tour-level review does not establish complete coverage across all years, channels, or deleted evidence.']}
report['coverage']['originalVideosAndClipsPreserved'] = len(read('archive/los-angeles-2022-original-videos.json'))
save('archive/los-angeles-2022-reconciliation.json',report)
print({'confirmedOrEnriched':len(rows),'supporting':len(supporting),'held':len(held)})
