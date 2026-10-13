import json,subprocess,hashlib,gzip,concurrent.futures
from pathlib import Path
from datetime import datetime,timezone
from bs4 import BeautifulSoup
load=lambda p:json.loads(subprocess.check_output(['git','show','HEAD:'+p]))
head=subprocess.check_output(['git','rev-parse','HEAD']).decode().strip();slugs=['3ds-wario-shipyard','wii-dk-summit-r'];out=Path('/tmp/mkt-losangeles2022-final-check');out.mkdir(exist_ok=True)
def normalize(x,key=None):
 if isinstance(x,dict):return {k:normalize(v,k) for k,v in x.items() if v is not None}
 if isinstance(x,list):
  v=[normalize(i) for i in x];return sorted(v,key=lambda r:json.dumps(r,sort_keys=True)) if key in ['notes','additionalSources','videoShareEvents','resultReportEvents'] else v
 return x
rows=[];pages=[];links=set()
for slug in slugs:
 expected=load('public/data/courses/'+slug+'.json');raw=subprocess.check_output(['curl','--fail','--silent','-A','Mozilla/5.0','https://mktwrs.com/data/courses/'+slug+'.json?final='+head[:8]]);live=json.loads(raw)
 (out/(slug+'.json.gz')).write_bytes(gzip.compress(raw,mtime=0))
 for group in ['records','submissions','candidates']:
  ys={r['id']:r for r in live.get(group,[])}
  expectedIds={r['id'] for r in expected.get(group,[])}
  for extraId in set(ys)-expectedIds:rows.append(dict(courseId=slug,collection=group,id=extraId,differentFields=['unexpected-live-row']))
  for r in expected.get(group,[]):
   y=ys.get(r['id']);fields=[k for k in set(r)|set(y or {}) if normalize(r.get(k),k)!=normalize((y or {}).get(k),k)] if y else ['missing'];rows.append(dict(courseId=slug,collection=group,id=r['id'],differentFields=fields))
 page=subprocess.check_output(['curl','--fail','--silent','-A','Mozilla/5.0','https://mktwrs.com/course/'+slug+'?final='+head[:8]]);(out/(slug+'.html.gz')).write_bytes(gzip.compress(page,mtime=0));s=BeautifulSoup(page,'html.parser');sec=next(x for x in s.find_all('section') if x.find('h2') and "Los Angeles Tour (2022) recording comparison" in x.h2.get_text());ps=dict(courseId=slug,pageSha256=hashlib.sha256(page).hexdigest(),comparisonText=sec.get_text(' ',strip=True),r2LinkCount=0)
 for a in s.select('a[href]'):
  u=a['href']
  if u.startswith('/assets/'):u='https://media.mktwrs.com'+u
  if u.startswith('https://media.mktwrs.com/assets/'):links.add(u);ps['r2LinkCount']+=1
 pages.append(ps)
def check(u):
 p=subprocess.run(['curl','--fail','--silent','-A','Mozilla/5.0','--range','0-31',u],capture_output=True);return dict(url=u,publicPrefixReadable=p.returncode==0 and len(p.stdout)>=1,receivedBytes=len(p.stdout))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:checks=list(pool.map(check,sorted(links)))
result=dict(checkedAt=datetime.now(timezone.utc).isoformat(),sourceCommit=head,tourId='tour-63',scope='Live whole-course snapshots compared with committed publication files. Los Angeles source and media coverage separately documented; this audit verifies publication and rendered evidence access.',normalization='Optional nulls omitted, notes/additionalSources/share/report events unordered; other fields ordered.',rows=rows,publicationDifferences=[r for r in rows if r['differentFields']],pages=pages,renderedR2Links=checks,passed=not any(r['differentFields'] for r in rows) and all(c['publicPrefixReadable'] for c in checks))
(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(rows=len(rows),differences=len(result['publicationDifferences']),r2Links=len(checks),readable=sum(c['publicPrefixReadable'] for c in checks),passed=result['passed'])));print(json.dumps(result['publicationDifferences'][:5]))
