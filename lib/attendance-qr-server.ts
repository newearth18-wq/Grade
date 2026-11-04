import {all,one,stmt,database,fail,uid,now,jsonBody,reply,integer,requireLive} from './server';
import {ownCourse,teacher,digest,type User} from './auth';

const ticketPattern=/^[a-f0-9]{64}$/;
async function context(u:User,token:unknown){
 if(u.role!=='student')fail(403,'กรุณาใช้บัญชีนักเรียนเพื่อเช็คชื่อ');
 if(typeof token!=='string'||!ticketPattern.test(token))fail(400,'QR เช็คชื่อไม่ถูกต้อง');
 const hash=await digest(token),q=await one('SELECT * FROM attendance_qr WHERE token_hash=?',hash);
 if(!q||q.expires_at<=Date.now())fail(410,'QR หมดอายุหรือครูปิดรับแล้ว กรุณาสแกน QR ใหม่จากครู');
 const s=await one('SELECT * FROM attendance_sessions WHERE id=? AND deleted=0',q!.session_id);if(!s)fail(410,'คาบนี้ปิดรับเช็คชื่อแล้ว');
 const c=await ownCourse(u,s!.course_id);await requireLive('student',u.id);
 if(c.archived||c.published)fail(409,'รายวิชานี้ปิดรับเช็คชื่อแล้ว');
 const e=await one('SELECT * FROM enrollments WHERE course_id=? AND student_id=? AND active=1 AND deleted=0',c.id,u.id);if(!e)fail(403,'คุณไม่ได้ลงทะเบียนในห้องนี้');await requireLive('enrollment',e!.id);
 return {q:q!,s:s!,c,hash};
}
const details=(s:any,c:any)=>({session:{id:s.id,title:s.title,date:s.date,hours:s.hours},course:{id:c.id,code:c.code,name:c.name,classroom:c.classroom,period_id:c.period_id,subject_id:c.subject_id}});

