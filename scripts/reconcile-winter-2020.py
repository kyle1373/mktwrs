"""Reconcile visually read Winter Tour 2020 results with contemporary source messages."""
import json, hashlib, datetime
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def save(p,d):(root/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
review=read('archive/early-visual-review.json');curated=read('archive/curated-runs.json');assets=read('archive/assets-manifest.json')
ci='snes-choco-island-1';mt='wii-maple-treeway'
reddit='https://www.reddit.com/r/MarioKartTour/comments/kdfx2c/i_won_rmariokarttours_tt_challenge_here_is_a/'
rows=[
('783576104937717790','Phillish',ci,'0:41.43',[None,None]),
('783579490181709834','Nu11',ci,'0:40.68',[None,None]),
('783585868920389702','Phillish',ci,'0:40.68',[None,None]),
('783586867534364672','Nu11',ci,'0:40.36',['20.39','19.97']),
('783594356710834176','Sucha',ci,'0:40.30',['20.26','20.04']),
('783619234290204682','Nu11',ci,'0:40.07',['20.14','19.93']),
('784041314089828372','Nu11',ci,'0:39.92',['20.09','19.83']),
('784596797573431316','Nu11',ci,'0:39.87',['20.09','19.78']),
('784661602557362206','Nu11',ci,'0:39.81',['20.02','19.79']),
('785138353091510342','Nu11',ci,'0:39.76',['19.97','19.79']),
('788321583910879252','SuperFX',ci,'0:39.76',['20.04','19.72']),
('783579491619307580','Nu11',mt,'1:48.66',[None,None]),
('783586868028899358','Nu11',mt,'1:47.67',['53.98','53.69']),
('783653010974179328','Phillish',mt,'1:47.57',['53.83','53.74']),
('783658948179394620','Astre',mt,'1:47.57',['53.47','54.10']),
('783661637264998441','Phillish',mt,'1:47.09',['53.55','53.54']),
('784037440302219274','Saki7',mt,'1:47.08',['53.69','53.39']),
('784162124535693382','Astre',mt,'1:47.02',[None,None]),
('784182573948862494','Wins',mt,'1:46.73',['53.37','53.36']),
('784581805809729566','Wins',mt,'1:46.64',['53.11','53.53']),
('785287234227535942','Phillish',mt,'1:46.62',['53.01','53.61']),
('785978100953120768','Wins',mt,'1:46.16',['52.99','53.17']),
]
new=[]
for aid,player,course,time,laps in rows:
 x=review[aid];assert x['time']==time,(aid,x['time'],time)
 dst=root/f'public/assets/proof/winter-2020-{aid}.webp'
 if not dst.exists():Image.open(root/x['path']).convert('RGB').save(dst,'WEBP',lossless=True)
 assets[x['url']]={'path':'/'+str(dst.relative_to(root/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 r={'messageId':x['messageId']+'-'+course,'player':player,'courseId':course,'time':time,'laps':laps,'mushrooms':None,'status':'community-wr','submittedAt':x['postedAt'],'proofImage':x['url'],'proofImageVerified':True,'source':{'url':x['source'],'channel':'tt-discussion','messageId':x['messageId']},'notes':['Result visually read and compared against the captured tour-wide results and contemporary leaderboard images. Exact UTC publication date; race completion timestamp is not claimed.']}
 if all(l is not None for l in laps):
  m,s=time.split(':');assert sum(round(float(l)*100) for l in laps)==int(m)*6000+round(float(s)*100)
  r['notes'].append('Lap times recovered from original message context or the contemporary leaderboard and checked against the total.')
 if player=='Nu11':r['notes'].append('Original account currently displays Enaga; contemporary replies identify Kaguya, archived as Nu11.')
 if time=='0:39.76' and player=='Nu11':r['rejectedVideos']=[{'url':reddit,'reason':'The Reddit original is by SuperFXMK and shows SuperFX’s later tied run, not Nu11’s run. Nu11’s own result and splits are preserved from December 6 Discord evidence.'}]
 if player=='SuperFX':
  r.update(video=reddit,videoVerified=True,submittedAt='2020-12-15T05:47:50.121Z',repostedAt=x['postedAt'])
  r['additionalSources']=[{'url':reddit,'publishedAt':'2020-12-15T05:47:50.121Z','author':'SuperFXMK'}]
  r['notes'].append('Original Reddit author and timestamp verified. Video visually confirms 20.04 at lap 2 start and final 39.76; lap 2 is 19.72. Wins’s repost says 40.04 / 19.72, a typo corrected using the footage. Wins is the reposter, not the runner.')
 if time=='1:46.16':
  r.update(video='https://twitter.com/WinsMkt/status/1339106433351159808?s=19',videoVerified=True)
  r['notes'].append('Original result is December 8, not the December 16 UTC video publication. Original X video recovered from its public media file after the primary downloader failed; the 1:46.16 finish was visually checked. Initial Discord splits 42.99 / 43.17 are a typo: runner immediately states lap 1 52.99, and the original video post and leaderboard give 52.99 / 53.17.')
 new.append(r);review[aid]['classification']='confirmed-world-record'
# Original image is gone, but the embedded original post survives with both splits.
new.append({'messageId':'winter-2020-wakinyo-783595591807533096','player':'Wakinyo','courseId':ci,'time':'0:40.29','laps':['20.30','19.99'],'mushrooms':None,'status':'community-wr','submittedAt':'2020-12-02T07:29:07.589Z','source':{'url':'https://discord.com/channels/629221606064914442/636461740162416640/783595591807533096','channel':'tt-discussion','messageId':'783595591807533096'},'additionalSources':[{'url':'https://twitter.com/wakinyodrivens/status/1334036494789459971?s=21','kind':'original-post'}],'notes':['Surviving original embedded post gives 20.30 / 19.99 = 40.29 between Sucha 40.30 and Nu11 40.07. Exact Discord repost date. Original image is unavailable and has not been visually verified; this entry is supported by the preserved original text.']})
ids={r['messageId'] for r in new};curated=[r for r in curated if r.get('messageId') not in ids]+new
q=[x for x in read('archive/early-image-index.json')['images'] if '2020-12-02T06'<=x['postedAt']<'2020-12-16T06']
audit={'tour':'Winter Tour 2020','status':'Available captured images reviewed; this does not prove the server has been exhausted','coverage':{'capturedImageAttachmentsInTour':len(q),'visuallyReviewed':sum(x['id'] in review for x in q)},'confirmedChanges':[{'courseId':r['courseId'],'player':r['player'],'time':r['time'],'submittedAt':r['submittedAt'],'laps':r['laps'],'source':r['source']} for r in new],'limitations':['Four captured images unavailable, including one avatar. Wakinyo 40.29 is supported by surviving original embed text, not a surviving image.','Original post embeds for Wakinyo 40.17 and 1:47.54 survive; both are slower than already published records and are excluded.','A text mention of Phillish 1:47.07 conflicts with original 1:47.09 screenshot and contemporary leaderboards; not promoted without corresponding proof.','Previous-best times in screenshots may document additional runs but cannot establish their exact date or position in history.','Astre 1:47.02 has no recovered splits; original message says the run was not recorded.','Unreviewed or uncaptured server evidence can still add or correct history.'],'corrections':['Removed SuperFX’s Reddit video from Nu11’s 39.76 entry.','Corrected SuperFX lap 1 typo using original footage.','Wins 1:46.16 dated to December 8 original result, not later video publication.']}
save('archive/curated-runs.json',curated);save('archive/assets-manifest.json',assets);save('archive/early-visual-review.json',review);save('archive/winter-2020-reconciliation.json',audit)
print(json.dumps({'coverage':audit['coverage'],'confirmedChanges':len(new)}))
