import json,sys
from pathlib import Path
rows=json.load(open(sys.argv[1]));values=json.loads(sys.argv[2]);p=Path('archive/early-visual-review.json');reviews=json.loads(p.read_text())
if len(rows)!=len(values):raise ValueError('Every displayed image requires a review entry')
for r,(time,course,notes) in zip(rows,values):
 reviews[r['id']]={**r,'time':time,'courseId':course,'notes':notes,'reviewStatus':'visually-reviewed','classification':'needs-chronology-reconciliation','source':'https://discord.com/channels/629221606064914442/636461740162416640/'+r['messageId']}
p.write_text(json.dumps(reviews,ensure_ascii=False,indent=2)+'\n');print('Early images reviewed',len(reviews))
