"""Recover Holiday Tour original footage and record the discussion message census."""
import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p): return json.loads((ROOT/p).read_text())
def save(p,v): (ROOT/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
original='https://twitter.com/tomegome_g/status/1207309240462802944'
frame=ROOT/'public/assets/proof/holiday-2019-tomegome-lagoon-11586.webp'
if not frame.exists():subprocess.run(['ffmpeg','-loglevel','error','-ss','84','-i',str(ROOT/'archive/video-backup-files/holiday-2019-1207309059528876032/original.mp4'),'-frames:v','1','-y',str(frame)],check=True)
proof='/assets/proof/'+frame.name
r={'messageId':'holiday-2019-1207309240462802944','player':'Tomegome','courseId':'3ds-cheep-cheep-lagoon','time':'1:15.86','laps':['37.81','38.05'],'mushrooms':None,'status':'community-wr','submittedAt':'2019-12-18T14:38:48.000Z','video':original,'videoVerified':True,'proofImage':proof,'proofImageVerified':True,'source':{'url':original,'kind':'original-video'},'notes':['Original post timestamp read directly from X: December 18, 2019, 14:38:48 UTC. It is a publication time, not an asserted race-completion instant.','Full original video downloaded and visually reviewed at lap one (37.81) and finish (1:15.86); second lap 38.05 agrees with both subtraction and the original caption.','This matches the independently preserved historical WR announcement. December 22 discussion names Tomegome, quotes 1:15.86, and identifies it as the likely WR.','Local image proof is a still at 84 seconds in the original recording.']}
curated=read('archive/curated-runs.json');save('archive/curated-runs.json',[x for x in curated if x.get('messageId')!=r['messageId']]+[r])
a=read('archive/assets-manifest.json');a[proof]={'path':proof,'sha256':hashlib.sha256(frame.read_bytes()).hexdigest(),'bytes':frame.stat().st_size,'contentType':'image/webp'};save('archive/assets-manifest.json',a)
messages={m['id']:m for p in ['archive/raw/holiday-2019-discussion-census-1.json','archive/raw/holiday-2019-discussion-census-older.json'] for m in read(p)['messages']}
assert len(messages)==49
image_ids=[x['id'] for x in read('archive/early-visual-review.json').values() if x.get('messageId') in messages]
audit={'tour':'Holiday Tour 2019','status':'Partial server-wide reconciliation; full accessible tt-discussion search window read.','confirmedChanges':[r],'coverage':{'discussionQuery':'in:tt-discussion after:2019-12-17 before:2020-01-01','searchReportedMessages':49,'uniqueMessagesCapturedAndRead':len(messages),'directImagesReRead':len(image_ids),'directImageIds':image_ids,'originalVideoDownloadedAndVisuallyReviewed':1},'limitations':['Search coverage concerns currently accessible messages in tt-discussion only. Deleted messages and other channels are not certified complete.','Meester Tweester’s externally embedded DK Pass image 656956000146030602 returned HTTP 404. Its filename is not visually verified proof.','Earlier intermediate WRs on both courses remain unresolved. Six direct result images are later personal bests or have insufficient evidence of WR status.','The separate social-media channel links heriaw sity’s 1:19.91 video, slower than the established 1:15.86; this is a preservation lead, not a WR.']}
save('archive/holiday-2019-reconciliation.json',audit)
print(json.dumps(audit['coverage']))
