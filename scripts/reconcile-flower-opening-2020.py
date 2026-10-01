"""Restore Kazuo's opening Flower Tour exchange from complete discussion context."""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def read(p):return json.loads((ROOT/p).read_text())
def save(p,x):(ROOT/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
messages={x['id'].removeprefix('search-result-'):x for x in read('archive/flower-2020-discussion-census.json')}
images={x['messageId']:x for x in read('archive/flower-2020-discussion-image-map.json')}
curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
def source(mid):return {'url':f'https://discord.com/channels/629221606064914442/636461740162416640/{mid}','channel':'tt-discussion','messageId':mid}
entries=[('707590442119725088','1:39.96',[]),('707592162795061319','1:39.77',[]),('707593551592030319','1:39.63',['707595268253810709']),('707596184868618250','1:39.55',[]),('707599086370422855','1:39.42',['707878847839731713'])]
for mid,time,extra in entries:
 row={'messageId':'flower-2020-'+mid,'player':'Kazuo','courseId':'3ds-shy-guy-bazaar-r','time':time,'laps':[None,None],'mushrooms':None,'status':'community-wr','submittedAt':messages[mid]['times'][0],'source':source(mid),'additionalSources':[source(x) for x in extra],'notes':['Opening Flower Tour discussion reviewed end to end. Kazuo improves the standing opening times through 1:39.96, 1:39.77, 1:39.63, 1:39.55, and 1:39.42. May 7 discussion explicitly confirms 1:39.42 remains the lowest time. No lap splits have been recovered for this run.']}
 if mid in images:
  x=images[mid];dest=f'/assets/proof/flower-2020-{x["attachmentId"]}.webp';im=Image.open(ROOT/x['path']).convert('RGB');im.thumbnail((1080,2160));im.save(ROOT/'public'/dest.lstrip('/'),'WEBP',lossless=True);assets[x['url']]={'path':dest};row.update(proofImage=x['url'],proofImageVerified=True);row['notes'].append('Original result screenshot visually read and preserved locally.')
 if time=='1:39.63':row['notes'].append('Initial message says 1:38.63, but Kazuo explicitly corrects it to 1:39.63. The subsequent 1:39.55 screenshot shows previous best 1:39.63. The mistaken 1:38.63 is excluded.')
 curated=[r for r in curated if r.get('messageId')!=row['messageId']]+[row]
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets)
print('Restored five exact opening Kazuo WRs; lap data remains unknown.')
