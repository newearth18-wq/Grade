import type {AppState,Row} from './client';
import {all,one,stmt,fail,jsonBody,reply,integer,string,now,log,bucket,requireLive} from './server';
import {ownCourse,type User} from './auth';
import {praiseKinds,type Memory} from './adventure-plus';
import {bangkokDay,homeProgress,profileValue} from './adventure-life';
import {getState} from './state';
import {studentJourney} from './student-journey';
import {treeGrowth} from './tree-growth';
const parse=(v:unknown)=>{try{return JSON.parse(String(v));}catch{return null;}};
async function stored(key:string){return await one('SELECT value FROM settings WHERE key=?',key);}
async function rows(prefix:string){return (await all('SELECT key,value FROM settings WHERE key>=? AND key<?',prefix,prefix+'\uffff')).map(r=>({key:r.key,...parse(r.value)}));}
async function save(key:string,old:any,value:any){const result=old?await stmt('UPDATE settings SET value=? WHERE key=? AND value=?',JSON.stringify(value),key,old.value).run():await stmt('INSERT INTO settings(key,value) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM settings WHERE key=?)',key,JSON.stringify(value),key).run();if(!result.meta.changes)fail(409,'ข้อมูลเปลี่ยนจากอีกหน้าต่าง กรุณาโหลดใหม่');}
function fields(b:any,allowed:string[]){if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!allowed.includes(k)))fail(400,'ข้อมูลไม่ถูกต้อง');}
async function access(u:User,id:string,write=false){const c=await ownCourse(u,id,write);if(u.role==='student'&&!await one(`SELECT en.id FROM enrollments en WHERE course_id=? AND student_id=? AND active=1 AND deleted=0 AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE t.kind='enrollment' AND t.record_id=en.id)`,id,u.id))fail(403,'การลงทะเบียนไม่ได้ใช้งาน');return c as Row;}
async function liveWork(course:string,id:string){
 const s=await one(`SELECT s.*,a.title,a.course_id FROM submissions s JOIN assignments a ON a.id=s.assignment_id JOIN enrollments en ON en.course_id=a.course_id AND en.student_id=s.student_id JOIN users learner ON learner.id=s.student_id WHERE s.id=? AND a.course_id=? AND s.deleted=0 AND en.active=1 AND en.deleted=0 AND learner.active=1 AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE (t.kind='assignment' AND t.record_id=a.id) OR (t.kind='submission' AND t.record_id=s.id) OR (t.kind='enrollment' AND t.record_id=en.id) OR (t.kind='student' AND t.record_id=s.student_id))`,id,course);
 if(!s)fail(404,'ไม่พบงานที่ยังใช้งานในห้องนี้');return s;
}
const eligible=(entry:any,s:any)=>entry?.selected===true&&entry?.consent===true&&s.status==='graded'&&entry.workRevision===s.revision&&entry.reviewedAt===s.reviewed_at;
async function liveWorks(course:string){return all(`SELECT s.*,a.title FROM submissions s JOIN assignments a ON a.id=s.assignment_id JOIN enrollments en ON en.course_id=a.course_id AND en.student_id=s.student_id JOIN users learner ON learner.id=s.student_id WHERE a.course_id=? AND s.deleted=0 AND en.active=1 AND en.deleted=0 AND learner.active=1 AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE (t.kind='assignment' AND t.record_id=a.id) OR (t.kind='submission' AND t.record_id=s.id) OR (t.kind='enrollment' AND t.record_id=en.id) OR (t.kind='student' AND t.record_id=s.student_id))`,course);}
async function exhibits(u:User,c:any){
 const works=await liveWorks(c.id),byId=new Map(works.map(s=>[s.id,s]));
 const available=await all(`SELECT f.id,f.name,f.mime,f.size,f.assignment_id,f.student_id,f.revision FROM files f WHERE course_id=? AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE t.kind='file' AND t.record_id=f.id)`,c.id);
 const prefix=`exhibit_cheer:${c.id}:`,cheers=await all('SELECT key FROM settings WHERE key>=? AND key<?',prefix,prefix+'\uffff');
 const result=[];for(const entry of await rows(`exhibit:${c.id}:`)){
  const s=byId.get(entry.id);if(!s)continue;
  const visible=eligible(entry,s),own=s.student_id===u.id,teacher=u.role!=='student';if(!visible&&!own&&!teacher)continue;
  const files=available.filter(f=>f.assignment_id===s.assignment_id&&f.student_id===s.student_id&&f.revision===s.revision).map(({assignment_id,student_id,revision,...f})=>f),applause=cheers.filter(r=>r.key.startsWith(prefix+s.id+':'));
  result.push({id:s.id,title:entry.title,caption:entry.caption,assignmentTitle:s.title,revision:entry.revision,selected:!!entry.selected,consent:!!entry.consent,visible,own,cheers:applause.length,cheered:applause.some(r=>r.key===`exhibit_cheer:${c.id}:${s.id}:${u.id}`),...(teacher?{student_id:s.student_id}:{}),files});
 }return result;
}
async function gardens(u:User,c:any){
 const result=await all(`WITH groups AS(SELECT g.id,g.name,a.title,g.created_at FROM work_groups g JOIN assignments a ON a.id=g.assignment_id WHERE a.course_id=? AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE t.kind='assignment' AND t.record_id=a.id) ${u.role==='student'?'AND EXISTS(SELECT 1 FROM group_members m WHERE m.group_id=g.id AND m.student_id=?)':''}),members AS (SELECT m.group_id,m.student_id FROM group_members m JOIN groups g ON g.id=m.group_id JOIN enrollments en ON en.student_id=m.student_id AND en.course_id=? JOIN users learner ON learner.id=m.student_id WHERE en.active=1 AND en.deleted=0 AND learner.active=1 AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE (t.kind='enrollment' AND t.record_id=en.id) OR (t.kind='student' AND t.record_id=m.student_id))),tasks AS(SELECT a.id FROM assignments a WHERE course_id=? AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE t.kind='assignment' AND t.record_id=a.id)),received AS(SELECT m.group_id,count(s.id) sent FROM members m JOIN submissions s ON s.student_id=m.student_id AND s.assignment_id IN(SELECT id FROM tasks) WHERE s.deleted=0 AND s.status<>'returned' AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE t.kind='submission' AND t.record_id=s.id) GROUP BY m.group_id),counts AS(SELECT group_id,count(*) members FROM members GROUP BY group_id) SELECT g.id,g.name,g.title,counts.members,counts.members*(SELECT count(*) FROM tasks) expected,coalesce(received.sent,0) sent FROM groups g JOIN counts ON counts.group_id=g.id LEFT JOIN received ON received.group_id=g.id ORDER BY g.created_at DESC`,c.id,...(u.role==='student'?[u.id]:[]),c.id,c.id);
 return result.map(g=>({...g,percent:g.expected?Math.floor(g.sent*100/g.expected):0}));
}
export async function adventurePlusRoute(r:Request,u:User,path:string,method:string):Promise<Response|null>{
 const m=path.match(/^explore\/([^/]+)(?:\/(praise|exhibit|consent|cheer|memory|recovery)(?:\/([^/]+))?(?:\/file\/([^/]+))?)?$/);if(!m)return null;
 const [,courseId,op,id,fileId]=m,c=await access(u,courseId),student=u.role==='student';
 if(!op&&method==='GET'){
  const liveIds=new Set((await liveWorks(c.id)).map(s=>s.id)),live=(await rows(`praise:${c.id}:`)).filter(p=>liveIds.has(p.id)&&(!student||p.student_id===u.id&&!p.deleted));
  const memory=parse((await stored(`island_memory:${u.id}:${c.id}`))?.value),recovery=parse((await stored(`island_recovery:${u.id}:${c.id}`))?.value);
  return reply({praises:live.map(({key,...p})=>p),exhibits:await exhibits(u,c),gardens:await gardens(u,c),memories:student&&Array.isArray(memory?.frames)?memory.frames:[],recovery:student?{revision:recovery?.revision||0,ids:recovery?.ids||[],activeId:recovery?.activeId||''}:{revision:0,ids:[],activeId:''}});
 }
 if(op==='exhibit'&&fileId&&method==='GET'){
  const entry=parse((await stored(`exhibit:${c.id}:${id}`))?.value),s=await liveWork(c.id,id);if(!eligible(entry,s))fail(403,'ผลงานนี้ไม่ได้เปิดแสดงแล้ว');
  const f=await one('SELECT * FROM files WHERE id=? AND assignment_id=? AND student_id=? AND revision=?',fileId,s.assignment_id,s.student_id,s.revision);if(!f)fail(404,'ไม่พบไฟล์ผลงาน');await requireLive('file',f.id);const obj=await bucket().get(f.id);if(!obj)fail(404,'ไม่พบไฟล์ต้นฉบับ');
  return new Response(obj.body,{headers:{'Content-Type':f.mime,'Content-Length':String(f.size),'Content-Disposition':`${f.mime.startsWith('image/')||f.mime==='application/pdf'?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }
 if(!['POST','PATCH','DELETE'].includes(method))return null;const b=await jsonBody(r);
 if(op==='praise'&&id){
  await access(u,c.id,true);const s=await liveWork(c.id,id),key=`praise:${c.id}:${id}`,old=await stored(key),value=parse(old?.value);fields(b,method==='DELETE'?['expectedRevision']:['expectedRevision','kind','message']);const expected=integer(b.expectedRevision,'รุ่นการ์ด',0,2147483647);if(expected!==(value?.revision||0))fail(409,'การ์ดเปลี่ยนแล้ว กรุณาโหลดใหม่');
  if(method==='DELETE'){if(old)await save(key,old,{...value,deleted:true,revision:expected+1});await log(u.id,c.id,'praise_withdrawn',{submissionId:id});return reply({ok:true});}
  if(!praiseKinds.some(k=>k.id===b.kind))fail(400,'เลือกประเภทคำชม');const message=typeof b.message==='string'?b.message.trim():'';if(message.length>500)fail(400,'คำชมไม่เกิน 500 ตัวอักษร');await save(key,old,{id:s.id,student_id:s.student_id,assignmentTitle:s.title,kind:b.kind,message,teacherName:u.name,at:now(),revision:expected+1});await log(u.id,c.id,'praise_card',{submissionId:id,kind:b.kind});return reply({ok:true});
 }
 if(['exhibit','consent','cheer'].includes(op||'')&&id){
  const s=await liveWork(c.id,id),key=`exhibit:${c.id}:${id}`,old=await stored(key),value=parse(old?.value);
  if(op==='cheer'){
   if(!student)fail(403,'คำชมจากเพื่อนใช้บัญชีนักเรียน');fields(b,['liked']);if(typeof b.liked!=='boolean')fail(400,'เลือกส่งหรือถอนคำชม');if(!eligible(value,s))fail(409,'ผลงานนี้ไม่ได้เปิดแสดง');if(s.student_id===u.id)fail(400,'ส่งคำชมให้เพื่อนได้');const ck=`exhibit_cheer:${c.id}:${id}:${u.id}`;if(b.liked)await stmt('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING',ck,'1').run();else await stmt('DELETE FROM settings WHERE key=?',ck).run();return reply({ok:true});
  }
  fields(b,op==='consent'?['expectedRevision','consent']:['expectedRevision','title','caption','selected']);const expected=integer(b.expectedRevision,'รุ่นผลงาน',0,2147483647);if(expected!==(value?.revision||0))fail(409,'ผลงานเปลี่ยนแล้ว กรุณาโหลดใหม่');
  if(op==='consent'){
   if(!student||s.student_id!==u.id)fail(403,'เจ้าของผลงานเท่านั้นที่ยินยอมได้');if(typeof b.consent!=='boolean')fail(400,'เลือกยินยอมหรือถอนผลงาน');if(!old)fail(404,'ครูยังไม่ได้เสนอผลงานนี้');if(b.consent&&(!value.selected||s.status!=='graded'||value.workRevision!==s.revision||value.reviewedAt!==s.reviewed_at))fail(409,'ให้ครูเสนอผลงานรุ่นปัจจุบันก่อน');await save(key,old,{...value,consent:b.consent,revision:expected+1});
  }else{
   await access(u,c.id,true);if(typeof b.selected!=='boolean')fail(400,'เลือกเพิ่มหรือถอดผลงาน');if(b.selected&&s.status!=='graded')fail(409,'เลือกงานที่ตรวจแล้ว');const title=b.selected?string(b.title,'ชื่อผลงาน',150):value?.title||s.title,caption=typeof b.caption==='string'?b.caption.trim():'';if(caption.length>500)fail(400,'คำบรรยายไม่เกิน 500 ตัวอักษร');await save(key,old,{id:s.id,title,caption,selected:b.selected,consent:false,workRevision:s.revision,reviewedAt:s.reviewed_at,revision:expected+1,at:now()});
  }await log(u.id,c.id,'class_exhibit',{submissionId:id,operation:op,consent:b.consent,selected:b.selected});return reply({ok:true});
 }
 if(op==='memory'&&method==='POST'){
  if(!student)fail(403,'สมุดการเติบโตเป็นของนักเรียน');fields(b,[]);const state=await getState(u) as unknown as AppState,j=studentJourney(state,[c]),growth=treeGrowth(state,[c]),key=`island_memory:${u.id}:${c.id}`,old=await stored(key),frames:Memory[]=parse(old?.value)?.frames||[],day=bangkokDay();
  const profile=profileValue(state.islandPreferences?.find(p=>p.course_id===c.id)),frame:Memory={day,at:now(),sent:j.sent,earned:growth.earned,capacity:growth.capacity,ratio:growth.ratio,house:homeProgress(j.sent).stage,xp:j.xp,houseColor:profile.houseColor,companionName:profile.companionName,personality:profile.personality,communityStage:state.classChallenges?.find(ch=>ch.course_id===c.id)?.stage||0},last=frames.at(-1);if(last?.day===day&&['sent','earned','capacity','xp','houseColor','companionName','personality','communityStage'].every(k=>(last as any)[k]===(frame as any)[k]))return reply({memories:frames});
  await save(key,old,{frames:[...frames.filter(f=>f.day!==day),frame].slice(-180)});return reply({memories:[...frames.filter(f=>f.day!==day),frame].slice(-180)});
 }
 if(op==='recovery'&&method==='PATCH'){
  if(!student)fail(403,'แผนตามงานเป็นส่วนตัว');if(c.archived||c.published)fail(409,'รายวิชาปิดรับงานแล้ว');fields(b,['expectedRevision','restart','activeId']);const key=`island_recovery:${u.id}:${c.id}`,old=await stored(key),value=parse(old?.value),expected=integer(b.expectedRevision,'รุ่นแผน',0,2147483647);if(expected!==(value?.revision||0))fail(409,'แผนเปลี่ยนแล้ว กรุณาโหลดใหม่');
  const state=await getState(u) as unknown as AppState,j=studentJourney(state,[c]),ids=b.restart===true?j.remaining.map(e=>e.a.id):value?.ids||[];if('restart' in b&&typeof b.restart!=='boolean')fail(400,'ข้อมูลแผนไม่ถูกต้อง');const activeId=typeof b.activeId==='string'?b.activeId:'';if(activeId&&!ids.includes(activeId))fail(400,'งานไม่อยู่ในแผนนี้');const next={revision:expected+1,ids,activeId};await save(key,old,next);return reply({recovery:next});
 }
 return null;
}
