import {all,one,stmt,fail,jsonBody,reply,integer,string} from './server';
import {ownCourse,type User} from './auth';
import {communityProgress,profileValue,houseColors,type IslandProfile} from './adventure-life';

const parse=(text:unknown)=>{try{return JSON.parse(String(text));}catch{return null;}};
const profileKey=(user:string,course:string)=>`student_island:${user}:${course}`;
export async function islandProfiles(u:User,courseIds:Set<string>){
 if(u.role!=='student')return [];
 const prefix=`student_island:${u.id}:`,rows=await all('SELECT key,value FROM settings WHERE key>=? AND key<?',prefix,prefix+'\uffff');
 return rows.filter(r=>courseIds.has(r.key.slice(prefix.length))).map(r=>({id:r.key.slice(prefix.length),course_id:r.key.slice(prefix.length),...profileValue(parse(r.value))}));
}
/** Aggregate on the server. The student response contains no roster or other pupil's records. */
export async function classChallenges(sql:string,args:unknown[]){
 const rows=await all(`WITH authorized AS (SELECT c.id FROM courses c WHERE ${sql}),
 roster AS (SELECT en.course_id,en.student_id FROM enrollments en JOIN users learner ON learner.id=en.student_id WHERE en.course_id IN(SELECT id FROM authorized) AND en.active=1 AND en.deleted=0 AND learner.active=1 AND learner.role='student' AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE (t.kind='enrollment' AND t.record_id=en.id) OR (t.kind='student' AND t.record_id=en.student_id))),
 tasks AS (SELECT a.id,a.course_id FROM assignments a WHERE a.course_id IN(SELECT id FROM authorized) AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE t.kind='assignment' AND t.record_id=a.id)),
 received AS (SELECT a.course_id,count(DISTINCT s.id) n FROM tasks a JOIN submissions s ON s.assignment_id=a.id JOIN roster en ON en.course_id=a.course_id AND en.student_id=s.student_id WHERE s.deleted=0 AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE t.kind='submission' AND t.record_id=s.id) GROUP BY a.course_id),
 students AS (SELECT course_id,count(*) n FROM roster GROUP BY course_id),work AS(SELECT course_id,count(*) n FROM tasks GROUP BY course_id)
 SELECT c.id,coalesce(students.n,0)*coalesce(work.n,0) expected,coalesce(received.n,0) submitted,setting.value saved FROM authorized c LEFT JOIN students ON students.course_id=c.id LEFT JOIN work ON work.course_id=c.id LEFT JOIN received ON received.course_id=c.id LEFT JOIN settings setting ON setting.key='class_island:'||c.id`,...args);
 return rows.map(row=>communityProgress(row.id,row.expected,row.submitted,parse(row.saved)?.stage));
}
async function activeStudent(u:User,courseId:string){
 const c=await ownCourse(u,courseId);if(u.role!=='student')fail(403,'เฉพาะนักเรียนตั้งค่าเกาะส่วนตัวได้');
 const en=await one(`SELECT id FROM enrollments en WHERE course_id=? AND student_id=? AND active=1 AND deleted=0 AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE t.kind='enrollment' AND t.record_id=en.id)`,courseId,u.id);if(!en)fail(403,'การลงทะเบียนไม่ได้ใช้งาน');return c;
}
export async function adventureRoute(r:Request,u:User,path:string,method:string):Promise<Response|null>{
 const match=path.match(/^island\/([^/]+)(?:\/(community))?$/);if(!match)return null;
 const c=match[2]==='community'&&['admin','teacher'].includes(u.role)?await ownCourse(u,match[1],true):await activeStudent(u,match[1]);
 if(match[2]==='community'&&method==='POST'){
  const b=await jsonBody(r);if(Object.keys(b).length)fail(400,'ภารกิจห้องคำนวณจากงานจริง ไม่รับคะแนนหรือระดับจากอุปกรณ์');
  const current=(await classChallenges('c.id=?',[c.id]))[0];
  if(current.stage>current.savedStage)await stmt(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE coalesce(CASE WHEN json_valid(settings.value) THEN json_extract(settings.value,'$.stage') ELSE 0 END,0)<?`,'class_island:'+c.id,JSON.stringify({stage:current.stage}),current.stage).run();
  return reply({challenge:(await classChallenges('c.id=?',[c.id]))[0]});
 }
 if(match[2])return null;
 const key=profileKey(u.id,c.id),row=await one('SELECT value FROM settings WHERE key=?',key),current=profileValue(parse(row?.value));
 if(method==='GET')return reply({profile:current,challenge:(await classChallenges('c.id=?',[c.id]))[0]});
 if(method!=='PATCH')return null;
 const b=await jsonBody(r),keys=Object.keys(b);if(keys.some(k=>!['expectedRevision','companionName','houseColor','goalIds'].includes(k))||!keys.some(k=>k!=='expectedRevision'))fail(400,'ข้อมูลตั้งค่าเกาะไม่ถูกต้อง');
 const expected=integer(b.expectedRevision,'รุ่นข้อมูล',0,2147483647);if(expected!==current.revision)fail(409,'มีการแก้ไขจากอีกหน้าต่าง กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก');
 const next:IslandProfile={...current,revision:current.revision+1};
 if('companionName' in b){if(typeof b.companionName!=='string'||b.companionName.trim().length>24||/[\x00-\x1f\x7f]/.test(b.companionName))fail(400,'ชื่อคู่หูต้องยาวไม่เกิน 24 ตัวอักษร');next.companionName=b.companionName.trim();}
 if('houseColor' in b){if(!houseColors.some(color=>color.id===b.houseColor))fail(400,'เลือกสีบ้านจากรายการ');next.houseColor=b.houseColor;}
 if('goalIds' in b){
  if(c.archived||c.published)fail(409,'รายวิชานี้ปิดรับงานแล้ว');
  if(!Array.isArray(b.goalIds)||b.goalIds.length>3||new Set(b.goalIds).size!==b.goalIds.length)fail(400,'เลือกเป้าหมายวันนี้ได้ไม่เกิน 3 งานและไม่ซ้ำกัน');
  const valid=[];for(const value of b.goalIds){const id=string(value,'งานที่เลือก',100);const a=await one(`SELECT a.id FROM assignments a WHERE a.id=? AND a.course_id=? AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE t.kind='assignment' AND t.record_id=a.id)`,id,c.id);if(!a)fail(400,'งานที่เลือกไม่ได้อยู่ในวิชาและห้องนี้');
   const s=await one("SELECT id,status FROM submissions WHERE assignment_id=? AND student_id=? AND deleted=0 AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE t.kind='submission' AND t.record_id=submissions.id)",id,u.id);
   if(s&&s.status!=='returned'&&!current.goalIds.includes(id))fail(409,'งานนี้ส่งแล้ว เลือกงานที่ยังไม่ส่งหรืองานที่ครูให้แก้ไข');valid.push(id);
  }next.goalIds=valid;
 }
 const result=row?await stmt('UPDATE settings SET value=? WHERE key=? AND value=?',JSON.stringify(next),key,row.value).run():await stmt('INSERT INTO settings(key,value) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM settings WHERE key=?)',key,JSON.stringify(next),key).run();
 if(!result.meta.changes)fail(409,'ข้อมูลเปลี่ยนระหว่างบันทึก กรุณาโหลดใหม่');return reply({profile:next});
}
