"""Flag early chronology gaps without mistaking a first record for full coverage."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
courses=json.loads((root/'public/data/courses.json').read_text())
rows=[]
for c in courses:
    apps=c.get('appearances',[])
    if not apps:continue
    first=min(apps,key=lambda a:a['startDate'])
    dates=[r['recordDate'] for r in c['records'] if r.get('recordDate')]
    earliest=min(dates) if dates else None
    status='first-tour-dated-evidence-present'
    if earliest is None or earliest>first['endDate']:status='first-tour-dated-evidence-missing'
    elif earliest==first['endDate']:status='reset-day-timestamp-needs-review'
    rows.append({'courseId':c['id'],'name':c['name'],'status':status,'firstTourStart':first['startDate'],'firstTourEnd':first['endDate'],'earliestDatedRecord':earliest,'undatedRecords':sum(not r.get('recordDate') for r in c['records']),'recordCount':len(c['records']),'historyComplete':False})
counts={s:sum(r['status']==s for r in rows) for s in sorted({r['status'] for r in rows})}
report={'scope':'All published courses. This checks early dated evidence only; it cannot certify that every intermediate record is captured. A tour ends at 06:00 UTC, so dates on the reset day need separate timestamp review.','courseCount':len(courses),'counts':counts,'courses':rows}
(root/'archive/course-early-coverage-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(counts)
