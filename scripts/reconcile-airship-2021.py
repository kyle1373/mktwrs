import json,hashlib,datetime
from pathlib import Path
from PIL import Image
url='https://pbs.twimg.com/media/E0vE7eIXsAM0hNp?format=jpg&name=small'
dst=Path('public/assets/proof/airship-2021-kazuo-12995.webp')
Image.open('archive/external-proof-images/airship-2021-kazuo-12995.jpg').convert('RGB').save(dst,'WEBP',lossless=True)
p=Path('archive/assets-manifest.json');a=json.loads(p.read_text());a[url]={'path':'/'+str(dst.relative_to('public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()};p.write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n')
r={'messageId':'original-kazuo-1390421440118329346','courseId':'ds-airship-fortress','player':'Kazuo','time':'1:29.95','laps':['45.24','44.71'],'mushrooms':None,'status':'community-wr','submittedAt':'2021-05-06T21:41:18.000Z','proofImage':url,'proofImageVerified':True,'video':'https://x.com/Kazuo_MK/status/1391428582883446792','videoVerified':True,'source':{'url':'https://x.com/Kazuo_MK/status/1390421440118329346','platform':'Twitter/X'},'notes':['Original result image visually read: 1:29.95; original post gives 45.24 / 44.71.','Original result published May 6, 2021 at 21:41:18 UTC; replaces later May 15 Discord proof date. Video was published May 9 at 16:23:20 UTC.','Downloaded original video visually checked at the final frame: 1:29.95 and Cleared on Airship Fortress.']}
p=Path('archive/curated-runs.json');a=json.loads(p.read_text());a=[x for x in a if x.get('messageId')!=r['messageId']]+[r];p.write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n')
