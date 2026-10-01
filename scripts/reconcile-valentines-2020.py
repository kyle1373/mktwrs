"""Restore original Valentine's Tour evidence without dating migration uploads."""
import json, hashlib
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
def read(p): return json.loads((ROOT / p).read_text())
def save(p,v): (ROOT/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
assets=read('archive/assets-manifest.json');curated=read('archive/curated-runs.json')
thread=read('archive/raw/valentines-tome-original-thread.json')['articles']
def image_run(tweet,time,status):
    url=f'https://x.com/tomegome_g/status/{tweet}'
    article=next(a for a in thread if any('/status/'+tweet in l['href'] for l in a['links']))
    im=next(i['src'] for i in article['images'] if i['alt']=='Image')
    imageid=im.split('/media/')[1].split('?')[0]
    dst=ROOT/f'public/assets/proof/valentines-2020-{imageid}.webp'
    Image.open(ROOT/f'archive/valentines-2020/{imageid}.jpg').convert('RGB').save(dst,'WEBP',lossless=True)
    assets[im]={'path':'/assets/proof/'+dst.name,'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'}
    return {'messageId':'valentines-2020-'+tweet,'player':'Tomegome','courseId':'3ds-toad-circuit-r','time':time,'status':status,'submittedAt':article['times'][0],'proofImage':im,'proofImageVerified':True,'source':{'url':url,'channel':'original Twitter post'},'notes':['Original image visually read; exact UTC timestamp is the original post publication.']}
wr=image_run('1223759936540119040','1:03.09','community-wr')
wr['additionalSources']=[{'url':'https://discord.com/channels/629221606064914442/896050730216095765/896332447128637451','kind':'historical-wr-announcement'}]
wr['notes'].append('The original February 2, 2020 post replaces the December 6 migration-upload date. The historical WR announcement identifies this same player and total as the Valentine’s Tour record. Splits remain unknown.')
first=image_run('1223745279003783169','1:04.81','documented-submission');first['includeInProgression']=False
first['notes'].append('Original first-attempt image; its WR status is not established. Do not promote merely because it beats other captured submissions.')
previous={**wr,'messageId':'valentines-2020-tome-previous-10351','time':'1:03.51','status':'documented-submission','includeInProgression':False,'submittedAt':None,'dateUnresolved':True,'observedAt':wr['submittedAt'],'notes':['Previous-best 1:03.51 read from the 1:03.09 screenshot. Its original date and WR status remain unresolved.']}
video={'messageId':'valentines-2020-tome-video-10316','player':'Tomegome','courseId':'3ds-toad-circuit-r','time':'1:03.16','laps':['31.56','31.60'],'status':'documented-submission','includeInProgression':False,'submittedAt':'2020-02-02T03:59:37.000Z','video':'https://twitter.com/tomegome_g/status/1223818226670268416','videoVerified':True,'source':{'url':'https://twitter.com/tomegome_g/status/1223818226670268416','channel':'original Twitter post'},'notes':['Original full recording visually verifies Toad Circuit R, 1:03.16 and first lap 31.56; second lap 31.60 follows by subtraction. Published after the 1:03.09 image; do not infer another WR change from this slower video.']}
beach_video={'messageId':'valentines-2020-tome-ktb-video-11386','player':'Tomegome','courseId':'n64-koopa-troopa-beach','time':'1:13.86','laps':['37.07','36.79'],'status':'documented-submission','includeInProgression':False,'submittedAt':'2020-01-29T14:57:42.000Z','video':'https://twitter.com/tomegome_g/status/1222534288186298369','videoVerified':True,'source':{'url':'https://twitter.com/tomegome_g/status/1222534288186298369','channel':'original Twitter post'},'notes':['Original full recording visually verifies N64 Koopa Troopa Beach, 1:13.86 and first lap 37.07; second lap 36.79 follows by subtraction. The faster tied 1:13.83 WR remains undated; this video alone does not establish an intermediate WR.']}
rows=[wr,first,previous,video,beach_video];ids={r['messageId'] for r in rows}
for r in rows:
    r.setdefault('laps',None)
    r.setdefault('mushrooms',None)
curated=[r for r in curated if r.get('messageId') not in ids]+rows
for r in curated:r['notes']=[n.replace('December 2020 record','Valentine’s Tour record') for n in r.get('notes',[])]
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets)
save('archive/valentines-2020-reconciliation.json',{'tour':"Valentine's Tour 2020",'status':'Partial recovery; earliest progression remains unconfirmed.','confirmedChanges':[wr],'heldForReconciliation':[first,previous],'verifiedPersonalBestVideos':[video,beach_video],'limitations':['The surviving thread includes a deleted intervening post. Its contents cannot be inferred.','A later proof upload is not the achievement date.','Earlier captured Toad Circuit R submissions have not been established as world records.','N64 Koopa Troopa Beach’s earliest progression still needs reconciliation.']})
print('Restored original 1:03.09 date; preserved earlier candidates and separate video provenance.')
