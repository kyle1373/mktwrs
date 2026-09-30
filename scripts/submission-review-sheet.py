import json,sys,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
start=int(sys.argv[1]);count=int(sys.argv[2]) if len(sys.argv)>2 else 18
queue=json.load(open('archive/submission-image-map.json'))['images'];downloads=json.load(open('archive/submission-image-downloads.json'));seen=set();unique=[]
for r in queue:
 if r['attachmentId'] in seen:continue
 seen.add(r['attachmentId']);unique.append(r)
rows=[]
for i,r in enumerate(unique[start:start+count],start):
 rows.append({'index':i,**r,'path':downloads.get(r['attachmentId'],{}).get('path')})
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',14)
w,h=220,510;cols=6;canvas=Image.new('RGB',(cols*w,math.ceil(len(rows)/cols)*h),'white');d=ImageDraw.Draw(canvas)
for j,r in enumerate(rows):
 x,y=(j%cols)*w,(j//cols)*h
 d.text((x+4,y+3),f"#{r['index']} {r['submittedAt'][:10]}",fill='black',font=font)
 if r['path']:
  im=Image.open(r['path']).convert('RGB');im.thumbnail((216,475));canvas.paste(im,(x+(w-im.width)//2,y+27))
 else:d.text((x+4,y+50),'DOWNLOAD PENDING',fill='red',font=font)
Path('artifacts/review').mkdir(parents=True,exist_ok=True)
canvas.save(f'artifacts/review/sheet-{start:04d}.jpg',quality=95)
json.dump(rows,open(f'artifacts/review/sheet-{start:04d}.json','w'),indent=2)
print(f'artifacts/review/sheet-{start:04d}.jpg')
