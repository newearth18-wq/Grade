import {all,one,stmt,database,fail,uid,now,string,number,log,jsonBody,reply,requireLive} from './server';
import {teacher,ownCourse,type User} from './auth';

// A subject owns multiple course sections. Existing section IDs, rosters and scores stay intact.
export async function subjectPlan(u:User,b:any){
 const periodId=string(b.periodId,'ภาคเรียน');await requireLive('period',periodId);if(!await one('SELECT id FROM periods WHERE id=?',periodId))fail(404,'ไม่พบภาคเรียน');
 const code=string(b.code,'รหัสวิชา',30),name=string(b.name,'ชื่อวิชา',100);
 const old=await one('SELECT * FROM subjects WHERE owner_id=? AND period_id=? AND code=? AND deleted=0',u.id,periodId,code);
 if(old)await requireLive('subject',old.id);
 if(old&&old.name!==name)fail(409,'รหัสวิชานี้มีชื่ออื่นแล้ว กรุณาเลือกวิชาเดิมหรือใช้รหัสใหม่');
 const id=old?.id||uid();return {id,periodId,code,name,ops:old?[]:[stmt('INSERT INTO subjects (id,period_id,owner_id,code,name,created_at) VALUES (?,?,?,?,?,?)',id,periodId,u.id,code,name,now())]};
}
export async function createSections(u:User,b:any){
 teacher(u);const rooms=b.classrooms??[b.classroom];if(!Array.isArray(rooms)||!rooms.length||rooms.length>50)fail(400,'เพิ่มได้ครั้งละ 1–50 ห้อง');
 const classrooms=rooms.map((s:any)=>string(s,'ห้องเรียน',40));if(new Set(classrooms).size!==classrooms.length)fail(400,'ห้องเรียนซ้ำ');
 let body=b;if(b.subjectId){await requireLive('subject',b.subjectId);const parent=await one('SELECT * FROM subjects WHERE id=?',b.subjectId);if(!parent||(u.role!=='admin'&&parent.owner_id!==u.id))fail(403,'เฉพาะเจ้าของวิชาหรือผู้ดูแลเพิ่มห้องได้');
  const source=await one('SELECT * FROM courses WHERE subject_id=? AND deleted=0 ORDER BY rowid LIMIT 1',parent.id);if(!source)fail(404,'ไม่พบห้องต้นแบบ');
  body={...b,periodId:parent.period_id,code:parent.code,name:parent.name,workWeight:source.work_weight,midWeight:source.mid_weight,finalWeight:source.final_weight,courseType:source.course_type,passThreshold:source.pass_threshold,beforeWorkWeight:source.before_work_weight??source.work_weight/2};
  // Keep the original subject owner when the school administrator adds a section.
  u={...u,id:parent.owner_id};
 }
 const w=number(body.workWeight,'คะแนนเก็บ'),m=number(body.midWeight,'กลางภาค'),f=number(body.finalWeight,'ปลายภาค');if(Math.abs(w+m+f-100)>.0001)fail(400,'สัดส่วนคะแนนต้องรวมเป็น 100');
 const type=body.courseType??'academic';if(!['academic','activity'].includes(type))fail(400,'ประเภทวิชาไม่ถูกต้อง');if(type==='activity'&&(w!==100||m!==0||f!==0))fail(400,'วิชากิจกรรมต้องไม่มีคะแนนสอบและใช้คะแนนกิจกรรม 100');const threshold=number(body.passThreshold??50,'เกณฑ์ผ่าน',0,100);
 const before=number(body.beforeWorkWeight??w/2,'คะแนนเก็บก่อนกลางภาค',0,w);
 const parent=await subjectPlan(u,body),ids=classrooms.map(()=>uid());
 const ops=[...parent.ops,...classrooms.map((classroom:string,i:number)=>stmt('INSERT INTO courses (id,subject_id,period_id,owner_id,code,name,classroom,work_weight,mid_weight,final_weight,before_work_weight,course_type,pass_threshold,grading_mode,published,archived) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,\'points\',0,0)',ids[i],parent.id,parent.periodId,u.id,parent.code,parent.name,classroom,w,m,f,before,type,threshold))];
 try{await database().batch(ops);}catch{fail(409,'มีห้องเรียนนี้ในรายวิชา/ภาคเรียนแล้ว ไม่มีห้องถูกเพิ่มบางส่วน');}
 return {id:ids[0],ids,subjectId:parent.id,periodId:parent.periodId};
}
export async function subjectRoute(r:Request,u:User,path:string,method:string){
 if(path==='subject-rooms'&&method==='POST'){const b=await jsonBody(r);return reply(await createSections(u,b),201);}
 if(path.startsWith('subjects/')&&method==='PATCH'){
  teacher(u);const id=path.slice(9);await requireLive('subject',id);const parent=await one('SELECT * FROM subjects WHERE id=?',id);if(!parent)fail(404,'ไม่พบรายวิชา');
  if(u.role!=='admin'&&parent.owner_id!==u.id)fail(403,'เฉพาะเจ้าของวิชาแก้ชื่อรายวิชาได้');
  const sections=await all('SELECT * FROM courses WHERE subject_id=?',id);for(const c of sections)await ownCourse(u,c.id,true,true);
  const b=await jsonBody(r),code=string(b.code,'รหัสวิชา',30),name=string(b.name,'ชื่อวิชา',100);
  try{await database().batch([stmt('UPDATE subjects SET code=?,name=? WHERE id=?',code,name,id),...sections.map(c=>stmt('UPDATE courses SET code=?,name=?,revision=revision+1 WHERE id=?',code,name,c.id))]);}catch{fail(409,'รหัสวิชาซ้ำ ไม่ได้แก้รายวิชาหรือห้องเรียน');}
  for(const c of sections)await log(u.id,c.id,'subject_details',{code,name});return reply({ok:true});
 }
 return null;
}
