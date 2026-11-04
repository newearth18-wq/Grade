import {all,one,stmt,database,bucket,fail,uid,now,reply,jsonBody,string,ensureSameOrigin} from './server';
import {digest,type User} from './auth';
import {validateRestore} from './restore-server';

type Config={mode:'pending'|'drive';tokenHash:string;folderId:string;account:string;createdAt:string;lastSuccess?:string;lastError?:string};
const configKey=(id:string)=>'drive-backup:'+id;
const driveId=(v:unknown)=>{if(typeof v!=='string'||!/^[-\w]{10,200}$/.test(v))fail(400,'รหัสไฟล์หรือโฟลเดอร์ Drive ไม่ถูกต้อง');return v as string;};
const hashBytes=async(b:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
export async function driveConfig(owner:string):Promise<Config|null>{const s=await one('SELECT value FROM settings WHERE key=?',configKey(owner));return s?JSON.parse(s.value):null;}
export async function driveBackupActive(owner:string){return (await driveConfig(owner))?.mode==='drive';}
async function saveConfig(owner:string,c:Config){await stmt('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',configKey(owner),JSON.stringify(c)).run();}

/** Only metadata and references to immutable originals are queued. No R2 copies. */
export async function queueDriveBackup(u:User,courseId:string|null,kind:string,daily=false){
 const config=await driveConfig(u.id);if(!config)fail(409,'ยังไม่ได้ตั้งค่า Drive');
 const day=daily?new Date(Date.now()+7*3600000).toISOString().slice(0,10):null;
 if(day){const prior=await one('SELECT id FROM drive_backup_jobs WHERE owner_id=? AND day=?',u.id,day);if(prior)return prior.id;}
 if((await one('SELECT COUNT(*) AS n FROM drive_backup_jobs WHERE owner_id=? AND status IN (\'queued\',\'running\')',u.id))!.n>=50)fail(503,'คิวสำรอง Drive เต็ม กรุณาตรวจการเชื่อมต่อก่อนทำรายการ');
 const {extendedRoute}=await import('./extended-server');
 let m=await (await extendedRoute(new Request('https://grade.internal/api/backup'),u,'backup','GET'))!.json() as any;
 if(courseId){const {scopeBackup}=await import('./snapshots-server');m=scopeBackup(m,courseId);}
 const sources=[...m.files.map((f:any)=>({id:uid(),kind:'file',referenceId:f.id,key:f.id,size:f.size,mime:f.mime})),...m.profiles.map((p:any)=>({id:uid(),kind:'template',referenceId:p.id,key:p.template_key,size:p.size,mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))];
 const size=sources.reduce((n:number,s:any)=>n+s.size,0);if(size>250*1024*1024)fail(413,'ชุดสำรองเกิน 250 MB กรุณาสำรองแยกรายวิชา');
 m.assets=[];const payload=JSON.stringify({manifest:m,sources});if(new TextEncoder().encode(payload).length>800000)fail(413,'รายการสำรองใหญ่เกินไป กรุณาแยกรายวิชา');
 if(courseId){for(const source of sources){const h=await bucket().head(source.key);if(!h||h.size!==source.size)fail(409,'ไฟล์ต้นฉบับไม่ครบ ไม่เพิ่มคิวจุดกู้คืน');}}
 const id=uid();try{await stmt('INSERT INTO drive_backup_jobs(id,owner_id,course_id,kind,day,payload,size,file_count,created_at) VALUES(?,?,?,?,?,?,?,?,?)',id,u.id,courseId,kind,day,payload,size,sources.length,now()).run();}
 catch(e){if(day){const existing=await one('SELECT id FROM drive_backup_jobs WHERE owner_id=? AND day=?',u.id,day);if(existing)return existing.id;}throw e;}
 return id;
}

async function authenticatedBridge(r:Request){
 const token=r.headers.get('X-Grade-Backup-Key')||'';if(!/^[a-f0-9]{64}$/.test(token))fail(403,'กุญแจสำรองไม่ถูกต้อง');
 const s=await one(`SELECT u.id,u.username,u.name,u.role,u.must_change,u.active,s.value FROM users u JOIN settings s ON s.key='drive-backup:'||u.id WHERE u.active=1 AND u.role='admin' AND json_extract(CASE WHEN json_valid(s.value) THEN s.value ELSE '{}' END,'$.tokenHash')=?`,await digest(token));
 if(!s)fail(403,'กุญแจถูกเพิกถอนหรือผู้ดูแลไม่มีสิทธิ์');return {u:s as User,config:JSON.parse(s!.value) as Config};
}
async function jobFor(u:User,id:string){const j=await one('SELECT * FROM drive_backup_jobs WHERE id=? AND owner_id=?',id,u.id);if(!j)fail(404,'ไม่พบงานสำรอง');return j!;}
function workerId(v:unknown){return string(v,'รหัสผู้ส่ง',100);}
function requireLease(j:any,w:string){if(j.worker_id!==w||j.lease_until<=Date.now()||j.status!=='running')fail(409,'สิทธิ์ส่งชุดนี้หมดอายุ กรุณารับคิวใหม่');}

export async function driveRemoteRoute(r:Request,path:string,method:string):Promise<Response|null>{
 if(!path.startsWith('drive-backup/remote/'))return null;
 ensureSameOrigin(r);const {u,config}=await authenticatedBridge(r),op=path.slice('drive-backup/remote/'.length);
 if(op==='status'&&method==='GET')return reply({mode:config.mode,folderId:config.folderId,account:config.account});
 if(op==='daily'&&method==='POST'){if(config.mode==='drive'&&(await one('SELECT value FROM settings WHERE key=?','backup-auto:'+u.id))?.value!=='0')await queueDriveBackup(u,null,'daily',true);return reply({ok:true});}
 if(op==='recent'&&method==='GET')return reply({jobs:await all("SELECT id,folder_id,created_at,COALESCE(day,substr(datetime(created_at,'+7 hours'),1,10)) AS backup_date FROM drive_backup_jobs WHERE owner_id=? AND status='complete' ORDER BY completed_at DESC LIMIT 10",u.id)});
 if(op==='next'&&method==='GET'){
  const j=await one(`SELECT * FROM drive_backup_jobs WHERE owner_id=? AND status IN ('queued','running') ORDER BY created_at,id LIMIT 1`,u.id);
  if(!j)return reply({job:null});
  return reply({job:{id:j.id,name:'Grade-Backup-'+(j.day||new Date(Date.parse(j.created_at)+7*3600000).toISOString().slice(0,10))+'-'+j.id.slice(0,8),size:j.size,fileCount:j.file_count,status:j.status}});
 }
 if(op==='claim'&&method==='POST'){
  const b=await jsonBody(r),w=workerId(b.workerId),j=await jobFor(u,string(b.jobId,'งานสำรอง',100));
  const result=await stmt(`UPDATE drive_backup_jobs SET status='running',worker_id=?,lease_until=?,error='' WHERE id=? AND owner_id=? AND (status='queued' OR (status='running' AND (lease_until<=? OR worker_id=?)))`,w,Date.now()+600000,j.id,u.id,Date.now(),w).run();
  if(!result.meta.changes)fail(409,'มีตัวส่งอื่นกำลังทำงาน หรือชุดนี้เสร็จแล้ว');
  const p=JSON.parse(j.payload);return reply({manifest:p.manifest,sources:p.sources.map(({key,...s}:any)=>s)});
 }
 const asset=op.match(/^jobs\/([^/]+)\/assets\/([^/]+)$/);
 if(asset&&method==='GET'){
  const j=await jobFor(u,asset[1]);requireLease(j,r.headers.get('X-Grade-Backup-Worker')||'');
  const p=JSON.parse(j.payload),i=p.sources.findIndex((s:any)=>s.id===asset[2]),source=p.sources[i];if(!source)fail(404,'ไฟล์ไม่อยู่ในชุดสำรอง');
  const object=await bucket().get(source.key);if(!object||object.size!==source.size)fail(409,'ไฟล์ต้นฉบับไม่ครบ ไม่รับรองชุดสำรอง');
  const bytes=await object.arrayBuffer(),hash=await hashBytes(bytes);if(source.sha256&&source.sha256!==hash)fail(409,'ไฟล์ต้นฉบับเปลี่ยนระหว่างสำรอง');
  const changed=await stmt("UPDATE drive_backup_jobs SET payload=json_set(payload,?,?) WHERE id=? AND owner_id=? AND worker_id=? AND status='running' AND lease_until>?",'$.sources['+i+'].sha256',hash,j.id,u.id,j.worker_id,Date.now()).run();if(!changed.meta.changes)fail(409,'สถานะคิวเปลี่ยนแล้ว');
  return new Response(bytes,{headers:{'Content-Type':source.mime,'Content-Length':String(source.size),'X-Grade-Backup-SHA256':hash,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(op==='complete'&&method==='POST'){
  const b=await jsonBody(r),j=await jobFor(u,string(b.jobId,'งานสำรอง',100)),w=workerId(b.workerId);
  if(j.status==='complete'){
   if(j.folder_id===b.folderId&&j.manifest_file_id===b.manifestFileId&&j.manifest_sha256===b.manifestSha256)return reply({ok:true,mode:config.mode});
   fail(409,'ชุดนี้รับรองไปแล้วและข้อมูลปลายทางไม่ตรง');
  }
  requireLease(j,w);if(b.account!==config.account||b.parentFolderId!==config.folderId)fail(409,'บัญชีหรือโฟลเดอร์ปลายทางไม่ตรง');
  const folder=driveId(b.folderId),manifestFile=driveId(b.manifestFileId),p=JSON.parse(j.payload),assets=b.assets;
  if(!Array.isArray(assets)||assets.length!==p.sources.length||new Set(assets.map((a:any)=>a.id)).size!==assets.length||new Set(assets.map((a:any)=>a.driveFileId)).size!==assets.length)fail(400,'รายการไฟล์สำรองไม่ครบหรือซ้ำ');
  const complete=[];
  for(const source of p.sources){
   const a=assets.find((a:any)=>a.id===source.id);if(!a||a.size!==source.size||!a.driveFileId||!/^[-\w]{10,200}$/.test(a.driveFileId)||! /^[a-f0-9]{64}$/.test(a.sha256))fail(400,'ข้อมูลรับรองไฟล์ไม่ตรง');
   if(!source.sha256||source.sha256!==a.sha256)fail(409,'ลายนิ้วมือไฟล์ไม่ตรง ไม่เปลี่ยนระบบสำรอง');
   complete.push({id:source.id,kind:source.kind,referenceId:source.referenceId,size:source.size,mime:source.mime,sha256:a.sha256});
  }
  p.manifest.assets=complete;validateRestore(p.manifest);
  if(await digest(JSON.stringify(p.manifest))!==b.manifestSha256)fail(409,'รายการ manifest ไม่ตรง');
  const stamp=now();
  await database().batch([
   stmt(`UPDATE drive_backup_jobs SET status='complete',payload=NULL,folder_id=?,manifest_file_id=?,manifest_sha256=?,completed_at=?,lease_until=0 WHERE id=? AND owner_id=? AND worker_id=? AND status='running'`,folder,manifestFile,b.manifestSha256,stamp,j.id,u.id,w),
   stmt(`UPDATE settings SET value=json_set(value,'$.mode','drive','$.lastSuccess',?,'$.lastError','') WHERE key=? AND json_extract(value,'$.tokenHash')=? AND EXISTS(SELECT 1 FROM drive_backup_jobs WHERE id=? AND status='complete' AND manifest_sha256=?)`,stamp,configKey(u.id),config.tokenHash,j.id,b.manifestSha256)
  ]);
  const confirmed=await jobFor(u,j.id);if(confirmed.status!=='complete')fail(409,'สถานะเปลี่ยนระหว่างรับรอง');return reply({ok:true,mode:'drive'});
 }
 if(op==='error'&&method==='POST'){
  const b=await jsonBody(r),j=await jobFor(u,string(b.jobId,'งานสำรอง',100));requireLease(j,workerId(b.workerId));
  // Never persist provider errors that might include a credential or response body.
  await stmt("UPDATE drive_backup_jobs SET status='queued',lease_until=0,error=? WHERE id=?",'Google สำรองไม่สำเร็จ กรุณาตรวจ Executions ใน Apps Script',j.id).run();
  await stmt("UPDATE settings SET value=json_set(value,'$.lastError',?) WHERE key=? AND json_extract(value,'$.tokenHash')=?",'สำรองไม่สำเร็จ กรุณาตรวจ Google Apps Script',configKey(u.id),config.tokenHash).run();return reply({ok:true});
 }
 fail(404,'ไม่พบคำสั่งสำรอง Drive');
}

export async function driveSettingsRoute(r:Request,u:User,path:string,method:string):Promise<Response|null>{
 if(!path.startsWith('drive-backup/'))return null;if(u.role!=='admin')fail(403,'เฉพาะผู้ดูแลระบบตั้งค่า Drive');
 if(path==='drive-backup/status'&&method==='GET'){
  const c=await driveConfig(u.id),jobs=await all('SELECT id,kind,status,size,file_count,folder_id,error,created_at,completed_at FROM drive_backup_jobs WHERE owner_id=? ORDER BY created_at DESC LIMIT 30',u.id);
  return reply({config:c?{mode:c.mode,folderId:c.folderId,account:c.account,lastSuccess:c.lastSuccess,lastError:c.lastError}:null,jobs});
 }
 if(path==='drive-backup/setup'&&method==='POST'){
  const b=await jsonBody(r),account=string(b.account,'บัญชี Google',200).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account))fail(400,'อีเมลไม่ถูกต้อง');
  const folder=string(b.folder,'โฟลเดอร์',300),folderId=driveId(folder.match(/\/folders\/([-\w]+)/)?.[1]||folder);
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
  const c:Config={mode:'pending',tokenHash:await digest(token),folderId,account,createdAt:now()};
  await database().batch([stmt("UPDATE drive_backup_jobs SET status='cancelled',payload=NULL,lease_until=0 WHERE owner_id=? AND status IN ('queued','running')",u.id),stmt('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',configKey(u.id),JSON.stringify(c))]);
  const jobId=await queueDriveBackup(u,null,'initial');return reply({token,jobId,folderId,account},201);
 }
 if(path==='drive-backup/queue'&&method==='POST'){
  if(!(await driveConfig(u.id)))fail(409,'ตั้งค่าการเชื่อมต่อก่อน');const queued=await one("SELECT id FROM drive_backup_jobs WHERE owner_id=? AND status IN ('queued','running') AND course_id IS NULL ORDER BY created_at LIMIT 1",u.id);
  return reply({id:queued?.id||await queueDriveBackup(u,null,'manual')},201);
 }
 if(path==='drive-backup/revoke'&&method==='POST'){
  await database().batch([stmt('DELETE FROM settings WHERE key=?',configKey(u.id)),stmt("UPDATE drive_backup_jobs SET status='cancelled',payload=NULL,lease_until=0 WHERE owner_id=? AND status IN ('queued','running')",u.id)]);return reply({ok:true});
 }
 fail(404,'ไม่พบคำสั่งสำรอง Drive');
}
