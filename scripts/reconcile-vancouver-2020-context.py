"""Restore original Vancouver evidence; leave missing original dates unresolved."""
import hashlib,json,shutil
from pathlib import Path
from PIL import Image
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
def save(p,d):(R/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def src(sid):return {'url':f'https://x.com/Astre_HD/status/{sid}','channel':'original Twitter post','messageId':sid}
def ds(mid):return {'url':f'https://discord.com/channels/629221606064914442/636461740162416640/{mid}','channel':'tt-discussion','messageId':mid}
assets=read('archive/assets-manifest.json');folder=R/'archive/vancouver-2020-original-media';folder.mkdir(exist_ok=True)
def proof(sid,name):
 source=Path('/Users/superfx/Downloads')/(name+'.jpeg');original=folder/(sid+'.jpg');shutil.copy2(source,original)
 dst=R/f'public/assets/proof/vancouver-2020-{sid}.webp';Image.open(original).convert('RGB').save(dst,'WEBP',lossless=True)
 url=f'https://pbs.twimg.com/media/{name}?format=jpg&name=small';assets[url]={'path':'/'+str(dst.relative_to(R/'public')),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'bytes':dst.stat().st_size,'contentType':'image/webp'};return url
final={'messageId':'vancouver-2020-astre-final-4955','player':'Astre','courseId':'snes-choco-island-2r','time':'0:49.55','laps':[None,None],'mushrooms':None,'status':'community-wr','submittedAt':'2020-02-25T23:13:51.000Z','source':src('1232443621816688640'),'proofImage':proof('1232443621816688640','ERqE76jWAAA2meP'),'proofImageVerified':True,'additionalSources':[src('1232686560962908162'),{'url':'https://x.com/MarioKartActu/status/1232684903231258629','channel':'contemporary WR announcement'}],'notes':['Original result screenshot visually verifies 0:49.55 and previous best 0:49.65. Exact date is the original post timestamp, not the later migration screenshot.','Astre and Mario Kart Actu explicitly confirm this as the tour-ending world record.','A later isolated 24.62 lap is not a split of this full race; both final-run splits remain unknown.']}
kaguya={'messageId':'vancouver-2020-kaguya-4956-context','player':'Nu11','courseId':'snes-choco-island-2r','time':'0:49.56','laps':[None,None],'mushrooms':None,'status':'community-wr','submittedAt':None,'observedAt':'2020-02-25T08:39:44.734Z','dateUnresolved':True,'tourDateRange':{'start':'2020-02-12','end':'2020-02-25'},'source':ds('681782373448548387'),'additionalSources':[ds('681778756867981365'),ds('681782342213173293'),src('1232331639193296901')],'notes':['Asked whether his time is WR, Astre posts his 49.65 screenshot and identifies Kaguya’s faster 49.56. His original February 25 post separately states the goal of beating Kaguya on this course before the later 49.55.','This is a contemporaneously reported WR predecessor. Its original result proof, exact achievement/submission date and lap splits remain missing. The report timestamp must not become its displayed record date.']}
other=[]
for sid,cid,time,laps,date,name in [
 ('1228710341871308804','snes-choco-island-2r','0:49.65',['24.82','24.83'],'2020-02-15', 'EQ1BiovWoAIHExL'),
 ('1229039438698831873','snes-rainbow-road','1:00.29',['29.90','30.39'],'2020-02-16','EQ5s2n8WsAEkeBT'),
 ('1231946388981854208','snes-rainbow-road','1:00.24',[None,None],'2020-02-24','ERjAtaRXYAYLExS'),
]:
 # Read the exact original timestamp from the captured DOM, rather than inferring it from a date label.
 matches=[a for p in (R/'archive/raw').glob('vancouver-2020-astre-timeline-*.json') for a in read(str(p.relative_to(R)))['data'] if any(l['href']==f'https://x.com/Astre_HD/status/{sid}' for l in a['links'])]
 stamp=matches[0]['times'][0];assert stamp.startswith(date)
 other.append({'messageId':'vancouver-2020-astre-'+sid,'player':'Astre','courseId':cid,'time':time,'laps':laps,'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':stamp,'source':src(sid),'proofImage':proof(sid,name),'proofImageVerified':True,'notes':['Original image and caption visually read. Historical WR status is not established; preserved outside the confirmed progression.']})
runs=[final,kaguya]+other;ids={r['messageId'] for r in runs}
save('archive/curated-runs.json',[r for r in read('archive/curated-runs.json') if r.get('messageId') not in ids]+runs);save('archive/assets-manifest.json',assets)
save('archive/vancouver-2020-context-reconciliation.json',{'tour':'Vancouver Tour','historyComplete':False,'confirmedChanges':[kaguya,final],'additionalDocumentedRuns':other,'coverage':{'discussionMessagesWithBoundaries':len(read('archive/vancouver-2020-discussion-census.json')),'indexedOriginalImagesVisuallyReviewed':24,'originalPlayerTimelinesRead':['Astre_HD','tomegome_g']},'openLeads':[{'courseId':'snes-choco-island-2r','player':'Nu11','time':'0:49.56','issue':'Original screenshot/video, record date and splits unresolved.'},{'courseId':'snes-choco-island-2r','player':'Astre','time':'0:49.65','issue':'Original February 15 image and splits recovered, but historical WR status unestablished.'},{'courseId':'snes-rainbow-road','player':'Nu11','time':'0:59.94','issue':'Original full-race proof and exact date still unresolved; February references establish a sub-minute time but do not identify the final total.'}],'limitations':['Server-wide images outside the TT channel are not yet fully audited for Vancouver Tour.','Deleted messages and original social posts cannot be certified recovered.']})
print({'restoredIntermediateWr':1,'resolvedFinalWrDate':1,'otherRunsPreserved':len(other)})

# Extend the evidence census when the separately reviewed source ledgers exist.
server_review=R/'archive/vancouver-2020-server-image-review.json'
reply_review=R/'archive/vancouver-2020-official-reply-review.json'
if server_review.exists() and reply_review.exists():
 report=read('archive/vancouver-2020-context-reconciliation.json')
 server=json.loads(server_review.read_text());replies=json.loads(reply_review.read_text())
 assert server['uniqueAttachmentImages']==server['imagesVisuallyReviewed'] and not server['missingAttachmentIds']
 report['coverage'].update(serverImageSearchResultMessages=server['searchResultMessages'],serverAttachmentImagesVisuallyReviewed=server['imagesVisuallyReviewed'],serverImageSearchPagesCaptured=server['pagesCaptured'],officialReplyImagesVisuallyReviewed=replies['imagesPreservedAndVisuallyReviewed'])
 report['limitations']=['All 406 unique attachments from 409 returned server-wide has:image results were preserved and visually reviewed. This does not cover every text/video message or deleted source.','Deleted messages and original social posts cannot be certified recovered.']
 save('archive/vancouver-2020-context-reconciliation.json',report)
