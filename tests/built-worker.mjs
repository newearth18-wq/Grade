import { Miniflare } from 'miniflare';
import { readFile,readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
const modulePaths=(await readdir('dist/server',{recursive:true})).filter(p=>(p.endsWith('.js')||p.endsWith('.mjs'))&&p!=='index.js');const mf=new Miniflare({name:'grade-built-verification',modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...modulePaths.map(p=>({type:'ESModule',path:resolve('dist/server',p)}))],modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'grade-test'},r2Buckets:{BUCKET:'grade-test'},assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{invoke_user_worker_ahead_of_assets:true,has_user_worker:true}},port:8783,host:'127.0.0.1'});
try{await mf.ready;const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort().map(f=>'drizzle/'+f)){for(const sql of (await readFile(file,'utf8')).split('--> statement-breakpoint')){if(sql.trim())await db.prepare(sql.trim()).run();}}
for(const script of ['tests/integration.mjs','tests/enhancements.mjs','tests/subjects.mjs','tests/coursework-phases.mjs','tests/trash.mjs']){
 const code=await new Promise(resolve=>{const child=spawn(process.execPath,[script],{stdio:'inherit',env:{...process.env,GRADE_TEST_URL:'http://127.0.0.1:8783',GRADE_TEST_OUTPUT:'../Grade-direct-verification'}});child.on('exit',resolve);});process.exitCode=code;if(code!==0)break;
}
if(process.exitCode===0){
 const salt='88'.repeat(16);async function passwordHash(password){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bytes=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);return salt+':'+Buffer.from(bytes).toString('hex');}
 for(const [id,code,password,role,mustChange] of [['policy-legacy','LEGACY01','Legacy-Temporary-1234','student',1],['policy-session','SESSION01','Legacy-Session-1234','student',1],['policy-personal','PERSONAL01','Personal-Already-Changed','student',0],['policy-staff','STAFF01','Staff-Temporary-1234','teacher',1]])await db.prepare('INSERT INTO users (id,username,name,role,password,active,must_change,created_at) VALUES (?,?,?,?,?,1,?,?)').bind(id,code,'บัญชีจำลอง '+code,role,await passwordHash(password),mustChange,new Date().toISOString()).run();
 const token=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('disposable-legacy-student-session'))).toString('hex');await db.prepare('INSERT INTO sessions (token,user_id,expires) VALUES (?,?,?)').bind(token,'policy-session',Date.now()+60000).run();
 process.exitCode=await new Promise(resolve=>{const child=spawn(process.execPath,['tests/student-login-policy.mjs'],{stdio:'inherit',env:{...process.env,GRADE_TEST_URL:'http://127.0.0.1:8783'}});child.on('exit',resolve);});
}
}finally{await mf.dispose();}




