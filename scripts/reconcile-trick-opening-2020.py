"""Restore explicitly recognized opening records from Trick Tour discussion."""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text())
def save(p,x):(ROOT/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
messages={x['id'].removeprefix('search-result-'):x for x in read('archive/trick-2020-discussion-census.json')}
images={x['messageId']:x for x in read('archive/trick-2020-server-image-map.json')}
curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
def source(mid):return {'url':f'https://discord.com/channels/629221606064914442/636461740162416640/{mid}','channel':'tt-discussion','messageId':mid}
mid='702434659526770758';x=images[mid];path=f'/assets/proof/trick-2020-{x["attachmentId"]}.webp'
im=Image.open(ROOT/x['path']).convert('RGB');im.thumbnail((1080,2160));im.save(ROOT/'public'/path.lstrip('/'),'WEBP',lossless=True)
assets[x['url']]={'path':path}
rows=[{'messageId':'trick-2020-'+mid,'player':'Astre','courseId':'snes-vanilla-lake-1','time':'0:35.40','laps':['17.71','17.69'],'mushrooms':None,'status':'community-wr','submittedAt':messages[mid]['times'][0],'source':source(mid),'additionalSources':[source('702434599602749501'),source('702434687959826532')],'proofImage':x['url'],'proofImageVerified':True,'notes':['Result screenshot visually read. Immediately before the image, Astre explicitly says he is WR; immediately afterward, he supplies both lap times. This succeeds the reported Baseball 35.42 and precedes Milky 35.21.']},
{'messageId':'trick-2020-702437997290848306','player':'Milky','courseId':'snes-vanilla-lake-1','time':'0:35.21','laps':[None,None],'mushrooms':None,'status':'community-wr','submittedAt':None,'achievedAt':None,'observedAt':messages['702437997290848306']['times'][0],'datePrecision':'unknown','dateEvidence':'contemporary-community-report','source':source('702437997290848306'),'additionalSources':[source('702438334307500062'),source('702443731273646120'),source('702455319376429096')],'notes':['HAYABUSA reports the fastest Japanese time as 35.21 and names Milky. Subsequent discussion explicitly recognizes 2AM 35.20 as the new WR and ranks Milky second. Original achievement date and proof have not been recovered; the report timestamp is retained as observation only.']}]
for row in rows:curated=[x for x in curated if x.get('messageId')!=row['messageId']]+[row]
for row in curated:
 if row.get('messageId')=='702455103457853480-verified':
  row['observedAt']=messages['702443731273646120']['times'][0]
  row['additionalSources']=list({x['url']:x for x in row.get('additionalSources',[])+[source('702443671974576198'),source('702443731273646120')]}.values())
  note='Astre announced 2AM’s 35.20 as the new WR at 09:00 UTC, before the player posted the screenshot at 09:45 UTC. The exact achievement timestamp remains unknown; the earlier report is observation evidence.'
  if note not in row['notes']:row['notes'].append(note)
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets)
print('Restored Astre 35.40 and Milky 35.21, and retained earlier 2AM observation.')
