# Persist a human visual review, keyed by immutable Discord attachment ID.
import json,sys,re
from pathlib import Path
start=int(sys.argv[1]); entries=json.loads(sys.argv[2]); q=json.load(open('archive/submission-image-map.json'))['images']; unique=[];seen=set()
for r in q:
 if r['attachmentId'] not in seen:unique.append(r);seen.add(r['attachmentId'])
msgs=json.load(open('archive/submission-review-index.json')); by={};author=None;author_id=None
for m in msgs:
 text=m['text']
 if ' — ' in text and not text.startswith('['):
  author=text.split(' — ')[0].split('\u00a0[')[0].strip();author_id=None
  for im in m.get('images',[]):
   match=re.search(r'/avatars/(\d+)/',im.get('src',''))
   if match:author_id=match[1];break
 by[m['id'].split('-')[-1]]={**m,'inferredAuthor':author,'inferredAuthorDiscordId':author_id}
p=Path('archive/submission-visual-review.json'); saved=json.loads(p.read_text()) if p.exists() else {}
for i,e in enumerate(entries,start):
 r=unique[i];m=by[r['messageId']]
 time,course=e[:2];course={"T":"3ds-toad-circuit-r","D":"wii-dk-summit","V":"rmx-vanilla-lake-1","S":"snes-rainbow-road-r","Y":"gcn-yoshi-circuit"}.get(course,course);notes=e[2] if len(e)>2 else ''
 saved[r['attachmentId']]={'index':i,'messageId':r['messageId'],'submittedAt':r['submittedAt'],'source':r['source'],'time':time,'courseId':course,'playerDisplayName':m['inferredAuthor'],'discordId':m['inferredAuthorDiscordId'],'messageText':m['text'],'reviewStatus':'visually-reviewed','courseBasis':'Visible course scenery and finish-screen target times matched to tour Time Trial roster; adjacent submission context considered.','notes':notes,'classification':'needs-chronology-reconciliation'}
p.write_text(json.dumps(saved,ensure_ascii=False,indent=2)+'\n');print('Reviewed',len(saved))
