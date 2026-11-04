// Entirely disposable classroom; never run against a school database.
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {PNG} from 'pngjs';
await build({entryPoints:['lib/exam-entry.ts'],outfile:'.sites-runtime/exam-entry-test.mjs',bundle:true,platform:'node',format:'esm'});
const {examEntryId,examEntryHash,examEntryUrl}=await import('../.sites-runtime/exam-entry-test.mjs');
const modules=(await readdir('dist/server',{recursive:true})).filter(p=>/\.(m?js)$/.test(p)&&p!=='index.js');
const mf=new Miniflare({name:'exam-entry-qa',modules:[{type:'ESModule',path:resolve('dist/server/index.js')},...modules.map(p=>({type:'ESModule',path:resolve('dist/server',p)}))],modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'exam-entry-qa'},r2Buckets:{BUCKET:'exam-entry-qa'},assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{invoke_user_worker_ahead_of_assets:false,has_user_worker:true}},host:'127.0.0.1',port:8795});
function client(){let cookie='';return {async call(path,body,method='POST',status=200){const r=await fetch('http://127.0.0.1:8795/api/'+path,{method:body===undefined?'GET':method,headers:{Connection:'close',...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const b=await r.json();assert.equal(r.status,status,path+': '+JSON.stringify(b));return b;}};}
const teacher=client(),student=client(),outsider=client(),anonymous=client();
try{
 await mf.ready;const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();
 await teacher.call('setup',{name:'ครูทดสอบ QR เข้าสอบ',username:'exam_qr_teacher',password:'Exam-QR-Teacher-1234'},'POST',201);
 const p=await teacher.call('periods',{year:2569,term:2},'POST',201);
 const config={periodId:p.id,code:'ว30101',name:'วิทยาศาสตร์ · ห้องสอบ QR',classrooms:['6/1'],workWeight:60,beforeWorkWeight:30,midWeight:20,finalWeight:20};
 const c=await teacher.call('courses',config,'POST',201),other=await teacher.call('courses',{...config,code:'ว30102',name:'ห้องอื่น',classrooms:['6/2']},'POST',201);
 await teacher.call('students',{courseId:c.id,code:'QR001',name:'นักเรียนทดสอบการสอบ',number:1},'POST',201);await teacher.call('students',{courseId:other.id,code:'QR002',name:'นักเรียนห้องอื่น',number:1},'POST',201);
 await student.call('login',{username:'QR001',password:'QR001'});await outsider.call('login',{username:'QR002',password:'QR002'});
 const exams=[];for(const kind of ['mid','final'])exams.push(await teacher.call('exams',{courseId:c.id,kind,title:kind==='mid'?'สอบกลางภาค วิทยาศาสตร์':'สอบปลายภาค วิทยาศาสตร์',duration:20,maxScore:20,instructions:'อ่านโจทย์ให้ครบ เลือกคำตอบที่ถูกต้อง แล้วส่งเมื่อพร้อม',unlockCode:'Teacher-2468',questions:[{type:'choice',prompt:'พลังงานใดหมุนเวียนได้?',options:['พลังงานแสงอาทิตย์','ถ่านหิน'],points:20,correct:0}]},'POST',201));
 for(const [index,e] of exams.entries()){
  await anonymous.call('exam-entry/'+e.id,undefined,'GET',401);await teacher.call('exam-entry/'+e.id,undefined,'GET',403);await student.call('exam-entry/'+e.id,undefined,'GET',409);
  await teacher.call('exams/'+e.id,{status:'open'},'PATCH');await outsider.call('exam-entry/'+e.id,undefined,'GET',403);
  const entry=await student.call('exam-entry/'+e.id);assert.equal(entry.course.id,c.id);assert.equal(entry.course.classroom,'6/1');assert.equal(entry.exam.kind,index===0?'mid':'final');assert.equal(entry.attempt,null);
  assert(!/questions|correct|unlock_hash|page_token|answers|"score":/.test(JSON.stringify(entry)));
  const url=examEntryUrl('http://127.0.0.1:8795',e.id);assert.equal(examEntryHash(new URL(url).hash),e.id);assert.equal(examEntryId(e.id.toUpperCase()),e.id);
  const data=await QRCode.toDataURL(url,{width:720,margin:4,errorCorrectionLevel:'M'}),png=PNG.sync.read(Buffer.from(data.split(',')[1],'base64'));assert.equal(jsQR(new Uint8ClampedArray(png.data),png.width,png.height).data,url);
 }
 assert.equal(examEntryHash('#attendance=anything'),'');assert.equal(examEntryHash('#exam=../../api'),'');assert.equal(examEntryHash('#exam='+exams[0].id+'&extra=1'),'');assert.throws(()=>examEntryUrl('https://example.test','invalid'));
 assert.equal((await db.prepare('SELECT count(*) n FROM exam_attempts').first()).n,0);
 console.log('PASS Both QR images decode to exact exam destination; login, room, draft visibility and answer-key privacy enforced; preview never starts a timer');
 const e=exams[0],page=await student.call(`exams/${e.id}/start`,{},'POST',201),a=page.attempt;
 const preview=await student.call('exam-entry/'+e.id);assert.equal(preview.attempt.status,'active');assert(!JSON.stringify(preview).includes(a.page_token));
 const unchanged=await db.prepare('SELECT * FROM exam_attempts WHERE id=?').bind(a.id).first();assert.equal(unchanged.status,'active');assert.equal(unchanged.generation,0);assert.equal(unchanged.deadline,a.deadline);
 const reopen=await student.call(`exams/${e.id}/start`,{});assert.equal(reopen.attempt.status,'locked');assert.equal(reopen.questions.length,0);assert.equal(reopen.attempt.deadline,a.deadline);
 assert.equal((await student.call('exam-entry/'+e.id)).attempt.status,'locked');await student.call(`exam-attempts/${a.id}/unlock`,{code:'incorrect'},'POST',403);
 const resumed=await student.call(`exam-attempts/${a.id}/unlock`,{code:'Teacher-2468'});assert.equal(resumed.attempt.deadline,a.deadline);
 await student.call(`exam-attempts/${a.id}/submit`,{token:resumed.attempt.page_token,generation:resumed.attempt.generation,answers:{q0:0}});
 assert.equal((await student.call('exam-entry/'+e.id)).attempt.status,'submitted');assert.equal((await student.call(`exams/${e.id}/start`,{})).attempt.id,a.id);assert.equal((await db.prepare('SELECT count(*) n FROM exam_attempts').first()).n,1);
 assert.equal((await teacher.call('state')).enrollments.find(en=>en.student_code==='QR001').mid,null);
 console.log('PASS Re-scanning cannot reset deadlines, bypass locks, reveal answers/scores or duplicate submitted attempts; teacher PIN still required');
 const final=exams[1];await student.call('exam-entry/'+final.id);await teacher.call('exams/'+final.id,{status:'closed'},'PATCH');await student.call('exam-entry/'+final.id,undefined,'GET',409);await student.call(`exams/${final.id}/start`,{},'POST',409);await teacher.call('exams/'+final.id,{status:'open'},'PATCH');
 await db.prepare('UPDATE courses SET archived=1 WHERE id=?').bind(c.id).run();await student.call('exam-entry/'+final.id,undefined,'GET',409);await db.prepare('UPDATE courses SET archived=0 WHERE id=?').bind(c.id).run();
 await db.prepare("UPDATE courses SET course_type='activity' WHERE id=?").bind(c.id).run();await student.call('exam-entry/'+final.id,undefined,'GET',409);await db.prepare("UPDATE courses SET course_type='academic' WHERE id=?").bind(c.id).run();
 await db.prepare("UPDATE enrollments SET active=0 WHERE course_id=? AND student_code='QR001'").bind(c.id).run();await student.call('exam-entry/'+final.id,undefined,'GET',403);await db.prepare("UPDATE enrollments SET active=1,deleted=1 WHERE course_id=? AND student_code='QR001'").bind(c.id).run();await student.call('exam-entry/'+final.id,undefined,'GET',403);await db.prepare("UPDATE enrollments SET deleted=0 WHERE course_id=? AND student_code='QR001'").bind(c.id).run();
 const trash=await teacher.call('trash/preview',{kind:'exam',id:final.id}),job=await teacher.call('trash',{kind:'exam',id:final.id,signature:trash.signature});await student.call('exam-entry/'+final.id,undefined,'GET',404);await teacher.call('trash/restore',{jobId:job.jobId});
 console.log('PASS Closing after preview blocks start; archived/activity course, inactive/deleted registration and trashed exam reject entry');
 if(process.env.GRADE_EXAM_QR_PREVIEW==='1'){
  await teacher.call('students',{courseId:c.id,code:'QR004',name:'นักเรียนสแกน QR จำลอง',number:2},'POST',201);
  const fixture={url:examEntryUrl('http://127.0.0.1:8795',e.id),examId:e.id,courseId:c.id,teacher:{username:'exam_qr_teacher',password:'Exam-QR-Teacher-1234'},student:{username:'QR004',password:'QR004'}};
  await writeFile('.sites-runtime/exam-qr-fixture.json',JSON.stringify(fixture));console.log('Preview '+fixture.url);console.log('Teacher exam_qr_teacher / Exam-QR-Teacher-1234; student QR004 / QR004');
  process.on('SIGINT',async()=>{await mf.dispose();process.exit(0);});await new Promise(()=>{});
 }
}finally{await mf.dispose();}
