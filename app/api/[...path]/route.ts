import { all, one, stmt, database, bucket, HttpError, fail, uid, now, string, number, integer, jsonBody, reply, ensureSameOrigin, log,requireLive,isTrashed } from '@/lib/server';
import { currentUser, requireUser, teacher, ownCourse, hashPassword, matches, passwordValid, session, cookie, digest, upgradeStudentInitialPassword, type User } from '@/lib/auth';
import {createSections,subjectRoute} from '@/lib/subjects-server';
import {teacherRoute} from '@/lib/teacher-server';
import {snapshotsRoute,snapshotCourse} from '@/lib/snapshots-server';
import {publicationCheck} from '@/lib/teacher-logic';
import {groupRoute,submissionGroup} from '@/lib/groups-server';
import { getState } from '@/lib/state';
import {trashRoute} from '@/lib/trash-server';
import {examRoute} from '@/lib/exam-server';
import { extendedRoute } from '@/lib/extended-server';
import { parseRubric,validateRubric,rubricScore } from '@/lib/rubrics';
import { calculateGrade } from '@/lib/grades';
export const dynamic='force-dynamic';

async function assignmentAccess(u:User,id:string,write=false){await requireLive('assignment',id);const a=await one('SELECT * FROM assignments WHERE id=?',id);if(!a)fail(404,'ไม่พบงาน');const c=await ownCourse(u,a!.course_id,write);return {a:a!,c};}
async function openCourse(u:User,id:string){const c=await ownCourse(u,id,true);if(c.archived)fail(409,'รายวิชานี้เก็บเข้าประวัติแล้ว');return c;}
async function fileBytes(f:File){
 if(f.size<=0||f.size>10*1024*1024)fail(400,'แต่ละไฟล์ต้องมีขนาด 1 ไบต์–10 MB');
 const data=await f.arrayBuffer();const b=new Uint8Array(data);let mime='';
 if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)mime='image/jpeg';
 else if(b.slice(0,8).join(',')==='137,80,78,71,13,10,26,10')mime='image/png';
 else if(new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP')mime='image/webp';
 else if(new TextDecoder().decode(b.slice(0,5))==='%PDF-')mime='application/pdf';
 else if(b[0]===80&&b[1]===75&&b[2]===3&&b[3]===4){if(/\.docx$/i.test(f.name))mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';if(/\.xlsx$/i.test(f.name))mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';}
 if(!mime)fail(400,'รองรับรูป JPG, PNG, WEBP และไฟล์ PDF, DOCX, XLSX เท่านั้น');
 return {data,mime};
}
async function saveUploads(form:FormData,a:any,u:User,revision:number,sample=false){
 const incoming=form.getAll('files').filter((f):f is File=>f instanceof File);if(incoming.length>5)fail(400,'แนบได้ไม่เกิน 5 ไฟล์ต่อครั้ง');if(!sample&&incoming.length===0)fail(400,'กรุณาแนบรูปหรือไฟล์งาน');
 if(incoming.reduce((n,f)=>n+f.size,0)>25*1024*1024)fail(413,'ไฟล์รวมต้องไม่เกิน 25 MB');
 const validated=[];for(const f of incoming)validated.push({f,...await fileBytes(f)});
 const saved:any[]=[];
 try{for(const {f,data,mime} of validated){const id=uid();await bucket().put(id,data,{httpMetadata:{contentType:mime}});saved.push({id,course_id:a.course_id,assignment_id:a.id,student_id:sample?null:u.id,revision,name:f.name.replace(/[\x00-\x1f\x7f]/g,'').slice(0,200),mime,size:f.size,created_at:now()});}return saved;}catch(e){await Promise.all(saved.map(f=>bucket().delete(f.id)));throw e;}
}
function invalidateCourse(id:string){return stmt('UPDATE courses SET published=0,grading_mode=\'points\',revision=revision+1 WHERE id=?',id);}
function insertFile(f:any){return stmt('INSERT INTO files (id,course_id,assignment_id,student_id,revision,name,mime,size,created_at) VALUES (?,?,?,?,?,?,?,?,?)',f.id,f.course_id,f.assignment_id,f.student_id,f.revision,f.name,f.mime,f.size,f.created_at);}
async function handle(r:Request){
 const path=new URL(r.url).pathname.replace(/^\/api\//,'').replace(/\/$/,'');const method=r.method;
 if(method!=='GET')ensureSameOrigin(r);
 if(path==='auth'&&method==='GET'){const user=await currentUser(r);const setup=!(await one('SELECT value FROM settings WHERE key=?','bootstrap'));return reply({user,setup});}
 if(path==='setup'&&method==='POST'){
  const b=await jsonBody(r);const name=string(b.name,'ชื่อครู',100);const username=string(b.username,'ชื่อผู้ใช้',40);if(!/^[a-zA-Z0-9_.-]{3,40}$/.test(username))fail(400,'ชื่อผู้ใช้ต้องมี 3–40 ตัวอักษรอังกฤษ ตัวเลข หรือ . _ -');
  if(await one('SELECT value FROM settings WHERE key=?','bootstrap'))fail(409,'ระบบมีบัญชีครูแล้ว กรุณาเข้าสู่ระบบ');
  const password=await hashPassword(passwordValid(b.password));const id=uid();
  try{await database().batch([stmt('INSERT INTO settings (key,value) VALUES (?,?)','bootstrap',id),stmt('INSERT INTO users (id,username,name,role,password,active,must_change,created_at) VALUES (?,?,?,?,?,1,0,?)',id,username,name,'admin',password,now())]);}catch{fail(409,'ระบบได้รับการตั้งค่าแล้ว กรุณาเข้าสู่ระบบ');}
  return reply({ok:true},201,{'Set-Cookie':await session(r,id)});
 }
 if(path==='login'&&method==='POST'){
  const b=await jsonBody(r);const username=string(b.username,'ชื่อผู้ใช้',40);const p=typeof b.password==='string'?b.password:'';if(p.length>128)fail(400,'รหัสผ่านไม่ถูกต้อง');
  const key=await digest((r.headers.get('cf-connecting-ip')||'local')+':'+username.toLowerCase());
  await stmt('INSERT INTO login_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END, expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END',key,Date.now()+900000,Date.now(),Date.now()).run();
  const limit=await one('SELECT count FROM login_limits WHERE key=?',key);if(limit!.count>10)fail(429,'ลองเข้าสู่ระบบหลายครั้ง กรุณารอ 15 นาที');
  let user=await one('SELECT * FROM users WHERE username=? AND active=1',username);
  if(user?.role==='student'&&await isTrashed('student',user.id))user=null;
  if(user?.role==='student'&&user.must_change){await upgradeStudentInitialPassword(user as User);user=await one('SELECT * FROM users WHERE username=? AND active=1',username);}
  if(user?.role==='student'&&await isTrashed('student',user.id))user=null;
  const valid=await matches(p,user?.password||'00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000');if(!valid||!user)fail(401,'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  await stmt('DELETE FROM login_limits WHERE key=?',key).run();return reply({ok:true},200,{'Set-Cookie':await session(r,user!.id)});
 }
 const u=await requireUser(r);
 if(path==='logout'&&method==='POST'){const token=r.headers.get('cookie')?.match(/(?:^|;\s*)grade_session=([^;]+)/)?.[1];if(token)await stmt('DELETE FROM sessions WHERE token=?',await digest(token)).run();return reply({ok:true},200,{'Set-Cookie':cookie(r,'',0)});}
 if(path==='password'&&method==='POST'){
  const b=await jsonBody(r);const row=await one('SELECT password FROM users WHERE id=?',u.id);if(typeof b.oldPassword!=='string'||!await matches(b.oldPassword,row!.password))fail(403,'รหัสผ่านเดิมไม่ถูกต้อง');
  const hash=await hashPassword(passwordValid(b.password));await database().batch([stmt('UPDATE users SET password=?,must_change=0 WHERE id=?',hash,u.id),stmt('DELETE FROM sessions WHERE user_id=?',u.id)]);return reply({ok:true},200,{'Set-Cookie':await session(r,u.id)});
 }
 if(u.must_change)fail(403,'กรุณาเปลี่ยนรหัสผ่านชั่วคราวก่อนใช้งาน');
 const teacherResponse=await teacherRoute(r,u,path,method);if(teacherResponse)return teacherResponse;
 const snapshotResponse=await snapshotsRoute(r,u,path,method);if(snapshotResponse)return snapshotResponse;
 const groupResponse=await groupRoute(r,u,path,method);if(groupResponse)return groupResponse;
 const examResponse=await examRoute(r,u,path,method);if(examResponse)return examResponse;
 const trashResponse=await trashRoute(r,u,path,method);if(trashResponse)return trashResponse;
 const subjectResponse=await subjectRoute(r,u,path,method);if(subjectResponse)return subjectResponse;
 const extra=await extendedRoute(r,u,path,method);if(extra)return extra;
 if(path==='state'&&method==='GET')return reply(await getState(u));
 if(path.startsWith('file/')&&method==='GET'){
  await requireLive('file',path.slice(5));const f=await one('SELECT * FROM files WHERE id=?',path.slice(5));if(!f)fail(404,'ไม่พบไฟล์');await ownCourse(u,f!.course_id);if(u.role==='student'&&f!.student_id&&f!.student_id!==u.id)fail(403,'ไม่มีสิทธิ์ดูไฟล์นักเรียนคนอื่น');await requireLive('assignment',f!.assignment_id);if(f!.student_id){await requireLive('student',f!.student_id);if(!await one('SELECT s.id FROM submissions s JOIN enrollments e ON e.student_id=s.student_id AND e.course_id=? WHERE s.assignment_id=? AND s.student_id=? AND s.deleted=0 AND e.deleted=0',f!.course_id,f!.assignment_id,f!.student_id))fail(404,'ไฟล์อยู่ในข้อมูลที่ลบแล้ว');}
  const obj=await bucket().get(f!.id);if(!obj)fail(404,'ไม่พบไฟล์');const inline=f!.mime.startsWith('image/')||f!.mime==='application/pdf';
  return new Response(obj.body,{headers:{'Content-Type':f!.mime,'Content-Length':String(f!.size),'Content-Disposition':`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(f!.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }
 if(path==='periods'&&method==='POST'){teacher(u);const b=await jsonBody(r);const year=integer(b.year,'ปีการศึกษา',2500,2700);const term=integer(b.term,'เทอม',1,3);const id=uid();try{await stmt('INSERT INTO periods (id,owner_id,year,term) VALUES (?,?,?,?)',id,u.id,year,term).run();}catch{fail(409,'มีปีการศึกษาและเทอมนี้แล้ว');}return reply({id},201);}
 if(path==='courses'&&method==='POST'){teacher(u);return reply(await createSections(u,await jsonBody(r)),201);}
 if(path.startsWith('courses/')&&method==='PATCH'){
  teacher(u);const id=path.slice(8);const c=await ownCourse(u,id,true);const b=await jsonBody(r);
  if(typeof b.published==='boolean'){if(c.archived)fail(409,'รายวิชานี้เก็บเข้าประวัติแล้ว');
   if(b.published){const state=await getState(u);const check=publicationCheck(state,c);if(check.unallocated>0&&!b.acknowledgeUnallocated)fail(409,`ยังจัดสรรคะแนนงานไม่ครบ ${check.unallocated} คะแนน กรุณาตรวจแผนและยืนยันก่อนเผยแพร่`);const enrolls=state.enrollments.filter(e=>e.course_id===id&&e.active);if(!enrolls.length)fail(409,'ยังไม่มีนักเรียน');if(enrolls.some(e=>!calculateGrade({...c,archived:0},state.assignments,state.submissions,e).budgetValid))fail(409,'คะแนนเต็มของงานเกินคะแนนเก็บก่อนหรือหลังกลางภาค กรุณาปรับหมวดงานหรือคะแนนเก็บ');if(enrolls.some(e=>!calculateGrade(c,state.assignments,state.submissions,e).complete))fail(409,'ตรวจงานที่ส่งให้ครบและกรอกคะแนนสอบ/คะแนนส่วนบุคคลและเช็กชื่อกิจกรรมก่อนเผยแพร่ หรือระบุสถานะ ร / มส');}
   const changed=await stmt('UPDATE courses SET published=?,grading_mode=\'points\' WHERE id=? AND revision=?',b.published?1:0,id,c.revision).run();if(!changed.meta.changes)fail(409,'ข้อมูลเปลี่ยนระหว่างเผยแพร่ กรุณาตรวจสอบแล้วลองใหม่');await log(u.id,id,'publication',{published:b.published});
  }else if(typeof b.archived==='boolean'){await stmt('UPDATE courses SET archived=?,published=0,grading_mode=\'points\',revision=revision+1 WHERE id=?',b.archived?1:0,id).run();}
  else{if(c.subject_id&&(b.code!==c.code||b.name!==c.name))fail(409,'แก้ชื่อหรือรหัสวิชาในหน้ารายวิชารวม เพื่อให้ทุกห้องตรงกัน');const w=number(b.workWeight,'คะแนนเก็บ'),before=number(b.beforeWorkWeight??w/2,'คะแนนเก็บก่อนกลางภาค',0,w),m=number(b.midWeight,'กลางภาค'),f=number(b.finalWeight,'ปลายภาค');const type=b.courseType??c.course_type??'academic',threshold=number(b.passThreshold??c.pass_threshold??50,'เกณฑ์ผ่าน');if(!['academic','activity'].includes(type))fail(400,'ประเภทวิชาไม่ถูกต้อง');if(type==='activity'&&(w!==100||m!==0||f!==0))fail(400,'วิชากิจกรรมใช้คะแนนกิจกรรม 100 และไม่มีสอบ');if(type!==c.course_type&&await one('SELECT id FROM exams WHERE course_id=? AND deleted=0',id))fail(409,'มีข้อสอบอยู่ ต้องย้ายข้อสอบเข้าถังขยะก่อนเปลี่ยนประเภทวิชา');if(w+m+f!==100)fail(400,'สัดส่วนคะแนนต้องรวมเป็น 100');if(await one('SELECT id FROM enrollments WHERE course_id=? AND deleted=0 AND (mid>? OR final>?)',id,m,f))fail(409,'คะแนนสอบเดิมเกินสัดส่วนใหม่');await stmt('UPDATE courses SET code=?,name=?,classroom=?,work_weight=?,mid_weight=?,final_weight=?,before_work_weight=?,course_type=?,pass_threshold=?,published=0,grading_mode=\'points\',revision=revision+1 WHERE id=?',string(b.code,'รหัสวิชา',30),string(b.name,'ชื่อวิชา',100),string(b.classroom,'ห้องเรียน',40),w,m,f,before,type,threshold,id).run();}
  return reply({ok:true});
 }
 if(path==='students'&&method==='POST'){
  teacher(u);const b=await jsonBody(r);await openCourse(u,string(b.courseId,'รายวิชา'));const code=string(b.code,'รหัสนักเรียน',40);if(!/^[a-zA-Z0-9_.-]{1,40}$/.test(code))fail(400,'รหัสนักเรียนต้องเป็นตัวเลขหรือตัวอักษรอังกฤษ');const name=string(b.name,'ชื่อนักเรียน',100);const n=integer(b.number,'เลขที่',1,999);
  let student=await one('SELECT * FROM users WHERE username=?',code);if(student)await requireLive('student',student.id);if(student&&student.role!=='student')fail(409,'รหัสนี้เป็นบัญชีครู');
  const ops=[];let initialPassword:string|null=null;
  if(!student){const id=uid();initialPassword=code;ops.push(stmt('INSERT INTO users (id,username,name,role,password,active,must_change,created_at) VALUES (?,?,?,?,?,1,0,?)',id,code,name,'student',await hashPassword(initialPassword),now()));student={id};}
  ops.push(stmt('INSERT INTO enrollments (id,course_id,student_id,student_code,name,number,active,special) VALUES (?,?,?,?,?,?,1,?)',uid(),b.courseId,student.id,code,name,n,''));
  try{await database().batch([...ops,invalidateCourse(b.courseId)]);}catch{fail(409,'นักเรียนคนนี้ลงทะเบียนรายวิชานี้แล้ว');}
  return reply({ok:true,code,initialPassword},201);
 }
 if(path.startsWith('enrollments/')&&method==='PATCH'){
  teacher(u);const id=path.slice(12);await requireLive('enrollment',id);const e=await one('SELECT * FROM enrollments WHERE id=?',id);if(!e)fail(404,'ไม่พบนักเรียน');const c=await openCourse(u,e!.course_id);const b=await jsonBody(r);
  if(b.resetPassword){if(u.role!=='admin')fail(403,'เฉพาะผู้ดูแลระบบตั้งรหัสผ่านนักเรียนได้');const account=await one('SELECT username FROM users WHERE id=?',e!.student_id);if(!account)fail(404,'ไม่พบบัญชีนักเรียน');const password=account!.username;await database().batch([stmt('UPDATE users SET password=?,must_change=0 WHERE id=?',await hashPassword(password),e!.student_id),stmt('DELETE FROM sessions WHERE user_id=?',e!.student_id)]);await log(u.id,c.id,'reset_password',{studentId:e!.student_id});return reply({ok:true,code:password,initialPassword:password});}
  if(c.course_type==='activity'&&('mid' in b||'final' in b))fail(409,'วิชากิจกรรมไม่มีคะแนนสอบ');
  if('mid' in b||'final' in b||'special' in b){const mid='mid' in b?(b.mid===null?null:number(b.mid,'กลางภาค',0,c.mid_weight)):e!.mid;const final='final' in b?(b.final===null?null:number(b.final,'ปลายภาค',0,c.final_weight)):e!.final;const special='special' in b?(typeof b.special==='string'?b.special:''):e!.special;if(!['','ร','มส'].includes(special))fail(400,'สถานะผลการเรียนไม่ถูกต้อง');const columns:string[]=[];const values:unknown[]=[];if('mid' in b){columns.push('mid=?');values.push(mid);}if('final' in b){columns.push('final=?');values.push(final);}if('special' in b){columns.push('special=?');values.push(special);}await database().batch([stmt('UPDATE enrollments SET '+columns.join(',')+' WHERE id=?',...values,id),invalidateCourse(c.id)]);await log(u.id,c.id,'exam_scores',{enrollment:id,before:{mid:e!.mid,final:e!.final,special:e!.special},mid,final,special});}
  else{await database().batch([stmt('UPDATE enrollments SET name=?,number=?,active=? WHERE id=?',string(b.name,'ชื่อนักเรียน',100),integer(b.number,'เลขที่',1,999),b.active===false?0:1,id),invalidateCourse(c.id)]);}
  return reply({ok:true});
 }
 if(path==='enroll-existing'&&method==='POST'){
  teacher(u);const b=await jsonBody(r);await openCourse(u,b.courseId);const e=await one('SELECT * FROM enrollments WHERE id=?',b.enrollmentId);if(!e)fail(404,'ไม่พบข้อมูลเดิม');await requireLive('enrollment',e!.id);await requireLive('student',e!.student_id);await ownCourse(u,e!.course_id);try{await database().batch([stmt('INSERT INTO enrollments (id,course_id,student_id,student_code,name,number,active,special) VALUES (?,?,?,?,?,?,1,?)',uid(),b.courseId,e!.student_id,e!.student_code,e!.name,e!.number,''),invalidateCourse(b.courseId)]);}catch{fail(409,'นักเรียนคนนี้ลงทะเบียนแล้ว');}return reply({ok:true});
 }
 if(path==='import'&&method==='POST'){
  teacher(u);const b=await jsonBody(r);await openCourse(u,b.courseId);if(!Array.isArray(b.rows)||b.rows.length===0||b.rows.length>100)fail(400,'นำเข้าได้ครั้งละ 1–100 คน');
  const seen=new Set<string>();const rows=b.rows.map((row:any)=>{const code=string(row.code,'รหัสนักเรียน',40);if(!/^[a-zA-Z0-9_.-]{1,40}$/.test(code)||seen.has(code))fail(400,`รหัส ${code} ไม่ถูกต้องหรือซ้ำในไฟล์`);seen.add(code);return {code,name:string(row.name,'ชื่อ',100),number:integer(row.number,'เลขที่',1,999)};});
  const credentials=[];const ops=[];const existingUsers=new Map((await all('SELECT id,username,role FROM users')).map(s=>[s.username,s]));const registered=new Set((await all('SELECT student_code FROM enrollments WHERE course_id=? AND deleted=0',b.courseId)).map(e=>e.student_code));
  for(const row of rows){let s=existingUsers.get(row.code);if(s)await requireLive('student',s.id);if(s&&s.role!=='student')fail(409,`รหัส ${row.code} เป็นบัญชีครู`);if(registered.has(row.code))fail(409,`รหัส ${row.code} มีในรายวิชานี้แล้ว กรุณาแก้ไขรายชื่อหรือตัดแถวนี้ออก`);
   if(!s){const id=uid(),p=row.code;s={id};ops.push(stmt('INSERT INTO users (id,username,name,role,password,active,must_change,created_at) VALUES (?,?,?,?,?,1,0,?)',id,row.code,row.name,'student',await hashPassword(p),now()));credentials.push({code:row.code,name:row.name,password:p});}
   ops.push(stmt('INSERT INTO enrollments (id,course_id,student_id,student_code,name,number,active,special) VALUES (?,?,?,?,?,?,1,?)',uid(),b.courseId,s!.id,row.code,row.name,row.number,''));
  }
  try{await database().batch([...ops,invalidateCourse(b.courseId)]);}catch{fail(409,'มีข้อมูลซ้ำหรือเปลี่ยนระหว่างนำเข้า กรุณาตรวจสอบแล้วลองใหม่');}
  await log(u.id,b.courseId,'import_students',{count:rows.length});return reply({ok:true,count:rows.length,credentials},201);
 }
 if(path==='assignments'&&method==='POST'){
  teacher(u);const b=await jsonBody(r),targets=b.courseIds??[b.courseId];if(!Array.isArray(targets)||!targets.length||targets.length>50||new Set(targets).size!==targets.length)fail(400,'เลือกห้องเรียน 1–50 ห้องโดยไม่ซ้ำ');
  const cs:any[]=[];for(const id of targets)cs.push(await openCourse(u,id));if(cs.some(c=>c.subject_id!==cs[0].subject_id))fail(400,'เลือกห้องจากรายวิชาเดียวกันเท่านั้น');
  const phase=b.workPhase??'before';if(!['before','after'].includes(phase))fail(400,'เลือกช่วงงานก่อนหรือหลังกลางภาค');const max=number(b.maxScore,'คะแนนเต็ม',.1,1000);let rubric;try{rubric=validateRubric(b.rubric,max);}catch(e){fail(400,(e as Error).message);}const due=new Date(b.dueAt);if(!Number.isFinite(due.getTime()))fail(400,'วันกำหนดส่งไม่ถูกต้อง');const title=string(b.title,'ชื่องาน',150),ids=cs.map(()=>uid()),isGroup=b.isGroup===true?1:0,groupMax=integer(b.groupMax??5,'สมาชิกสูงสุด',2,10);
  await database().batch(cs.flatMap((c,i)=>[stmt('INSERT INTO assignments (id,course_id,title,description,max_score,due_at,rubric,work_phase,is_group,group_max,individual_weight,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',ids[i],c.id,title,typeof b.description==='string'?b.description.slice(0,10000):'',max,due.toISOString(),JSON.stringify(rubric),phase,isGroup,groupMax,isGroup?number(b.individualWeight??0,'สัดส่วนรายบุคคล'):0,now()),invalidateCourse(c.id)]));return reply({id:ids[0],assignmentIds:ids},201);
 }
 if(path.startsWith('assignments/')&&method==='PATCH'){
  teacher(u);const id=path.slice(12);const {a,c}=await assignmentAccess(u,id,true);if(c.archived)fail(409,'รายวิชาเก็บเข้าประวัติแล้ว');const b=await jsonBody(r);const phase=b.workPhase??a.work_phase;if(!['before','after'].includes(phase))fail(400,'เลือกช่วงงานก่อนหรือหลังกลางภาค');const isGroup=b.isGroup===undefined?a.is_group:(b.isGroup===true?1:0),groupMax=integer(b.groupMax??a.group_max??5,'สมาชิกสูงสุด',2,10);if(isGroup!==a.is_group&&(await one('SELECT id FROM work_groups WHERE assignment_id=?',id)||await one('SELECT id FROM submissions WHERE assignment_id=?',id)))fail(409,'มีสมาชิกกลุ่มหรือส่งงานแล้ว เปลี่ยนรูปแบบงานไม่ได้');if(await one('SELECT id FROM work_groups WHERE assignment_id=? AND member_count>?',id,groupMax))fail(409,'จำนวนสมาชิกเดิมเกินขนาดกลุ่มใหม่');const individualWeight=isGroup?number(b.individualWeight??a.individual_weight??0,'สัดส่วนรายบุคคล',0,100):0;if(individualWeight!==Number(a.individual_weight||0)&&await one('SELECT id FROM submissions WHERE assignment_id=?',id))fail(409,'ส่งงานแล้ว เปลี่ยนสัดส่วนรายบุคคลไม่ได้');const max=number(b.maxScore,'คะแนนเต็ม',.1,1000);if(await one('SELECT id FROM submissions WHERE assignment_id=? AND individual_score>?',id,max*individualWeight/100))fail(409,'คะแนนส่วนบุคคลเดิมเกินคะแนนเต็มใหม่');let rubric;try{rubric=validateRubric(b.rubric??a.rubric,max);}catch(e){fail(400,(e as Error).message);}if(JSON.stringify(rubric)!==JSON.stringify(parseRubric(a.rubric))&&await one('SELECT id FROM submissions WHERE assignment_id=? AND deleted=0 AND status=?',id,'graded'))fail(409,'มีคะแนนแล้ว กรุณาสร้างงานใหม่เพื่อเปลี่ยนเกณฑ์');if(await one('SELECT id FROM submissions WHERE assignment_id=? AND deleted=0 AND score>?',id,max))fail(409,'มีคะแนนที่ตรวจแล้วเกินคะแนนเต็มใหม่');const due=new Date(b.dueAt);if(!Number.isFinite(due.getTime()))fail(400,'วันกำหนดส่งไม่ถูกต้อง');await database().batch([stmt('UPDATE assignments SET title=?,description=?,max_score=?,due_at=?,rubric=?,work_phase=?,is_group=?,group_max=?,individual_weight=? WHERE id=?',string(b.title,'ชื่องาน',150),typeof b.description==='string'?b.description.slice(0,10000):'',max,due.toISOString(),JSON.stringify(rubric),phase,isGroup,groupMax,individualWeight,a.id),invalidateCourse(c.id)]);return reply({ok:true});
 }
 if(path==='samples'&&method==='POST'){
  teacher(u);const form=await r.formData();let targets;try{targets=form.has('assignmentIds')?JSON.parse(String(form.get('assignmentIds'))):[String(form.get('assignmentId'))];}catch{fail(400,'รายการงานไม่ถูกต้อง');}if(!Array.isArray(targets)||!targets.length||targets.length>50||new Set(targets).size!==targets.length)fail(400,'รายการงานไม่ถูกต้อง');
  const permitted:any[]=[];for(const id of targets){const access=await assignmentAccess(u,id,true);if(access.c.archived)fail(409,'รายวิชาเก็บเข้าประวัติแล้ว');permitted.push(access);}if(permitted.some(x=>x.c.subject_id!==permitted[0].c.subject_id))fail(400,'เลือกงานจากวิชาเดียวกัน');
  const fs=[];try{for(const {a} of permitted)fs.push(...await saveUploads(form,a,u,0,true));if(!fs.length)fail(400,'กรุณาแนบไฟล์');await database().batch([...fs.map(insertFile),...permitted.map(({c})=>stmt('UPDATE courses SET revision=revision+1 WHERE id=?',c.id))]);}catch(e){await Promise.all(fs.map(f=>bucket().delete(f.id)));throw e;}return reply({ok:true},201);
 }
 if(path==='submit'&&method==='POST'){
  if(u.role!=='student')fail(403,'เฉพาะนักเรียนเท่านั้น');const form=await r.formData();const {a,c}=await assignmentAccess(u,String(form.get('assignmentId')));if(c.archived||c.published)fail(409,'รายวิชานี้ปิดรับงานแล้ว');
  if(a.is_group)return submitGroup(form,a,c,u);
  const old=await one('SELECT * FROM submissions WHERE assignment_id=? AND student_id=? AND deleted=0',a.id,u.id);if(old)await requireLive('submission',old.id);if(old&&old.status!=='returned')fail(409,'ส่งงานแล้ว ให้ครูส่งคืนก่อนแก้ไขงาน');
  const revision=(old?.revision||0)+1;const fs=await saveUploads(form,a,u,revision);const note=String(form.get('note')||'').slice(0,3000);
  try{const op=old?stmt("UPDATE submissions SET note=?,submitted_at=?,score=NULL,feedback='',rubric_scores='[]',source='upload',status='pending',revision=?,reviewed_at=NULL WHERE id=? AND revision=? AND status='returned'",note,now(),revision,old.id,old.revision):stmt("INSERT INTO submissions (id,assignment_id,student_id,note,submitted_at,score,feedback,status,revision) VALUES (?,?,?,?,?,NULL,'','pending',?)",uid(),a.id,u.id,note,now(),revision);
   const result=await database().batch([op,...fs.map(insertFile),invalidateCourse(c.id)]);if(result[0].meta.changes!==1){await database().batch(fs.map(f=>stmt('DELETE FROM files WHERE id=?',f.id)));fail(409,'งานเปลี่ยนระหว่างส่ง กรุณาโหลดใหม่');}
  }catch(e){await Promise.all(fs.map(f=>bucket().delete(f.id)));throw e;}await log(u.id,c.id,'submission',{assignmentId:a.id,revision});return reply({ok:true},201);
 }
 if(path.startsWith('review/')&&method==='PATCH'){
  teacher(u);const id=path.slice(7);await requireLive('submission',id);const s=await one('SELECT * FROM submissions WHERE id=?',id);if(!s)fail(404,'ไม่พบงานที่ส่ง');const {a,c}=await assignmentAccess(u,s!.assignment_id,true);if(c.archived)fail(409,'รายวิชาเก็บเข้าประวัติแล้ว');const b=await jsonBody(r);if('expectedReviewedAt' in b&&b.expectedReviewedAt!==s!.reviewed_at)fail(409,'ครูอีกคนแก้คะแนนแล้ว กรุณาเปิดงานใหม่');if('expectedRubric' in b&&b.expectedRubric!==a.rubric)fail(409,'เกณฑ์คะแนนเปลี่ยนแล้ว กรุณาเปิดงานใหม่');if(s!.group_id&&await one('SELECT id FROM submissions WHERE group_id=? AND assignment_id=? AND deleted=0 AND (revision<>? OR reviewed_at IS NOT ?)',s!.group_id,s!.assignment_id,s!.revision,s!.reviewed_at))fail(409,'ข้อมูลกลุ่มไม่ตรงกัน ให้ครูกู้คืนหรือตรวจข้อมูลกลุ่มก่อน');const status=b.returned?'returned':'graded';let score=b.returned?null:number(b.score,'คะแนน',0,a.max_score);const rubric=parseRubric(a.rubric);if(!b.returned&&rubric.length)try{score=rubricScore(rubric,b.rubricScores);}catch(e){fail(400,(e as Error).message);}const rev=integer(b.revision,'รุ่นงาน',1,10000);const feedback=typeof b.feedback==='string'?b.feedback.slice(0,5000):'';
  const reviewedAt=new Date(Math.max(Date.now(),new Date(s!.reviewed_at||0).getTime()+1)).toISOString();const result=await database().batch([stmt('UPDATE submissions SET score=?,feedback=?,status=?,reviewed_at=?,rubric_scores=?,individual_score=CASE WHEN ?=\'returned\' THEN NULL ELSE individual_score END WHERE '+(s!.group_id?'group_id=? AND assignment_id=? AND deleted=0':'id=?')+' AND revision=?'+('expectedReviewedAt' in b?' AND reviewed_at IS ?':''),score,feedback,status,reviewedAt,JSON.stringify(b.returned?[]:b.rubricScores||[]),status,...(s!.group_id?[s!.group_id,s!.assignment_id]:[id]),rev,...('expectedReviewedAt' in b?[b.expectedReviewedAt]:[])),invalidateCourse(c.id),...(s!.group_id?[stmt('UPDATE work_groups SET revision=revision+1 WHERE id=? AND EXISTS(SELECT 1 FROM submissions WHERE id=? AND reviewed_at=?)',s!.group_id,id,reviewedAt)]:[])]);if(!result[0].meta.changes)fail(409,'ข้อมูลงานหรือคะแนนเปลี่ยนแล้ว กรุณาเปิดงานอีกครั้ง');await log(u.id,c.id,'review',{submissionId:id,before:{score:s!.score,status:s!.status,feedback:s!.feedback,rubricScores:s!.rubric_scores},score,status,feedback,revision:rev,rubric,rubricScores:b.rubricScores||[]});return reply({ok:true});
 }
 if(path==='backup'&&method==='GET'){teacher(u);const state=await getState(u);const audit=await all('SELECT * FROM audit WHERE actor_id=? OR course_id IN (SELECT id FROM courses WHERE owner_id=?) ORDER BY created_at',u.id,u.id);return reply({version:1,exportedAt:now(),...state,audit});}
 fail(404,'ไม่พบคำสั่ง');
}
async function route(r:Request){try{return await handle(r);}catch(e){if(e instanceof HttpError)return reply({error:e.message},e.status);console.error('Grade API error',e);return reply({error:'บันทึกหรือโหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่ ข้อมูลที่กรอกยังอยู่ในหน้าเดิม'},503);}}
export const GET=route;export const POST=route;export const PATCH=route;





async function submitGroup(form:FormData,a:any,c:any,u:User){
 const {g,members}=await submissionGroup(u,a);const old=await all('SELECT * FROM submissions WHERE assignment_id=? AND student_id IN(SELECT value FROM json_each(?))',a.id,JSON.stringify(members));
 if(old.some(s=>s.deleted||s.status!=='returned'))fail(409,'กลุ่มส่งงานแล้ว ให้ครูส่งคืนก่อนแก้ไข');if(old.length&&old.length!==members.length)fail(409,'ข้อมูลกลุ่มบางส่วนอยู่ในถังขยะ ให้ครูกู้คืนทั้งกลุ่มก่อน');
 const revision=Math.max(0,...old.map(s=>s.revision))+1,token=uid(),saved:any[]=[];const stamp=now(),note=String(form.get('note')||'').slice(0,3000);
 try{
  for(const studentId of members)saved.push(...await saveUploads(form,a,{...u,id:studentId},revision));
  const guard='EXISTS(SELECT 1 FROM work_groups WHERE id=? AND submission_token=?)';
  const ops=[stmt('UPDATE work_groups SET sealed=1,submission_token=?,revision=revision+1 WHERE id=? AND revision=?',token,g.id,g.revision)];
  for(const studentId of members){const prev=old.find(s=>s.student_id===studentId);ops.push(prev?stmt(`UPDATE submissions SET note=?,submitted_at=?,score=NULL,feedback='',rubric_scores='[]',source='upload',status='pending',individual_score=NULL,group_id=?,revision=?,reviewed_at=NULL WHERE id=? AND ${guard}`,note,stamp,g.id,revision,prev.id,g.id,token):stmt(`INSERT INTO submissions(id,assignment_id,student_id,group_id,note,submitted_at,status,revision) SELECT ?,?,?,?,?,?,'pending',? WHERE ${guard}`,uid(),a.id,studentId,g.id,note,stamp,revision,g.id,token));}
  for(const f of saved)ops.push(stmt(`INSERT INTO files(id,course_id,assignment_id,student_id,revision,name,mime,size,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ${guard}`,f.id,f.course_id,f.assignment_id,f.student_id,f.revision,f.name,f.mime,f.size,f.created_at,g.id,token));
  ops.push(stmt(`UPDATE courses SET published=0,grading_mode='points',revision=revision+1 WHERE id=? AND ${guard}`,c.id,g.id,token));
  const result=await database().batch(ops);if(!result[0].meta.changes)fail(409,'สมาชิกหรือการส่งงานเปลี่ยนระหว่างส่ง กรุณาโหลดใหม่');
 }catch(e){await Promise.all(saved.map(f=>bucket().delete(f.id)));throw e;}
 await log(u.id,c.id,'group_submission',{assignmentId:a.id,groupId:g.id,members,revision});return reply({ok:true},201);
}
