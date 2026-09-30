import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { videoKey } from '../lib/video.mjs';
const root = 'archive/video-backup-files';
fs.mkdirSync(root, {recursive:true});
const courses = JSON.parse(fs.readFileSync('public/data/courses.json'));
const players = JSON.parse(fs.readFileSync('public/data/players.json'));
const backups = JSON.parse(fs.readFileSync('archive/video-backups.json'));
const ledgerPath = path.join(root, 'downloads.json');
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath)) : {};
const videos = new Map();
for (const course of courses) for (const r of [...course.currentHolders, ...course.records, ...course.submissions.filter(r=>r.videoVerified)]) {
  if (!r.video || r.videoAudit?.status === 'title-time-mismatch') continue;
  const key = videoKey(r.video);
  if (!key) continue;
  const entry = videos.get(key) || {originalUrl:r.video,runs:[]};
  if (!entry.runs.some(x=>x.courseId===course.id && x.time===r.time && x.playerId===r.playerId)) entry.runs.push({courseId:course.id,course:course.name,time:r.time,playerId:r.playerId,player:players.find(p=>p.id===r.playerId)?.name,date:r.recordDate || r.achievedAt || null,source:r.source?.url});
  videos.set(key,entry);
}
const queue = [...videos].map(([key, entry])=>({key,...entry,backup:backups[key]?.url || null}));
fs.writeFileSync(path.join(root,'queue.json'), JSON.stringify(queue,null,2)+'\n');
console.log(`Video preservation queue: ${queue.length} unique originals`);
if (process.argv.includes('--plan')) process.exit(0);
for (const [index,entry] of queue.entries()) {
  if (entry.backup || ledger[entry.key]?.status==='downloaded') continue;
  const folder = path.join(root,crypto.createHash('sha256').update(entry.key).digest('hex').slice(0,20));
  fs.mkdirSync(folder,{recursive:true});
  const output=fs.openSync(path.join(folder,'download.log'),'w');
  console.log(`${index+1}/${queue.length} ${entry.runs[0].course} ${entry.runs[0].time}`);
  const result=spawnSync('yt-dlp',['--js-runtimes','node','--no-progress','--no-playlist','--socket-timeout','20','--retries','2','--fragment-retries','2','--write-info-json','-f','bv*[height<=1080]+ba/b[height<=1080]/b','--merge-output-format','mp4','-o',path.join(folder,'original.%(ext)s'),entry.originalUrl],{stdio:['ignore',output,output],timeout:300_000});
  fs.closeSync(output);
  const file=fs.readdirSync(folder).find(f=>/^original\.(mp4|webm|mkv|mov)$/.test(f));
  ledger[entry.key]={...entry,status:result.status===0 && file?'downloaded':'download-failed',checkedAt:new Date().toISOString(),folder,exitCode:result.status};
  if (ledger[entry.key].status==='downloaded') {
    const videoPath=path.join(folder,file);
    ledger[entry.key].file=videoPath;
    ledger[entry.key].bytes=fs.statSync(videoPath).size;
    ledger[entry.key].sha256=crypto.createHash('sha256').update(fs.readFileSync(videoPath)).digest('hex');
  }
  fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');
}
