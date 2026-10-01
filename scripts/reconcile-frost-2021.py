"""Reconcile Frost Tour images, adjacent replies, and original recordings."""
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
    dst = ROOT / f'public/assets/proof/frost-2021-{aid}.webp'
    if not dst.exists(): Image.open(ROOT / path).convert('RGB').save(dst, 'WEBP', lossless=True)
    assets[url] = {'path': '/' + str(dst.relative_to(ROOT / 'public')), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes': dst.stat().st_size, 'contentType': 'image/webp'}
    t = time or r['time']
    if laps and all(l is not None for l in laps):
        m, s = t.split(':')
        assert sum(round(float(l)*100) for l in laps) == int(m)*6000 + round(float(s)*100)
    channel = '636461740162416640' if is_early else '875784780573184010'
    return {'messageId': 'frost-2021-' + aid + '-' + t.replace(':', '').replace('.', ''), 'player': player, 'courseId': r['courseId'], 'time': t, 'laps': laps or [None, None], 'mushrooms': None, 'status': 'community-wr', 'submittedAt': r['postedAt'] if is_early else r['submittedAt'], 'proofImage': url, 'proofImageVerified': True, 'source': {'url': base + channel + '/' + r['messageId'], 'channel': 'tt-discussion' if is_early else 'tt-submission', 'messageId': r['messageId']}, 'notes': ['Result visually read and compared with earlier results and nearby messages. Timestamp is original evidence publication in UTC, not an asserted race-completion instant.']}

spec = [
    ('874897108774322216', 'Y146'),
    ('874899647792037898', 'Unidentified runner (Frost 2021)'),
    ('874900020799885312', 'Y146'),
    ('874902314857680916', 'DIT'),
    ('874911173626195989', 'Nu11'),
    ('874933865972629534', 'Nu11'),
    ('874945269039530005', 'Nu11', ['46.64', '47.15']),
    ('875033907140124732', 'Nu11', ['46.84', '46.80']),
    ('875483912846061588', 'Nu11', ['46.61', '46.96']),
    ('875602339640250409', 'Nu11', ['46.71', '46.66']),
    ('875666982526128178', 'Nu11', ['46.59', '46.63']),
    ('876477667355000852', 'Nu11', ['46.54', '46.55']),
    ('877181949322612796', 'Nu11', ['46.44', '46.53']),
    ('878548213295104030', 'Nu11', ['46.55', '46.35']),
    ('874999322478014564', 'Astre'),
    ('875301273178636308', 'Wins'),
    ('875330783689203732', 'Wins', ['31.51', '31.43']),
    ('875687048101638194', 'Kura'),
    ('875846518932910150', 'Astre', ['31.46', '31.41']),
    ('875847091937738782', 'Astre', ['31.47', '31.33']),
    ('876437947245797416', 'Astre', ['31.46', '31.32']),
    ('876540774249037914', 'Astre', ['31.39', '31.36']),
    ('876912624485408768', 'Astre', ['31.34', '31.28']),
]
rows = [make(*s) for s in spec]
by = {(r['courseId'], r['time']): r for r in rows}
unknown = by[('wii-dk-summit', '1:35.51')]
unknown.update(identityUnresolved=True)
unknown['notes'].append('Deleted Discord account. Its immediately following message explicitly says New wr, between Y146’s 1:35.93 and 1:34.99. Preserve the record without guessing the runner’s identity or merging unrelated deleted accounts.')
unknown['additionalSources'] = [{'url': base + '636461740162416640/874899685150720022', 'kind': 'adjacent-wr-confirmation'}]
by[('3ds-toad-circuit-r', '1:03.01')]['notes'].append('Adjacent .67/.85 belongs to Whiplash’s separate 1:03.52, not this Wins result. Splits remain unknown.')
by[('3ds-toad-circuit-r', '1:03.09')]['notes'].append('Runner explicitly says Old WR tie; this ties Tomegome’s Valentine’s Tour record.')
by[('3ds-toad-circuit-r', '1:02.90')]['notes'].append('Original image precedes Astre’s 1:02.87. Astre congratulates Kura in the surrounding discussion. Previous-best 1:02.97 is slower than Wins’s already established 1:02.94 and is not another WR.')
by[('3ds-toad-circuit-r', '1:02.87')]['additionalSources'] = [{'url': base + '875784780573184010/875846573328834591', 'kind': 'adjacent-lap-reply'}]
videos = {
    ('3ds-toad-circuit-r', '1:02.94'): 'https://twitter.com/winsmkt/status/1425777420481744903',
    ('3ds-toad-circuit-r', '1:02.75'): 'https://twitter.com/Astre_HD/status/1427166956629729282',
    ('wii-dk-summit', '1:32.97'): 'https://twitter.com/_kaguya_games/status/1428227275703558152',
}
for k, url in videos.items():
    by[k].update(video=url, videoVerified=True)
    by[k]['notes'].append('Original downloaded recording visually verifies the completed total and first lap; retain the earlier image-submission date.')

# A previous-best field establishes a separate run, but does not establish its date.
held = []
for aid, player, t in [('878548213295104030', 'Nu11', '1:32.91'), ('876912624485408768', 'Astre', '1:02.74')]:
    r = make(aid, player, time=t)
    r.update(status='documented-submission', includeInProgression=False, dateUnresolved=True, observedAt=r['submittedAt'], submittedAt=None)
    r['notes'] = ['Previous-best field visually read in the later screenshot. Original dated evidence remains unresolved; do not date this run using the later result or promote it solely from a previous-best field.']
    held.append(r)

# The creator labels this surviving recording Former WR; its finish screen shows
# previous best 1:02.75, and the August 16 image shows it as the previous best.
former = held.pop()
former.update(status='community-wr', includeInProgression=True, video='https://www.youtube.com/watch?v=LQH2dW-z-Ik', videoVerified=True, laps=['31.44', '31.30'], tourDateRange={'start': '2021-08-11', 'end': '2021-08-24'})
former['additionalSources'] = [{'url': former['video'], 'kind': 'original-creator-former-wr-recording'}]
former['notes'] = ['Original creator explicitly labels this recording Former WR. Visually verified completed 1:02.74, first lap 31.44, second lap 31.30 by subtraction. Finish screen shows previous best 1:02.75.', 'This run falls between the August 15 1:02.75 and August 16 1:02.62; its exact original date remains unresolved. Do not assign the October 7 video-publication date to the run.']
frame = ROOT / 'public/assets/proof/frost-2021-astre-10274.webp'
if not frame.exists():
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', '128', '-i', str(ROOT / 'archive/video-backup-files/frost-LQH2dW-z-Ik/original.mp4'), '-frames:v', '1', '-y', str(frame)], check=True)
former['additionalProofImages'] = [former['proofImage']]
former['proofImage'] = '/assets/proof/frost-2021-astre-10274.webp'
assets[former['proofImage']] = {'path': former['proofImage'], 'sha256': hashlib.sha256(frame.read_bytes()).hexdigest(), 'bytes': frame.stat().st_size, 'contentType': 'image/webp'}
former['notes'].append('Local image proof is a still frame at 128 seconds in the original recording.')
rows.append(former)

fallbacks = [make('876117362934431754', 'Phillish', ['31.49', '31.46']), make('878650315992334426', 'spartacurtYT', ['31.49', '31.54'])]
for r, url in zip(fallbacks, ['https://www.youtube.com/watch?v=2w4g4ccS-wI', 'https://www.youtube.com/watch?v=J0PkuY5_PhE']):
    r.update(status='documented-submission', includeInProgression=False, video=url, videoVerified=True)
    r['notes'].append('Full original recording visually confirms total and first lap. Personal best slower than the established WR at publication; preserved as footage, excluded from WR progression.')

allrows = rows + held + fallbacks
ids = {r['messageId'] for r in allrows}
curated = [r for r in curated if r.get('messageId') not in ids] + allrows
images = [r for r in read('archive/early-image-index.json')['images'] if '2021-08-11T06' <= r['postedAt'] < '2021-08-25T06']
subimages = [r for r in sub.values() if '2021-08-13' <= r['submittedAt'] < '2021-08-25T06']
messages = [r for r in read('archive/submission-review-index.json') if r['datetime'] < '2021-08-25T06']
audit = {'tour': 'Frost Tour 2021', 'status': 'Discussion image index and captured submission messages reviewed; broader discussion message census remains unresolved.', 'coverage': {'discussionIndexedImages': len(images), 'discussionIndexedImagesVisuallyReviewed': sum(early.get(r['id'], {}).get('reviewStatus') == 'visually-reviewed' for r in images), 'submissionImagesVisuallyReviewed': len(subimages), 'capturedSubmissionMessagesRead': len(messages), 'discussionWrMatches': 15, 'discussionLinkMatches': 18, 'discussionVideoMatches': 15, 'originalVideosDownloadedAndVisuallyReviewed': 6, 'discordTechniqueClipsDownloadedAndVisuallyReviewed': 10}, 'confirmedChanges': rows, 'heldForReconciliation': held, 'verifiedPersonalBestVideos': fallbacks, 'submissionChannelTransition': {'timestamp': '2021-08-13T16:58:46.420Z', 'source': base + '875784780573184010/875785466077655062'}, 'limitations': ['Full discussion message census is not established by image and keyword searches.', 'The deleted account’s original identity remains unresolved; its confirmed 1:35.51 is labeled unidentified.', 'Previous-best 1:33.03 in Nu11’s downloaded 1:32.97 video still needs an original dated result.', 'Astre’s 1:02.74 former WR is verified from the surviving creator recording, but its exact date remains unknown within August 15–16.', 'Three earlier Kaguya Twitter links returned no downloadable video; each original X page now says it does not exist. Preserve those source references rather than substituting a different run.', 'Ten Discord technique clips were downloaded and visually reviewed, all shorter than eight seconds. They are preserved locally and excluded as proof of a full run. The Mirrativ source reports that the broadcast has finished; a playable archive has not been recovered.']}
save('archive/curated-runs.json', curated)
save('archive/assets-manifest.json', assets)
save('archive/frost-2021-reconciliation.json', audit)
print(json.dumps({'confirmedChanges': len(rows), 'coverage': audit['coverage']}))
