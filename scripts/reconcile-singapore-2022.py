"""Restore Singapore Tour exchanges from visually reviewed original evidence."""
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
audit = read('archive/singapore-2022-capture-audit.json')
base = 'https://discord.com/channels/629221606064914442/'
def source(channel, mid): return {'url':base+channel+'/'+mid,'channel':{'896050730216095765':'wr-history','875784780573184010':'tt-submission'}.get(channel,'tt-discussion'),'messageId':mid}
official = {'ds-waluigi-pinball-r':source('896050730216095765','935931652855697418'),'singapore-speedway':source('896050730216095765','935931716575559721')}
finals = {'ds-waluigi-pinball-r':source('636461740162416640','935977157589606480'),'singapore-speedway':source('636461740162416640','935977191538327552')}
def preserve(path,url,aid):
    dst=ROOT/f'public/assets/proof/singapore-2022-{aid}.webp'
    if not dst.exists(): Image.open(ROOT/path).convert('RGB').save(dst,'WEBP',lossless=True)
    assets[url]={'path':'/'+str(dst.relative_to(ROOT/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
def make(index,player,laps=None):
    aid=indexed[index];r=sub[aid];assert r['reviewStatus']=='visually-reviewed'
    url=queue[aid]['imageUrl'];preserve(downloads[aid]['path'],url,aid)
    return {'messageId':'singapore-2022-'+aid,'player':player,'courseId':r['courseId'],'time':r['time'],'laps':laps or [None,None],'mushrooms':None,'status':'community-wr','submittedAt':stamp(r['messageId']),'proofImage':url,'proofImageVerified':True,'source':{'url':r['source'],'channel':'tt-submission','messageId':r['messageId']},'additionalSources':[official[r['courseId']],finals[r['courseId']]],'notes':['Original result image visually read and compared with preceding surviving submissions. Date is exact Discord publication in UTC, not an asserted race-completion instant.']}

spec=[(1375,'Romain',['35.94','35.95']),(1376,'Romain',['35.84','35.91']),
      (1378,'Nu11'),(1379,'Nu11'),(1380,'Nu11',['52.32','53.24']),(1391,'N',['52.35','53.12']),
      (1406,'Wins'),(1407,'Wins'),(1409,'Wins'),(1411,'Wins'),(1414,'Wins'),(1416,'Wins'),
      (1422,'Nu11',['35.45','35.46']),(1425,'Nu11',['34.27','36.11']),(1426,'Sucha',['35.00','34.95']),
      (1434,'nekozuki'),(1438,'nekozuki'),(1449,'nekozuki'),(1455,'Sucha',['34.75','34.77']),(1458,'Sucha',['34.70','34.73'])]
rows=[make(*s) for s in spec]
for r in audit['missingFromOriginalIndex']:
    if r.get('classification')!='wr-candidate':continue
    assert r['reviewStatus']=='visually-reviewed'
    preserve(r['localPath'],r['url'],r['attachmentId'])
    rows.append({'messageId':'singapore-2022-'+r['attachmentId'],'player':r['player'],'courseId':r['courseId'],'time':r['time'],'laps':[None,None],'mushrooms':None,'status':'community-wr','submittedAt':r['publishedAt'],'proofImage':r['url'],'proofImageVerified':True,'source':{'url':base+'875784780573184010/'+r['messageId'],'channel':'tt-submission','messageId':r['messageId']},'additionalSources':[official[r['courseId']],finals[r['courseId']]],'notes':['Attachment omitted from the initial capture and recovered by revisiting the original message. Result image visually read; chronology compared with fresh overlapping submission windows. Date is exact evidence publication in UTC.']})
by={(r['player'],r['time']):r for r in rows}
video_specs=[('Nu11','1:45.56','R4DefPSYMTg'),('Nu11','1:10.91','zKR8sIyQcmc'),('Nu11','1:10.38','kjqAvHNjTv0'),('Sucha','1:09.95','9bmeOgAOATU'),('Sucha','1:09.43','7HDDBQW-H_Y'),('Wins','1:11.14','579ZJDPFiyE')]
for player,time,vid in video_specs:
    by[player,time].update(video='https://www.youtube.com/watch?v='+vid,videoVerified=True)
    by[player,time]['notes'].append('Original full video preserved locally and visually checked at lap crossing and finish. Later video publication does not replace the original submission timestamp.')
by['Wins','1:11.14']['laps']=['35.54','35.60']
by['Nu11','1:45.56']['additionalSources'].append(source('875784780573184010','930812238212788304'))
by['Nu11','1:45.56']['notes'].append('Final spreadsheet image mistypes lap 2 as 53.34. Original submission says 53.24; video shows lap 1 52.32 and total 1:45.56, confirming 53.24.')
by['Sucha','1:09.43']['additionalSources'].append(source('875784780573184010','935569373769383936'))
by['Sucha','1:09.43']['notes'].append('HIKARU and Sucha attribution is corroborated by Sucha’s January 24 request to rename their leaderboard entry and the administrator’s confirmation.')
supporting=[make(1418,'Spart',['35.89','35.79'])]
supporting[0].update(status='documented-submission',includeInProgression=False,video='https://www.youtube.com/watch?v=D5zpal67nw4',videoVerified=True)
supporting[0]['notes'].append('Full video 1:11.68 verified; Wins already held 1:11.26, so this is not a WR.')
held=[]
for player,parent,time in [('Romain','1:11.89','1:12.33'),('Nu11','1:45.73','1:45.84'),('Wins','1:11.61','1:11.64'),('Wins','1:11.56','1:11.58'),('Wins','1:11.53','1:11.54'),('Nu11','1:10.91','1:11.00'),('Nu11','1:10.38','1:10.45'),('Sucha','1:09.95','1:10.70'),('Sucha','1:09.52','1:09.75')]:
    r={**by[player,parent],'messageId':by[player,parent]['messageId']+'-previous-best','time':time,'laps':[None,None],'submittedAt':None,'observedAt':by[player,parent]['submittedAt'],'dateUnresolved':True,'status':'documented-submission','includeInProgression':False,'notes':['Visible previous best proves an earlier run. Its original date and ordering against competing records remain unresolved; do not assign a guessed WR date.']}
    for key in ['video','videoVerified']:r.pop(key,None)
    held.append(r)
for r in rows+supporting:
    if all(x is not None for x in r['laps']):
        m,s=r['time'].split(':');assert sum(round(float(l)*100) for l in r['laps'])==int(m)*6000+round(float(s)*100),r
ids={r['messageId'] for r in rows+supporting+held}
save('archive/curated-runs.json',[r for r in read('archive/curated-runs.json') if r.get('messageId') not in ids]+rows+supporting+held)
save('archive/assets-manifest.json',assets)
confirmed={indexed[s[0]] for s in spec}
for aid,r in sub.items():
    if 1373<=r['index']<=1462:
        r.update(classification='reconciled-wr' if aid in confirmed else 'reviewed-non-wr-submission',reconciliation='archive/singapore-2022-reconciliation.json')
save('archive/submission-visual-review.json',sub)
videos=[]
for name,note,kind in [('nu11-wpr','Waluigi Pinball R 1:45.56, 52.32/53.24.','full-wr'),('nu11-7091','Singapore 1:10.91, 35.45/35.46; no cannon glitch.','full-wr'),('nu11-ss','Singapore 1:10.38, 34.27/36.11; cannon glitch.','full-wr'),('sucha-6995','Singapore 1:09.95, 35.00/34.95.','full-wr'),('wins-7114','Singapore 1:11.14, 35.54/35.60.','full-wr'),('spart','Singapore 1:11.68, 35.89/35.79; slower than standing WR.','full-personal-best'),('wins-wpr-lap','Waluigi Pinball R first lap 52.41 only.','technique'),('wins-wpr-lap2','Waluigi Pinball R second lap excerpt, finish 1:45.81. Not a full-run video.','technique'),('spart-hop','Hop-cancel tutorial; no full run.','technique')]:
    folder='archive/video-backup-files/singapore-2022-'+name;meta=read(folder+'/original.info.json')
    videos.append({'file':folder+'/original.mp4','originalUrl':meta['webpage_url'],'classification':kind,'notes':note})
videos.append({'file':'archive/video-backup-files/6f3fb0989beb529b9734/original.mp4','originalUrl':'https://www.youtube.com/watch?v=7HDDBQW-H_Y','classification':'full-wr','notes':'Sucha Singapore 1:09.43; 34.70/34.73. Original already downloaded; visually verified again against the exact submission.'})
for aid,name,note,channel in [('932848729646587924','haruru-932848729646587924.mp4','Haruru 17-second opening route attempt; no completed lap or result.','875784780573184010'),('932359292311461968','wins-932359292311461968.mov','Wins five-second final-corner technique demonstration; no full run.','636461740162416640')]:
    url=next(r['url'] for r in audit['missingFromOriginalIndex'] if r['attachmentId']==aid) if channel=='875784780573184010' else 'https://cdn.discordapp.com/attachments/'+channel+'/'+aid+'/RPReplay_Final1642361919.mov'
    videos.append({'file':'archive/singapore-2022-original-media/'+name,'originalUrl':url,'classification':'technique','notes':note})
availability=read('archive/video-availability.json')
for v in videos:
    p=ROOT/v['file'];v.update(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size,reviewStatus='visually-reviewed',backupStatus='queued-daily-upload-limit')
    u=v['originalUrl'];vid=u.split('v=')[-1] if 'watch?v=' in u else u.split('/shorts/')[-1] if '/shorts/' in u else None
    key='youtube:'+vid if vid else u
    availability[key]={'originalUrl':u,'status':'available','checkedAt':datetime.now(timezone.utc).isoformat(),'bytes':v['bytes'],'sha256':v['sha256'],'reason':'Downloaded and visually reviewed: '+v['notes']}
availability['youtube:PnKptyLllnw']={'originalUrl':'https://youtube.com/shorts/PnKptyLllnw','status':'unavailable','checkedAt':datetime.now(timezone.utc).isoformat(),'reason':'Original early Singapore route short linked January 12. Download reports video unavailable; no replacement URL invented.'}
save('archive/video-availability.json',availability)
save('archive/singapore-2022-original-videos.json',videos)
save('archive/singapore-2022-reconciliation.json',{'tour':'Singapore Tour','status':'Surviving submissions rechecked; broader archive and undated previous bests remain incomplete.','coverage':{'freshSubmissionWindows':len(audit['windows']),'freshMessagesIncludingBoundaryOverlap':audit['uniqueMessagesRecaptured'],'recoveredResultImages':20,'recoveredWRImages':6,'originalVideosAndClipsPreserved':len(videos),'newUnlistedBackupsVerified':0},'confirmedChanges':rows,'supportingEvidence':supporting,'previousBestLeads':held,'officialConfirmations':official,'finalStandings':finals,'limitations':['Twenty result images were absent from the original capture. All were recovered and visually reviewed; six restore intermediate WRs. Earlier and later tours require the same capture audit.','Nine visible previous-best leads have unresolved dates and are excluded from progression.','The January 12 Wins route short PnKptyLllnw is unavailable.','Original media is saved locally; new unlisted uploads remain queued after the YouTube daily upload limit.','Final standings contain a 53.34 typo for Nu11 lap 2; the original video and submission establish 53.24.','This does not certify that every historical WR was posted or that every source across all years has been reviewed.']})
print({'confirmedOrEnriched':len(rows),'supporting':len(supporting),'held':len(held),'videos':len(videos)})
