import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec = promisify(execFile);
const dir='archive/submission-images'; fs.mkdirSync(dir,{recursive:true});
const destination='archive/submission-image-downloads.json';
const saved=fs.existsSync(destination)?JSON.parse(fs.readFileSync(destination)):{};
const map=JSON.parse(fs.readFileSync('archive/submission-image-map.json'));
const unique=new Map();
for(const r of map.images){
 const old=unique.get(r.attachmentId);
 if(!old || r.localPath)unique.set(r.attachmentId,r);
}
const queue=[...unique.values()]; let done=0,failed=0;
const persist=()=>fs.writeFileSync(destination,JSON.stringify(saved,null,2));
await Promise.all(Array.from({length:8},async()=>{
 while(queue.length){
  const r=queue.shift(),id=r.attachmentId;
  if(saved[id]?.path && fs.existsSync(saved[id].path)){done++;continue;}
  if(r.localPath && fs.existsSync('public'+r.localPath)){
   saved[id]={path:'public'+r.localPath,source:r.imageUrl,status:'preserved-existing'};done++;continue;
  }
  const temp=`${dir}/${id}.part`;
  try{
   const {stdout}=await exec('curl',['--fail','--location','--silent','--show-error','--max-time','30','--retry','1','--output',temp,'--write-out','%{content_type}',r.imageUrl],{maxBuffer:20000});
   const type=stdout.trim().split(';')[0],ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[type];
   if(!ext)throw Error('Not an image: '+type);
   const path=`${dir}/${id}.${ext}`;fs.renameSync(temp,path);
   const bytes=fs.readFileSync(path);
   saved[id]={path,source:r.imageUrl,status:'preserved',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),retrievedAt:new Date().toISOString()};done++;
  }catch(e){saved[id]={source:r.imageUrl,status:'unavailable',error:String(e.message).slice(-400),checkedAt:new Date().toISOString()};failed++;if(fs.existsSync(temp))fs.unlinkSync(temp);}
  if((done+failed)%50===0){persist();console.log(JSON.stringify({done,failed,remaining:queue.length}));}
 }
}));persist();console.log({done,failed,total:unique.size});
