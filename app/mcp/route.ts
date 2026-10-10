import {env} from 'cloudflare:workers';
import {all,one,reply,HttpError} from '@/lib/server';
import {snapshotCourse} from '@/lib/snapshots-server';
import {getState} from '@/lib/state';
import type {User} from '@/lib/auth';

const tools=[{name:'daily_classroom_backup',description:'Create complete daily recovery snapshots, including uploaded files, for enabled classroom owners. Existing snapshots for today are reused.',inputSchema:{type:'object',properties:{},additionalProperties:false}},{name:'classroom_backup_status',description:'Read aggregate backup completion and failure counts without exposing student records or files.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}}];
export async function POST(r:Request){
 let id:any=null;
 try {
  const body:any=await r.json();id=body.id??null;
  const result=(value:any)=>reply({jsonrpc:'2.0',id,result:value});
  if(body.method==='server/discover')return result({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
  if(body.method==='tools/list')return result({tools});
  if(body.method!=='tools/call')return reply({jsonrpc:'2.0',id,error:{code:-32601,message:'Unknown method'}});
  // Sites verifies and supplies this identity. A Grade login cookie cannot grant unattended access.
  const owner=(env as any).BACKUP_OWNER_EMAIL;
  if(!owner||r.headers.get('oai-authenticated-user-email')?.toLowerCase()!==String(owner).toLowerCase()||!r.headers.get('oai-authenticated-user-id'))throw new HttpError(403,'Only the verified Site owner may run unattended backups');
  const bootstrap=await one('SELECT value FROM settings WHERE key=?','bootstrap');
  const admin=bootstrap&&await one<User>("SELECT id,username,name,role,must_change,active FROM users WHERE id=? AND role='admin' AND active=1",bootstrap.value);
  if(!admin)throw new HttpError(409,'Grade administrator is unavailable');
  if(body.params?.arguments&&Object.keys(body.params.arguments).length)throw new HttpError(400,'This tool accepts no arguments');
  if(body.params?.name==='daily_classroom_backup'){
   const owners=await all<User>("SELECT id,username,name,role,must_change,active FROM users WHERE active=1 AND role IN ('admin','teacher')");
   let completed=0;const errors:string[]=[];
   for(const u of owners){if((await one('SELECT value FROM settings WHERE key=?','backup-auto:'+u.id))?.value==='0')continue;const state=await getState(u);
    for(const c of state.courses.filter(c=>c.owner_id===u.id&&!c.archived)){try{await snapshotCourse(u,c.id,'daily',true);completed++;}catch(e){errors.push((e as Error).message);}}
   }
   return result({content:[{type:'text',text:JSON.stringify({completed,failed:errors.length,errors})}],isError:errors.length>0});
  }
  if(body.params?.name==='classroom_backup_status')return result({content:[{type:'text',text:JSON.stringify(await all("SELECT status,COUNT(*) AS count,MAX(created_at) AS latest FROM backup_snapshots WHERE kind='daily' AND substr(datetime(created_at,'+7 hours'),1,10)=? GROUP BY status",new Date(Date.now()+7*3600000).toISOString().slice(0,10)))}]});
  throw new HttpError(404,'Unknown tool');
 }catch(e){return reply({jsonrpc:'2.0',id,result:{content:[{type:'text',text:(e as Error).message}],isError:true}});}
}
