import json,time,subprocess,concurrent.futures
from pathlib import Path
outdir=Path('archive/ocr-batches');outdir.mkdir(exist_ok=True)
seen=set()
for f in outdir.glob('*.jsonl'):
 for line in f.read_text().splitlines():
  try:seen.add(json.loads(line)['path'])
  except:pass
batch=len(list(outdir.glob('*.jsonl')))
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 active={}
 while True:
  downloads=json.load(open('archive/submission-image-downloads.json'))
  paths=[v['path'] for v in downloads.values() if v.get('path') and v['path'] not in seen]
  while paths and len(active)<3:
   part=paths[:50];paths=paths[50:];seen.update(part);batch+=1
   inp=outdir/f'batch-{batch:04d}.json';out=outdir/f'batch-{batch:04d}.jsonl';inp.write_text(json.dumps(part))
   future=pool.submit(subprocess.run,['/tmp/mkt-submission-ocr',str(inp),str(out)],capture_output=True,text=True)
   active[future]=batch
  for future in list(active):
   if future.done():
    r=future.result();print('OCR batch',active.pop(future),'exit',r.returncode,'paths scheduled',len(seen),flush=True)
  if not paths and not active and len(downloads)>=6779:break
  time.sleep(3)
print('OCR complete',len(seen),flush=True)
