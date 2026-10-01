"""Reconcile Toad vs. Toadette Tour results with original images and surrounding discussion."""
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
    dst = ROOT / f'public/assets/proof/toad-toadette-2021-{name}.webp'
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
    return {'messageId': 'toad-toadette-2021-' + aid, 'player': player, 'courseId': r['courseId'], 'time': r['time'], 'laps': laps or [None, None], 'mushrooms': None, 'status': 'community-wr', 'submittedAt': r['submittedAt'], 'proofImage': url, 'proofImageVerified': True, 'source': {'url': r['source'], 'channel': 'tt-submission', 'messageId': r['messageId']}, 'notes': ['Original result image visually read at enlarged size and reconciled with earlier submissions, linked posts and surrounding discussion. Timestamp is original evidence publication in UTC, not an asserted race-completion instant.']}

spec = [
 ('905808867064180786','N',['25.05','24.62']),
 ('908702592341778463','ゼド',['24.86','24.79']),
 ('908886763538350090','AKI',['24.96','24.66']),
 ('909783531968954418','AKI',['24.82','24.75']),
 ('910120909417898034','NHSpeedy',['29.53','33.86']),
 ('905711622679576606','Astre'),
 ('905730270529990677','Nu11',['36.12','36.38']),
 ('905816213538627634','Wins'),
 ('905952852285993040','Wins'),
 ('905961287387873320','Wins'),
 ('909459575877550091','Wins'),
]
rows=[make(*s) for s in spec]
by={(r['player'],r['time']):r for r in rows}
by[('ゼド','0:49.65')]['notes'].append('Current Discord display name ほぬー belongs to Discord ID 708847830416228403, matching the existing ゼド player profile. Preserve one player identity.')
by[('Nu11','1:12.50')]['notes'].append('Current Discord display name えなが belongs to Discord ID 280285510075940864, already established as Kaguya/Nu11.')
by[('NHSpeedy','1:03.39')].update(video='https://www.youtube.com/watch?v=BG0nzD0agSc',videoVerified=True)
by[('NHSpeedy','1:03.39')]['notes'].append('Original full video visually verified at lap one and finish. This ties Astre’s January 25, 2021 1:03.39. November times 1:03.48, 1:03.46 and 1:03.45 are slower personal bests, not new WRs. Astre confirms the tie in message 910409191510925363.')
wins_clip='https://cdn.discordapp.com/attachments/636461740162416640/909465050241171536/RPReplay_Final1636901902.mov'
by[('Wins','1:12.19')].update(video=wins_clip,videoVerified=True,videoCoverage='partial')
by[('Wins','1:12.19')]['notes'].append('Original 4.606-second clip shows the end of lap two and 1:12.19 finish, not the full run; laps remain unknown.')
by[('Astre','1:13.05')]['notes'].append('Earliest published result found in this reviewed cohort for the new course. Earlier 1:13.97 previous best has no independent original date. Coverage remains incomplete for unpublished runs.')
by[('AKI','0:49.57')].update(video='https://www.youtube.com/watch?v=TLFGh8B-lPI',videoVerified=False)
by[('AKI','0:49.57')]['notes'].append('Original video URL retained, but the source is unavailable and no backup has been recovered.')
shiraui={'messageId':'toad-toadette-2021-shiraui-7203','player':'Shiraui','courseId':'rmx-choco-island-1r','time':'1:12.03','laps':['35.94','36.09'],'mushrooms':None,'status':'community-wr','submittedAt':None,'dateUnresolved':True,'delayedSubmission':True,'observedAt':'2021-11-17T07:31:53.536000Z','video':'https://www.youtube.com/watch?v=sO1Rf1kjQZg','videoVerified':True,'source':{'url':base+'636461740162416640/910432040799830026','channel':'tt-discussion','messageId':'910432040799830026'},'notes':['Original full video downloaded and visually read: 35.94 lap one, 1:12.03 finish, derived lap two 36.09. Discussion confirms Shiraui took the lead at the end of the tour. Original video publication and migrated screenshot are after the reset; neither establishes an exact race date. Date remains unresolved. Video previous best 1:12.18 is a separate undated lead.']}
original=make('910409561540821012','Shiraui',['35.94','36.09'])
shiraui.update({k:original[k] for k in ['submittedAt','proofImage','proofImageVerified','source']})
shiraui['observedAt']=original['submittedAt']
shiraui['notes'].append('Original result image and 35.94/36.09 message recovered in tt-submission 910409566120996864, posted November 17 at 06:02:35 UTC, just after the 06:00 tour reset. Preserve that exact evidence timestamp but do not assign it as the race date. The separate migrated attachment is no longer available.')
rows.append(shiraui)
supporting=[]
for player,course,time,laps,video,mid,coverage in [
 ('NHSpeedy','snes-donut-plains-1','0:49.86',['24.86','25.00'],'https://www.youtube.com/watch?v=Fd3PM1vJJEs','907435355257602099','full'),
 ('NHSpeedy','snes-donut-plains-1','0:50.14',['25.17','24.97'],'https://www.youtube.com/watch?v=8Hv4tdIXPa0','907435355257602099','partial'),
 ('JuicyJack','snes-donut-plains-1','0:52.27',['25.99','26.28'],'https://cdn.discordapp.com/attachments/875784780573184010/906978278018011136/RPReplay_Final1636310390.mov','906978284049408070','full'),
]:
 from datetime import datetime,timezone
 stamp=datetime.fromtimestamp(((int(mid)>>22)+1420070400000)/1000,timezone.utc).isoformat().replace('+00:00','Z')
 channel='875784780573184010' if player=='JuicyJack' else '636461740162416640'
 supporting.append({'messageId':'toad-toadette-2021-video-'+video.split('=')[-1].split('/')[-1],'player':player,'courseId':course,'time':time,'laps':laps,'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':stamp,'video':video,'videoVerified':True,'videoCoverage':coverage,'source':{'url':base+channel+'/'+mid,'channel':'tt-submission' if player=='JuicyJack' else 'tt-discussion','messageId':mid},'notes':['Original footage downloaded and visually read. Slower than the standing record; preserve as supporting evidence, not WR. '+('Lap-two clip shows lap-one split and final total but not lap-one driving.' if coverage=='partial' else 'Lap one and final total visually verified; lap two derived by subtraction.')]})
