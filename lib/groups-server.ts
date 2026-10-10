import {all,one,stmt,database,fail,uid,now,string,jsonBody,reply,requireLive,log} from './server';
import {ownCourse,type User} from './auth';

async function access(u:User,id:string){
 await requireLive('assignment',id);const a=await one('SELECT * FROM assignments WHERE id=?',id);if(!a)fail(404,'ไม่พบงาน');
 const c=await ownCourse(u,a.course_id);if(!a.is_group)fail(409,'งานนี้เป็นงานรายบุคคล');return {a,c};
}
export async function submissionGroup(u:User,a:any){
 const g=await one('SELECT g.* FROM work_groups g JOIN group_members m ON m.group_id=g.id WHERE m.assignment_id=? AND m.student_id=?',a.id,u.id);
 if(!g)fail(409,'สร้างหรือเข้าร่วมกลุ่มก่อนส่งงาน');
 const members=await all('SELECT m.student_id FROM group_members m JOIN enrollments e ON e.student_id=m.student_id AND e.course_id=? JOIN users u ON u.id=m.student_id WHERE m.group_id=? AND e.active=1 AND e.deleted=0 AND u.active=1 AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE (t.kind=\'student\' AND t.record_id=u.id) OR (t.kind=\'enrollment\' AND t.record_id=e.id))',a.course_id,g.id);
 if(members.length!==g.member_count)fail(409,'สมาชิกบางคนไม่ได้ลงทะเบียนแล้ว ให้ครูตรวจรายชื่อก่อนส่งงาน');
 return {g,members:members.map(m=>m.student_id as string)};
}
export async function groupRoute(r:Request,u:User,path:string,method:string){
 const match=path.match(/^groups\/([^/]+)(?:\/(create|join|leave|rename|remove))?$/);if(!match)return null;
 const {a,c}=await access(u,match[1]);
 if(!match[2]&&method==='GET'){
  const groups=await all('SELECT * FROM work_groups WHERE assignment_id=? ORDER BY created_at',a.id);
  const members=await all('SELECT m.group_id,m.student_id,e.name,e.number FROM group_members m JOIN enrollments e ON e.student_id=m.student_id AND e.course_id=? WHERE m.assignment_id=? AND e.deleted=0 AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE (t.kind=\'student\' AND t.record_id=m.student_id) OR (t.kind=\'enrollment\' AND t.record_id=e.id)) ORDER BY e.number',c.id,a.id);
  return reply({groups:groups.map(g=>({...g,members:members.filter(m=>m.group_id===g.id)}))});
 }
 if(method!=='POST')return null;if(u.role!=='student')fail(403,'นักเรียนเลือกกลุ่มด้วยบัญชีตนเอง');if(c.archived||c.published)fail(409,'ห้องเรียนนี้ปิดรับงานแล้ว');
 const b=await jsonBody(r),op=match[2];
 const own=await one('SELECT g.* FROM work_groups g JOIN group_members m ON m.group_id=g.id WHERE m.assignment_id=? AND m.student_id=?',a.id,u.id);
 if(op==='create'){
  if(own)fail(409,'คุณมีกลุ่มในงานนี้แล้ว');const id=uid(),name=string(b.name,'ชื่อกลุ่ม',80);
  try{await database().batch([stmt('INSERT INTO work_groups(id,assignment_id,name,leader_id,created_at) VALUES(?,?,?,?,?)',id,a.id,name,u.id,now()),stmt('INSERT INTO group_members(group_id,assignment_id,student_id) VALUES(?,?,?)',id,a.id,u.id)]);}catch{fail(409,'สร้างกลุ่มไม่สำเร็จ คุณอาจเข้ากลุ่มอื่นแล้ว');}
  await log(u.id,c.id,'group_created',{assignmentId:a.id,groupId:id});return reply({id},201);
 }
 if(op==='join'){
  if(own)fail(409,'คุณมีกลุ่มในงานนี้แล้ว');const id=string(b.groupId,'กลุ่ม');
  try{const result=await stmt('INSERT INTO group_members(group_id,assignment_id,student_id) SELECT id,assignment_id,? FROM work_groups WHERE id=? AND assignment_id=?',u.id,id,a.id).run();if(!result.meta.changes)fail(404,'ไม่พบกลุ่ม');}catch(e){if((e as any).status)throw e;fail(409,'กลุ่มเต็ม ส่งงานแล้ว หรือคุณเข้ากลุ่มอื่นแล้ว');}return reply({ok:true});
 }
 if(!own)fail(404,'คุณยังไม่มีกลุ่ม');if(own.sealed)fail(409,'ส่งงานแล้ว ไม่สามารถเปลี่ยนสมาชิกหรือชื่อกลุ่มได้');
 if(op==='leave'){
  if(own.leader_id===u.id&&own.member_count>1)fail(409,'หัวหน้ากลุ่มออกได้เมื่อสมาชิกคนอื่นออกครบแล้ว');
  const result=await stmt('DELETE FROM group_members WHERE assignment_id=? AND student_id=? AND EXISTS(SELECT 1 FROM work_groups g WHERE g.id=group_members.group_id AND g.sealed=0 AND (g.leader_id<>? OR g.member_count=1))',a.id,u.id,u.id).run();if(!result.meta.changes)fail(409,'กลุ่มเปลี่ยนหรือเพิ่งส่งงานแล้ว กรุณาโหลดใหม่');
  await stmt('DELETE FROM work_groups WHERE id=? AND member_count=0 AND sealed=0',own.id).run();return reply({ok:true});
 }
 if(op==='rename'||op==='remove'){
  if(own.leader_id!==u.id)fail(403,'เฉพาะหัวหน้ากลุ่ม');if(op==='remove'&&own.member_count>1)fail(409,'ให้สมาชิกออกจากกลุ่มก่อนลบ');
  if(op==='rename')await stmt('UPDATE work_groups SET name=? WHERE id=? AND sealed=0',string(b.name,'ชื่อกลุ่ม',80),own.id).run();
  else await database().batch([stmt('DELETE FROM group_members WHERE group_id=? AND EXISTS(SELECT 1 FROM work_groups WHERE id=? AND sealed=0 AND member_count=1)',own.id,own.id),stmt('DELETE FROM work_groups WHERE id=? AND member_count=0 AND sealed=0',own.id)]);return reply({ok:true});
 }
 return null;
}
