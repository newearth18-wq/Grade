// Isolated D1/R2 integration; never connects to Google or school data.
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
const origin='http://127.0.0.1:8795';
const modules=(await readdir('dist/server',{recursive:true})).filter(p=>/\.(m?js)$/.test(p)&&p!=='index.js');
const mf=new Miniflare({name:'drive-backup-qa',modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...modules.map(p=>({type:'ESModule',path:resolve('dist/server',p)}))],modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'drive-backup-qa'},r2Buckets:{BUCKET:'drive-backup-qa'},assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{invoke_user_worker_ahead_of_assets:false,has_user_worker:true}},host:'127.0.0.1',port:8795,bindings:{BACKUP_OWNER_EMAIL:'drive-owner@example.test'}});
await mf.ready;const db=await mf.getD1Database('DB'),r2=await mf.getR2Bucket('BUCKET');
for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
const sha=b=>createHash('sha256').update(b).digest('hex');
function client(){let cookie='';return async(path,body,method=body===undefined?'GET':'POST',status=200,headers={})=>{
 const r=await fetch(origin+'/api/'+path,{method,headers:{Connection:'close',...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
 const value=r.headers.get('content-type')?.includes('application/json')?await r.json():Buffer.from(await r.arrayBuffer());
 assert.equal(r.status,status,path+': '+JSON.stringify(value));return value;
};}
const admin=client(),student=client(),anon=client();
try{
 await admin('setup',{name:'Backup QA',username:'backup_teacher',password:'Backup-Teacher-1234'},'POST',201);
 const period=await admin('periods',{year:2569,term:2},'POST',201);
 const course=await admin('courses',{periodId:period.id,code:'QA101',name:'ทดสอบสำรอง',classrooms:['1/1'],workWeight:60,beforeWorkWeight:30,midWeight:20,finalWeight:20},'POST',201);
 await admin('students',{courseId:course.id,code:'DRIVE001',name:'นักเรียนจำลอง',number:1},'POST',201);await student('login',{username:'DRIVE001',password:'DRIVE001'});
 const assignment=await admin('assignments',{courseId:course.id,title:'งานจำลอง',description:'',maxScore:10,workPhase:'before',dueAt:'2027-12-01T00:00:00Z',rubric:[]},'POST',201);
 const original=Buffer.from([137,80,78,71,13,10,26,10,0,1,2,3]),fileId='qa-drive-original';
 await r2.put(fileId,original,{httpMetadata:{contentType:'image/png'}});
 await db.prepare('INSERT INTO files(id,course_id,assignment_id,student_id,revision,name,mime,size,created_at) VALUES(?,?,?,NULL,0,?,?,?,?)').bind(fileId,course.id,assignment.id,'sample.png','image/png',original.length,new Date().toISOString()).run();
 await anon('drive-backup/status',undefined,'GET',401);await student('drive-backup/status',undefined,'GET',403);
 await admin('drive-backup/setup',{folder:'bad',account:'owner@example.test'},'POST',400);
 const before=(await r2.list({prefix:'snapshots/'})).objects.length;
 const setup=await admin('drive-backup/setup',{folder:'https://drive.google.com/drive/folders/qa_drive_folder_123',account:'owner@example.test'},'POST',201);
 assert.match(setup.token,/^[a-f0-9]{64}$/);assert.equal((await admin('drive-backup/status')).config.mode,'pending');
 assert.equal((await r2.list({prefix:'snapshots/'})).objects.length,before);
 const saved=await db.prepare('SELECT value FROM settings WHERE key LIKE ?').bind('drive-backup:%').first();assert(!saved.value.includes(setup.token));
 const remote=(path,body,status=200,worker='worker_a',token=setup.token)=>anon('drive-backup/remote/'+path,body,body===undefined?'GET':'POST',status,{'X-Grade-Backup-Key':token,'X-Grade-Backup-Worker':worker});
 await remote('status',undefined,403,'worker_a','0'.repeat(64));
 await remote('next',undefined,403,'worker_a',setup.token.toUpperCase());
 const job=(await remote('next')).job;assert.equal(job.id,setup.jobId);
 const packet=await remote('claim',{jobId:job.id,workerId:'worker_a'});
 assert.equal(packet.sources.length,1);assert(!JSON.stringify(packet).includes('password'));assert(!packet.sources[0].key);
 await remote('claim',{jobId:job.id,workerId:'worker_b'},409);
 await remote('jobs/'+job.id+'/assets/not_in_job',undefined,404);
 await remote('jobs/'+job.id+'/assets/'+packet.sources[0].id,undefined,409,'worker_b');
 const bytes=await remote('jobs/'+job.id+'/assets/'+packet.sources[0].id);assert.deepEqual(bytes,original);
 const receipt={id:packet.sources[0].id,size:original.length,sha256:sha(bytes),driveFileId:'qa_drive_asset_123'};
 packet.manifest.assets=packet.sources.map(s=>({id:s.id,kind:s.kind,referenceId:s.referenceId,size:s.size,mime:s.mime,sha256:receipt.sha256}));
 const completed={jobId:job.id,workerId:'worker_a',account:'owner@example.test',parentFolderId:'qa_drive_folder_123',folderId:'qa_drive_export_123',manifestFileId:'qa_drive_manifest_123',manifestSha256:sha(JSON.stringify(packet.manifest)),assets:[receipt]};
 await remote('complete',{...completed,assets:[]},400);
 await remote('complete',{...completed,account:'other@example.test'},409);
 await remote('complete',{...completed,assets:[{...receipt,sha256:'0'.repeat(64)}]},409);
 assert.equal((await admin('drive-backup/status')).config.mode,'pending');
 // The old safety path is retained until verification really succeeds.
 await admin('snapshots',{courseId:course.id},'POST',201);
 const preserved=(await r2.list({prefix:'snapshots/'})).objects.length;assert(preserved>before);
 await remote('complete',completed);await remote('complete',completed);
 await remote('complete',{...completed,folderId:'different_drive_folder'},409);
 const status=await admin('drive-backup/status');assert.equal(status.config.mode,'drive');assert.equal(status.jobs[0].status,'complete');assert(!JSON.stringify(status).includes(setup.token));
 assert.equal((await db.prepare('SELECT payload FROM drive_backup_jobs WHERE id=?').bind(job.id).first()).payload,null);
 const queued=await admin('snapshots',{courseId:course.id},'POST',201);assert.equal(queued.queued,true);
 await admin('snapshots/daily',{});const count=(await admin('drive-backup/status')).jobs.length;await admin('snapshots/daily',{});assert.equal((await admin('drive-backup/status')).jobs.length,count);
 assert.equal((await r2.list({prefix:'snapshots/'})).objects.length,preserved);assert(await r2.get(fileId));
 const rpcResponse=await fetch(origin+'/mcp',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'fixture-owner','oai-authenticated-user-email':'drive-owner@example.test'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'daily_classroom_backup',arguments:{}}})});const rpcResult=await rpcResponse.json();assert(!rpcResult.result.isError);const totals=JSON.parse(rpcResult.result.content[0].text);assert.equal(totals.driveManaged,1);assert.equal(totals.completed,0);assert.equal((await admin('drive-backup/status')).jobs.length,count);assert.equal((await r2.list({prefix:'snapshots/'})).objects.length,preserved);
 // A Drive folder download has a containing directory. Grade must accept it.
 const zip=new JSZip();zip.file('Grade-Backup-QA/manifest.json',JSON.stringify(packet.manifest));zip.file('Grade-Backup-QA/assets/'+receipt.id,original);
 await mkdir('../../outputs/grade-drive-backup',{recursive:true});await writeFile('../../outputs/grade-drive-backup/Drive-folder-QA.zip',await zip.generateAsync({type:'nodebuffer'}));
 // Revoke immediately stops unattended reads and returns the old safety path.
 await admin('drive-backup/revoke',{});await remote('status',undefined,403);assert.equal((await admin('drive-backup/status')).config,null);
 await admin('snapshots',{courseId:course.id},'POST',201);assert((await r2.list({prefix:'snapshots/'})).objects.length>preserved);
 console.log('PASS Drive backup: admin-only setup, hash-only key, no password export, isolated assets, exclusive leases, account/folder binding, complete original hashes, no premature cutover, idempotent receipt/daily, no R2 copies after cutover, revoke/fallback, wrapped Drive ZIP fixture');
}finally{await mf.dispose();}
