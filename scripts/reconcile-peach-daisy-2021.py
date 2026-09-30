"""Restore dated Peach vs. Daisy exchanges from visually reviewed evidence."""
import json, hashlib
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
def read(p): return json.loads((root/p).read_text())
def save(p, value): (root/p).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')
review = read('archive/early-visual-review.json')
curated = read('archive/curated-runs.json')
assets = read('archive/assets-manifest.json')
courses = {'dp':'snes-donut-plains-2', 'sw':'gba-sunset-wilds-r', 'cm':'n64-choco-mountain-r'}
rows = json.loads('''[
["808952613416075264","Troy","dp","1:01.72",[null,null]],
["808997311165366302","DIT","dp","1:01.42",["30.80","30.62"]],
["809018515238944768","N","dp","1:01.40",["30.63","30.77"]],
["809050872314462228","Wakinyo","dp","1:00.99",["30.49","30.50"]],
["809352804555685929","Nu11","dp","1:00.73",["30.37","30.36"]],
["809013997642842112","Troy","sw","1:12.23",[null,null]],
["809019507275333652","Nu11","sw","1:11.98",["36.13","35.85"]],
["809123067263451156","Kazuo","sw","1:10.92",["35.32","35.60"]],
["809955469258915840","Nu11","sw","1:10.90",["35.42","35.48"]],
["811559802093830195","SuperFX","sw","1:10.87",[null,null]],
["811768855084138536","SuperFX","sw","1:10.67",["35.39","35.28"]],
["811873246872862730","SuperFX","sw","1:10.56",["35.10","35.46"]],
["812231804991438858","SuperFX","sw","1:10.53",["35.28","35.25"]],
["809551096007360552","JF","cm","1:21.10",[null,null]],
["809797038786084955","Romain","cm","1:20.67",[null,null]],
["810047734509076510","saki7","cm","1:19.29",[null,null]],
["810406479030255636","DIT","cm","1:19.29",["39.60","39.69"]],
["810433857299546174","Phillish","cm","1:18.97",[null,null]],
["810472453838602260","Nu11","cm","1:18.48",["39.19","39.29"]],
["810661344487276574","N","cm","1:18.45",["39.27","39.18"]],
["810681508158767114","N","cm","1:18.42",["39.10","39.32"]],
["810701836629704744","Nu11","cm","1:18.36",["39.05","39.31"]],
["811258665365405746","Kazuo","cm","1:18.27",["39.09","39.18"]],
["812219446059335690","DIT","cm","1:18.25",["39.07","39.18"]],
["812321192479424512","10mp","cm","1:18.21",["38.96","39.25"]],
["812469999184773120","Kazuo","cm","1:17.95",["38.87","39.08"]]
]''')
def proof(x):
    src=x.get('path') or read('archive/early-image-downloads.json')[x['id']]['path']
    dst=root/f"public/assets/proof/peach-daisy-2021-{x['id']}.webp"
    if not dst.exists(): Image.open(root/src).convert('RGB').save(dst,'WEBP',lossless=True)
    assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')), 'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(), 'bytes':dst.stat().st_size, 'contentType':'image/webp'}
def make(aid,player,c,time,laps,status='community-wr'):
    x=review[aid]; assert x['reviewStatus']=='visually-reviewed'; proof(x)
    if status=='community-wr': assert x['time']==time
    if all(l is not None for l in laps):
        m,s=time.split(':'); assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100)
    return {'messageId':'peach-daisy-2021-'+aid+'-'+time.replace(':','').replace('.',''), 'player':player, 'courseId':courses[c], 'time':time, 'laps':laps, 'mushrooms':None, 'status':status, 'submittedAt':x['postedAt'], 'proofImage':x['url'], 'proofImageVerified':True, 'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']}, 'notes':['Original image visually read and compared with contemporary dated submissions. UTC date is the preserved publication date; race completion instant is not claimed.']}
