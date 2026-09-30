import json,subprocess,hashlib,concurrent.futures,re
from pathlib import Path
rows=json.load(open('archive/raw/original-2019-leaderboard.json'))['WR history'];course=None;records=[]
for row in rows:
 v=row['values']
 if v[0] in ['Toad Circuit','Neo Bowser City','Dino Dino Jungle']:course={'Toad Circuit':'3ds-toad-circuit','Neo Bowser City':'3ds-neo-bowser-city','Dino Dino Jungle':'gcn-dino-dino-jungle'}[v[0]]
 if not isinstance(v[0],(int,float)):continue
 date='2019-10-'+v[5].split()[-1].zfill(2) if v[5].startswith('Oct.') else v[5][:10]
 records.append({'row':row['row'],'courseId':course,'player':v[1],'country':v[2],'time':v[3],'lap1':v[4],'sourceDate':date,'sourceClock':v[6],'sourceZoneLabel':'CST','image':v[7] if v[7]!='-' else None,'video':v[8] if v[8]!='-' else None,'comment':v[9],'reviewStatus':'pending-image-review'})
Path('archive/2019-history-candidates.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
Path('archive/2019-proof-images').mkdir(exist_ok=True)
local={}
for f in ['archive/early-image-downloads.json','archive/submission-image-downloads.json']:
 local.update(json.load(open(f)))
def download(r):
 u=r['image'];out={**r}
 if not u:return out
 aid=re.search(r'/attachments/\d+/(\d+)/',u)
 if aid and local.get(aid[1],{}).get('path'):out['path']=local[aid[1]]['path'];return out
 path='archive/2019-proof-images/row-'+str(r['row'])+'.img'
 p=subprocess.run(['curl','-fLsS','--max-time','25','-o',path,u],capture_output=True)
 if p.returncode:out['error']=p.stderr.decode()[-200:]
 else:out['path']=path;out['sha256']=hashlib.sha256(Path(path).read_bytes()).hexdigest()
 return out
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:out=list(ex.map(download,records))
Path('archive/2019-proof-downloads.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print({'records':len(out),'preserved':sum('path' in r for r in out),'unavailable':sum('error' in r for r in out)})
