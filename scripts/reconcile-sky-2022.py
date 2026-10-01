"""Reconcile Sky Tour 2022 from original results, surrounding corrections and footage."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT/path).read_text())
def save(path, data): (ROOT/path).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
def stamp(mid): return datetime.fromtimestamp(((int(mid)>>22)+1420070400000)/1000, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
def source(mid, channel='875784780573184010'):
    return {'url':f'https://discord.com/channels/629221606064914442/{channel}/{mid}','channel':{'875784780573184010':'tt-submission','896050730216095765':'wr-history'}.get(channel,'tt-discussion'),'messageId':mid}
course='rmx-ghost-valley-1r'
sub=read('archive/submission-visual-review.json')
indexed={r['index']:aid for aid,r in sub.items()}
queue={r['attachmentId']:r for r in read('archive/submission-image-map.json')['images']}
downloads=read('archive/submission-image-downloads.json')
assets=read('archive/assets-manifest.json')
official=source('951165693699706890','896050730216095765')
spec=[(1606,'Kmello',None),(1614,'N',None),(1615,'Wins',None),(1616,'spartacurtYT',None),(1617,'Wins',None),(1618,'Wins',['30.86','30.83']),(1625,'spartacurtYT',['30.81','30.79']),(1661,'spartacurtYT',['30.73','30.84']),(1662,'Nu11',['30.73','30.80']),(1663,'spartacurtYT',['30.78','30.72'])]
rows=[]
for index,player,laps in spec:
    aid=indexed[index];review=sub[aid];assert review['reviewStatus']=='visually-reviewed'
    url=queue[aid]['imageUrl'];dst=ROOT/f'public/assets/proof/sky-2022-{aid}.webp'
    if not dst.exists():Image.open(ROOT/downloads[aid]['path']).convert('RGB').save(dst,'WEBP',lossless=True)
    assets[url]={'path':'/'+str(dst.relative_to(ROOT/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
    rows.append({'messageId':'sky-2022-'+aid,'player':player,'courseId':course,'time':review['time'],'laps':laps or [None,None],'mushrooms':None,'status':'community-wr','submittedAt':stamp(review['messageId']),'proofImage':url,'proofImageVerified':True,'source':source(review['messageId']),'additionalSources':[official],'notes':['Original result image visually read and compared with overlapping submissions and surrounding discussion. Exact date is Discord publication in UTC; race completion may precede publication.']})
by={(r['player'],r['time']):r for r in rows}
video_specs=[('Wins','1:01.69','DTEPMfR5Fqo','wins','946815041255141416'),('spartacurtYT','1:01.60','1tsu2-OFHX0','spart-early','946952350613000232'),('Nu11','1:01.53','cNc8nLRaswU','nu11',None),('spartacurtYT','1:01.50','_oHloCNsZ2Y','spart-final',None)]
for player,time,vid,folder,mid in video_specs:
    r=by[player,time];r.update(video='https://www.youtube.com/watch?v='+vid,videoVerified=True)
    if mid:r['additionalSources'].append(source(mid,'636461740162416640'))
    r['notes'].append('Original video downloaded and visually read at the first-lap crossing and finish; second lap is the final time minus the first lap and agrees with the posted splits where present.')
by['spartacurtYT','1:01.50']['notes'].append('A bot initially attached Nu11’s video to this result. The players identified and corrected that URL in the surrounding discussion. The matched Spart video shows 1:01.50, 30.78/30.72.')
for mid in ['947831924439797760','947832053095882792','947834352061018182']:
    by['spartacurtYT','1:01.50']['additionalSources'].append(source(mid,'636461740162416640'))
held=[]
for player,parent,time in [('Wins','1:01.81','1:01.89'),('spartacurtYT','1:01.78','1:01.92'),('spartacurtYT','1:01.60','1:01.67'),('Nu11','1:01.53','1:01.59')]:
    r={**by[player,parent],'messageId':by[player,parent]['messageId']+'-previous-best','time':time,'laps':[None,None],'submittedAt':None,'observedAt':by[player,parent]['submittedAt'],'dateUnresolved':True,'status':'documented-submission','includeInProgression':False,'notes':['Visible previous best establishes an earlier run, but its original publication date and order against competitors are unresolved. Held outside confirmed progression.']}
    r.pop('video',None);r.pop('videoVerified',None);held.append(r)
supporting=[{'messageId':'sky-2022-wins-6154-video','player':'Wins','courseId':course,'time':'1:01.54','laps':['30.74','30.80'],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':stamp('947909494866853908'),'source':source('947909494866853908','636461740162416640'),'video':'https://www.youtube.com/watch?v=DnPRCsyCPTw','videoVerified':True,'notes':['Original video visually read at 35s and 70–75s: 30.74 + 30.80 = 1:01.54. Slower than Spart’s already published 1:01.50; retained as supporting footage, not a WR. The visible previous best 1:01.67 lacks an independently established publication date.']}]
held.append({**supporting[0],'messageId':'sky-2022-wins-6154-previous-best','time':'1:01.67','laps':[None,None],'submittedAt':None,'observedAt':supporting[0]['submittedAt'],'dateUnresolved':True,'notes':['Visible previous best in Wins’s 1:01.54 video. Its original publication date and competing-record order are unresolved; held outside confirmed progression.']})
held[-1].pop('video');held[-1].pop('videoVerified')
def cs(t):
    m,s=t.split(':');return int(m)*6000+round(float(s)*100)
assert all(cs(a['time'])>cs(b['time']) for a,b in zip(rows,rows[1:]))
for r in rows+supporting:
    if all(x is not None for x in r['laps']):assert sum(round(float(x)*100) for x in r['laps'])==cs(r['time'])
ids={r['messageId'] for r in rows+held+supporting}
save('archive/curated-runs.json',[r for r in read('archive/curated-runs.json') if r.get('messageId') not in ids]+rows+held+supporting)
save('archive/assets-manifest.json',assets)
confirmed={indexed[i] for i,_,_ in spec}
for aid,r in sub.items():
    if 1606<=r['index']<=1692 and r['courseId']==course and r['reviewStatus']=='visually-reviewed':
        r.update(classification='reconciled-wr' if aid in confirmed else 'reviewed-non-wr-submission',reconciliation='archive/sky-2022-reconciliation.json')
for i in [1664,1680]:
    if i in indexed:sub[indexed[i]]['classification']='withdrawn-input-error'
save('archive/submission-visual-review.json',sub)
availability=read('archive/video-availability.json')
preserved=read('archive/video-backup-files/downloads.json')
for player,time,vid,folder,mid in video_specs+[('Wins','1:01.54','DnPRCsyCPTw','wins-6154','947909494866853908')]:
    r=by.get((player,time),supporting[0]);file=ROOT/f'archive/video-backup-files/sky-2022-{folder}/original.mp4';key='youtube:'+vid
    item={'originalUrl':'https://www.youtube.com/watch?v='+vid,'status':'available','checkedAt':'2026-10-01','bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
    availability[key]=item
    preserved[key]={**item,'key':key,'status':'downloaded','file':str(file.relative_to(ROOT)),'folder':str(file.parent.relative_to(ROOT)),'backup':None,'backupStatus':'queued-daily-upload-limit','visualReview':'visually-reviewed','runs':[{'courseId':course,'course':'RMX Ghost Valley 1R','time':time,'player':player,'playerId':player.lower(),'date':r['submittedAt'][:10],'source':r['source']['url']}],'notes':['Verified full original recording; no SuperFX64 upload claimed.']}
save('archive/video-availability.json',availability)
save('archive/video-backup-files/downloads.json',preserved)
audit=read('archive/sky-2022-capture-audit.json');evidence=read('archive/sky-2022-evidence-review.json')
report={'tour':'Sky Tour (2022)','status':'Surviving tour submissions and surrounding discussion reconciled; unresolved earlier runs and broader archive remain incomplete.','coverage':{'freshSubmissionWindows':len(audit['windows']),'freshMessagesIncludingBoundaryOverlap':audit['uniqueMessagesRecaptured'],'discussionMessagesIncludingBoundaryOverlap':len(read('archive/sky-2022-discussion-census.json')),'fullRaceVideosPreserved':5,'techniqueClipsPreserved':1,'newUnlistedBackupsVerified':0},'confirmedChanges':rows,'supportingEvidence':supporting,'previousBestLeads':held,'withdrawnClaims':evidence['corrections'],'officialConfirmation':official,'limitations':['Previous-best displays do not establish original record dates or competing-record order. Five such leads remain outside confirmed progression.','LaLanterne’s 1:01.47 and GOTEN’s 1:00.80 were explicitly withdrawn as input errors; neither is counted as a WR. Their original attachments remain unavailable.','An Astre attachment is unavailable; its surviving bot entry is slower than the contemporary WR.','The 16-second Wins technique clip and hypothetical best splits do not establish a completed overall run.','Contemporaneous discussion reports loss of old WR channels. This review cannot establish exhaustive recovery of deleted sources or all years.','Preserved videos await unlisted SuperFX64 copies after the daily upload limit.']}
save('archive/sky-2022-reconciliation.json',report)
print({'confirmedOrEnriched':len(rows),'supporting':len(supporting),'held':len(held)})
