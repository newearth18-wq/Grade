'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {api,timeThai} from '@/lib/client';
import {BusyButton} from './shared';

export function DriveBackupPanel(){
 const [data,setData]=useState<any>(null),[account,setAccount]=useState(''),[folder,setFolder]=useState(''),[token,setToken]=useState(''),[showToken,setShowToken]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const load=async()=>{const r=await api('drive-backup/status');setData(r);};
 useEffect(()=>{void load().catch(e=>setError(e.message));const t=setInterval(()=>void load().catch(()=>{}),15000);return()=>clearInterval(t);},[]);
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setMessage('');try{await fn();await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const config=data?.config,active=config?.mode==='drive';
 return <section className="panel"><h2>สำรองบนเซิร์ฟเวอร์ Google Drive</h2>
  <p className="muted">Google ทำงานทุกวันช่วง 02:00–03:00 น. เวลาไทย แม้ปิดคอม ชุดละไม่เกิน 250 MB ชุดสำรองมีข้อมูลและไฟล์แนบ ไม่รวมรหัสผ่าน งานต้นฉบับและคะแนนยังใช้ที่เก็บเดิม</p>
  <p className={active?'notice':'muted'} role="status">{active?'เปิดใช้ Drive แล้ว · ชุดใหม่เข้าคิวให้ Google ดึงไปเก็บ โดยไม่สร้างสำเนาไฟล์สำรองเพิ่มใน Cloudflare':config?'รอตรวจชุดแรก · ระบบสำรอง Cloudflare เดิมยังทำงานจนกว่า Google ส่งและตรวจไฟล์ครบ':'ยังไม่ได้เชื่อม · ระบบสำรองเดิมยังทำงาน'}</p>
  {config&&<p>บัญชีปลายทาง: {config.account} · <a href={'https://drive.google.com/drive/folders/'+config.folderId} target="_blank" rel="noopener noreferrer">เปิดโฟลเดอร์สำรอง</a><br/>สำเร็จล่าสุด: {config.lastSuccess?timeThai(config.lastSuccess):'ยังไม่มีชุดจากการเชื่อมนี้'}</p>}
  {config?.lastSuccess&&Date.now()-Date.parse(config.lastSuccess)>36*3600000&&<p className="error">ยังไม่มีชุดสำรองใหม่เกิน 36 ชั่วโมง กรุณาตรวจ Google Apps Script และการตั้งเวลาทำงาน</p>}
  {config?.lastError&&<p className="error" role="alert">{config.lastError}</p>}
  <details><summary>ตั้งค่าหรือเปลี่ยนการเชื่อมต่อ</summary><p>ใช้บัญชี Google และโฟลเดอร์ส่วนตัวที่ต้องการเก็บข้อมูลนักเรียน การเปลี่ยนกุญแจจะเพิกถอนกุญแจเดิมทันที และกลับไปรอตรวจชุดแรก</p>
   <div className="form-grid"><label>อีเมลบัญชี Google ปลายทาง<Input type="email" value={account} onChange={e=>setAccount(e.target.value)} autoComplete="off"/></label><label>ลิงก์โฟลเดอร์ Drive<Input value={folder} onChange={e=>setFolder(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." autoComplete="off"/></label></div>
   <p className="muted">กุญแจนี้ให้สิทธิ์อ่านข้อมูลสำรองและยืนยันการส่งเท่านั้น ไม่ให้แก้คะแนน เก็บไว้ใน Script Properties ของโปรเจกต์ส่วนตัว ห้ามใส่ในโค้ดสาธารณะ</p>
   <BusyButton busy={busy} disabled={!account||!folder} onClick={()=>void run(async()=>{const r=await api('drive-backup/setup',{account,folder});setToken(r.token);setMessage('สร้างกุญแจและคิวชุดแรกแล้ว คัดลอกกุญแจไป Script Properties แล้วเรียก setupDriveBackup ใน Google');})}>สร้างกุญแจและเตรียมชุดแรก</BusyButton>
   {token&&<div className="notice"><p>แสดงกุญแจเพียงครั้งนี้ หากปิดหน้านี้ต้องสร้างใหม่</p><label>GRADE_BACKUP_KEY<Input value={token} readOnly type={showToken?'text':'password'} autoComplete="off"/></label><Button variant="outline" onClick={()=>void navigator.clipboard.writeText(token).then(()=>setMessage('คัดลอกกุญแจแล้ว')).catch(()=>setError('คัดลอกไม่ได้ กดแสดงกุญแจแล้วคัดลอกด้วยตนเอง'))}>คัดลอกกุญแจ</Button><Button variant="ghost" onClick={()=>setShowToken(v=>!v)}>{showToken?'ซ่อนกุญแจ':'แสดงกุญแจ'}</Button></div>}
   <ol><li>ดาวน์โหลด <a href="/backup/GradeDriveBackup.gs" download>โค้ด Google Apps Script</a> และ <a href="/backup/appsscript.json" download>ไฟล์ตั้งค่า appsscript.json</a> ไปใช้ในโปรเจกต์ส่วนตัว</li><li>ตั้ง Script Properties: GRADE_URL = ที่อยู่เว็บ Grade, GRADE_BACKUP_KEY = กุญแจด้านบน</li><li>เรียก setupDriveBackup และอนุญาต Google ด้วยบัญชีปลายทาง สคริปต์ตรวจบัญชีและโฟลเดอร์ก่อนส่งงาน</li></ol>
   {config&&<Button variant="outline" disabled={busy} onClick={()=>void run(async()=>{await api('drive-backup/revoke',{});setToken('');setMessage('เพิกถอนกุญแจแล้ว กลับมาใช้การสำรอง Cloudflare เดิม');})}>เพิกถอนกุญแจและกลับใช้ระบบเดิม</Button>}
  </details>
  {config&&<div className="row"><BusyButton busy={busy} onClick={()=>void run(async()=>{await api('drive-backup/queue',{});setMessage('เพิ่มคิวแล้ว รอ Google ดึงไปสำรอง การเพิ่มคิวยังไม่ใช่การส่งสำเร็จ');})}>เพิ่มคิวสำรองตอนนี้</BusyButton><Button variant="outline" disabled={busy} onClick={()=>void run(load)}>ตรวจสถานะ</Button></div>}
  {(data?.jobs||[]).map((j:any)=><article className="snapshot-row" key={j.id}><strong>{timeThai(j.created_at)} · {j.kind==='initial'?'ชุดแรก':j.kind==='daily'?'รายวัน':'จุดกู้คืน'}</strong><p>{({queued:'รอ Google ดึงข้อมูล',running:'กำลังส่งและตรวจ',complete:'ตรวจครบแล้ว',cancelled:'ยกเลิกการเชื่อมเดิม'} as any)[j.status]||j.status} · {j.file_count} ไฟล์ · {(j.size/1024/1024).toFixed(2)} MB</p>{j.error&&<p className="error">{j.error}</p>}{j.status==='complete'&&j.folder_id&&<a href={'https://drive.google.com/drive/folders/'+j.folder_id} target="_blank" rel="noopener noreferrer">เปิดชุดสำรองใน Drive</a>}</article>)}
  <p className="muted">ดาวน์โหลดโฟลเดอร์ชุดที่สำเร็จจาก Drive เป็น ZIP แล้วเลือก ZIP ในช่องกู้คืนครบชุดของ Grade ชุดเก่าที่เคยเก็บใน Cloudflare ยังอยู่จนกว่าจะย้ายและตรวจแยกต่างหาก</p>
  {message&&<p className="notice" role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}
 </section>;
}
