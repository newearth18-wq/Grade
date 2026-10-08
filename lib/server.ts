import { env } from 'cloudflare:workers';
export class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
export function database():D1Database { if(!env.DB) throw new HttpError(503,'ฐานข้อมูลยังไม่พร้อม กรุณาลองใหม่');return env.DB; }
export function bucket():R2Bucket {if(!env.BUCKET) throw new HttpError(503,'พื้นที่เก็บไฟล์ยังไม่พร้อม กรุณาลองใหม่');return env.BUCKET;}
export function stmt(sql:string,...args:unknown[]){return database().prepare(sql).bind(...args);}
export async function one<T=Record<string,any>>(sql:string,...args:unknown[]){return stmt(sql,...args).first<T>();}
export async function all<T=Record<string,any>>(sql:string,...args:unknown[]){return (await stmt(sql,...args).all<T>()).results;}
export const uid=()=>crypto.randomUUID();
export const now=()=>new Date().toISOString();
export function fail(status:number,message:string):never {throw new HttpError(status,message);}
export function string(v:unknown,label:string,max=300){if(typeof v!=='string'||!v.trim()||v.trim().length>max)fail(400,`${label}ไม่ถูกต้อง`);return v.trim();}
export function number(v:unknown,label:string,min=0,max=100){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(400,`${label}ต้องอยู่ระหว่าง ${min}–${max}`);return v;}
export function integer(v:unknown,label:string,min=1,max=9999){const n=number(v,label,min,max);if(!Number.isInteger(n))fail(400,`${label}ต้องเป็นจำนวนเต็ม`);return n;}
export function ensureSameOrigin(r:Request){const origin=r.headers.get('origin');if((origin&&origin!==new URL(r.url).origin)||r.headers.get('sec-fetch-site')==='cross-site')fail(403,'คำขอไม่ถูกต้อง กรุณาเปิดจากหน้าระบบ');}
export async function jsonBody(r:Request){if(!r.headers.get('content-type')?.includes('application/json'))fail(415,'กรุณาส่งข้อมูล JSON');const t=await r.text();if(t.length>800000)fail(413,'ข้อมูลมากเกินไป');try{return JSON.parse(t);}catch{fail(400,'ข้อมูลไม่ถูกต้อง');}}
export function reply(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...headers}});}
export async function log(actorId:string,courseId:string|null,action:string,detail:unknown){await stmt('INSERT INTO audit (id,actor_id,course_id,action,detail,created_at) VALUES (?,?,?,?,?,?)',uid(),actorId,courseId,action,JSON.stringify(detail),now()).run();}

