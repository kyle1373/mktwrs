"""Attach DIT's five personally supplied and visually verified recordings."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT / path).read_text())
def save(path, value): (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

runs = read('archive/curated-runs.json')
backups = read('archive/video-backups.json')
availability = read('archive/video-availability.json')
ledger = read('archive/video-backup-files/downloads.json')
spec = [
    ('mWbaf9XQHh4', 'gba-bowser-s-castle-1', '0:59.55', ['29.99', '29.56'], [33, 62.3]),
    ('cdvRa_5DaFw', '3ds-rosalina-s-ice-world', '1:29.78', ['44.84', '44.94'], [48, 93]),
    ('qI-fDeMybIU', 'gcn-dino-dino-jungle-r', '1:39.25', ['49.67', '49.58'], [53, 102.5]),
    ('4WTs_KPwdno', 'snes-vanilla-lake-1', '0:34.20', ['17.09', '17.11'], [22, 38]),
    ('mfipXbqLkUw', 'athens-dash-3', '1:11.66', ['35.87', '35.79'], [41, 76.6]),
]
report = []
for vid, course, time, laps, frames in spec:
    matches = [r for r in runs if r.get('player') == 'DIT' and r.get('courseId') == course and r.get('time') == time]
    assert len(matches) == 1, (course, time, len(matches))
    r = matches[0]
    folder = Path('archive/video-backup-files/dit-recovered') / vid
    metadata = read(folder / 'original.info.json')
    assert metadata['channel_id'] == 'UCQ2hcLcrYPBH04Xj1Du58Cw'
    file = ROOT / folder / 'original.mp4'
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    url = 'https://www.youtube.com/watch?v=' + vid
    published = datetime.fromtimestamp(metadata['timestamp'], timezone.utc).isoformat().replace('+00:00', 'Z')
    m, s = time.split(':')
    assert sum(round(float(l) * 100) for l in laps) == int(m) * 6000 + round(float(s) * 100)
    old_video = r.get('video')
    r['laps'] = laps
    r.setdefault('additionalSources', [])
    source = {'url': url, 'channel': 'player-supplied-video'}
    if source not in r['additionalSources']: r['additionalSources'].append(source)
    note = 'Recovered recording supplied by DIT; first-lap crossing and final time visually verified. Lap 2 is total minus lap 1 and agrees with the original posted splits where present.'
    if note not in r['notes']: r['notes'].append(note)
    if old_video and 'twitter.com' in old_video:
        key = 'x:' + old_video.split('/status/')[1].split('?')[0]
        backups[key] = {'url': url, 'originalUrl': old_video, 'channel': 'DIT', 'channelId': metadata['channel_id'], 'kind': 'player-recovery', 'status': 'available', 'publishedAt': published, 'sha256': digest, 'bytes': file.stat().st_size, 'credit': 'DIT', 'verifiedTime': time, 'verifiedLaps': laps}
        r['notes'] = [n for n in r['notes'] if 'do not claim a recovered video' not in n]
        r['notes'].append('The original X link is retained. Its recovered screen recording is available separately on DIT’s YouTube channel.') if 'The original X link is retained. Its recovered screen recording is available separately on DIT’s YouTube channel.' not in r['notes'] else None
    else:
        r.update(video=url, videoVerified=True)
        # These original uploads predate the preserved Discord reposts. Retain
        # those reposts as sources without treating their dates as race dates.
        if published < r['submittedAt']:
            old_source = r['source']
            if old_source not in r['additionalSources']: r['additionalSources'].append(old_source)
            r.update(source=source, submittedAt=published)
        date_note = 'Earliest surviving video publication is ' + published + '; this establishes the run by that date, not its exact race-completion instant. Later Discord evidence is retained separately.'
        if date_note not in r['notes']: r['notes'].append(date_note)
        if course == 'snes-vanilla-lake-1':
            r['notes'] = [n for n in r['notes'] if 'original date is unresolved' not in n]
    availability['youtube:' + vid] = {'originalUrl': url, 'status': 'available', 'checkedAt': '2026-10-01', 'bytes': file.stat().st_size, 'sha256': digest}
    ledger['youtube:' + vid] = {'key': 'youtube:' + vid, 'originalUrl': url, 'status': 'downloaded', 'file': str(folder / 'original.mp4'), 'folder': str(folder), 'bytes': file.stat().st_size, 'sha256': digest, 'reviewStatus': 'visually-reviewed', 'backupStatus': 'queued', 'runs': [{'courseId': course, 'time': time, 'player': 'DIT', 'laps': laps}]}
    report.append({'courseId': course, 'player': 'DIT', 'time': time, 'laps': laps, 'originalUrl': old_video or url, 'recoveredUrl': url, 'publishedAt': published, 'recordEvidenceDate': r['submittedAt'], 'reviewFramesSeconds': frames, 'sha256': digest, 'bytes': file.stat().st_size})
save('archive/curated-runs.json', runs)
save('archive/video-backups.json', backups)
save('archive/video-availability.json', availability)
save('archive/video-backup-files/downloads.json', ledger)
save('archive/dit-recovered-videos.json', {'reviewedAt': '2026-10-01', 'videos': report, 'notes': ['Five recordings supplied by DIT and downloaded locally. Three recover original X footage; two add previously unlinked original YouTube videos.', 'No new SuperFX64 upload is claimed. Player-provided recovered copies are credited to DIT.', 'Private message text and private Discord links are not included in the public archive.']})
print('Attached five verified DIT videos; preserved three original X links.')