new=[]
for aid,player,c,time,laps in rows:
    r=make(aid,player,c,time,laps)
    if all(l is not None for l in laps): r['notes'].append('Laps recovered from the original post, adjacent messages or contemporary standings; their sum matches the result.')
    if player=='Nu11': r['notes'].append('Original account now displays Enaga; contemporary Kaguya identity archived as Nu11.')
    if aid=='811559802093830195':
        r.update(dateUnresolved=True,delayedSubmission=True)
        r['notes'].append('On February 17, SuperFX initially says four days ago, then corrects this to three days ago. Exact original date is unresolved. The adjacent response says the laps are not remembered; neither date nor splits are invented.')
    if aid=='811768855084138536': r['notes'].append('Adjacent .39 .28 message resolves to 35.39 / 35.28. The later 35.15 lap image belongs to a different failed run.')
    if aid=='811873246872862730': r['notes'].append('Adjacent .10 .46 message resolves to 35.10 / 35.46.')
    if aid=='812231804991438858':
        r.update(video='https://www.youtube.com/watch?v=aNjiaWm-h9Y',videoVerified=True)
        r['notes'].append('Adjacent .28 .25 message at 07:59:16 UTC resolves to 35.28 / 35.25. Original YouTube footage, disclosed after the tour, shows this record with previous best 1:10.56. The Discord video posted at 08:48:55 UTC is a separate tie with different, incompletely specified splits.')
    if aid=='811258665365405746':
        r.update(video='https://twitter.com/KazuoMKT/status/1362108231267610625',derivedLap=2)
        r['notes'].append('Contemporary standings provide lap 1 of 39.09; lap 2 is calculated as 1:18.27 minus 39.09. The next-day video post says it was recorded yesterday; the original image date is retained.')
    if aid=='810681508158767114': r.update(video='https://www.youtube.com/watch?v=7bfRJFyAGBA',videoVerified=True)
    if aid=='812219446059335690': r['video']='https://twitter.com/dit_mkt/status/1362681057779220483'
    if aid=='812469999184773120': r.update(video='https://twitter.com/KazuoMKT/status/1362916914759159808',videoVerified=True)
    if aid in ['812219446059335690','812321192479424512','812469999184773120']:
        r.update(status='documented-submission',includeInProgression=False)
        r['notes'].append('Chronology held after recovering Kaguya’s delayed disclosure: the faster 1:17.87 was reportedly achieved on Friday morning, February 19. These same-day submissions cannot be assumed to precede that run. Original evidence and video are retained while exact ordering remains unresolved.')
        review[aid]['classification']='held-for-chronology'
    else: review[aid]['classification']='confirmed-world-record'
    new.append(r)
new.append({'messageId':'peach-daisy-kaguya-delayed-11787','player':'Nu11','courseId':courses['cm'],'time':'1:17.87','laps':[None,None],'mushrooms':None,'status':'community-wr','achievedAt':'2021-02-19','datePrecision':'day','submittedAt':'2021-02-24T07:08:24.261Z','delayedSubmission':True,'source':{'url':'https://twitter.com/_kaguya_games/status/1364472227081592832','platform':'Twitter/X'},'additionalSources':[{'url':'https://discord.com/channels/629221606064914442/636461740162416640/814049135291793428','channel':'tt-discussion'},{'url':'https://discord.com/channels/629221606064914442/636461740162416640/814052287227625522','channel':'tt-discussion'},{'url':'https://discord.com/channels/629221606064914442/896050730216095765/896333812240355370','channel':'wr-history'}],'notes':['WR-history and Kaguya’s direct Discord message confirm 1:17.87. The next message says the lap times are not remembered. In the original tweet, embedded in Discord on February 24, Kaguya says the WR was achieved last Friday morning and withheld because no video was recorded. February 19 is the runner-reported calendar date; no exact race time or UTC conversion is asserted.','The original image URL is https://pbs.twimg.com/media/Eu-UQd2UYAUhImN.jpg:large, but retrieval currently fails. No image inspection or recovered splits are claimed for this source. Same-day chronology and reign duration remain unresolved.']})
held=[]
for aid,player,c,time,reason in [
    ('808952525746995250','Nick','dp','1:05.44','Opening WR claim is present, but Troy posts a 1:01.72 with previous best 1:02.15 twenty-one seconds later. Earlier run chronology is unresolved.'),
    ('808968981041119232','Unidentified player','sw','1:12.58','Original deleted-account submission; runner identity unresolved.')]:
    r=make(aid,player,c,time,[None,None],'documented-submission');r.update(includeInProgression=False);r['notes']=[reason]
    if player=='Unidentified player':r['identityUnresolved']=True
    held.append(r)
