import { fail, one, stmt, uid } from './server';
export type User={id:string;username:string;name:string;role:'admin'|'teacher'|'homeroom'|'student';must_change:number;active:number};
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
export async function digest(t:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)));}
export async function hashPassword(password:string,salt=hex(crypto.getRandomValues(new Uint8Array(16)).buffer)){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 return `${salt}:${hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))}`;
}
export function passwordValid(p:unknown){if(typeof p!=='string'||p.length<10||p.length>128)fail(400,'รหัสผ่านต้องมีความยาว 10–128 ตัวอักษร');return p;}
export async function matches(p:string,stored:string){const actual=await hashPassword(p,stored.split(':')[0]);let diff=actual.length^stored.length;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^(stored.charCodeAt(i)||0);return diff===0;}
export function cookie(r:Request,token:string,maxAge=604800){return `grade_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${new URL(r.url).protocol==='https:'?'; Secure':''}`;}
export async function session(r:Request,userId:string){const token=uid()+uid();await stmt('INSERT INTO sessions (token,user_id,expires) VALUES (?,?,?)',await digest(token),userId,Date.now()+604800000).run();return cookie(r,token);}
// Existing compulsory temporary student passwords become optional code defaults.
// The conditional update preserves a personal password changed concurrently.
export async function upgradeStudentInitialPassword(u:User){if(u.role==='student'&&u.must_change){await stmt("UPDATE users SET password=?,must_change=0 WHERE id=? AND role='student' AND must_change=1",await hashPassword(u.username),u.id).run();}}
export async function currentUser(r:Request):Promise<User|null>{const token=r.headers.get('cookie')?.match(/(?:^|;\s*)grade_session=([^;]+)/)?.[1];if(!token)return null;let u=await one<User>('SELECT u.id,u.username,u.name,u.role,u.must_change,u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1',await digest(token),Date.now());if(u?.role==='student'&&u.must_change){await upgradeStudentInitialPassword(u);u=await one<User>('SELECT id,username,name,role,must_change,active FROM users WHERE id=? AND active=1',u.id);}return u;}
export async function requireUser(r:Request){const u=await currentUser(r);if(!u)fail(401,'กรุณาเข้าสู่ระบบ');return u!;}
export function teacher(u:User){if(!['teacher','admin'].includes(u.role))fail(403,'เฉพาะครูเท่านั้น');}
export async function ownCourse(u:User,id:string,write=false){const c=await one('SELECT * FROM courses WHERE id=?',id);if(!c)fail(404,'ไม่พบรายวิชา');if(u.role!=='student'){if(u.role!=='admin'&&c!.owner_id!==u.id&&!await one('SELECT id FROM course_staff WHERE course_id=? AND user_id=?'+(write?" AND permission='edit'":''),id,u.id))fail(403,'ไม่มีสิทธิ์ในรายวิชานี้');if(write&&u.role==='homeroom')fail(403,'บัญชีครูประจำชั้นดูข้อมูลได้เท่านั้น');}else if(write)fail(403,'นักเรียนแก้ไขรายวิชาไม่ได้');else if(!await one('SELECT id FROM enrollments WHERE course_id=? AND student_id=? AND active=1',id,u.id))fail(403,'คุณไม่ได้ลงทะเบียนรายวิชานี้');return c!;}
