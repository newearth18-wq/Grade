import {all,one,stmt,database,fail,uid,now,jsonBody,reply,string,integer,requireLive} from './server';
import {teacher,ownCourse,digest,type User} from './auth';

const tables:Record<string,string>={exam:'exams',examAttempt:'exam_attempts',period:'periods',subject:'subjects',course:'courses',assignment:'assignments',enrollment:'enrollments',submission:'submissions',file:'files',student:'users',extension:'extensions',profile:'sgs_profiles'};
const reusable=['exam','period','subject','course','enrollment','submission','extension'];
export const trashLabels:Record<string,string>={exam:'ข้อสอบ',examAttempt:'คำตอบสอบ',period:'ภาคเรียน',subject:'วิชา',course:'ห้องเรียน',assignment:'งานที่มอบหมาย',enrollment:'การลงทะเบียน',submission:'งานส่ง / คะแนนงาน',file:'ไฟล์',student:'บัญชีนักเรียน',extension:'กำหนดส่งรายคน',profile:'แบบส่งออก SGS'};
type Item={kind:string;id:string;row:Record<string,any>};
async function checkCourses(u:User,courses:Record<string,any>[]){
 if(u.role==='admin')return;
 const grants=new Set((await all("SELECT course_id FROM course_staff WHERE user_id=? AND permission='edit'",u.id)).map(g=>g.course_id));
 if(courses.some(c=>c.owner_id!==u.id&&!grants.has(c.id)))fail(403,'ไม่มีสิทธิ์จัดการทุกห้องในชุดนี้');
}
async function plan(u:User,kind:string,id:string){
 teacher(u);if(!tables[kind]&&kind!=='reset')fail(400,'ประเภทข้อมูลไม่ถูกต้อง');
 if(['student','reset'].includes(kind)&&u.role!=='admin')fail(403,'เฉพาะผู้ดูแลระบบลบบัญชีหรือข้อมูลทั้งหมดได้');
 const target=kind==='reset'?null:await one(`SELECT * FROM ${tables[kind]} WHERE id=?`,id);
 if(kind!=='reset'){if(!target)fail(404,'ไม่พบข้อมูล');await requireLive(kind,id);}
 if(kind==='student'&&target!.role!=='student')fail(403,'ไม่สามารถลบบัญชีครูหรือผู้ดูแลจากหน้านี้');
 if(['period','subject','profile'].includes(kind)&&target!.owner_id!==u.id&&u.role!=='admin')fail(403,'ไม่มีสิทธิ์จัดการข้อมูลนี้');
 if(kind==='profile'&&target!.owner_id!==u.id)fail(403,'แบบส่งออกเป็นข้อมูลส่วนตัวของครู');
 const hidden=new Set((await all('SELECT kind,record_id FROM trash_entries')).map(t=>`${t.kind}:${t.record_id}`));
 const items:Item[]=[];const seen=new Set<string>();
 const add=(k:string,row:any)=>{const key=`${k}:${row.id}`;if(!hidden.has(key)&&!seen.has(key)){seen.add(key);items.push({kind:k,id:row.id,row});}};
 let cs:Record<string,any>[]=[];
 if(kind==='reset')cs=await all('SELECT * FROM courses');
 else if(kind==='period')cs=await all('SELECT * FROM courses WHERE period_id=?',id);
 else if(kind==='subject')cs=await all('SELECT * FROM courses WHERE subject_id=?',id);
 else if(kind==='course')cs=[target!];
 else if(kind==='exam'||kind==='assignment'||kind==='enrollment'||kind==='file')cs=[await one('SELECT * FROM courses WHERE id=?',target!.course_id) as Record<string,any>];
 else if(kind==='submission'||kind==='extension')cs=await all('SELECT c.* FROM courses c JOIN assignments a ON a.course_id=c.id WHERE a.id=?',target!.assignment_id);
 else if(kind==='student')cs=await all('SELECT DISTINCT c.* FROM courses c JOIN enrollments e ON e.course_id=c.id WHERE e.student_id=?',id);
 if(kind==='examAttempt')cs=await all('SELECT c.* FROM courses c JOIN exams e ON e.course_id=c.id WHERE e.id=?',target!.exam_id);
 // Restoration and deletion both check actual permissions, including hidden descendants.
 await checkCourses(u,cs);
 if(target)add(kind,target);
 const full=['reset','period','subject','course'].includes(kind);
 if(full){
  if(kind==='reset'){
   for(const p of await all('SELECT * FROM periods'))add('period',p);
   for(const s of await all('SELECT * FROM subjects'))add('subject',s);
   for(const s of await all("SELECT * FROM users WHERE role='student'"))add('student',s);
  }else if(kind==='period')for(const s of await all('SELECT * FROM subjects WHERE period_id=?',id))add('subject',s);
  for(const c of cs)add('course',c);
 }
 if(cs.length){
  const courseIds=JSON.stringify(cs.map(c=>c.id));
  const examRows=await all('SELECT * FROM exams WHERE course_id IN(SELECT value FROM json_each(?))',courseIds);
  if(full||kind==='exam')for(const e of examRows)if(full||e.id===id)add('exam',e);
  if(full||['exam','examAttempt','student','enrollment'].includes(kind)){const studentId=kind==='student'?id:kind==='enrollment'?target!.student_id:null;for(const a of await all('SELECT a.* FROM exam_attempts a JOIN exams e ON e.id=a.exam_id WHERE e.course_id IN(SELECT value FROM json_each(?))',courseIds))if((full||kind==='exam'&&a.exam_id===id||kind==='examAttempt'&&a.id===id||studentId&&a.student_id===studentId))add('examAttempt',a);}
  const tasks=await all('SELECT * FROM assignments WHERE course_id IN(SELECT value FROM json_each(?))',courseIds);
  if(full)for(const a of tasks)add('assignment',a);
  if(full||kind==='student')for(const e of await all('SELECT * FROM enrollments WHERE course_id IN(SELECT value FROM json_each(?))'+(kind==='student'?' AND student_id=?':''),courseIds,...(kind==='student'?[id]:[])))add('enrollment',e);
  const taskIds=new Set(tasks.filter(a=>full||kind==='assignment'&&a.id===id||['enrollment','student'].includes(kind)||kind==='submission'&&a.id===target!.assignment_id).map(a=>a.id));
  const studentId=kind==='student'?id:kind==='enrollment'?target!.student_id:kind==='submission'?target!.student_id:null;
  for(const s of await all('SELECT s.* FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.course_id IN(SELECT value FROM json_each(?))',courseIds))if(taskIds.has(s.assignment_id)&&(!studentId||s.student_id===studentId))add('submission',s);
  for(const f of await all('SELECT * FROM files WHERE course_id IN(SELECT value FROM json_each(?))',courseIds))if(taskIds.has(f.assignment_id)&&(!studentId||f.student_id===studentId))add('file',f);
  for(const x of await all('SELECT x.* FROM extensions x JOIN assignments a ON a.id=x.assignment_id WHERE a.course_id IN(SELECT value FROM json_each(?))',courseIds))if(kind!=='submission'&&taskIds.has(x.assignment_id)&&(!studentId||x.student_id===studentId))add('extension',x);
 }
 items.sort((a,b)=>`${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));
 const counts:Record<string,number>={};for(const i of items)counts[i.kind]=(counts[i.kind]||0)+1;
 if(!items.length)fail(409,'ไม่มีข้อมูลที่ยังใช้งานอยู่ให้ลบ');
 const title=kind==='reset'?'ข้อมูลการเรียนทั้งหมด':kind==='period'?`ปี ${target!.year} เทอม ${target!.term}`:target!.title||target!.name||target!.student_code||trashLabels[kind];
 const signature=await digest(JSON.stringify({items,cs}));
 return {items,cs,title,counts,signature};
}
async function restore(u:User,id:string){
 teacher(u);const job=await one('SELECT * FROM trash_jobs WHERE id=?',id);
 if(!job||job.restored_at)fail(404,'ไม่พบรายการในถังขยะ');
 if(job.actor_id!==u.id&&u.role!=='admin')fail(403,'ไม่มีสิทธิ์กู้คืนรายการนี้');
 if(['student','reset'].includes(job.kind)&&u.role!=='admin')fail(403,'เฉพาะผู้ดูแลระบบกู้คืนรายการนี้ได้');
 const entries=await all('SELECT * FROM trash_entries WHERE job_id=?',id);
 const included=new Set(entries.map(e=>`${e.kind}:${e.record_id}`));
 const hidden=new Set((await all('SELECT kind,record_id FROM trash_entries')).map(e=>`${e.kind}:${e.record_id}`));
 const check=(k:string,v:string|null)=>{if(v&&!included.has(`${k}:${v}`)&&hidden.has(`${k}:${v}`))fail(404,'ข้อมูลต้นทางอยู่ในถังขยะ กรุณากู้คืนต้นทางก่อน');};
 const rows=new Map<string,Record<string,any>>();
 for(const kind of new Set<string>(entries.map(e=>e.kind))){for(const row of await all(`SELECT * FROM ${tables[kind]} WHERE id IN(SELECT value FROM json_each(?))`,JSON.stringify(entries.filter(e=>e.kind===kind).map(e=>e.record_id))))rows.set(`${kind}:${row.id}`,row);}
 const parentTasks=new Map((await all('SELECT id,course_id FROM assignments WHERE id IN(SELECT value FROM json_each(?))',JSON.stringify([...rows.values()].filter(r=>r.assignment_id).map(r=>r.assignment_id)))).map(a=>[a.id,a]));
 const affected=new Set<string>();
 for(const e of entries){const row=rows.get(`${e.kind}:${e.record_id}`);if(!row)fail(409,'ข้อมูลต้นฉบับไม่ครบ กรุณาตรวจสอบชุดสำรอง');
  if(e.kind==='subject')await check('period',row!.period_id);
  if(e.kind==='course'){await check('period',row!.period_id);await check('subject',row!.subject_id);affected.add(row!.id);}
  if(['exam','assignment','enrollment','file'].includes(e.kind)){await check('course',row!.course_id);affected.add(row!.course_id);}
  if(['submission','extension','file'].includes(e.kind))await check('assignment',row!.assignment_id);
  if(['examAttempt','enrollment','submission','extension','file'].includes(e.kind))await check('student',row!.student_id);
  if(e.kind==='examAttempt'){check('exam',row!.exam_id);check('enrollment',row!.enrollment_id);const parent=await one('SELECT course_id FROM exams WHERE id=?',row!.exam_id);if(parent)affected.add(parent.course_id);}
  if(e.kind==='submission'||e.kind==='extension'){const a=parentTasks.get(row!.assignment_id);if(a)affected.add(a.course_id);}
  if(['period','subject','profile'].includes(e.kind)&&row!.owner_id!==u.id&&u.role!=='admin')fail(403,'ไม่มีสิทธิ์กู้คืนข้อมูลนี้');
 }
 const courseIds=JSON.stringify([...affected]);
 const parentEnrollments=await all('SELECT id,course_id,student_id FROM enrollments WHERE course_id IN(SELECT value FROM json_each(?))',courseIds);
 for(const e of entries){const row=rows.get(`${e.kind}:${e.record_id}`)!;if(['submission','extension','file'].includes(e.kind)&&row.student_id){const courseId=parentTasks.get(row.assignment_id)?.course_id;const enrolls=parentEnrollments.filter(x=>x.course_id===courseId&&x.student_id===row.student_id);if(enrolls.length&&!enrolls.some(x=>included.has(`enrollment:${x.id}`)||!hidden.has(`enrollment:${x.id}`)))fail(404,'การลงทะเบียนอยู่ในถังขยะ กรุณากู้คืนก่อน');}}
 await checkCourses(u,await all('SELECT * FROM courses WHERE id IN(SELECT value FROM json_each(?))',courseIds));
 const statements=[...reusable.map(k=>stmt(`UPDATE ${tables[k]} SET deleted=0 WHERE id IN(SELECT record_id FROM trash_entries WHERE job_id=? AND kind=?)`,id,k)),stmt('DELETE FROM trash_entries WHERE job_id=?',id),stmt('UPDATE trash_jobs SET restored_at=? WHERE id=? AND restored_at IS NULL',now(),id),stmt("UPDATE courses SET published=0,revision=revision+1 WHERE id IN(SELECT value FROM json_each(?))",courseIds),stmt('INSERT INTO audit(id,actor_id,course_id,action,detail,created_at) VALUES(?,?,NULL,?,?,?)',uid(),u.id,'trash_restore',JSON.stringify({jobId:id,title:job.title}),now())];
 try{await database().batch(statements);}catch{fail(409,'มีข้อมูลรหัสหรือชื่อเดียวกันสร้างใหม่อยู่ กรุณาย้ายรายการใหม่เข้าถังขยะก่อนกู้คืนชุดเดิม');}return reply({ok:true});
}
export async function trashRoute(r:Request,u:User,path:string,method:string){
 if(path==='trash'&&method==='GET'){teacher(u);return reply({jobs:await all('SELECT * FROM trash_jobs WHERE restored_at IS NULL'+(u.role==='admin'?'':' AND actor_id=?')+' ORDER BY created_at DESC',...(u.role==='admin'?[]:[u.id]))});}
 if(path==='trash/restore'&&method==='POST'){const b=await jsonBody(r);return restore(u,string(b.jobId,'รายการถังขยะ',100));}
 if(['trash/preview','trash'].includes(path)&&method==='POST'){
  const b=await jsonBody(r),kind=string(b.kind,'ประเภทข้อมูล',30),id=kind==='reset'?'all':string(b.id,'รหัสข้อมูล',100);const p=await plan(u,kind,id);
  if(path==='trash/preview')return reply({title:p.title,counts:p.counts,signature:p.signature});
  if(b.signature!==p.signature)fail(409,'ข้อมูลเปลี่ยนหลังเปิดคำยืนยัน กรุณาปิดแล้วตรวจจำนวนข้อมูลใหม่');
  const jobId=uid(),time=now();
  const revisions=JSON.stringify(p.cs.map(c=>({id:c.id,revision:c.revision})));const guard="NOT EXISTS(SELECT 1 FROM json_each(?) j LEFT JOIN courses c ON c.id=json_extract(j.value,'$.id') WHERE c.id IS NULL OR c.revision!=json_extract(j.value,'$.revision'))";
  try{await database().batch([
   stmt(`INSERT INTO trash_jobs(id,actor_id,kind,target_id,title,counts,created_at) SELECT ?,?,?,?,?,?,? WHERE ${guard}`,jobId,u.id,kind,id,p.title,JSON.stringify(p.counts),time,revisions),
   stmt("INSERT INTO trash_entries(kind,record_id,job_id) SELECT json_extract(value,'$.kind'),json_extract(value,'$.id'),? FROM json_each(?) WHERE EXISTS(SELECT 1 FROM trash_jobs WHERE id=?)",jobId,JSON.stringify(p.items.map(i=>({kind:i.kind,id:i.id}))),jobId),
   ...reusable.map(k=>stmt(`UPDATE ${tables[k]} SET deleted=1 WHERE id IN(SELECT record_id FROM trash_entries WHERE job_id=? AND kind=?)`,jobId,k)),
   stmt("UPDATE courses SET published=0,revision=revision+1 WHERE id IN(SELECT json_extract(value,'$.id') FROM json_each(?)) AND EXISTS(SELECT 1 FROM trash_jobs WHERE id=?)",JSON.stringify(p.cs.map(c=>({id:c.id}))),jobId),
   stmt("DELETE FROM sessions WHERE user_id IN(SELECT record_id FROM trash_entries WHERE job_id=? AND kind='student')",jobId),
   stmt("INSERT INTO audit(id,actor_id,course_id,action,detail,created_at) SELECT ?,?,NULL,?,?,? WHERE EXISTS(SELECT 1 FROM trash_jobs WHERE id=?)",uid(),u.id,'trash_delete',JSON.stringify({jobId,kind,title:p.title,counts:p.counts}),time,jobId)
  ]);}catch{fail(409,'ข้อมูลมีการเปลี่ยนแปลง กรุณาเปิดคำยืนยันใหม่');}
  if(!await one('SELECT id FROM trash_jobs WHERE id=?',jobId))fail(409,'ข้อมูลเปลี่ยนระหว่างลบ กรุณาลองใหม่');return reply({ok:true,jobId});
 }
 if(path.startsWith('periods/')&&method==='PATCH'){
  teacher(u);const id=path.slice(8);await requireLive('period',id);const p=await one('SELECT * FROM periods WHERE id=?',id);if(!p)fail(404,'ไม่พบภาคเรียน');if(p.owner_id!==u.id&&u.role!=='admin')fail(403,'เฉพาะเจ้าของภาคเรียนแก้ไขได้');
  const b=await jsonBody(r);try{await stmt('UPDATE periods SET year=?,term=? WHERE id=?',integer(b.year,'ปีการศึกษา',2500,2700),integer(b.term,'เทอม',1,3),id).run();}catch(e){if((e as Error).message.includes('UNIQUE'))fail(409,'มีปีการศึกษาและเทอมนี้อยู่แล้ว รวมถึงรายการในถังขยะ');throw e;}return reply({id});
 }
 if(path.startsWith('files/')&&method==='PATCH'){
  teacher(u);const id=path.slice(6);await requireLive('file',id);const f=await one('SELECT * FROM files WHERE id=?',id);if(!f)fail(404,'ไม่พบไฟล์');await ownCourse(u,f.course_id,true);const b=await jsonBody(r);const name=string(b.name,'ชื่อไฟล์',200);if(/[\x00-\x1f\x7f/\\]/.test(name))fail(400,'ชื่อไฟล์ไม่ถูกต้อง');await database().batch([stmt('UPDATE files SET name=? WHERE id=?',name,id),stmt('UPDATE courses SET revision=revision+1 WHERE id=?',f.course_id)]);return reply({ok:true});
 }
 if(path.startsWith('student-accounts/')&&method==='PATCH'){
  if(u.role!=='admin')fail(403,'เฉพาะผู้ดูแลระบบแก้ไขบัญชีนักเรียนได้');const id=path.slice(17);await requireLive('student',id);const student=await one("SELECT id FROM users WHERE id=? AND role='student'",id);if(!student)fail(404,'ไม่พบบัญชีนักเรียน');const b=await jsonBody(r);await stmt('UPDATE users SET name=? WHERE id=?',string(b.name,'ชื่อบัญชี',100),id).run();return reply({ok:true});
 }
 if(path.startsWith('sgs-profiles/')&&method==='PATCH'){
  teacher(u);const id=path.slice(13);await requireLive('profile',id);const p=await one('SELECT id FROM sgs_profiles WHERE id=? AND owner_id=?',id,u.id);if(!p)fail(404,'ไม่พบแบบส่งออกของคุณ');const b=await jsonBody(r);await stmt('UPDATE sgs_profiles SET name=? WHERE id=?',string(b.name,'ชื่อแบบส่งออก',100),id).run();return reply({ok:true});
 }
 return null;
}
