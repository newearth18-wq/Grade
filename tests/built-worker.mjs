import { Miniflare } from 'miniflare';
import { readFile,readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
const modulePaths=(await readdir('dist/server',{recursive:true})).filter(p=>(p.endsWith('.js')||p.endsWith('.mjs'))&&p!=='index.js');const mf=new Miniflare({name:'grade-built-verification',modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...modulePaths.map(p=>({type:'ESModule',path:resolve('dist/server',p)}))],modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'grade-test'},r2Buckets:{BUCKET:'grade-test'},assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{invoke_user_worker_ahead_of_assets:true,has_user_worker:true}},port:8783,host:'127.0.0.1'});
try{await mf.ready;const db=await mf.getD1Database('DB');for(const file of ['drizzle/0000_secret_aaron_stack.sql','drizzle/0001_green_wallop.sql']){for(const sql of (await readFile(file,'utf8')).split('--> statement-breakpoint')){if(sql.trim())await db.prepare(sql.trim()).run();}}
const code=await new Promise(resolve=>{const child=spawn(process.execPath,['tests/integration.mjs'],{stdio:'inherit',env:{...process.env,GRADE_TEST_URL:'http://127.0.0.1:8783',GRADE_TEST_OUTPUT:'../Grade-direct-verification'}});child.on('exit',resolve);});process.exitCode=code;
}finally{await mf.dispose();}



