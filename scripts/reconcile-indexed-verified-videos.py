"""Link captured discussion video references to existing verified canonical footage.

Exact video ID matches preserve repost source IDs; they never establish a new
run, achievement date, WR status, or complete review of surrounding messages.
"""
import json
import re
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
AUDIT = 'archive/discussion-known-verified-video-index-reconciliation-20261005.json'

def video_id(url):
    match = re.search(r'(?:youtu\.be/|[?&]v=|youtube\.com/shorts/)([\w-]{11})(?:[?&#/]|$)', url or '')
    return match[1] if match else None

def replace_object(text, key, value, replacement, indent):
    pos = text.index(json.dumps(key) + ': ' + json.dumps(value))
    start = text.rfind(' ' * indent + '{', 0, pos)
    assert start >= 0
    old, length = json.JSONDecoder().raw_decode(text[start + indent:])
    assert old[key] == value
    encoded = ' ' * indent + json.dumps(replacement, ensure_ascii=(indent == 4), indent=2).replace('\n', '\n' + ' ' * indent)
    return text[:start] + encoded + text[start + indent + length:]

curated_path = ROOT / 'archive/curated-runs.json'
curated_text = curated_path.read_text()
curated = json.loads(curated_text)
verified = {}
for run in curated:
    ident = video_id(run.get('video'))
    if run.get('videoVerified') and ident:
        verified.setdefault(ident, []).append(run)

linked = []
changed_runs = {}
queue_files = []
for path in sorted((ROOT / 'archive').glob('tt-discussion*-captured-video-review-queue-*.json')):
    text = path.read_text()
    queue = json.loads(text)
    changed = 0
    for row in queue.get('rows', []):
        if row.get('reviewStatus') != 'pending-footage-and-record-match':
            continue
        matches = {}
        for url in row.get('videoCandidates', []):
            ident = video_id(url)
            if ident in verified:
                matches[ident] = verified[ident]
        if not matches:
            continue
        refs = []
        for ident, runs in matches.items():
            for run in runs:
                refs.append({'videoId': ident, 'curatedId': run['messageId'], 'courseId': run['courseId'], 'player': run['player'], 'time': run.get('time'), 'canonicalWrStatus': run.get('status')})
                source_url = row.get('sourceUrl') or f"https://discord.com/channels/629221606064914442/636461740162416640/{row['messageId']}"
                existing = [run.get('source', {}), *run.get('additionalSources', [])]
                if not any(s.get('messageId') == row['messageId'] or s.get('url') == source_url for s in existing):
                    run.setdefault('additionalSources', []).append({'url': source_url, 'channel': 'tt-discussion', 'messageId': row['messageId'], 'publishedAt': row.get('postedAt'), 'kind': 'indexed-reference-to-same-verified-video'})
                    changed_runs[run['messageId']] = run
        updated = dict(row)
        updated.update({'reviewStatus': 'indexed-to-existing-verified-video;surrounding-context-review-not-certified', 'matchedVerifiedRuns': refs, 'reviewAudit': AUDIT, 'matchBasis': 'Exact YouTube video ID; prior canonical visual verification reused. No new footage verification or WR/date inference.'})
        text = replace_object(text, 'messageId', row['messageId'], updated, 4)
        linked.append({'queueFile': str(path.relative_to(ROOT)), 'sourceMessageId': row['messageId'], 'sourcePublishedAt': row.get('postedAt'), 'matches': refs})
        changed += 1
    if changed:
        path.write_text(text)
        queue_files.append(str(path.relative_to(ROOT)))
for ident, run in changed_runs.items():
    curated_text = replace_object(curated_text, 'messageId', ident, run, 2)
curated_path.write_text(curated_text)
report = {'checkedAt': '2026-10-05', 'historyComplete': False, 'scope': 'Captured TT-discussion references matched to exact YouTube IDs already visually verified in curated runs.', 'newWrCount': 0, 'achievementDatesChanged': 0, 'footageNewlyReviewed': 0, 'matchedDiscussionMessages': len(linked), 'canonicalRunsWithNewSourceReferences': len(changed_runs), 'queueFilesUpdated': queue_files, 'limitations': ['This reconciles existing reviews with capture queues; it does not verify all nearby messages or certify tour completeness.', 'A later video repost does not create a new run or replace the original first-publication date.', 'Original and unlisted backup availability still require their separate preservation audit.'], 'references': linked}
if linked:
    (ROOT / AUDIT).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ['matchedDiscussionMessages', 'canonicalRunsWithNewSourceReferences', 'newWrCount', 'achievementDatesChanged']}))