export async function attendanceQrRoute(r:Request,u:User,path:string,method:string):Promise<Response|null>{
 if((path==='attendance-qr/preview'||path==='attendance-qr/check-in')&&method==='POST'){
  const b=await jsonBody(r);if('studentId' in b)fail(400,'ระบบใช้บัญชีนักเรียนที่เข้าสู่ระบบเท่านั้น');
  const {q,s,c,hash}=await context(u,b.token);
  if(path==='attendance-qr/preview')return reply({...details(s,c),expiresAt:q.expires_at,lateAt:q.late_at,record:await one('SELECT status,hours,updated_at FROM attendance_records WHERE session_id=? AND student_id=?',s.id,u.id)});
  const stamp=now(),time=Date.now(),id=uid();
  // One transaction admits every eligible student independently. It also checks
  // revocation, enrollment, trash and expiry again at the actual insert boundary.
  const res=await database().batch([
   stmt(`INSERT INTO attendance_records(id,session_id,student_id,status,hours,note,updated_at)
    SELECT ?,s.id,?,CASE WHEN q.late_at IS NOT NULL AND q.late_at<=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER) THEN 'late' ELSE 'present' END,s.hours,'เช็คชื่อผ่าน QR',?
    FROM attendance_qr q JOIN attendance_sessions s ON s.id=q.session_id JOIN courses c ON c.id=s.course_id
    JOIN enrollments e ON e.course_id=c.id AND e.student_id=? JOIN users u ON u.id=e.student_id
    WHERE q.token_hash=? AND q.expires_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER) AND s.deleted=0 AND c.archived=0 AND c.deleted=0 AND c.published=0
    AND e.active=1 AND e.deleted=0 AND u.active=1 AND u.role='student'
    AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE
     (t.kind='course' AND t.record_id=c.id) OR (t.kind='period' AND t.record_id=c.period_id) OR
     (t.kind='subject' AND t.record_id=c.subject_id) OR (t.kind='enrollment' AND t.record_id=e.id) OR (t.kind='student' AND t.record_id=u.id))
    ON CONFLICT(session_id,student_id) DO NOTHING`,id,u.id,stamp,u.id,hash),
   stmt('UPDATE attendance_sessions SET revision=revision+1 WHERE id=? AND EXISTS(SELECT 1 FROM attendance_records WHERE id=?)',s.id,id),
   stmt("UPDATE courses SET revision=revision+1,grading_mode='points' WHERE id=? AND EXISTS(SELECT 1 FROM attendance_records WHERE id=?)",c.id,id),
   stmt('INSERT INTO audit(id,actor_id,course_id,action,detail,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM attendance_records WHERE id=?)',uid(),u.id,c.id,'attendance_qr',JSON.stringify({sessionId:s.id,title:s.title,checkedAt:stamp}),stamp,id)
  ]);
  const record=await one('SELECT status,hours,updated_at FROM attendance_records WHERE session_id=? AND student_id=?',s.id,u.id);
  if(!record)fail(409,'QR ปิดรับหรือข้อมูลทะเบียนเปลี่ยนแล้ว กรุณาตรวจสอบกับครู');
  return reply({...details(s,c),record,already:!res[0].meta.changes});
 }
 const match=path.match(/^attendance-qr\/([^/]+)(?:\/(open|close))?$/);if(!match)return null;
 teacher(u);const s=await one('SELECT * FROM attendance_sessions WHERE id=?',match[1]);if(!s)fail(404,'ไม่พบคาบเช็คชื่อ');
 const c=await ownCourse(u,s!.course_id,!!match[2]);
 if(match[2]==='close'&&method==='POST'){await stmt('DELETE FROM attendance_qr WHERE session_id=?',s!.id).run();return reply({ok:true});}
 if(s!.deleted)fail(409,'คาบอยู่ในถังขยะ');
 if(match[2]==='open'&&method==='POST'){
  if(c.archived||c.published)fail(409,'รายวิชาเก็บเป็นประวัติหรือเผยแพร่ผลแล้ว กรุณาเปิดรายวิชาและถอนผลเผยแพร่ก่อนเปิด QR');
  const b=await jsonBody(r),minutes=integer(b.minutes??10,'เวลารับเช็คชื่อ',1,60),lateAfter=integer(b.lateAfter??0,'นาทีที่เริ่มนับสาย',0,minutes),time=Date.now(),expiresAt=time+minutes*60000,lateAt=lateAfter?time+lateAfter*60000:null;
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
  const res=await stmt(`INSERT INTO attendance_qr(session_id,token_hash,expires_at,late_at,created_by,created_at)
   SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM attendance_sessions s JOIN courses c ON c.id=s.course_id WHERE s.id=? AND s.deleted=0 AND c.archived=0 AND c.deleted=0 AND c.published=0 AND c.revision=?)
   ON CONFLICT(session_id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,late_at=excluded.late_at,created_by=excluded.created_by,created_at=excluded.created_at`,s!.id,await digest(token),expiresAt,lateAt,u.id,now(),s!.id,c.revision).run();
  if(!res.meta.changes)fail(409,'ข้อมูลคาบเปลี่ยนแล้ว กรุณาโหลดใหม่');
  return reply({...details(s,c),token,expiresAt,lateAt});
 }
 if(!match[2]&&method==='GET'){
  const q=await one('SELECT expires_at,late_at FROM attendance_qr WHERE session_id=?',s!.id),rows=await all(`SELECT r.status FROM enrollments e LEFT JOIN attendance_records r ON r.student_id=e.student_id AND r.session_id=? WHERE e.course_id=? AND e.active=1 AND e.deleted=0 AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE (t.kind='enrollment' AND t.record_id=e.id) OR (t.kind='student' AND t.record_id=e.student_id))`,s!.id,c.id);
  return reply({open:!!q&&q.expires_at>Date.now()&&!c.archived&&!c.published,expiresAt:q?.expires_at,lateAt:q?.late_at,total:rows.length,present:rows.filter(x=>x.status==='present').length,late:rows.filter(x=>x.status==='late').length,unmarked:rows.filter(x=>!x.status).length});
 }
 return null;
}
