"""Rebuild an honest status snapshot from saved review ledgers, never a completion claim."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'archive'


def read(name):
    return json.loads((ARCHIVE / name).read_text())


queue = read('early-image-index.json')['images']
reviews = read('early-visual-review.json')
downloads = read('early-image-downloads.json')
curated = read('curated-runs.json')
coverage = read('history-coverage-audit.json')
years = []
for year in ('2019', '2020', '2021'):
    # Attachment IDs deduplicate sightings; hashes in download ledgers identify files.
    rows = list({r['id']: r for r in queue if r.get('postedAt', '').startswith(year)}.values())
    statuses = Counter(reviews.get(r['id'], {}).get('reviewStatus', 'not-reviewed') for r in rows)
    years.append({
        'year': year,
        'indexedImageReferences': len(rows),
        'reviewStatuses': dict(statuses),
        'imagesWithTranscribedTime': sum(bool(reviews.get(r['id'], {}).get('time')) for r in rows),
        'referencesWithoutReviewEntry': [
            {'attachmentId': r['id'], 'messageId': r['messageId'], 'postedAt': r['postedAt'],
             'sourceImage': r['url'], 'localPath': downloads.get(r['id'], {}).get('path')}
            for r in rows if r['id'] not in reviews
        ],
        'historyComplete': False,
    })

early_leads = [
    {'recordId': r.get('messageId'), 'courseId': r.get('courseId'), 'player': r.get('player'),
     'time': r.get('time'), 'observedAt': r.get('observedAt'), 'submittedAt': r.get('submittedAt'),
     'source': r.get('source'), 'notes': r.get('notes', [])}
    for r in curated if r.get('dateUnresolved') and
    (r.get('observedAt') or r.get('submittedAt') or '')[:4] in ('2019', '2020')
]
forward = read('winter2020-discussion-review-progress.json')
submission = read('october2-submission-review-progress.json')
report = {
    'complete': False,
    'scope': 'Snapshot of existing local queues, not all Discord messages or all years. Separate tour/server-image searches are not added to these counts because their references may overlap.',
    'tracking': {
        'messageIdentity': 'Discord channel ID + message ID; preserve original UTC timestamp and source URL.',
        'imageIdentity': 'Discord attachment ID (or source-derived ID for external images), plus local SHA-256 where available.',
        'stages': ['captured', 'media-preserved', 'visually-reviewed', 'context-and-chronology-reconciled', 'published', 'live-verified'],
        'resumeRule': 'Skip image IDs already reviewed unless unavailable, ambiguous, changed, or reopened by a new source. Read nearby messages for unresolved context; do not equate visual review with accepted WR status.',
        'completionRule': coverage['completionRule'],
    },
    'earlyImageQueue': years,
    'explicitEarlyUndatedCuratedLeads': early_leads,
    'continuousDiscussionCheckpoint': {k: forward.get(k) for k in
        ('firstCapturedAt', 'lastCapturedAt', 'lastMessageId', 'uniqueMessageCount', 'pageCount', 'allAdjacentPagesOverlap', 'complete')},
    'currentSubmissionImagePass': {k: submission.get(k) for k in
        ('imagesReviewedThisPass', 'remainingLocalImagesInMay2022OnwardQueue', 'nextLocalImage', 'complete')},
    'courseTourAudit': {k: coverage[k] for k in ('courseCount', 'appearanceCount', 'completeAppearances', 'flagCounts')},
    'limitations': [
        'Image-filtered searches omit messages without images, deleted content, and some external embeds.',
        'Publication timestamps do not automatically establish achievement dates. Unknown dates stay unknown.',
        'Visual-review ledgers still contain chronology-pending entries. Missing rival runs can change WR classification.',
        'No date through which the entire archive is certified complete has been established.',
    ],
}
(ARCHIVE / 'archive-status.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'earlyQueue': [{k: r[k] for k in ('year', 'indexedImageReferences', 'reviewStatuses')} for r in years],
                  'earlyUndatedLeads': len(early_leads), 'certifiedCompleteAppearances': coverage['completeAppearances']}, indent=2))
