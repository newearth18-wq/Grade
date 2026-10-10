export type Row={id:string;[key:string]:any};
export type AppState={attendanceSessions?:Row[];attendanceRecords?:Row[];followupNotes?:Row[];notificationReads?:Row[];user:Row;periods:Row[];subjects:Row[];courses:Row[];enrollments:Row[];assignments:Row[];submissions:Row[];files:Row[];students:Row[];extensions:Row[];staff:Row[];people:Row[];profiles:Row[];history:Row[]};
export type ImportRow={code:string;name:string;number:number};
export class ApiError extends Error {constructor(message:string,public status=0){super(message);this.name='ApiError';}}
export async function api(path:string,body?:unknown,method='POST'):Promise<any>{
 let response:Response;try{response=await fetch(`/api/${path}`,body===undefined?{credentials:'same-origin',cache:'no-store'}:body instanceof FormData?{method,body,credentials:'same-origin'}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'same-origin'});}catch{throw new ApiError('เชื่อมต่อระบบไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง');}
 let result:any;try{result=await response.json();}catch{throw new ApiError('ยังยืนยันผลจากระบบไม่ได้ กรุณาลองอีกครั้ง',response.ok?0:response.status);}
 if(!response.ok)throw new ApiError(result.error||'ทำรายการไม่สำเร็จ',response.status);return result;
}
export function download(data:BlobPart,name:string,type='application/octet-stream'){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export const dateThai=(value:string)=>new Date(value).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric'});
export const timeThai=(value:string)=>new Date(value).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
export function localDue(iso:string){return new Date(new Date(iso).getTime()+7*3600000).toISOString().slice(0,16);}
export const dueISO=(v:string)=>new Date(v+':00+07:00').toISOString();