held=[]
for parent,time in [(by[('Astre','1:13.05')],'1:13.97'),(by[('Nu11','1:12.50')],'1:12.92'),(by[('Wins','1:12.48')],'1:12.78'),(shiraui,'1:12.18')]:
 item={**parent,'messageId':parent['messageId']+'-previous-best','time':time,'laps':[None,None],'submittedAt':None,'observedAt':parent.get('submittedAt') or parent.get('observedAt'),'dateUnresolved':True,'status':'documented-submission','includeInProgression':False}
 for key in ['video','videoVerified','videoCoverage']:item.pop(key,None)
 item['notes']=['Previous best visibly establishes an earlier run but not its exact date or ordering against other players. Do not use the later publication date as its record date.']
 held.append(item)
allrows=rows+supporting+held
ids={r['messageId'] for r in allrows}
save('archive/curated-runs.json',[r for r in curated if r.get('messageId') not in ids]+allrows)
save('archive/assets-manifest.json',assets)
confirmed={s[0] for s in spec}|{'910409561540821012'}
for aid,r in sub.items():
 if 772<=r['index']<=895 or r['index'] in [900,901,902,904,907,908]:
  r['classification']='reconciled-wr' if aid in confirmed else 'reviewed-non-wr-submission'
  r['reconciliation']='archive/toad-toadette-2021-reconciliation.json'
save('archive/submission-visual-review.json',sub)
save('archive/toad-toadette-2021-reconciliation.json',{
 'tour':'Toad vs. Toadette Tour 2021',
 'status':'130 submission images visually reviewed, including one late Halloween repeat and seven post-reset images; 137 submission messages and surrounding discussion read. Original-date gaps remain explicitly unresolved.',
 'coverage':{'submissionImagesVisuallyReviewed':130,'submissionMessagesRead':137,'discussionUniqueMessagesRead':len(read('archive/toad-toadette-discussion-census.json')['messages']),'discussionWindowsReadIncludingReused':26,'newDiscussionImagesVisuallyReviewed':14,'externalOriginalImagesVisuallyReviewed':1,'originalVideosDownloadedAndVisuallyReviewed':8,'newUnlistedBackupsVerified':0},
 'confirmedChanges':rows,'supportingEvidence':supporting,'previousBestLeads':held,
 'limitations':[
  'Shiraui 1:12.03 is confirmed, but its exact original date remains unresolved. Post-reset video and migrated screenshot dates must not be substituted.',
  'Previous bests 1:13.97, 1:12.92, 1:12.78 and 1:12.18 establish earlier runs with unresolved original dates and ordering.',
  'AKI 49.57 original YouTube video is unavailable; AKI Twitter comparison 1457512632970190849 also leads to a deleted post. No recovered backup is claimed.',
  'N explicitly reported having no video for 49.67 in discussion message 905951370748772402.',
  'Final RC board gives Sucha 1:12.52 as 36.28/26.24, a typo. The original submission 908175845351383080 says .28/.24, correctly summing as 36.28/36.24.',
  'Wins Kalimari 1:03.48 and NHSpeedy 1:03.46/1:03.45 do not beat Astre’s January 2021 1:03.39. They are not added to WR progression.',
  'Haruru’s joking WR message shows RMX Choco 1:52.83, not a WR. JuicyJack’s 1:39.64 is a slow Donut Plains run, not Dino Dino Jungle R.',
  'Eight original videos are locally preserved; unlisted uploads remain queued after YouTube reported its daily upload limit.',
  'Reading this tour cohort does not establish complete coverage of all earlier tours or channels.'
 ]})
print({'confirmedOrEnriched':len(rows),'supporting':len(supporting),'held':len(held)})
