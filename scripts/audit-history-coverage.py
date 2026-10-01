"""Inventory every course/tour appearance without treating record presence as completeness."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
courses = json.loads((ROOT / 'public/data/courses.json').read_text())
tours = {t['id']: t for t in json.loads((ROOT / 'public/data/tours.json').read_text())}
curated = json.loads((ROOT / 'archive/curated-runs.json').read_text())
reports = []
for path in sorted((ROOT / 'archive').glob('*-reconciliation.json')):
    data = json.loads(path.read_text())
    reports.append((str(path.relative_to(ROOT)), json.dumps(data, ensure_ascii=False)))

rows = []
for course in courses:
    appearances = sorted(course['appearances'], key=lambda a: a['startDate'])
    for number, appearance in enumerate(appearances):
        start, end = appearance['startDate'], appearance['endDate']
        dated = [r for r in course['records'] if start <= (r.get('recordDate') or '') < end]
        boundary = [r for r in course['records'] if r.get('recordDate') == end]
        undated = [r for r in course['records'] if not r.get('recordDate') and
                   (r.get('tourDateRange') or {}).get('start') == start]
        leads = [r for r in curated if r.get('courseId') == course['id'] and
                 r.get('includeInProgression') is False and r.get('dateUnresolved') and
                 start <= (r.get('observedAt') or '')[:10] <= end]
        flags = []
        if number == 0 and not dated:
            flags.append('first-appearance-has-no-dated-wr')
        if undated:
            flags.append('undated-announced-wrs')
        if boundary:
            flags.append('reset-day-records-require-timestamp-check')
        if leads:
            flags.append('unresolved-intermediate-record-leads')
        if any(not r.get('proofImageLocal') and not r.get('videoVerified') for r in dated + undated + boundary):
            flags.append('record-evidence-needs-review')
        related = [path for path, text in reports if course['id'] in text and
                   any((r.get('id') or r.get('messageId') or '\0') in text or
                       (r.get('source') or {}).get('messageId', '\0') in text
                       for r in dated + boundary)]
        if not related:
            flags.append('no-matched-reconciliation-report')
        rows.append({'courseId': course['id'], 'course': course['name'],
                     'tourId': appearance['tourId'], 'tour': tours[appearance['tourId']]['name'],
                     'startDate': start, 'endDate': end,
                     'datedRecordCount': len(dated), 'undatedRecordCount': len(undated),
                     'resetDayRecordCount': len(boundary), 'openLeadCount': len(leads),
                     'relatedReports': related, 'flags': flags,
                     'historyComplete': False,
                     'status': 'requires-coverage-verification'})

report = {'scope': 'Every published course and tour appearance. Flags identify review priorities, not proof that a WR existed. Zero new records can be legitimate when a standing WR survived a tour.',
          'completionRule': 'Neither a final WR, a reconciliation report nor a message count certifies exhaustive history. Every appearance remains unverified until source coverage, images, nearby context, competitors and open leads are reconciled.',
          'courseCount': len(courses), 'appearanceCount': len(rows),
          'completeAppearances': 0, 'flagCounts': dict(Counter(f for r in rows for f in r['flags'])),
          'appearances': rows}
(ROOT / 'archive/history-coverage-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print({k: v for k, v in report.items() if k not in ['scope', 'completionRule', 'appearances']})