for aid,player,c,time in [
    ('808952613416075264','Troy','dp','1:02.15'),
    ('809050872314462228','Wakinyo','dp','1:01.02'),
    ('809013997642842112','Troy','sw','1:12.53'),
    ('809123067263451156','Kazuo','sw','1:11.23'),
    ('810433857299546174','Phillish','cm','1:19.03'),
    ('810472453838602260','Nu11','cm','1:18.62'),
    ('810701836629704744','Nu11','cm','1:18.39'),
    ('812469999184773120','Kazuo','cm','1:18.05')]:
    r=make(aid,player,c,time,[None,None],'documented-submission');r.update(includeInProgression=False,dateUnresolved=True,observedAt=r['submittedAt'],submittedAt=None)
    r['notes']=['Previous best visually read in a later result. Original date and place in the WR exchange remain unresolved. Preserved without assigning the later image date to the earlier run.'];held.append(r)
video='https://cdn.discordapp.com/attachments/636461740162416640/812244311521230898/video0.mov'
held.append({'messageId':'peach-daisy-superfx-11053-video-tie','player':'SuperFX','courseId':courses['sw'],'time':'1:10.53','laps':[None,None],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':'2021-02-19T08:48:55.357Z','video':video,'videoVerified':True,'source':{'url':'https://discord.com/channels/629221606064914442/636461740162416640/812244314545193010','channel':'tt-discussion','messageId':'812244314545193010'},'notes':['Separate tied run: video result reads 1:10.53 and previous best 1:10.53. Adjacent lap 1 description is only .1, so exact splits are unknown. This footage must not be presented as the earlier 35.28 / 35.25 run. Retained for video fallback without adding another WR break.']})
held.append({'messageId':'peach-daisy-unproven-11794','player':'Unidentified player','courseId':courses['cm'],'time':'1:17.94','laps':[None,None],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'identityUnresolved':True,'submittedAt':'2021-02-23T23:38:26.591Z','source':{'url':'https://discord.com/channels/629221606064914442/636461740162416640/813917721187188767','channel':'tt-discussion','messageId':'813917721187188767'},'notes':['Deleted account claims 1:17.94, then says it cannot provide a screenshot. Surrounding replies do not verify the run or identify its runner. Preserved as an unsupported claim, excluded from WR history.']})
ids={r['messageId'] for r in new+held};curated=[r for r in curated if r.get('messageId') not in ids]+new+held
q=[x for x in read('archive/early-image-index.json')['images'] if '2021-02-10T06'<=x['postedAt']<'2021-02-24T06']
unread=[x['id'] for x in q if review.get(x['id'],{}).get('reviewStatus')!='visually-reviewed']
audit={'tour':'Peach vs. Daisy Tour 2021','status':'Indexed images visually reviewed; delayed final Choco record disclosure recovered, same-day ordering and complete source coverage remain unresolved.','coverage':{'indexedImages':len(q),'indexedImagesVisuallyReviewed':len(q)-len(unread),'unreviewed':unread,'linkSearchResultsReviewed':21,'wrTextSearchResultsReviewed':19},'confirmedChanges':[r for r in new if r['status']=='community-wr'],'heldForReconciliation':held+[r for r in new if r['status']!='community-wr'],'limitations':['Kaguya reports achieving 1:17.87 on Friday morning, February 19, in a delayed February 24 tweet. Exact time, timezone and same-day ordering remain unresolved; original image retrieval failed.','SuperFX 1:10.87 was submitted three days late; exact date and laps are unresolved.','Tomegome 1:01.08 and 1:00.97 screenshots are later reposts; original tweet dates need recovery before WR status can be established.','Previous-best values reveal potential additional intermediate records. These are retained separately until original dates can be established.','Indexed images and search results do not establish that every Discord message was captured.'],'excluded':['Wins 1:02.02 and Phillish 1:01.80 follow the recovered Troy 1:01.72 opening image.','N 1:18.72 follows Nu11 1:18.48. N 1:18.15 and 10mp 1:18.11 follow Kazuo 1:17.95.','SuperFX repeats 1:10.53 in a later video; it is separate footage, not a new WR break.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/peach-daisy-2021-reconciliation.json',audit)
print(json.dumps({'confirmedChanges':len(new),'held':len(held),'coverage':audit['coverage']}))
