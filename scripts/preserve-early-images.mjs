import fs from 'node:fs';
import {earlyImageURL} from './early-image-url.mjs';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile), dir='archive/early-submission-images';
fs.mkdirSync(dir,{recursive:true});
const manifestFile='archive/early-image-downloads.json';
const saved=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile)):{};
function index(){
 const pages=new Map(), windows=new Map(), messages=new Map();
 for(const file of fs.readdirSync('archive/raw').filter(f=>/^early-tt-(?:images-\d+-\d+|month-\d{6}-\d+)\.json$/.test(f)).sort()){
  for(const p of JSON.parse(fs.readFileSync('archive/raw/'+file)).pages||[]){
   if(!p.messages?.length)continue;
   const collection=p.window?windows:pages,key=p.window?`${p.window}:${p.page}`:p.page;
   const prev=collection.get(key);
   collection.set(key,{page:p.page,window:p.window,imageSweep:!!(p.imageSweep||prev?.imageSweep)});
   for(const m of p.messages){
    const old=messages.get(m.id);
    messages.set(m.id,{...m,page:p.page,capture:file,
     links:[...new Map([...(old?.links||[]),...m.links].map(v=>[v.href,v])).values()],
     images:[...new Map([...(old?.images||[]),...m.images].map(v=>[v.src,v])).values()]});
   }
  }
 }
 const images=new Map();
 for(const m of [...messages.values()].sort((a,b)=>a.datetime.localeCompare(b.datetime))){
  for(const rawUrl of [...m.links.map(l=>l.href),...m.images.map(i=>i.src)]){
   const normalized=earlyImageURL(rawUrl);
   if(!normalized)continue;
   const u=new URL(normalized);
   const url=u.toString(),id=url.match(/\/attachments\/\d+\/(\d+)\//)?.[1]||crypto.createHash('sha256').update(url.split('?')[0]).digest('hex').slice(0,24);
   const old=images.get(id),score=(u.searchParams.has('ex')?2:0)+(u.hostname==='cdn.discordapp.com'?1:0);
   if(!old)images.set(id,{id,url,urlScore:score,messageId:m.id.replace('search-result-',''),postedAt:m.datetime,author:m.author,body:m.body,page:m.page,downloadFallbacks:rawUrl!==url?[rawUrl]:[]});
   else images.set(id,{...old,...(score>old.urlScore?{url,urlScore:score}:{}),downloadFallbacks:[...new Set([...(old.downloadFallbacks||[]),...(rawUrl!==url?[rawUrl]:[])])]});
  }
 }
 const result={pages:[...pages.keys()].sort((a,b)=>a-b),sweptPages:[...pages.values()].filter(p=>p.imageSweep).map(p=>p.page).sort((a,b)=>a-b),windowPages:[...windows.values()],messageCount:messages.size,images:[...images.values()]};
 fs.writeFileSync('archive/early-image-index.json',JSON.stringify(result,null,2));return result;
}
if(process.argv.includes('--index-only')){const result=index();console.log({knownImages:result.images.length});process.exit(0);}
while(true){
 const idx=index(),queue=idx.images.filter(r=>!saved[r.id]||(saved[r.id].status==='unavailable'&&(saved[r.id].source!==r.url||JSON.stringify(saved[r.id].downloadFallbacks||[])!==JSON.stringify(r.downloadFallbacks||[])))||(saved[r.id].path&&/[?&](width|height|format)=/.test(saved[r.id].source)&&saved[r.id].source!==r.url&&saved[r.id].upgradeErrorSource!==r.url)).slice(0,100);
 if(!queue.length){if(process.argv.includes('--once')||idx.sweptPages.length===361)break;await new Promise(r=>setTimeout(r,3000));continue;}
 await Promise.all(Array.from({length:4},async()=>{while(queue.length){
  const r=queue.shift(),temp=`${dir}/${r.id}.part`;
  try{
   let stdout, lastError;
   for(const candidate of [r.url,...(r.downloadFallbacks||[])]){
    try { ({stdout}=await exec('curl',['-fLsS','--max-time','25','-o',temp,'-w','%{content_type}',candidate],{maxBuffer:15000})); break; }
    catch(error){lastError=error;}
   }
   if(stdout===undefined)throw lastError;
   const type=stdout.trim().split(';')[0],ext={'image/png':'png','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp'}[type];
   if(!ext)throw Error('Not image '+type);
   const path=`${dir}/${r.id}.${ext}`;fs.renameSync(temp,path);const b=fs.readFileSync(path);
   saved[r.id]={path,source:r.url,status:'preserved',bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),retrievedAt:new Date().toISOString()};
  }catch(e){if(!saved[r.id]?.path)saved[r.id]={source:r.url,downloadFallbacks:r.downloadFallbacks||[],status:'unavailable',error:String(e.message).slice(-400)};else saved[r.id]={...saved[r.id],upgradeErrorSource:r.url,upgradeError:String(e.message).slice(-400)};if(fs.existsSync(temp))fs.unlinkSync(temp);}
 }}));
 fs.writeFileSync(manifestFile,JSON.stringify(saved,null,2));console.log({capturedPages:idx.pages.length,sweptPages:idx.sweptPages.length,knownImages:idx.images.length,attempted:Object.keys(saved).length,preserved:Object.values(saved).filter(v=>v.path).length});
}
console.log('All currently indexed early images attempted');
