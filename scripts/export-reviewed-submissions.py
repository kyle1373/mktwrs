import json,re,hashlib
from pathlib import Path
read=lambda p:json.load(open(p))
reviews=read('archive/submission-visual-review.json');queue={r['attachmentId']:r for r in read('archive/submission-image-map.json')['images']};downloads=read('archive/submission-image-downloads.json');players=read('public/data/players.json');courses=read('public/data/courses.json');assets=read('archive/assets-manifest.json')
bydiscord={}
for p in sorted(players,key=lambda p:len(p.get('records',[])),reverse=True):
 if p.get('discordId'):bydiscord.setdefault(str(p['discordId']),p)
messages=read('archive/submission-review-index.json');mi={m['id'].split('-')[-1]:i for i,m in enumerate(messages)}
body=lambda m: re.sub(r'^.*?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), .*? at \d+:\d+ [AP]M','',m['text'],count=1)
cs=lambda s:sum(int(x)*n for x,n in zip(reversed(s.replace(':','.').split('.')),[1,100,6000]))
# WR status is deliberately reviewed; the image's New Record banner is a PB indicator.
confirmed={5:'Contemporaneous explicit WR claim in this post.',6:'Immediate improvement to the explicitly claimed 1:02.87 WR.',39:'Improvement to the confirmed 1:02.80; all captured intervening tour images reviewed.',44:'Improvement to the confirmed 1:02.78; all captured intervening tour images reviewed.',191:'Improves the independently preserved former 1:00.16 WR; earlier tour images reviewed.',192:'Immediate improvement to 1:00.10.',227:'Improves 1:00.09; all captured intervening tour images reviewed.'}
export=[];conflicts=[]
for aid,r in reviews.items():
 if not r['courseId'] or not r['time'] or r['index']==190:continue
 p=bydiscord.get(str(r.get('discordId')))
 name=p['name'] if p else r['playerDisplayName']
 if name=='Deleted User':continue # identity must be established before public player attribution
 i=mi[r['messageId']];own=body(messages[i]);laps=[None,None];lapSource=None;notes=[r['notes']] if r['notes'] else []
 match=re.search(r'(\d{1,2}[.:]\d{2})\s*(?:/{1,2}|-|\s)\s*(\d{1,2}[.:]\d{2})',own)
 if match:
  candidate=[v.replace(':','.') for v in match.groups()]
  if sum(cs(v) for v in candidate)==cs(r['time']):laps=candidate;lapSource=r['source']
  else:conflicts.append({'attachmentId':aid,'messageId':r['messageId'],'time':r['time'],'writtenLaps':candidate});notes.append('Written lap splits do not sum to the visually verified total; excluded pending review.')
 # Only explicit follow-up split posts belonging to the same Discord message group.
 if not match:
  for m in messages[i+1:i+3]:
   if not m['text'].startswith('['):break
   match=re.search(r'(\d{1,2}[.:]\d{2})\s*(?:/{1,2}|-)\s*(\d{1,2}[.:]\d{2})',body(m))
   if match and sum(cs(v.replace(':','.')) for v in match.groups())==cs(r['time']):
    laps=[v.replace(':','.') for v in match.groups()];lapSource='https://discord.com/channels/629221606064914442/875784780573184010/'+m['id'].split('-')[-1];break
 url=queue[aid]['imageUrl'];status='community-wr' if r['index'] in confirmed else 'documented-submission'
 if status=='community-wr':notes.append(confirmed[r['index']])
 entry={'messageId':r['messageId']+'-'+aid,'originalMessageId':r['messageId'],'player':name,'courseId':r['courseId'],'time':r['time'],'laps':laps,'mushrooms':None,'submittedAt':r['submittedAt'],'proofImage':url,'status':status,'source':{'url':r['source'],'channel':'tt-submission','messageId':r['messageId']},'notes':['Finish-screen total visually read; source post timestamp preserved exactly.',*notes]}
 if lapSource:entry['additionalSources']=[{'url':lapSource,'channel':'tt-submission'}]
 isWR=status=='community-wr' or any(c['id']==r['courseId'] and any(x['time']==r['time'] and p and x['playerId']==p['id'] for x in c['records']) for c in courses)
 if isWR and downloads.get(aid,{}).get('path'):
  origin=Path(downloads[aid]['path']);b=origin.read_bytes();sha=hashlib.sha256(b).hexdigest();path='/assets/proof/'+sha[:24]+origin.suffix;Path('public'+path).write_bytes(b);assets[url]={'path':path,'sha256':sha,'bytes':len(b),'contentType':'image/jpeg' if origin.suffix=='.jpg' else 'image/'+origin.suffix[1:]}
 export.append(entry)
Path('archive/reviewed-submissions.json').write_text(json.dumps(export,ensure_ascii=False,indent=2)+'\n');Path('archive/reviewed-split-conflicts.json').write_text(json.dumps(conflicts,ensure_ascii=False,indent=2)+'\n');Path('archive/assets-manifest.json').write_text(json.dumps(assets,indent=2)+'\n');print({'reviewed':len(reviews),'exported':len(export),'newWRs':sum(r['status']=='community-wr' for r in export),'splitConflicts':len(conflicts)})
