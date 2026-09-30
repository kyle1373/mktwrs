import json,math,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
q=json.load(open('archive/early-image-index.json'))['images'];d=json.load(open('archive/early-image-downloads.json'));reviews=json.load(open('archive/early-visual-review.json'));limit=int(sys.argv[1]) if len(sys.argv)>1 else 24
rows=[dict(r,path=d[r['id']]['path']) for r in q if d.get(r['id'],{}).get('path') and (r['id'] not in reviews or 'unavailable' in reviews[r['id']].get('notes','').lower())][:limit]
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',14)
c=Image.new('RGB',(1320,math.ceil(len(rows)/6)*510),'white');draw=ImageDraw.Draw(c)
for i,r in enumerate(rows):
 x,y=i%6*220,i//6*510;draw.text((x+3,y+3),f"#{i} {r['postedAt'][:10]}",fill='black',font=font);im=Image.open(r['path']).convert('RGB');im.thumbnail((216,475));c.paste(im,(x+(220-im.width)//2,y+27))
name='early-next-'+rows[0]['id'];c.save('artifacts/review/'+name+'.jpg',quality=95);Path('artifacts/review/'+name+'.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print(name)
for i,r in enumerate(rows):print(i,r['author'],r.get('body','')[:180])
