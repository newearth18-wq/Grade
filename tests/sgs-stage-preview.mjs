// A disposable local classroom: never run these fixtures against a school database.
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const modules=(await readdir('dist/server',{recursive:true})).filter(p=>(p.endsWith('.js')||p.endsWith('.mjs'))&&p!=='index.js');
const mf=new Miniflare({name:'sgs-stage-preview',modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...modules.map(p=>({type:'ESModule',path:resolve('dist/server',p)}))],modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'sgs-stage-preview'},r2Buckets:{BUCKET:'sgs-stage-preview'},assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{invoke_user_worker_ahead_of_assets:false,has_user_worker:true}},port:8790,host:'127.0.0.1'});
await mf.ready;const db=await mf.getD1Database('DB');
for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
let cookie='';async function call(path,body,method='POST'){const r=await fetch('http://127.0.0.1:8790/api/'+path,{method:body===undefined?'GET':method,headers:{Connection:'close',...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const result=await r.json();if(!r.ok)throw Error(path+': '+result.error);return result;}
await call('setup',{name:'ครูทดสอบ SGS แยกช่วง',username:'sgs_teacher',password:'Sgs-Preview-Teacher-1234'});
const p=await call('periods',{year:2569,term:1}),c=await call('courses',{periodId:p.id,code:'TEST-SGS',name:'ทดสอบส่งออก SGS แยกช่วง',classrooms:['3/4'],workWeight:60,beforeWorkWeight:30,midWeight:20,finalWeight:20});
await call('students',{courseId:c.id,code:'00001',name:'นักเรียนจำลอง SGS',number:1});
const studentId=(await call('state')).enrollments[0].student_id;
for(const workPhase of ['before','after']){const task=await call('assignments',{courseId:c.id,title:workPhase==='before'?'งานก่อนกลางภาค':'งานหลังกลางภาค',description:'ข้อมูลทดสอบ',maxScore:30,workPhase,dueAt:'2027-12-01T09:00:00+07:00',rubric:[]});await call('paper-grade',{assignmentId:task.id,studentId,score:workPhase==='before'?30:28});}
await db.prepare('UPDATE enrollments SET mid=15,final=NULL WHERE course_id=?').bind(c.id).run();
console.log('SGS stage QA ready: http://127.0.0.1:8790/ — disposable teacher sgs_teacher / Sgs-Preview-Teacher-1234');
process.on('SIGINT',async()=>{await mf.dispose();process.exit(0);});await new Promise(()=>{});
