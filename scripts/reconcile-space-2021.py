"""Reconcile Space Tour results with original images and surrounding discussion."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT / path).read_text())
def save(path, value): (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
sub = read('archive/submission-visual-review.json')
downloads = read('archive/submission-image-downloads.json')
queue = {r['attachmentId']: r for r in read('archive/submission-image-map.json')['images']}
assets = read('archive/assets-manifest.json')
curated = read('archive/curated-runs.json')
base = 'https://discord.com/channels/629221606064914442/'

def preserve(path, url, name):
    dst = ROOT / f'public/assets/proof/space-2021-{name}.webp'
    if not dst.exists(): Image.open(ROOT / path).convert('RGB').save(dst, 'WEBP', lossless=True)
    assets[url] = {'path': '/' + str(dst.relative_to(ROOT / 'public')), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes': dst.stat().st_size, 'contentType': 'image/webp'}

def make(aid, player, laps=None):
    r = sub[aid]
    assert r['reviewStatus'] == 'visually-reviewed'
    url = queue[aid]['imageUrl']
    preserve(downloads[aid]['path'], url, aid)
    if laps:
        m, s = r['time'].split(':')
        assert sum(round(float(l)*100) for l in laps) == int(m)*6000 + round(float(s)*100)
    return {'messageId': 'space-2021-' + aid, 'player': player, 'courseId': r['courseId'], 'time': r['time'], 'laps': laps or [None, None], 'mushrooms': None, 'status': 'community-wr', 'submittedAt': r['submittedAt'], 'proofImage': url, 'proofImageVerified': True, 'source': {'url': r['source'], 'channel': 'tt-submission', 'messageId': r['messageId']}, 'notes': ['Original result image visually read at enlarged size and reconciled with earlier submissions, linked posts and surrounding discussion. Timestamp is original evidence publication in UTC, not an asserted race-completion instant.']}

from datetime import datetime, timezone
import shutil
indexed={r['index']:aid for aid,r in sub.items()}
spec=[(905,'Nu11',['28.88','28.63']),(924,'N'),(925,'N'),(926,'N',['41.60','41.85']),(930,'Wins'),(931,'N'),(937,'Wins'),(938,'Wins'),(940,'Wins',['41.54','41.32']),(943,'Nu11',['41.75','41.10']),(944,'Nu11'),(945,'Wins'),(946,'Wins'),(947,'Wins'),(948,'N'),(954,'NHSpeedy'),(955,'NHSpeedy',['41.22','40.92']),(957,'NHSpeedy',['41.16','40.87']),(959,'NHSpeedy',['41.13','40.83']),(963,'SuperFX',['40.91','41.00']),(971,'SuperFX'),(974,'SuperFX'),(980,'Nu11',['40.89','40.86']),(982,'SuperFX',['40.82','40.89']),(983,'Nu11',['40.90','40.81']),(1004,'SuperFX'),(1009,'N'),(1015,'N',['40.80','40.77'])]
rows=[make(indexed[s[0]],*s[1:]) for s in spec]
by={(r['player'],r['time']):r for r in rows}
def source(mid):return {'url':base+'636461740162416640/'+mid,'channel':'tt-discussion','messageId':mid}
def stamp(mid):return datetime.fromtimestamp(((int(mid)>>22)+1420070400000)/1000,timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
images={r['messageId']:r for r in read('archive/space-2021-discussion-images.json')}
def discussion_result(mid,player,time):
 im=images[mid];url=im['url'].split('?')[0];preserve(im['file'],url,mid)
 return {'messageId':'space-2021-'+mid,'player':player,'courseId':'rmx-rainbow-road-2r','time':time,'laps':[None,None],'mushrooms':None,'status':'community-wr','submittedAt':stamp(mid),'proofImage':url,'proofImageVerified':True,'source':source(mid),'notes':['Original discussion image visually read and reconciled with neighboring messages. Exact timestamp is evidence publication, not an asserted race-completion instant.']}
n8315=discussion_result('911195466392277044','N','1:23.15');rows.append(n8315)
sf=by[('SuperFX','1:21.84')];earlier=discussion_result('911978669138927616','SuperFX','1:21.84')
sf['additionalSources']=[sf['source']];sf.update({k:earlier[k] for k in ['submittedAt','proofImage','source']});sf['notes'].append('Earlier original discussion image establishes November 21 at 13:57 UTC; submission was a later repost. Previous best 1:21.88 is undated.')
nh={'messageId':'space-2021-nhspeedy-8230','player':'NHSpeedy','courseId':'rmx-rainbow-road-2r','time':'1:22.30','laps':['41.31','40.99'],'mushrooms':None,'status':'community-wr','submittedAt':stamp('911771384173182976'),'source':source('911771384173182976'),'video':'https://www.youtube.com/watch?v=asfPB4daRsA','videoVerified':True,'notes':['Original full video visually read at lap one and finish. Published between N 1:22.33 and NHSpeedy 1:22.22. This is a missing intermediate WR, also shown as previous best in the following submission.']};rows.append(nh)
for key,vid in [(('Nu11','0:57.51'),'https://twitter.com/_kaguya_games/status/1460907887107063809'),(('Wins','1:22.86'),'https://www.youtube.com/watch?v=UXBzpQsUvjU'),(('N','1:21.57'),'https://www.youtube.com/watch?v=MPa1f6rABx4')]:
 by[key].update(video=vid,videoVerified=True);by[key]['notes'].append('Original full video downloaded and visually checked at lap-one split and finish; lap two is total minus lap one.')
# Preserve a stable public copy while YouTube uploads are blocked. Keep original provenance.
sfvideo=next(r for r in read('archive/space-2021-original-videos.json') if '1637497512' in r['file'])
dst=ROOT/'public/assets/proof/space-2021-superfx-8191.mov'
if not dst.exists():shutil.copyfile(ROOT/sfvideo['file'],dst)
by[('SuperFX','1:21.91')].update(video='https://mktwrs.com/assets/proof/space-2021-superfx-8191.mov',videoVerified=True,additionalSources=[source('911957830175707206'),{'url':sfvideo['originalUrl'],'channel':'original-video'}])
by[('SuperFX','1:21.91')]['notes'].append('Full original Discord recording preserved on this site because Discord attachment URLs expire. Original attachment and discussion link retained in sources. An unlisted YouTube backup remains queued, not completed.')
for key,mid,note in [(('Nu11','1:21.75'),'912255430825246750','Adjacent message explicitly gives 40.89/40.86.'),(('SuperFX','1:21.71'),'912271767094046790','Adjacent .82/.89 message resolves to 40.82/40.89, summing to 1:21.71.'),(('N','1:21.57'),'915178869227671614','Adjacent message explicitly gives 40.80/40.77, matching original video.')]:
 by[key].setdefault('additionalSources',[]).append({'url':base+'875784780573184010/'+mid,'channel':'tt-submission','messageId':mid});by[key]['notes'].append(note)
by[('SuperFX','1:21.69')]['notes'].append('Discussion 913125539412340847 says the original screen recording failed. Repeat screenshot 913125554671198228 shows the same 1:21.69 previous best and is supporting evidence, not another WR or a video.')
by[('SuperFX','1:21.69')]['additionalSources']=[source('913125539412340847'),source('913125554671198228')]
by[('N','1:21.60')]['notes'].append('Haruru later reposted this exact screenshot (submission image index 1010, matching coins, clock and previous best). It does not establish a second player or tie.')
supporting=[]
pb=make(indexed[918],'Wins',['28.84','28.73']);pb.update(status='documented-submission',includeInProgression=False,video='https://cdn.discordapp.com/attachments/636461740162416640/910961579527376937/RPReplay_Final1637260378.mov',videoVerified=True,videoCoverage='partial');pb['notes'].append('Only final 6.87 seconds of run preserved. 57.57 is slower than Nu11 57.51, not WR.');supporting.append(pb)
supporting.append({'messageId':'space-2021-spart-8271','player':'Spart','courseId':'rmx-rainbow-road-2r','time':'1:22.71','laps':['41.34','41.37'],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':stamp('911766290828509305'),'video':'https://www.youtube.com/watch?v=YWMZZBw137A','videoVerified':True,'source':source('911766290828509305'),'notes':['Full run visually verified. Published after N 1:22.33; personal best, not WR.']})
held=[]
for parent,time in [(by[('N','1:23.95')],'1:24.15'),(by[('N','1:23.45')],'1:23.63'),(n8315,'1:23.22'),(by[('Nu11','1:22.70')],'1:22.75'),(sf,'1:21.88')]:
 item={**parent,'messageId':parent['messageId']+'-previous-best','time':time,'laps':[None,None],'submittedAt':None,'observedAt':parent['submittedAt'],'dateUnresolved':True,'status':'documented-submission','includeInProgression':False,'notes':['Previous best visually establishes an earlier run but not its original date or ordering against competitors. Held outside WR chronology until independently dated.']}
 for k in ['video','videoVerified','videoCoverage']:item.pop(k,None)
 held.append(item)
allrows=rows+supporting+held
ids={r['messageId'] for r in allrows}
save('archive/curated-runs.json',[r for r in curated if r.get('messageId') not in ids]+allrows)
save('archive/assets-manifest.json',assets)
confirmed={indexed[s[0]] for s in spec}
for aid,r in sub.items():
 if 896<=r['index']<=1026 and r['courseId'] in ['rmx-rainbow-road-2r','snes-koopa-troopa-beach-2']:
  r.update(classification='reconciled-wr' if aid in confirmed else 'reviewed-non-wr-submission',reconciliation='archive/space-2021-reconciliation.json')
save('archive/submission-visual-review.json',sub)
availability=read('archive/video-availability.json')
for v in read('archive/space-2021-original-videos.json'):
 u=v['originalUrl'];key='youtube:'+u.split('v=')[-1] if 'youtube.com' in u else 'x:'+u.split('/status/')[-1] if 'twitter.com' in u else u
 availability[key]={'originalUrl':u,'status':'available','checkedAt':datetime.now(timezone.utc).isoformat(),'bytes':v['bytes'],'sha256':v['sha256'],'reason':'Original downloaded and visually reviewed. '+v['notes']}
availability[by[('SuperFX','1:21.91')]['video']]={**availability[sfvideo['originalUrl']],'originalUrl':by[('SuperFX','1:21.91')]['video']}
save('archive/video-availability.json',availability)
save('archive/space-2021-reconciliation.json',{'tour':'Space Tour 2021','status':'Reviewed submission cohort and surrounding discussion; unresolved prior-best dates retained explicitly. Global archive remains incomplete.','coverage':{'submissionImagesVisuallyReviewed':132,'submissionMessagesRead':148,'discussionUniqueMessagesRead':len(read('archive/space-2021-discussion-census.json')['messages']),'discussionImagesVisuallyReviewed':12,'originalVideosDownloadedAndVisuallyReviewed':12,'newUnlistedBackupsVerified':0},'confirmedChanges':rows,'supportingEvidence':supporting,'previousBestLeads':held,'limitations':['Prior-best dates and ordering are unresolved for N 1:24.15, 1:23.63 and 1:23.22, Nu11 1:22.75 and SuperFX 1:21.88.','Haruru 1:21.60 image is a repost of N, not a second record holder.','SuperFX 1:21.69 recording failed; repeat screenshot does not provide video.','YouTube daily upload limit prevents new unlisted backups; 12 originals preserved locally.','Earliest known published RR2R result is N 1:23.95; this does not prove no earlier unpublished WRs existed.','KTB 57.54 and 57.57 are slower than Nu11 57.51 and excluded from WR progression.']})
print({'confirmedOrEnriched':len(rows),'supporting':len(supporting),'held':len(held)})
