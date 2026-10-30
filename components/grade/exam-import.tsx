'use client';
import {useId,useRef,useState} from 'react';
import {Upload,Download,FileText} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {readExamFile,parseExamTable,parseExamText,questionIssues,type ExamImportSource,type ExamImportResult,type ImportedQuestion} from '@/lib/exam-import';
import {exportWorkbook} from '@/lib/files-client';
const example=`1. ดาวเคราะห์ใดอยู่ใกล้ดวงอาทิตย์ที่สุด
A. โลก
B. ดาวพุธ
C. ดาวอังคาร
D. ดาวเสาร์
เฉลย: B
คะแนน: 2

2. อธิบายการประหยัดพลังงานในชีวิตประจำวัน
ประเภท: ข้อเขียน
คะแนน: 3`;
export function ExamImporter({count,max,onApply}:{count:number;max:number;onApply:(questions:ImportedQuestion[],replace:boolean)=>void}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sources,setSources]=useState<ExamImportSource[]>([]),[source,setSource]=useState(0),[raw,setRaw]=useState(''),[result,setResult]=useState<ExamImportResult|null>(null),[filename,setFilename]=useState(''),[replace,setReplace]=useState(true);
 const input=useRef<HTMLInputElement>(null);const id=useId();
 const preview=(s:ExamImportSource)=>{setError('');setResult(null);setRaw(s.text??'');try{setResult(s.rows?parseExamTable(s.rows):parseExamText(s.text||''));}catch(e){setError((e as Error).message);}};
 const total=result?Math.round(result.questions.reduce((n,q)=>n+q.points,0)*100)/100:0;
 const unresolved=result?.questions.filter(q=>questionIssues(q).length).length||0;
 const template=async()=>{setBusy(true);setError('');try{await exportWorkbook([
  {'ประเภท':'เลือกตอบ','คำถาม':'ดาวเคราะห์ใดอยู่ใกล้ดวงอาทิตย์ที่สุด','คะแนน':2,'ตัวเลือก A':'โลก','ตัวเลือก B':'ดาวพุธ','ตัวเลือก C':'ดาวอังคาร','ตัวเลือก D':'ดาวเสาร์','ตัวเลือก E':'','ตัวเลือก F':'','เฉลย':'B'},
  {'ประเภท':'ข้อเขียน','คำถาม':'อธิบายการประหยัดพลังงานในชีวิตประจำวัน','คะแนน':3,'ตัวเลือก A':'','ตัวเลือก B':'','ตัวเลือก C':'','ตัวเลือก D':'','ตัวเลือก E':'','ตัวเลือก F':'','เฉลย':''}
 ],'แม่แบบนำเข้าข้อสอบ.xlsx','ข้อสอบ');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <section className='exam-import' aria-label='นำเข้าข้อสอบ'><div className='row'><Button type='button' variant='outline' onClick={()=>setOpen(v=>!v)} aria-expanded={open}><Upload size={16}/> นำเข้าข้อสอบจากไฟล์</Button><span className='muted'>Excel · Word · PDF</span></div>{open&&<div className='exam-import-body'>
 <p>อ่านไฟล์และตรวจตัวอย่างก่อนนำเข้า จากนั้นแก้ไขคำถาม เฉลย และคะแนนในแบบฟอร์มด้านล่าง แล้วกดบันทึกข้อสอบ ข้อมูลยังไม่ถูกบันทึกหรือเปิดสอบในขั้นตอนนี้</p>
 <div className='row'><Button type='button' disabled={busy} onClick={()=>input.current?.click()}><FileText size={16}/>{busy?'กำลังอ่านไฟล์…':'เลือกไฟล์ข้อสอบ'}</Button><Button type='button' variant='outline' disabled={busy} onClick={()=>void template()}><Download size={16}/> ดาวน์โหลดแม่แบบ Excel</Button></div>
 <input ref={input} className='exam-file-input' type='file' aria-label='ไฟล์ข้อสอบ' accept='.xlsx,.xls,.csv,.docx,.pdf,.doc' disabled={busy} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);setError('');setResult(null);setSources([]);setRaw('');setFilename(file.name);try{const data=await readExamFile(file);if(!data.length)throw new Error('ไฟล์ไม่มีชีตหรือข้อความ');setSources(data);setSource(0);preview(data[0]);}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}/>
 <p className='muted'>สูงสุด 15 MB / 100 ข้อ · PDF สูงสุด 30 หน้าและต้องมีข้อความ · Word ใช้ .docx · ไฟล์สแกนต้องแปลงด้วย OCR ก่อนนำเข้า</p>
 <details><summary>รูปแบบที่รองรับและตัวอย่าง Word / PDF</summary><p>Excel ใช้คอลัมน์ ประเภท, คำถาม, คะแนน, ตัวเลือก A–F, เฉลย (A–F / ก–ฉ / 1–6 / ข้อความตัวเลือก) ข้อเขียนเว้นตัวเลือกและเฉลยได้ ส่วน Word ใช้ตารางแบบเดียวกับ Excel หรือข้อความตามตัวอย่าง โดยขึ้นข้อใหม่ด้วย 1. และวางแต่ละตัวเลือกคนละบรรทัด</p><pre>{example}</pre><p>PDF ที่จัดหลายคอลัมน์อาจอ่านลำดับคลาดเคลื่อน ให้ตรวจและแก้ข้อความก่อนนำเข้า หากไม่ระบุคะแนนหรือเฉลย ระบบจะให้ครูเติมเอง</p><Button type='button' variant='outline' disabled={busy} onClick={()=>{setSources([{name:'ข้อความที่วางเอง',text:example}]);setSource(0);setFilename('ข้อความที่วางเอง');preview({name:'ข้อความที่วางเอง',text:example});}}>เปิดตัวอย่าง / วางข้อความเอง</Button></details>
 {filename&&<p className='exam-import-filename'>ไฟล์: {filename}</p>}
 {sources.length>1&&<label htmlFor={id+'sheet'}>เลือกชีต / ส่วนของเอกสาร<select id={id+'sheet'} disabled={busy} value={source} onChange={e=>{const next=Number(e.target.value);setSource(next);preview(sources[next]);}}>{sources.map((s,i)=><option value={i} key={i}>{s.name}</option>)}</select></label>}
 {sources[source]?.text!==undefined&&<label>ข้อความที่อ่านได้ — แก้ไขได้<Textarea aria-label='ข้อความข้อสอบที่อ่านได้' value={raw} disabled={busy} onChange={e=>{setRaw(e.target.value);setResult(null);}} rows={10} maxLength={600000}/><Button type='button' variant='outline' disabled={busy} onClick={()=>{setError('');try{setResult(parseExamText(raw));}catch(e){setResult(null);setError((e as Error).message);}}}>ตรวจตัวอย่างจากข้อความ</Button></label>}
 {error&&<p className='error' role='alert'>{error}</p>}
 {result&&<div className='exam-import-preview' aria-live='polite'><h3>ตัวอย่างข้อสอบ {result.questions.length} ข้อ · รวม {total} คะแนน</h3>{unresolved>0&&<p className='notice'>มี {unresolved} ข้อต้องแก้ไขคะแนน / ตัวเลือก / เฉลยในแบบฟอร์มก่อนบันทึก</p>}{total!==Number(max)&&<p className='notice'>คะแนนที่นำเข้า {total} ยังไม่เท่าคะแนนเต็ม {max} กรุณาปรับคะแนนรายข้อหรือคะแนนเต็มให้ตรงกันก่อนบันทึก</p>}
 <ol className='exam-import-list'>{result.questions.map((q,i)=><li key={i}><strong>{q.prompt||'(ไม่มีคำถาม)'}</strong><p className='muted'>{q.type==='choice'?`เลือกตอบ ${q.options.length} ตัวเลือก · เฉลย ${q.correct===null?'ยังไม่ระบุ':q.options[q.correct]}`:'ข้อเขียน · ครูตรวจ'} · {q.points} คะแนน</p>{questionIssues(q).length>0&&<p className='error'>{questionIssues(q).join(' · ')}</p>}</li>)}</ol>
 {result.warnings.length>0&&<details><summary>ข้อสังเกต {result.warnings.length} รายการ</summary><ul>{result.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
 <label htmlFor={id+'mode'}>วิธีนำเข้า<select id={id+'mode'} value={replace?'replace':'append'} onChange={e=>setReplace(e.target.value==='replace')}><option value='replace'>แทนที่คำถามในแบบฟอร์มทั้งหมด ({count} ข้อ)</option><option value='append'>เพิ่มต่อท้ายคำถามเดิม ({count} ข้อ)</option></select></label>
 {!replace&&count+result.questions.length>100&&<p className='error'>จำนวนข้อรวมเกิน 100 ข้อ กรุณาเลือกแทนที่หรือลดจำนวนข้อ</p>}
 <Button type='button' disabled={busy||(!replace&&count+result.questions.length>100)} onClick={()=>{onApply(result.questions.map(q=>({...q,options:[...q.options]})),replace);setOpen(false);setResult(null);setSources([]);setRaw('');setFilename('');}}>ยืนยันนำเข้าเพื่อแก้ไขในแบบฟอร์ม</Button></div>}
 </div>}</section>;
}
