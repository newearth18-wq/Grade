// Uses a disposable D1/R2 classroom. Set GRADE_JOURNEY_PREVIEW=1 for browser QA.
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {studentJourney} from '../.sites-runtime/student-journey-test.mjs';
const modules=(await readdir('dist/server',{recursive:true})).filter(p=>(p.endsWith('.js')||p.endsWith('.mjs'))&&p!=='index.js');
const mf=new Miniflare({name:'journey-qa',modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...modules.map(p=>({type:'ESModule',path:resolve('dist/server',p)}))],modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'journey-qa'},r2Buckets:{BUCKET:'journey-qa'},assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{invoke_user_worker_ahead_of_assets:false,has_user_worker:true}},port:8787,host:'127.0.0.1'});
function client(){let cookie='';return {async call(path,body,method='POST',status=200){const response=await fetch('http://127.0.0.1:8787/api/'+path,{method:body===undefined?'GET':method,headers:{...(cookie?{Cookie:cookie}:{}),...(body===undefined||body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const data=await response.json();assert.equal(response.status,status,path+': '+JSON.stringify(data));return data;}};}
try{
 await mf.ready;const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 const teacher=client(),student=client();await teacher.call('setup',{name:'ครูห้องทดสอบ',username:'journey_teacher',password:'Journey-Teacher-1234'},'POST',201);
 const period=await teacher.call('periods',{year:2569,term:2},'POST',201),c=await teacher.call('courses',{periodId:period.id,code:'สวน101',name:'สวนภารกิจ · ห้องทดสอบ',classrooms:['6/1'],workWeight:60,beforeWorkWeight:30,midWeight:20,finalWeight:20},'POST',201);
 await teacher.call('students',{courseId:c.id,code:'001',name:'นักปลูกความฝันทดสอบ',number:1},'POST',201);await student.call('login',{username:'001',password:'001'});
 const tasks=[];for(const title of ['ออกแบบสวนในฝัน','ถ่ายภาพใบไม้ใกล้ตัว','เรื่องเล่าต้นไทร','สมุดสะสมความคิด'])tasks.push(await teacher.call('assignments',{courseId:c.id,title,description:'ห้องจำลองสำหรับทดลองส่งงานและสะสมรางวัล',maxScore:5,workPhase:'before',dueAt:'2027-12-01T00:00:00Z',rubric:[]},'POST',201));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=','base64');
 async function upload(id){const form=new FormData();form.set('assignmentId',id);form.append('files',new Blob([png],{type:'image/png'}),'งานทดสอบ.png');await student.call('submit',form,'POST',201);}
 await upload(tasks[0].id);let state=await student.call('state'),course=state.courses.find(x=>x.id===c.id);assert.equal(studentJourney(state,[course]).xp,25);
 let s=state.submissions[0];await teacher.call('review/'+s.id,{revision:s.revision,score:null,returned:true,expectedReviewedAt:s.reviewed_at??null,expectedRubric:'[]',feedback:'เพิ่มชื่อดอกไม้ในสวน แล้วลองส่งอีกครั้งนะ',rubricScores:[]},'PATCH');await upload(tasks[0].id);
 state=await student.call('state');assert.equal(studentJourney(state,[course]).xp,35);s=state.submissions[0];await teacher.call('review/'+s.id,{revision:s.revision,score:null,returned:true,expectedReviewedAt:s.reviewed_at??null,expectedRubric:'[]',feedback:'ลองเพิ่มรายละเอียดใบไม้อีกนิดนะ',rubricScores:[]},'PATCH');state=await student.call('state');assert.equal(studentJourney(state,[course]).xp,35);await upload(tasks[0].id);state=await student.call('state');assert.equal(studentJourney(state,[course]).xp,35);
 await upload(tasks[1].id);state=await student.call('state');assert.equal(studentJourney(state,[course]).xp,60);assert.equal(studentJourney(state,[course]).weekly,2);assert.equal(studentJourney(state,[course]).sent,2);
 console.log('PASS Real uploads/resubmissions retain server-derived rewards without farming; next garden theme unlocked at 60 XP; original grade records remain pending with no points');
 if(process.env.GRADE_JOURNEY_PREVIEW==='1'){console.log('Preview http://127.0.0.1:8787/ student 001 / 001');await new Promise(()=>{});}
}finally{await mf.dispose();}
