"""Reconcile 2nd Anniversary Tour images, adjacent replies, and original recordings."""
import hashlib
import json
import subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT / path).read_text())
def save(path, value): (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
early = read('archive/early-visual-review.json')
sub = read('archive/submission-visual-review.json')
downloads = read('archive/submission-image-downloads.json')
queue = {r['attachmentId']: r for r in read('archive/submission-image-map.json')['images']}
assets = read('archive/assets-manifest.json')
curated = read('archive/curated-runs.json')
base = 'https://discord.com/channels/629221606064914442/'

def make(aid, player, laps=None, time=None):
    r = early.get(aid) or sub[aid]
    assert r['reviewStatus'] == 'visually-reviewed'
    is_early = aid in early
    path = r['path'] if is_early else downloads[aid]['path']
    url = r['url'] if is_early else queue[aid]['imageUrl']
    dst = ROOT / f'public/assets/proof/second-anniversary-2021-{aid}.webp'
    if not dst.exists(): Image.open(ROOT / path).convert('RGB').save(dst, 'WEBP', lossless=True)
    assets[url] = {'path': '/' + str(dst.relative_to(ROOT / 'public')), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes': dst.stat().st_size, 'contentType': 'image/webp'}
    t = time or r['time']
    if laps and all(l is not None for l in laps):
        m, s = t.split(':')
        assert sum(round(float(l)*100) for l in laps) == int(m)*6000 + round(float(s)*100)
    channel = '636461740162416640' if is_early else '875784780573184010'
    return {'messageId': 'second-anniversary-2021-' + aid + '-' + t.replace(':', '').replace('.', ''), 'player': player, 'courseId': r['courseId'], 'time': t, 'laps': laps or [None, None], 'mushrooms': None, 'status': 'community-wr', 'submittedAt': r['postedAt'] if is_early else r['submittedAt'], 'proofImage': url, 'proofImageVerified': True, 'source': {'url': base + channel + '/' + r['messageId'], 'channel': 'tt-discussion' if is_early else 'tt-submission', 'messageId': r['messageId']}, 'notes': ['Result visually read and compared with earlier results and nearby messages. Timestamp is original evidence publication in UTC, not an asserted race-completion instant.']}

spec = [
 ('890135342806626324','Sucha'),
 ('890142805643628564','zxflare'),
 ('890211833187803217','saki7'),
 ('890228995860361298','DIT'),
 ('890239485240029245','Wins',['44.76','44.83']),
 ('890403696670834768','DIT'),
 ('890419757138972702','DIT'),
 ('890904461864759306','Astre',['44.71','44.72']),
 ('891788346039365642','Astre',['44.85','44.55']),
 ('892087082208600214','Astre',['44.76','44.59']),
 ('892132245098360832','Astre',['44.70','44.58']),
 ('894491538267193354','Astre',['44.54','44.72']),
 ('894853656216748042','Astre',['44.52','44.70']),
 ('895183456001224734','NHSpeedy',['44.48','44.62']),
 ('890147561904701460','N'),
 ('890231703010967552','DIT'),
 ('890243306355838996','DIT'),
 ('890590528943562802','Wins'),
 ('890610749330845707','DIT'),
 ('890950772211191888','DIT',['41.93','41.79']),
 ('890961012306624522','Wins',['41.81','41.87']),
 ('891207778675351582','DIT'),
 ('892007515817132042','Astre',['41.78','41.76']),
 ('893419833251749958','Astre',['41.78','41.73']),
 ('893444969736585246','Astre',['41.72','41.75']),
 ('894468288006991892','Astre',['41.71','41.72']),
 ('894954136699822122','Astre',['41.68','41.72']),
 ('895033088898396170','Astre',['41.70','41.68']),
]
rows = [make(*s) for s in spec]
by = {(r['courseId'],r['time']):r for r in rows}
videos = [
 ('sydney-sprint','1:29.10','8px-bdaEFgQ'),
 ('sydney-sprint','1:29.59','8Y9DogVh2do'),
 ('sydney-sprint','1:29.26','oiT9-csKBLE'),
 ('berlin-byways-2','1:23.38','BJhXVSGfyRI'),
 ('berlin-byways-2','1:23.68','OyEoxvMb5dg'),
 ('berlin-byways-2','1:23.54','sh1tp6sK4I4'),
 ('berlin-byways-2','1:23.43','TaVbaceD6EQ'),
]
for course,t,video in videos:
 r=by[(course,t)];r.update(video='https://www.youtube.com/watch?v='+video,videoVerified=True)
 r['notes'].append('Original recording downloaded; course, lap-one freeze and final result visually checked. Lap two agrees with the result minus lap one and the supplied splits.')
by[('sydney-sprint','1:29.10')]['notes'].append('Original submission at 2021-10-06 05:39:28 UTC precedes the 06:00 UTC tour reset. The discussion video and congratulations corroborate the final lead change.')
by[('sydney-sprint','1:29.22')]['notes'].append('Nearby October 5 discussion explicitly says .70 lap two, with the same lines and mushroom count as the 1:29.26 recording; do not attach the slower video as proof of this result.')
by[('berlin-byways-2','1:23.54')]['notes'].append('September 27 discussion explicitly congratulates Astre for taking both WRs. Kaguya later appears tied at 1:23.54 on the final leaderboard, but no original date has yet established whether Kaguya tied the WR while it stood.')

supporting = []
for aid,player,laps,video in [
 ('894895142908092437','Romain',['41.75','41.89'],'Bai-Ol1tWkk'),
 ('893315420801626152','Sucha',['41.70','41.85'],'TTdFD5PKFGg'),
 ('892984033338884117','Sucha',['41.75','41.83'],'hCn2GDFL6EY'),
]:
 r=make(aid,player,laps)
 r.update(status='documented-submission',includeInProgression=False,video='https://www.youtube.com/watch?v='+video,videoVerified=True)
 r['notes'].append('Personal best slower than the already-published WR. Original course, lap and finish frames visually verified; preserve media without promoting it into WR progression.')
 supporting.append(r)
for aid in ['895210940285476874','895210952453148672']:
 r=make(aid,'Nu11')
 r.update(status='documented-submission',includeInProgression=False,observedAt=r['submittedAt'],submittedAt=None,dateUnresolved=True)
 r['notes'].append('Kaguya/Nu11 submitted this previous-tour image after the October 6 reset. The original publication/race chronology is unresolved. The final leaderboard and nearby discussion corroborate the result, but do not establish a WR tie while the 1:23.54 stood.')
 supporting.append(r)
previous_best = [
 ('890135342806626324','Sucha','1:31.38'),
 ('890147561904701460','N','1:24.47'),
 ('890211833187803217','saki7','1:29.99'),
 ('890228995860361298','DIT','1:29.77'),
 ('890231703010967552','DIT','1:24.03'),
 ('890239485240029245','Wins','1:29.68'),
 ('890590528943562802','Wins','1:23.84'),
 ('890610749330845707','DIT','1:23.82'),
 ('890904461864759306','Astre','1:29.71'),
 ('890961012306624522','Wins','1:23.74'),
 ('891207778675351582','DIT','1:23.63'),
 ('892007515817132042','Astre','1:23.64'),
 ('892087082208600214','Astre','1:29.39'),
 ('895183456001224734','NHSpeedy','1:29.24'),
]
held=[]
for aid,player,t in previous_best:
 r=make(aid,player,time=t)
 r.update(status='documented-submission',includeInProgression=False,submittedAt=None,dateUnresolved=True,observedAt=r['submittedAt'])
 r['notes']=['Previous-best field visually read from the original result image. This proves an earlier personal best, but original publication chronology against rivals remains unresolved. Do not assign the later screenshot date or silently promote it into WR progression.']
 held.append(r)
allrows=rows+supporting+held
ids={r['messageId'] for r in allrows}
save('archive/curated-runs.json',[r for r in curated if r.get('messageId') not in ids]+allrows)
save('archive/assets-manifest.json',assets)
save('archive/second-anniversary-2021-reconciliation.json',{
 'tour':'2nd Anniversary Tour 2021',
 'status':'155 submission images including two late previous-tour images visually reviewed. 57 overlapping discussion windows read. Original chronology of late results remains unresolved; not a claim of complete history.',
 'coverage':{'submissionImagesVisuallyReviewed':155,'capturedSubmissionMessagesRead':160,'discussionContinuousWindowsRead':57,'discussionUniqueMessagesRead':870,'discussionMessagesWithinUTCDateWindow':856,'discussionSearchReportedMessages':852,'attachedTechniqueClipsDownloadedAndReviewed':3,'discussionImageSearchResults':13,'discussionImagesVisuallyReviewed':13,'fullOriginalVideosDownloaded':10,'originalVideosCourseLapAndFinishVisuallyChecked':10},
 'confirmedChanges':rows,
 'supportingEvidence':supporting,
 'previousBestLeads':held,
 'limitations':[
  'Kaguya 1:23.54 and 1:29.72 images were found in submissions at 07:28 UTC October 6, after reset. Earlier discussion and final boards corroborate the results, but original run/publication chronology is unresolved; no WR tie is inferred.',
  'Submission index 522 is a leaderboard screenshot listing Astre, not a new run by the sender.',
  'Late previous-tour Yoshi Circuit and RMX Vanilla Lake 1R submissions are not results on the two current-tour tracks.',
  'LaLanterne 1:25.70 was called a WR in its message but is slower than an earlier Berlin 1:24.40 submission and is excluded.',
  'Romain 1:23.64 and Sucha 1:23.55/1:23.58 recordings are personal best evidence; they did not beat the already-published WR.',
  'Sucha wrote lap one 42.70 beside the 1:23.55 video; the recording visibly shows 41.70. Preserve the actual lap, not the message typo.',
  'Nearby Romain 41.75/41.74 = 1:23.49 refers to combined best segments, not one completed run.',
  'Previous-best fields alone are not assigned the later screenshot date as a race date.',
  'All three attached technique clips were recovered through their visible Discord download links after direct downloads returned HTTP 403. They show partial course segments, not completed two-lap results. One MOV was found through the full census despite not appearing in has:video search.',
  'Search reported 852 messages; continuous channel windows contain 856 unique messages within the UTC search-date range, plus 14 surrounding messages. Raw IDs are retained to document the discrepancy.',
  'October 5 recollection of Donut Plains 1 times is a historical lead, not new dated race evidence. Historical Kalimari Desert 2 and Sunset Wilds R video links already have preservation copies.'
 ]})
print(json.dumps({'confirmedChanges':len(rows)}))
