"""Identify early image reviews not yet linked to curated evidence.

This checks evidence transfer, not whether a submission was a world record.
It deliberately keeps source capture and chronology completion separate.
"""
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'archive'


def read(name):
    return json.loads((ARCHIVE / name).read_text())


def centiseconds(value):
    if not value:
        return None
    parts = value.split(':')
    seconds = parts.pop()
    whole, fraction = seconds.split('.')
    return (int(parts[0]) * 60 if parts else 0) * 100 + int(whole) * 100 + int(fraction.ljust(2, '0'))


reviews = read('early-visual-review.json')
curated = read('curated-runs.json')
existing = {row['attachmentId']: row['curatedEvidenceIds']
            for row in read('2019-image-to-curated-audit.json')['images']}
by_attachment = defaultdict(list)
by_message = defaultdict(list)
for run in curated:
    for source in [run.get('source', {}), *run.get('additionalSources', [])]:
        if source.get('messageId'):
            by_message[source['messageId']].append(run)
    for value in [run.get('proofImage', ''), run.get('proofImageLocal', '')]:
        for row in (value or '').split('/'):
            if row.isdigit():
                by_attachment[row].append(run)

rows = []
for aid, image in sorted({i['id']: i for i in read('early-image-index.json')['images']
                          if '2019' <= i.get('postedAt', '') < '2020-03-01'}.items(),
                         key=lambda item: (item[1]['postedAt'], item[0])):
    review = reviews.get(aid, {})
    candidates = by_attachment[aid] + by_message[image['messageId']]
    # Source-derived external IDs can occur in a local proof filename.
    candidates += [run for run in curated if aid in (run.get('proofImageLocal') or '')]
    matches = {run['messageId']: run for run in candidates
               if review.get('courseId') == run.get('courseId') and
               review.get('time') and centiseconds(review['time']) == centiseconds(run.get('time'))}
    # Preserve previously inspected links, but validate their time and course too.
    for run in curated:
        if run['messageId'] in existing.get(aid, []) and review.get('courseId') == run.get('courseId') and review.get('time') and centiseconds(review['time']) == centiseconds(run.get('time')):
            matches[run['messageId']] = run
    rows.append({
        'attachmentId': aid, 'messageId': image['messageId'],
        'sourcePostedAt': image['postedAt'], 'courseId': review.get('courseId'),
        'transcribedTime': review.get('time'), 'reviewStatus': review.get('reviewStatus', 'not-reviewed'),
        'curatedEvidenceIds': sorted(matches),
        'curatedClassifications': {key: run.get('status') for key, run in matches.items()},
        'stage': 'linked-to-curated-evidence' if matches else
                 'transcribed-not-linked' if review.get('time') else 'no-result-time-transcription',
        'sourceImage': image['url'],
    })
report = {
    'complete': False,
    'scope': 'Indexed images posted before March 2020 only. Not an exhaustive Discord census or a WR chronology certification.',
    'matchingRule': 'Stable attachment or source message identity plus matching course and centisecond time; retained manual 2019 links also validated.',
    'counts': dict(Counter(row['stage'] for row in rows)),
    'nextAction': 'Resolve unmatched transcriptions, then compare linked runs against contemporary rival history and original achievement dates.',
    'images': rows,
}
(ARCHIVE / 'early-review-transfer-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'indexedImages': len(rows), 'counts': report['counts']}))
