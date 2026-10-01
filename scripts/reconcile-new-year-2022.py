"""Reconcile New Year's 2022 records using images, messages and original videos."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT / path).read_text())
def save(path, value): (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
sub = read('archive/submission-visual-review.json')
downloads = read('archive/submission-image-downloads.json')
queue = {r['attachmentId']: r for r in read('archive/submission-image-map.json')['images']}
assets = read('archive/assets-manifest.json')
indexed = {r['index']: aid for aid, r in sub.items()}
base = 'https://discord.com/channels/629221606064914442/'
announcement = {'url': base+'930925864944795728/930963206942371900', 'channel': 'tt-announcements', 'messageId': '930963206942371900'}

def preserve(path, url, name):
    dst = ROOT / f'public/assets/proof/new-year-2022-{name}.webp'
    if not dst.exists(): Image.open(ROOT / path).convert('RGB').save(dst, 'WEBP', lossless=True)
    assets[url] = {'path': '/' + str(dst.relative_to(ROOT / 'public')), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes': dst.stat().st_size, 'contentType': 'image/webp'}

def make(index, player, laps=None):
    aid = indexed[index]
    r = sub[aid]
    assert r['reviewStatus'] == 'visually-reviewed'
    url = queue[aid]['imageUrl']
    preserve(downloads[aid]['path'], url, aid)
    # Discord snowflakes identify the message's own publication, unlike a time
    # element in an embedded reply or edited-message tooltip.
    date = datetime.fromtimestamp(((int(r['messageId']) >> 22) + 1420070400000)/1000, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    return {'messageId': 'new-year-2022-'+aid, 'player': player, 'courseId': r['courseId'], 'time': r['time'], 'laps': laps or [None, None], 'mushrooms': None, 'status': 'community-wr', 'submittedAt': date, 'proofImage': url, 'proofImageVerified': True, 'source': {'url': r['source'], 'channel': 'tt-submission', 'messageId': r['messageId']}, 'additionalSources': [announcement], 'notes': ['Original result screenshot visually read and reconciled against preceding submissions. Date is evidence publication in UTC; it does not assert an exact race-completion instant.']}

spec = [(1236,'Timaël'),(1239,'Timaël'),(1240,'Timaël'),(1241,'Ecliptix'),(1242,'saki7'),(1261,'Wins',['38.72','38.61']), (1262,'Wins'),(1263,'nekozuki'),(1269,'Phillish',['38.78','38.50']), (1273,'nekozuki'),(1274,'SuperFX'),(1276,'Nu11'),(1289,'Wins',['38.69','38.44']), (1292,'Phillish',['38.56','38.54']),(1295,'Wins'),(1299,'Phillish',['38.59','38.44']), (1304,'nekozuki'),(1310,'nekozuki',['17.17','17.03']),(1312,'Wins'),(1354,'DIT'),(1371,'Nu11',['37.52','37.36'])]
rows = [make(*s) for s in spec]
dit = next(r for r in rows if r['player']=='DIT')
dit['notes'].append('Image is a screenshot of DIT’s own tweet reposted by Wins. Both runs belong to DIT. The visible 34.20 previous best means an earlier equal run existed; its original date is unresolved. Retain the exact surviving Discord publication date, not a guessed tweet timezone.')
kd = {**dit, 'messageId': dit['messageId']+'-kalimari', 'courseId': 'n64-kalimari-desert', 'time': '1:14.92', 'notes': ['Same original DIT tweet screenshot visibly contains Kalimari Desert 1:14.92, previous best 1:15.01. Player is DIT, not the reposter. Date is the surviving evidence publication in UTC.']}
rows.append(kd)
for r in read('archive/new-year-2022-recovered-attachments.json')['items']:
    if r['recordStatus'] != 'wr-candidate': continue
    time = f"{int(r['time'])//60}:{r['time']%60:05.2f}"
    preserve(r['localPath'], r['url'], r['attachment'])
    rows.append({'messageId':'new-year-2022-'+r['attachment'],'player':'Phillish','courseId':r['courseId'],'time':time,'laps':[f'{l:.2f}' for l in r['laps']],'mushrooms':None,'status':'community-wr','submittedAt':r['submittedAt'],'proofImage':r['url'],'proofImageVerified':True,'source':{'url':base+'875784780573184010/'+r['message'],'channel':'tt-submission','messageId':r['message']},'additionalSources':[announcement],'notes':['Recovered by revisiting the original message after finding the initial capture omitted its attachment. Original image and adjacent lap text visually verified. Timestamp is exact Discord publication in UTC.']})

by = {(r['player'],r['time']):r for r in rows}
for player,time,url in [('Wins','1:17.33','https://twitter.com/winsmkt/status/1476317806190895108'),('Wins','1:17.13','https://www.youtube.com/watch?v=Z9v2K7ucSD8'),('Phillish','1:17.03','https://www.youtube.com/watch?v=_YM0uGg7_1o'),('Nu11','1:14.88','https://www.youtube.com/watch?v=SfOaPLskVfI')]:
    by[player,time].update(video=url,videoVerified=True)
    by[player,time]['notes'].append('Original video downloaded and visually checked at lap crossing and final result. Later video publication does not replace the earlier submission date.')
by['Nu11','0:34.32']['notes'].append('The linked 17.04 lap tutorial is only a partial run, so it is not presented as a full 34.32 video.')
supporting = [make(1308,'Spart',['37.74','37.70'])]
supporting[0].update(status='documented-submission',includeInProgression=False,video='https://www.youtube.com/watch?v=6VOAhfIT0-E',videoVerified=True)
supporting[0]['notes'].append('Full 1:15.44 video verified, but Wins had already posted 1:15.19, so this is a personal best rather than a WR.')
held=[]
for parent,time in [(by['Nu11','1:14.88'],'1:14.92'),(by['Nu11','0:34.32'],'0:34.45'),(by['Wins','1:15.19'],'1:15.21'),(by['Wins','1:14.99'],'1:15.17'),(by['Wins','1:17.33'],'1:17.41'),(by['Wins','1:17.13'],'1:17.28'),(by['saki7','1:17.90'],'1:18.00'),(by['Ecliptix','1:18.65'],'1:19.05')]:
    r={**parent,'messageId':parent['messageId']+'-previous-best','time':time,'laps':[None,None],'submittedAt':None,'observedAt':parent['submittedAt'],'dateUnresolved':True,'status':'documented-submission','includeInProgression':False,'notes':['Visible previous best proves an earlier run, but its original date and ordering against competing submissions are unresolved. Preserve the lead without inventing a WR or tie timestamp.']}
    for k in ['video','videoVerified']:r.pop(k,None)
    held.append(r)
for r in rows+supporting:
    if all(x is not None for x in r['laps']):
        m,s=r['time'].split(':');assert sum(round(float(l)*100) for l in r['laps'])==int(m)*6000+round(float(s)*100),r
ids={r['messageId'] for r in rows+supporting+held}
save('archive/curated-runs.json',[r for r in read('archive/curated-runs.json') if r.get('messageId') not in ids]+rows+supporting+held)
save('archive/assets-manifest.json',assets)
confirmed={indexed[s[0]] for s in spec}
for aid,r in sub.items():
    if 1233<=r['index']<=1372 and r['courseId'] in ['snes-vanilla-lake-1','3ds-cheep-cheep-lagoon-r','n64-kalimari-desert']:
        r.update(classification='reconciled-wr' if aid in confirmed else 'reviewed-non-wr-submission',reconciliation='archive/new-year-2022-reconciliation.json')
save('archive/submission-visual-review.json',sub)
videos=[]
for name,note,kind in [
 ('nu11-7488','Full Kalimari Desert 1:14.88; 37.52/37.36.','full-wr'),
 ('wins-7713','Full Cheep Cheep Lagoon R 1:17.13; 38.69/38.44.','full-wr'),
 ('phillish-7703','Full Cheep Cheep Lagoon R 1:17.03; 38.59/38.44.','full-wr'),
 ('wins-cclr','Full Cheep Cheep Lagoon R 1:17.33; 38.72/38.61.','full-wr'),
 ('spart-kd','Full Kalimari Desert PB 1:15.44; 37.74/37.70.','full-personal-best'),
 ('wins-ice','Vanilla Lake 1 lap 16.77, not a full run.','technique'),
 ('wins-lap','Vanilla Lake 1 lap 17.17, not a full run.','technique'),
 ('nu11-strat','Vanilla Lake 1 lap 17.04 tutorial, not full 34.32 proof.','technique'),
 ('wins-kd-route','Kalimari Desert route through lap two; Wins explicitly said he did not record the 1:14 run.','technique')]:
    folder=f'archive/video-backup-files/new-year-2022-{name}'
    meta=read(folder+'/original.info.json')
    videos.append({'file':folder+'/original.mp4','originalUrl':meta['webpage_url'],'classification':kind,'notes':note})
for name,aid,note in [
 ('RPReplay_Final1640819117.mov','926134752812085288','Wins Vanilla Lake 1 ice bounce around 9–11 seconds; no full lap or total.'),
 ('RPReplay_Final1641396095.mov','928307591908589588','Wins Vanilla Lake 1 failed second lap into tree around 30 seconds; no result.'),
 ('ScreenRecording_12-29-2021_19-35-52_1.mov','925824058447245392','Phillish finish excerpt 1:17.43, already slower than Wins 1:17.33; not a full run.'),
 ('RPReplay_Final1640863306.mov','926073966240628746','Wins Cheep Cheep Lagoon R underwater route around 20–28 seconds; no lap or total.')]:
    videos.append({'file':'archive/new-year-2022-original-media/'+name,'originalUrl':f'https://cdn.discordapp.com/attachments/636461740162416640/{aid}/{name}','classification':'technique-or-excerpt','notes':note})
availability=read('archive/video-availability.json')
for v in videos:
    p=ROOT/v['file'];v.update(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size,reviewStatus='visually-reviewed',backupStatus='queued-daily-upload-limit')
    u=v['originalUrl'];key='youtube:'+u.split('v=')[-1] if 'watch?v=' in u else 'x:'+u.split('/status/')[-1] if 'twitter.com' in u else u
    availability[key]={'originalUrl':u,'status':'available','checkedAt':datetime.now(timezone.utc).isoformat(),'bytes':v['bytes'],'sha256':v['sha256'],'reason':'Downloaded; visual inspection confirms: '+v['notes']}
save('archive/new-year-2022-original-videos.json',videos)
save('archive/video-availability.json',availability)
audit=read('archive/new-year-2022-capture-audit.json')
save('archive/new-year-2022-reconciliation.json',{'tour':"New Year's 2022 Tour",'status':'Surviving original submissions rechecked with overlapping fresh captures. Broader archive and missing prior-best dates remain incomplete.','coverage':{'freshSubmissionWindows':len(audit['windows']),'freshMessagesIncludingBoundaryOverlap':audit['uniqueMessagesRecaptured'],'recoveredNewYearImages':23,'additionalPenguinImageRecovered':1,'originalVideosDownloadedAndVisuallyReviewed':len(videos),'newUnlistedBackupsVerified':0},'confirmedChanges':rows,'supportingEvidence':supporting,'previousBestLeads':held,'officialConfirmation':announcement,'limitations':['Initial capture omitted 23 New Year images, including three intermediate WRs. Earlier tours require the same attachment-completeness audit; no global completion claim is made.','Nu11 previous 1:14.92 date and ordering remain unresolved. DIT’s screenshot repeats a previous 34.20; its first attainment timestamp is unknown.','Wins previous 1:15.21/1:15.17 and other earlier personal-best dates require independent evidence before promotion to WR history.','Two Isun Twitter video posts (1480353594260230152 and 1480360138058137601) could not be downloaded; result screenshots and lap text survive.','Thirteen video originals are preserved locally; unlisted uploads await the YouTube daily limit reset.','Course history outside this tour remains under audit.']})
print({'confirmedOrEnriched':len(rows),'supporting':len(supporting),'held':len(held),'videos':len(videos)})
