import {all} from './server';
import type {User} from './auth';
export function scopeFor(u:User){return u.role==='admin'?{sql:'1=1',args:[] as unknown[]}:u.role==='student'?{sql:'EXISTS (SELECT 1 FROM enrollments access WHERE access.course_id=c.id AND access.student_id=? AND access.active=1)',args:[u.id]}:{sql:'(c.owner_id=? OR EXISTS (SELECT 1 FROM course_staff access WHERE access.course_id=c.id AND access.user_id=?))',args:[u.id,u.id]};}
export async function getState(u:User){
 const {sql:scope,args}=scopeFor(u),student=u.role==='student';
 const courses=await all(`SELECT c.* FROM courses c WHERE ${scope} ORDER BY c.rowid DESC`,...args);
 for(const c of courses)c.can_edit=u.role==='admin'||c.owner_id===u.id||(u.role==='teacher'&&!!await all('SELECT id FROM course_staff WHERE course_id=? AND user_id=? AND permission=?',c.id,u.id,'edit').then(x=>x.length));
 const periods=student?await all(`SELECT DISTINCT p.* FROM periods p JOIN courses c ON c.period_id=p.id WHERE ${scope} ORDER BY p.year DESC,p.term DESC`,...args):await all('SELECT * FROM periods ORDER BY year DESC,term DESC');
 const assignments=await all(`SELECT a.* FROM assignments a JOIN courses c ON c.id=a.course_id WHERE ${scope} ORDER BY a.due_at,a.id`,...args);
 const enrollments=await all(`SELECT e.* FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE ${scope} ${student?'AND e.student_id=?':''} ORDER BY e.number`,...args,...(student?[u.id]:[]));
 const submissions=await all(`SELECT s.* FROM submissions s JOIN assignments a ON a.id=s.assignment_id JOIN courses c ON c.id=a.course_id WHERE ${scope} ${student?'AND s.student_id=?':''}`,...args,...(student?[u.id]:[]));
 const files=await all(`SELECT f.* FROM files f JOIN courses c ON c.id=f.course_id WHERE ${scope} ${student?'AND (f.student_id IS NULL OR f.student_id=?)':''}`,...args,...(student?[u.id]:[]));
 const extensions=await all(`SELECT x.* FROM extensions x JOIN assignments a ON a.id=x.assignment_id JOIN courses c ON c.id=a.course_id WHERE ${scope} ${student?'AND x.student_id=?':''}`,...args,...(student?[u.id]:[]));
 if(student)for(const e of enrollments)if(!courses.find(c=>c.id===e.course_id)?.published){e.mid=null;e.final=null;e.special='';}
 const students=student?[]:await all(`SELECT DISTINCT u.id,u.username,u.name,u.active,u.must_change FROM users u JOIN enrollments e ON e.student_id=u.id JOIN courses c ON c.id=e.course_id WHERE ${scope} ORDER BY u.username`,...args);
 const staff=student?[]:await all(`SELECT cs.*,u.name,u.username,u.role FROM course_staff cs JOIN users u ON u.id=cs.user_id JOIN courses c ON c.id=cs.course_id WHERE ${scope}`,...args);
 const people=u.role==='admin'?await all("SELECT id,username,name,role,active,must_change FROM users WHERE role!='student' ORDER BY name"):[];
 const profiles=student?[]:await all('SELECT * FROM sgs_profiles WHERE owner_id=? ORDER BY created_at DESC',u.id);
 const history=student?[]:await all(`SELECT a.*,u.name actor_name FROM audit a JOIN users u ON u.id=a.actor_id JOIN courses c ON c.id=a.course_id WHERE ${scope} ORDER BY a.created_at DESC LIMIT 500`,...args);
 const subjects=await all(`SELECT DISTINCT s.* FROM subjects s JOIN courses c ON c.subject_id=s.id WHERE ${scope} ORDER BY s.name`,...args);
 return {user:u,subjects,courses,periods,assignments,enrollments,submissions,files,students,extensions,staff,people,profiles,history};
}
