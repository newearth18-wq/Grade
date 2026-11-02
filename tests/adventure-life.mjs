// Private cosmetic settings, aggregate missions and real work: disposable D1/R2 only.
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const modules=(await readdir('dist/server',{recursive:true})).filter(p=>/\.(m?js)$/.test(p)&&p!=='index.js');
const mf=new Miniflare({name:'adventure-life-qa',modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...modules.map(p=>({type:'ESModule',path:resolve('dist/server',p)}))],modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'adventure-life-qa'},r2Buckets:{BUCKET:'adventure-life-qa'},assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{invoke_user_worker_ahead_of_assets:false,has_user_worker:true}},host:'127.0.0.1',port:8796});
function client(){let cookie='';return {async call(path,body,method='POST',status=200){const form=body instanceof FormData,r=await fetch('http://127.0.0.1:8796/api/'+path,{method:body===undefined?'GET':method,headers:{Connection:'close',...(cookie?{Cookie:cookie}:{}),...(body===undefined||form?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:form?body:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const b=await r.json();if(Array.isArray(status)){assert(status.includes(r.status),path+': '+JSON.stringify(b));return {...b,_status:r.status};}assert.equal(r.status,status,path+': '+JSON.stringify(b));return b;}};}
const t=client(),a=client(),b=client(),outsider=client(),anon=client();
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=','base64');
async function upload(student,id,pretty=false){const f=new FormData();f.set('assignmentId',id);f.append('files',new Blob([pretty?await readFile('public/experience/classroom-sky.webp'):png],{type:pretty?'image/webp':'image/png'}),pretty?'สวนแห่งความคิด.webp':'สวนของฉัน.png');await student.call('submit',f,'POST',201);}
try{
 await mf.ready;const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 await t.call('setup',{name:'ครูทดสอบเกาะภารกิจ',username:'adventure_teacher',password:'Adventure-Teacher-1234'},'POST',201);
 const p=await t.call('periods',{year:2569,term:2},'POST',201),config={periodId:p.id,code:'สวน101',name:'สวนแห่งการเรียนรู้',classrooms:['6/1'],workWeight:60,beforeWorkWeight:30,midWeight:20,finalWeight:20};
 const c=await t.call('courses',config,'POST',201),other=await t.call('courses',{...config,code:'สวน102',name:'ห้องอื่น',classrooms:['6/2']},'POST',201);
 for(const [student,code,courseId,name,number] of [[a,'PLAY001',c.id,'นักปลูกความฝัน',1],[b,'PLAY002',c.id,'เพื่อนร่วมทีมที่ไม่เปิดเผย',2],[outsider,'PLAY003',other.id,'นักเรียนต่างห้อง',1]]){await t.call('students',{courseId,code,name,number},'POST',201);await student.call('login',{username:code,password:code});}
 const tasks=[];for(let i=0;i<10;i++)tasks.push(await t.call('assignments',{courseId:c.id,title:['ออกแบบสวนในฝัน','เก็บภาพใบไม้','เรื่องเล่าต้นไทร','สมุดสีสัน','แผนที่สวน','ทดลองปลูกต้นไม้','บันทึกการเติบโต','บ้านของสัตว์ตัวน้อย','เพื่อนในธรรมชาติ','แบ่งปันความรู้'][i],description:'ภารกิจจำลองสำหรับตรวจระบบเกม',maxScore:3,workPhase:i<5?'before':'after',dueAt:'2027-12-01T00:00:00Z',rubric:[]},'POST',201));
 const outsideTask=await t.call('assignments',{courseId:other.id,title:'งานห้องอื่น',description:'ไม่ให้เลือกข้ามห้อง',maxScore:3,workPhase:'before',dueAt:'2027-12-01T00:00:00Z',rubric:[]},'POST',201);
 const path='island/'+c.id;await anon.call(path,undefined,'GET',401);await outsider.call(path,undefined,'GET',403);await t.call(path,undefined,'GET',403);
 let profile=(await a.call(path)).profile;assert.equal(profile.revision,0);const initialMarks=(await t.call('state')).courses.find(x=>x.id===c.id).revision;
 profile=(await a.call(path,{expectedRevision:0,companionName:'ใบแก้ว',houseColor:'mint',goalIds:[tasks[5].id,tasks[6].id]},'PATCH')).profile;
 assert.equal(profile.companionName,'ใบแก้ว');assert.equal(profile.houseColor,'mint');assert.equal((await b.call(path)).profile.companionName,'');
 await a.call(path,{expectedRevision:profile.revision,studentId:'someone',companionName:'x'},'PATCH',400);await a.call(path,{expectedRevision:profile.revision,houseColor:'bad-color'},'PATCH',400);await a.call(path,{expectedRevision:profile.revision,companionName:'x'.repeat(25)},'PATCH',400);await a.call(path,{expectedRevision:profile.revision,goalIds:[tasks[0].id,tasks[0].id]},'PATCH',400);await a.call(path,{expectedRevision:profile.revision,goalIds:[outsideTask.id]},'PATCH',400);
 const race=await Promise.all(['ใบแก้วหนึ่ง','ใบแก้วสอง'].map(companionName=>a.call(path,{expectedRevision:profile.revision,companionName},'PATCH',[200,409])));assert.deepEqual(race.map(r=>r._status).sort(),[200,409]);profile=(await a.call(path)).profile;
 assert.equal((await t.call('state')).courses.find(x=>x.id===c.id).revision,initialMarks);
 console.log('PASS Profile persists per student/course; name/color/goals validated; cross-room/anonymous/teacher spoofing blocked; concurrent edits have one winner; no grade mutation');
 for(const [i,task] of tasks.slice(0,5).entries())await upload(a,task.id,i===0);for(const task of tasks)await upload(b,task.id);
 let info=await a.call(path);assert.equal(info.challenge.expected,20);assert.equal(info.challenge.submitted,15);assert.equal(info.challenge.stage,1);
 const state=await a.call('state');assert(state.enrollments.every(e=>e.student_id===state.user.id));assert(state.submissions.every(s=>s.student_id===state.user.id));assert(state.files.every(f=>!f.student_id||f.student_id===state.user.id));assert(state.classChallenges.every(ch=>ch.course_id===c.id));assert(!JSON.stringify(state.classChallenges).includes('student_id'));assert(!JSON.stringify(state).includes('เพื่อนร่วมทีมที่ไม่เปิดเผย'));
 await a.call(path,{expectedRevision:profile.revision,goalIds:[tasks[0].id]},'PATCH',409);
 await upload(a,tasks[5].id);info=await a.call(path);assert.equal(info.challenge.percent,80);assert.equal(info.challenge.stage,2);await a.call(path+'/community',{stage:3},'POST',400);await outsider.call(path+'/community',{},'POST',403);
 info=await t.call(path+'/community',{});assert.equal(info.challenge.savedStage,2);info=await a.call(path+'/community',{});assert.equal(info.challenge.savedStage,2);
 await t.call('assignments',{courseId:c.id,title:'ภารกิจใหม่ของห้อง',description:'ไม่ริบรางวัลที่เคยได้รับ',maxScore:3,workPhase:'after',dueAt:'2027-12-01T00:00:00Z',rubric:[]},'POST',201);
 info=await a.call(path);assert.equal(info.challenge.expected,22);assert.equal(info.challenge.percent,72);assert.equal(info.challenge.stage,2);assert.equal(info.challenge.savedStage,2);
 console.log('PASS Shared missions use real aggregate uploads without exposing classmates; server computes rewards; 80% bridge persists when new work is assigned');
 let own=await a.call('state'),s=own.submissions.find(s=>s.assignment_id===tasks[0].id);
 await t.call('review/'+s.id,{revision:s.revision,score:3,returned:false,expectedReviewedAt:s.reviewed_at??null,expectedRubric:'[]',feedback:'วางองค์ประกอบได้ดี ลองเพิ่มรายละเอียดใบไม้ในงานถัดไปนะ',rubricScores:[]},'PATCH');
 s=own.submissions.find(s=>s.assignment_id===tasks[1].id);await t.call('review/'+s.id,{revision:s.revision,score:null,returned:true,expectedReviewedAt:s.reviewed_at??null,expectedRubric:'[]',feedback:'เพิ่มรายละเอียดอีกนิดแล้วส่งกลับมานะ',rubricScores:[]},'PATCH');await upload(a,tasks[1].id);
 own=await a.call('state');assert.equal(own.submissions.filter(s=>s.status==='graded').length,1);assert.equal(own.submissions.length,6);assert.equal((await a.call(path)).challenge.submitted,16);
 const key=`student_island:${own.user.id}:${c.id}`,stored=JSON.parse((await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first()).value);stored.goalDate='2000-01-01';await db.prepare('UPDATE settings SET value=? WHERE key=?').bind(JSON.stringify(stored),key).run();
 profile=(await a.call(path)).profile;assert.deepEqual(profile.goalIds,[]);profile=(await a.call(path,{expectedRevision:profile.revision,companionName:'ใบแก้ว'},'PATCH')).profile;assert.notEqual(profile.goalDate,'2000-01-01');
 await db.prepare("UPDATE enrollments SET active=0 WHERE course_id=? AND student_code='PLAY001'").bind(c.id).run();await a.call(path,undefined,'GET',403);assert.equal((await a.call('state')).classChallenges.length,0);await db.prepare("UPDATE enrollments SET active=1 WHERE course_id=? AND student_code='PLAY001'").bind(c.id).run();
 console.log('PASS Graded own-work album data, returned-work resubmission without count farming, Bangkok day goal reset, and revoked enrollment boundaries');
 if(process.env.GRADE_ADVENTURE_PREVIEW==='1'){
  const returned=(await a.call('state')).submissions.find(s=>s.assignment_id===tasks[2].id);await t.call('review/'+returned.id,{revision:returned.revision,score:null,returned:true,expectedReviewedAt:returned.reviewed_at??null,expectedRubric:'[]',feedback:'เพิ่มชื่อพันธุ์ไม้ แล้วค่อย ๆ ส่งกลับมาอีกครั้งนะ',rubricScores:[]},'PATCH');
  await writeFile('.sites-runtime/adventure-life-fixture.json',JSON.stringify({url:'http://127.0.0.1:8796/',courseId:c.id,tasks:tasks.map(t=>t.id),student:{username:'PLAY001',password:'PLAY001'},teacher:{username:'adventure_teacher',password:'Adventure-Teacher-1234'}}));
  console.log('Preview http://127.0.0.1:8796/ student PLAY001 / PLAY001; teacher adventure_teacher / Adventure-Teacher-1234');process.on('SIGINT',async()=>{await mf.dispose();process.exit(0);});await new Promise(()=>{});
 }
}finally{await mf.dispose();}
