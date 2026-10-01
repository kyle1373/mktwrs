"""Reconcile Mii Tour evidence against all-time records from earlier tours."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text())
def save(p,d):(ROOT/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def stamp(mid):return datetime.fromtimestamp(((int(mid)>>22)+1420070400000)/1000,timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
def source(mid,channel='875784780573184010'):return {'url':f'https://discord.com/channels/629221606064914442/{channel}/{mid}','channel':{'875784780573184010':'tt-submission','896050730216095765':'wr-history'}.get(channel,'tt-discussion'),'messageId':mid}
sub=read('archive/submission-visual-review.json');idx={r['index']:aid for aid,r in sub.items()};queue={r['attachmentId']:r for r in read('archive/submission-image-map.json')['images']};downloads=read('archive/submission-image-downloads.json');assets=read('archive/assets-manifest.json')
rows=[]
for index,player,laps,confirmation in [(1734,'Wakinyo',['39.57','39.37'],'953229274549207061'),(1745,'Hilton',['29.07','35.23'],'953771609485869066'),(1776,'Nu11',['39.64','39.18'],'956184264779649054')]:
 aid=idx[index];r=sub[aid];assert r['reviewStatus']=='visually-reviewed';url=queue[aid]['imageUrl'];dst=ROOT/f'public/assets/proof/mii-2022-{aid}.webp'
 if not dst.exists():Image.open(ROOT/downloads[aid]['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[url]={'path':'/'+str(dst.relative_to(ROOT/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
 rows.append({'messageId':'mii-2022-'+aid,'player':player,'courseId':r['courseId'],'time':r['time'],'laps':laps,'mushrooms':None,'status':'community-wr','submittedAt':stamp(r['messageId']),'source':source(r['messageId']),'additionalSources':[source(confirmation,'636461740162416640')],'proofImage':url,'proofImageVerified':True,'notes':['Original result image visually read. Compared against standing all-time records from earlier tours, not just this tour’s leaderboard. Dates document surviving publication, not an exact race-completion instant.']})
by={r['player']:r for r in rows}
by['Wakinyo']['additionalSources'].append(source('953156794677612615'))
by['Wakinyo']['notes'].append('1:18.94 improves the standing 1:18.95. Use the original result and 39.57/39.37 message rather than its later bot-command repost.')
by['Hilton']['additionalSources'] += [source('953769140588519434'),source('966540176568512563','896050730216095765')]
by['Hilton']['notes'].append('1:04.30 ties Kazuo’s May 2021 record. The first screenshot precedes the corrected submission command by three minutes. The nearby 1:04.45 menu video is a different, slower run and is not linked as WR race footage.')
vid='OFFJGT-J0w4';url='https://www.youtube.com/watch?v='+vid;meta=read('archive/video-backup-files/mii-2022-nu11-final/original.info.json');published=datetime.fromtimestamp(meta['timestamp'],timezone.utc).isoformat().replace('+00:00','Z')
r=by['Nu11'];r['additionalSources'] += [r['source'],source('966457752471883866','896050730216095765')];r.update(video=url,videoVerified=True,source={'url':url,'channel':'original-video','publishedAt':published},submittedAt=published)
r['notes'].append('Original video publication '+published+' predates the March 23 Discord submission. First-lap crossing and finish visually verified: 39.64 + 39.18 = 1:18.82. Publication proves the run existed by this instant; it does not prove its completion instant.')
held=[{**r,'messageId':r['messageId']+'-previous-best','time':'1:18.84','laps':[None,None],'submittedAt':None,'observedAt':published,'dateUnresolved':True,'status':'documented-submission','includeInProgression':False,'notes':['Visible previous best 1:18.84 in the result image establishes an earlier run, but no original date or position against Wakinyo’s 1:18.94 is established. Held outside confirmed progression.']}]
held[0].pop('video');held[0].pop('videoVerified')
supporting=[{'messageId':'mii-2022-spart-7946-video','player':'spartacurtYT','courseId':'rmx-rainbow-road-1','time':'1:19.46','laps':['39.77','39.69'],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':stamp('952323484460155001'),'source':source('952323484460155001'),'additionalSources':[source('952324245705338890','636461740162416640')],'video':'https://www.youtube.com/watch?v=dM87HejLzys','videoVerified':True,'notes':['Full original video visually checked at first-lap crossing45s and finish85s: 39.77 + 39.69 = 1:19.46. Slower than the standing 1:18.95 record from 2021; retained as supporting footage only.']}]
for r in rows+supporting:
 m,s=r['time'].split(':');assert sum(round(float(l)*100) for l in r['laps'])==int(m)*6000+round(float(s)*100)
ids={r['messageId'] for r in rows+held+supporting};save('archive/curated-runs.json',[r for r in read('archive/curated-runs.json') if r.get('messageId') not in ids]+rows+held+supporting);save('archive/assets-manifest.json',assets)
for aid,r in sub.items():
 if 1693<=r['index']<=1778 and r['courseId'] in ['n64-kalimari-desert-2r','rmx-rainbow-road-1'] and r.get('reviewStatus')=='visually-reviewed':r.update(classification='reconciled-wr' if r['index'] in [1734,1745,1776] else 'reviewed-non-wr-submission',reconciliation='archive/mii-2022-reconciliation.json')
save('archive/submission-visual-review.json',sub)
audit=read('archive/mii-2022-capture-audit.json')
for r in audit['missingFromOriginalIndex']:
 if r.get('reviewStatus')=='visually-reviewed':r.update(classification='reviewed-non-wr-submission',reconciliation='archive/mii-2022-reconciliation.json')
save('archive/mii-2022-capture-audit.json',audit)
availability=read('archive/video-availability.json');ledger=read('archive/video-backup-files/downloads.json')
for vid,folder,run in [('OFFJGT-J0w4','mii-2022-nu11-final',by['Nu11']),('dM87HejLzys','mii-2022-spart-7946',supporting[0])]:
 f=ROOT/f'archive/video-backup-files/{folder}/original.mp4';item={'originalUrl':'https://www.youtube.com/watch?v='+vid,'status':'available','checkedAt':'2026-10-01','bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()};key='youtube:'+vid;availability[key]=item
 ledger[key]={**item,'key':key,'status':'downloaded','file':str(f.relative_to(ROOT)),'folder':str(f.parent.relative_to(ROOT)),'backup':None,'backupStatus':'queued-daily-upload-limit','reviewStatus':'visually-reviewed','runs':[{'courseId':run['courseId'],'time':run['time'],'player':run['player'],'laps':run['laps'],'date':run['submittedAt'][:10]}]}
save('archive/video-availability.json',availability);save('archive/video-backup-files/downloads.json',ledger)
report={'tour':'Mii Tour (2022)','status':'Surviving submissions and nearby discussion reconciled against prior-tour all-time records; broader archive remains incomplete.','coverage':{'freshSubmissionWindows':len(audit['windows']),'submissionMessagesIncludingBoundaryOverlap':audit['uniqueMessagesRecaptured'],'discussionMessagesIncludingBoundaryOverlap':len(read('archive/mii-2022-discussion-census.json')),'omittedImagesRecoveredAndReviewed':6,'fullRaceVideosPreserved':2,'resultOrTechniqueClipsPreserved':2,'newUnlistedBackupsVerified':0},'confirmedChanges':rows,'supportingEvidence':supporting,'previousBestLeads':held,'excludedApparentRecords':[{'time':t,'reason':'Slower than the standing all-time 1:18.95 from February 2021, regardless of the WR wording in the post.'} for t in ['1:22.25','1:21.40','1:21.31','1:20.95','1:20.12','1:19.05']],'limitations':['Nu11’s 1:18.84 previous best has no independently established original publication date.','Several opening posts call slower times WRs. The existing all-time baseline, not those labels or a tour-only leaderboard, determines record eligibility.','One Starin bot-entry attachment remains unreviewed; its corrected surviving result is slower than the all-time record.','This tour review does not prove complete coverage across all years, channels or deleted evidence.','YouTube copies remain queued after the upload limit; no new SuperFX64 backups are claimed.']}
save('archive/mii-2022-reconciliation.json',report)
print({'confirmedOrEnriched':len(rows),'supporting':len(supporting),'held':len(held)})
