"""Persist the manually read original-image census without promoting uncertain runs."""
import json,re
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
def save(p,d):(R/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
images=read('archive/valentines-2020-server-image-downloads.json')
articles=[]
for page in range(1,12):
    batch=read(f'archive/raw/valentines-2020-server-images-page-{page}.json')['data']['articles']
    assert len(batch)==(7 if page==11 else 25)
    articles.extend(batch)
assert len(articles)==257 and len(images)==267
# These totals and previous bests were transcribed by visually reading all fourteen contact sheets.
times={10:('1:03.31',None),36:('1:14.53','1:14.56'),50:('1:14.96','1:15.01'),51:('1:15.01','1:15.09'),53:('1:15.09','1:15.21'),54:('1:15.21',None),83:('1:16.45','1:16.88'),106:('1:03.94','1:04.26'),146:('1:04.34',None),151:('1:04.49',None),155:('1:04.56','1:04.79'),156:('1:05.17','1:05.46'),163:('1:06.71',None),166:('1:14.67','1:14.69'),167:('1:15.27',None),169:('1:15.41','1:15.53'),171:('1:18.38',None),172:('1:19.17',None),178:('1:15.53',None),180:('1:15.50','1:16.03'),181:('1:16.03','1:16.10'),182:('1:16.10','1:16.43'),201:('1:17.39',None),202:('1:14.94','1:15.22'),203:('1:16.17','1:16.87'),204:('1:19.16',None),205:('1:16.87','1:17.03'),211:('1:18.60','1:22.94'),219:('1:23.77',None),226:('1:18.80','1:19.75'),233:('1:16.96','1:18.51'),236:('1:18.51','1:18.61'),247:('1:19.01',None),266:('1:43.29','1:43.72')}
for im in images:
    art=next(a for a in articles if any(im['id'] in l['href'] for l in a['links']))
    im.update(reviewStatus='visually-reviewed',postedAt=art['times'][0],classification='not-a-time-trial-result')
    index=im['index']
    if index in times:
        im['messageText']=art['text']
        time,prev=times[index];im.update(time=time,previousBest=prev,classification='slower-than-already-documented-result')
        im['courseId']='3ds-toad-circuit-r' if index in [106,146,151,155,156,163] else 'n64-koopa-troopa-beach'
        if index==10:im.update(courseId='3ds-toad-circuit',classification='next-tour-boundary-submission')
        if index==266:im.update(courseId='gcn-dino-dino-jungle-r',classification='previous-tour-boundary-submission')
        if index in [163,247]:im['classification']='historical-wr-status-unresolved'
        if index==50:im['laps']=['37.14','37.82']
        if index==51:im['laps']=['36.98','38.03']
        if index==106:im['laps']=['31.97','31.97']
report={'query':'after:2020-01-27 before:2020-02-12 has:image','tourWindowUtc':{'start':'2020-01-29T06:00:00Z','end':'2020-02-12T06:00:00Z'},'searchResultMessages':257,'searchPages':11,'attachmentImagesVisuallyReviewed':267,'timeTrialImages':34,'timeTrialImagesInsideTour':32,'images':images,'notes':['The query intentionally includes local-date boundaries on either side of the tour; actual timestamps determine the tour.', 'All 267 original attachments visually read. Eight additional message embeds were official announcements or a ranked-score post.', 'Two earlier submissions remain unresolved as historical WRs. A first attempt or a new personal best alone does not establish world-record status.', 'Deleted messages and inaccessible original posts cannot be certified recovered.']}
save('archive/valentines-2020-server-image-review.json',report)
audit=read('archive/valentines-2020-context-reconciliation.json')
audit['coverage'].update(serverImageSearchMessages=257,serverImageSearchPages=11,originalServerAttachmentImagesVisuallyReviewed=267,serverImageReview='archive/valentines-2020-server-image-review.json')
audit['limitations']=[x for x in audit['limitations'] if not x.startswith('Server-wide images')]
audit['openLeads'] = [lead for lead in audit['openLeads'] if 'attachmentId' not in lead] + [{'courseId':im['courseId'],'time':im['time'],'postedAt':im['postedAt'],'attachmentId':im['id'],'issue':'First surviving submission in this local review is insufficient to establish a WR; competing opening runs unresolved.'} for im in images if im['classification']=='historical-wr-status-unresolved']
save('archive/valentines-2020-context-reconciliation.json',audit)
print({'messages':len(articles),'imagesRead':len(images),'ttImages':len(times),'newConfirmedWrFromTheseImages':0})
