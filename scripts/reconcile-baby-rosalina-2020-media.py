"""Preserve a verified fallback video without promoting a personal best to WR."""
import json,subprocess
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
def save(p,d):(R/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
mid='baby-rosalina-2020-heriawsity-6280-video'
proof='public/assets/proof/baby-rosalina-2020-heriawsity-6280.webp'
subprocess.run(['ffmpeg','-loglevel','error','-y','-ss','75','-i',str(R/'archive/baby-rosalina-2020-original-media/galaxy-1242285007546150912.mp4'),'-frames:v','1','-lossless','1',str(R/proof)],check=True)
run={'messageId':mid,'player':'Heriawsity','courseId':'snes-mario-circuit-2r','time':'1:02.80','laps':['31.36',None],'mushrooms':None,'status':'documented-submission','includeInProgression':False,'submittedAt':'2020-03-24T03:02:04.385Z','video':'https://twitter.com/heriawsity/status/1242285007546150912','videoVerified':True,'proofImage':'/'+proof.removeprefix('public/'),'proofImageVerified':True,'source':{'url':'https://discord.com/channels/629221606064914442/630524563335282689/691844255622103123','channel':'social-media','messageId':'691844255622103123'},'additionalSources':[{'url':'https://twitter.com/heriawsity/status/1242285007546150912','kind':'original-player-post'}],'notes':['Original video downloaded and visually checked: Waluigi Time Trial on SNES Mario Circuit 2R, 1:02.80 finish and 31.36 first-lap split. Lap 2 is total minus lap 1.','The author shared the video from the heriawsity account, whose embedded display name was [ER] galaxy.','Exact date is the Discord video-share timestamp, not an asserted race-achievement timestamp. Kaguya’s faster 1:01.83 video was already shared on March 17; this footage is a fallback, not a WR-history row.','The local proof image is a frame from the preserved original video. No YouTube backup has been uploaded for this run.']}
save('archive/curated-runs.json',[x for x in read('archive/curated-runs.json') if x.get('messageId')!=mid]+[run])
p='archive/baby-rosalina-2020-video-review.json';d=read(p);d['videos'][0].update(laps=['31.36','31.44'],derivedLap=2,publishedAs='fastest-video fallback; excluded from WR progression',curatedRunId=mid);save(p,d)
print('Added verified 1:02.80 fallback footage; no new WR row.')
