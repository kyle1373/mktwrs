import json,hashlib,re
from pathlib import Path
read=lambda p:json.load(open(p))
rows=read('archive/2019-proof-downloads.json');runs=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json');early=read('archive/early-image-index.json')['images'];downloads=read('archive/early-image-downloads.json')
verified={5,6,7,8,9,10,19,20,27,28,29,35,36,45}
base='https://docs.google.com/spreadsheets/d/17aBouVdvUJS6EHsc8m-rdYGtwfERIBSBgVFJ-iqCSqQ/edit'
for r in rows:
 if r['row'] not in verified:continue
 old=next((x for x in runs if x['courseId']==r['courseId'] and x['player']==r['player'] and x['time']==r['time']),None)
 proof=r.get('image');path=r.get('path');aid=re.search(r'/attachments/\d+/(\d+)/',proof or '')
 sourceImage=next((x for x in early if aid and x['id']==aid[1]),None)
 if r['row']==36:
  sourceImage=next(x for x in early if x['id']=='637230684749955074');path=downloads[sourceImage['id']]['path'];proof=sourceImage['url']
 if r['row']==45:proof=old['proofImage']
 if path:
  b=Path(path).read_bytes();h=hashlib.sha256(b).hexdigest();ext='.png' if b.startswith(b'\x89PNG') else '.jpg';local='/assets/proof/'+h[:24]+ext;Path('public'+local).write_bytes(b);assets[proof]={'path':local,'sha256':h,'bytes':len(b),'contentType':'image/png' if ext=='.png' else 'image/jpeg'}
 notes=['Listed explicitly in the contemporary 2019 WR history, and the proof image has been visually read.','Source clock is retained as written; the sheet labels Central daylight-time values as CST, so the clock has not been converted into an exact UTC achievement timestamp.']
 if r['row']==20:notes.append('Date conflict: the summary table says October 24; the dedicated WR history dates this run October 25 at 10:16. This entry follows the dedicated history and retains both sources.')
 if r['row']==36:notes.append('This image was reposted to tt-discussion on October 25; the original WR history and original attachment identify October 24. Repost time is observation only.')
 entry={'messageId':'original-2019-wr-row-'+str(r['row']),'player':r['player'],'courseId':r['courseId'],'time':r['time'],'laps':[f"{float(r['lap1']):.2f}" if r['lap1'] is not None else None,None],'mushrooms':None,'status':'community-wr','achievedAt':r['sourceDate'],'datePrecision':'day','sourceClock':r['sourceClock'],'sourceZoneLabel':r['sourceZoneLabel'],'submittedAt':None,'proofImage':proof,'video':r.get('video'),'source':{'url':base+'#range='+"'WR%20history'!A"+str(r['row'])+':J'+str(r['row']),'sheet':'WR history','range':'A'+str(r['row'])+':J'+str(r['row'])},'notes':notes,'additionalSources':[]}
 if sourceImage:
  entry['additionalSources'].append({'url':'https://discord.com/channels/629221606064914442/636461740162416640/'+sourceImage['messageId'],'channel':'tt-discussion','messageId':sourceImage['messageId']})
  if sourceImage['postedAt'][:10]==r['sourceDate']:entry['submittedAt']=sourceImage['postedAt']
  else:entry['observedAt']=sourceImage['postedAt']
 if r['row']==20:entry['dateOverride']={'date':r['sourceDate'],'reason':'Dedicated WR history date preferred; conflicting summary date retained in notes.','source':entry['source']}
 if old:
  entry['messageId']=old['messageId'];entry['observedAt']=old.get('observedAt',entry.get('observedAt'))
  entry['additionalSources'].append(old['source']);runs[runs.index(old)]=entry
 else:runs.append(entry)
Path('archive/curated-runs.json').write_text(json.dumps(runs,ensure_ascii=False,indent=2)+'\n');Path('archive/assets-manifest.json').write_text(json.dumps(assets,indent=2)+'\n');print('Imported',len(verified),'visually checked 2019 WR entries')
