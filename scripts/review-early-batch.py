import json,sys
from pathlib import Path
start=int(sys.argv[1]);values=json.loads(sys.argv[2]);queue=json.load(open('archive/early-image-index.json'))['images'];dest=Path('archive/early-visual-review.json');reviews=json.loads(dest.read_text()) if dest.exists() else {}
for r,reading in zip(queue[start:start+len(values)],values):
 time,course,notes=reading
 reviews[r['id']]={**r,'time':time,'courseId':course,'notes':notes,'reviewStatus':'visually-reviewed' if time or course else 'unresolved','classification':'needs-chronology-reconciliation','source':'https://discord.com/channels/629221606064914442/636461740162416640/'+r['messageId']}
dest.write_text(json.dumps(reviews,ensure_ascii=False,indent=2)+'\n');print('Early evidence reviewed',len(reviews))
