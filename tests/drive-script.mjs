import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const code=await readFile('public/backup/GradeDriveBackup.gs','utf8');
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture({wrongAccount=false,corrupt=false,pause=false}={}){
 let clock=1000,paused=false,mode='pending',completed=0,nextId=1;const triggers=[],requests=[],properties=new Map([['GRADE_URL','https://grade-fixture.teacher-fixture.chatgpt.site'],['GRADE_BACKUP_KEY','a'.repeat(64)]]);
 const bytes=[Buffer.from('first original'),Buffer.from('second original')];const sources=bytes.map((b,i)=>({id:'asset-'+i,referenceId:'file-'+i,kind:'file',mime:'image/png',size:b.length}));
 const manifest={format:'grade-backup',version:2,assets:[]};const records=new Map();
 const blob=value=>({getBytes:()=>[...Buffer.from(value)],getDataAsString:()=>Buffer.from(value).toString('utf8')});
 const iterator=a=>{let i=0;return{hasNext:()=>i<a.length,next:()=>a[i++]};};
 function file(folder,name,data){const f={id:'fixture_file_'+nextId++,name,data:Buffer.from(data),trashed:false,getId(){return this.id;},getBlob(){return blob(corrupt&&name==='asset-0'?Buffer.from('wrong'):this.data);},setContent(t){this.data=Buffer.from(t);return this;},setTrashed(t){this.trashed=t;return this;}};folder.files.push(f);records.set(f.id,f);return f;}
 function folder(name,parent=null){const f={id:'fixture_folder_'+nextId++,name,parent,files:[],folders:[],getId(){return this.id;},getOwner:()=>({getEmail:()=> 'owner@example.test'}),getSharingAccess:()=> 'PRIVATE',getEditors:()=>[],getViewers:()=>[],getParents(){return iterator(this.parent?[this.parent]:[]);},getFoldersByName(n){return iterator(this.folders.filter(f=>f.name===n));},createFolder(n){const child=folder(n,this);this.folders.push(child);return child;},getFilesByName(n){return iterator(this.files.filter(f=>f.name===n&&!f.trashed));},createFile(a,b){const result=typeof a==='string'?file(this,a,b):file(this,a.name,a.data);if(pause&&!paused&&result.name==='asset-0'){clock=250001;paused=true;}return result;},setName(n){this.name=n;return this;}};records.set(f.id,f);return f;}
 const root=folder('Grade Backup');
 const api=(url,o)=>{assert.equal(o.followRedirects,false);assert.equal(o.headers['X-Grade-Backup-Key'],'a'.repeat(64));const op=url.split('/remote/')[1],body=o.payload?JSON.parse(o.payload):null;requests.push(op);let result={ok:true},content=null;
  if(op==='status')result={mode,folderId:root.id,account:'owner@example.test'};
  else if(op==='recent')result={jobs:[]};
  else if(op==='next')result={job:completed?null:{id:'job-1',name:'Grade-Backup-fixture'}};
  else if(op==='claim')result={manifest:structuredClone(manifest),sources};
  else if(op.startsWith('jobs/'))content=bytes[Number(op.split('/').at(-1).split('-')[1])];
  else if(op==='complete'){
   assert.equal(body.account,'owner@example.test');assert.equal(body.parentFolderId,root.id);assert.equal(body.assets.length,2);
   const f=records.get(body.manifestFileId),m=JSON.parse(f.data.toString());assert.equal(sha(f.data),body.manifestSha256);
   m.assets.forEach((a,i)=>assert.equal(a.sha256,sha(bytes[i])));assert(!f.data.toString().includes('a'.repeat(64)));
   body.assets.forEach((a,i)=>assert.equal(sha(records.get(a.driveFileId).data),sha(bytes[i])));mode='drive';completed++;
  }
  return{getResponseCode:()=>200,getContentText:()=>JSON.stringify(result),getBlob:()=>blob(content),getAllHeaders:()=>({'X-Grade-Backup-SHA256':content?sha(content):''})};
 };
 const trigger=handler=>({timeBased(){return this;},everyDays(){return this;},atHour(){return this;},inTimezone(){return this;},after(){return this;},create(){const t={getHandlerFunction:()=>handler};triggers.push(t);return t;}});
 const context={Date:{now:()=>clock},Error,JSON,encodeURIComponent,PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v)})},Utilities:{getUuid:()=> 'worker-fixture',DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,b)=>[...createHash('sha256').update(Buffer.from(b)).digest()],newBlob:(value,mime,name)=>({...blob(typeof value==='string'?Buffer.from(value):Buffer.from(value)),data:typeof value==='string'?Buffer.from(value):Buffer.from(value),name})},UrlFetchApp:{fetch:api},DriveApp:{Access:{PRIVATE:'PRIVATE'},getFolderById:id=>records.get(id)},Session:{getEffectiveUser:()=>({getEmail:()=>wrongAccount?'other@example.test':'owner@example.test'})},ScriptApp:{getProjectTriggers:()=>[...triggers],deleteTrigger:t=>triggers.splice(triggers.indexOf(t),1),newTrigger:trigger},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})}};
 vm.createContext(context);vm.runInContext(code,context);
 return {context,root,triggers,requests,get completed(){return completed;},get mode(){return mode;}};
}
const normal=fixture();normal.context.setupDriveBackup();assert.equal(normal.completed,1);assert.equal(normal.mode,'drive');assert.equal(normal.triggers.filter(t=>t.getHandlerFunction()==='runDriveBackup').length,1);assert(!normal.root.folders[0].name.endsWith('.partial'));
const resumed=fixture({pause:true});resumed.context.setupDriveBackup();assert.equal(resumed.completed,0);assert.equal(resumed.mode,'pending');assert(resumed.triggers.some(t=>t.getHandlerFunction()==='resumeDriveBackup'));resumed.context.resumeDriveBackup();assert.equal(resumed.completed,1);assert.equal(resumed.root.folders.length,1);assert.equal(resumed.root.folders[0].folders[0].files.filter(f=>!f.trashed).length,2);
const corrupted=fixture({corrupt:true});assert.throws(()=>corrupted.context.setupDriveBackup(),/failed/);assert.equal(corrupted.completed,0);assert.equal(corrupted.mode,'pending');assert(corrupted.requests.includes('error'));
const wrong=fixture({wrongAccount:true});assert.throws(()=>wrong.context.setupDriveBackup(),/บัญชี/);assert.equal(wrong.root.folders.length,0);assert.equal(wrong.triggers.length,0);
console.log('PASS Google script simulation: account guard before consented triggers, daily trigger, bounded/resumable work, no duplicate files, persisted Drive hashes and manifest, successful receipt before final folder, no completion on corrupt bytes, no credentials in files');
