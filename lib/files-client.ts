import type { ImportRow } from './client';
import { download } from './client';
import { calculateGrade } from './grades';
export type ParsedFile={headers:string[];rows:string[][];source:string};
const cellString=(v:unknown)=>v===null||v===undefined?'':String(v).trim();
function sheetRows(rows:unknown[][],source:string):ParsedFile{
 const clean=rows.map(r=>r.map(cellString)).filter(r=>r.some(Boolean));
 if(clean.length===0)throw new Error('ไม่พบข้อมูลในไฟล์');
 const headerIndex=clean.findIndex(r=>r.some(v=>/รหัส|student.?id|student.?code/i.test(v))&&r.some(v=>/ชื่อ|name/i.test(v)));
 if(headerIndex>=0)return {headers:clean[headerIndex],rows:clean.slice(headerIndex+1),source};
 return {headers:clean[0].map((_,i)=>`คอลัมน์ ${i+1}`),rows:clean,source};
}
export async function parseImport(file:File):Promise<ParsedFile>{
 if(file.size>15*1024*1024)throw new Error('ไฟล์นำเข้าต้องไม่เกิน 15 MB');
 const ext=file.name.split('.').pop()?.toLowerCase();const data=await file.arrayBuffer();
 if(['xlsx','xls','csv'].includes(ext||'')){
  const XLSX=await import('xlsx');const wb=XLSX.read(data,{type:'array',cellText:true});const rows=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false});if(rows.length>10000)throw new Error('ไฟล์มีข้อมูลมากเกินไป กรุณาแยกไฟล์');return sheetRows(rows,file.name);
 }
 if(ext==='docx'){
  const mammoth=await import('mammoth/mammoth.browser');const html=await mammoth.convertToHtml({arrayBuffer:data});const dom=new DOMParser().parseFromString(html.value,'text/html');const rows=Array.from(dom.querySelectorAll('table tr')).map(tr=>Array.from(tr.querySelectorAll('td,th')).map(td=>td.textContent||''));
  if(rows.length)return sheetRows(rows,file.name);
  const raw=await mammoth.extractRawText({arrayBuffer:data});return parseText(raw.value,file.name);
 }
 if(ext==='pdf'){
  const pdf=await import('pdfjs-dist');pdf.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';const task=pdf.getDocument({data:new Uint8Array(data),cMapUrl:'/pdf-cmaps/',cMapPacked:true,standardFontDataUrl:'/pdf-fonts/'});const doc=await task.promise;
  try{if(doc.numPages>30)throw new Error('PDF ต้องไม่เกิน 30 หน้า กรุณาแยกไฟล์');const rows:string[][]=[];
   for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p);const content=await page.getTextContent();const lines=new Map<number,{x:number;text:string}[]>();for(const item of content.items){if(!('str' in item))continue;const y=Math.round(item.transform[5]/3)*3;const line=lines.get(y)||[];line.push({x:item.transform[4],text:item.str});lines.set(y,line);}for(const [,line] of [...lines.entries()].sort((a,b)=>b[0]-a[0])){const sorted=line.sort((a,b)=>a.x-b.x).map(i=>i.text.trim()).filter(Boolean);if(sorted.length)rows.push(sorted);}}
   if(!rows.length)throw new Error('PDF นี้เป็นภาพสแกน กรุณาใช้ Excel / Word หรือกรอกข้อมูลในตารางตรวจสอบ');return sheetRows(rows,file.name);
  }finally{await task.destroy();}
 }
 throw new Error('รองรับ Excel (.xlsx/.xls), CSV, Word (.docx) และ PDF ที่มีข้อความ');
}
export function parseText(text:string,source='ข้อความ'):ParsedFile{
 const rows=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(s=>s.split(/\t|\s{2,}|,/).filter(Boolean));
 return sheetRows(rows,source);
}
export function mapImport(parsed:ParsedFile,map:{code:number;name:number;number:number;lastName?:number}):ImportRow[]{
 return parsed.rows.filter(r=>r[map.code]?.trim()).map((r,i)=>({code:r[map.code]?.trim()||'',name:[r[map.name]?.trim(),map.lastName!==undefined&&map.lastName>=0?r[map.lastName]?.trim():''].filter(Boolean).join(' '),number:map.number>=0?Number(r[map.number]):i+1}));
}
export async function exportWorkbook(rows:Record<string,unknown>[],filename:string,sheetName='รายชื่อ'){
 const excel=await import('exceljs');const ExcelJS=excel.default||excel;const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet(sheetName);const headers=Object.keys(rows[0]||{});ws.columns=headers.map(key=>({header:key,key,width:key.includes('ชื่อ')?30:18}));rows.forEach(r=>ws.addRow(r));
 ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF214ED3'}};ws.getRow(1).height=26;ws.views=[{state:'frozen',ySplit:1}];if(headers.length)ws.autoFilter={from:{row:1,column:1},to:{row:1,column:headers.length}};const data=await wb.xlsx.writeBuffer();download(data as BlobPart,filename,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
export function resultRows(state:any,course:any){return state.enrollments.filter((e:any)=>e.course_id===course.id&&e.active).map((e:any)=>{const g=calculateGrade(course,state.assignments,state.submissions,e);return {'เลขที่':e.number,'รหัสนักเรียน':e.student_code,'ชื่อ-นามสกุล':e.name,'ปีการศึกษา':state.periods.find((p:any)=>p.id===course.period_id)?.year,'ภาคเรียน':state.periods.find((p:any)=>p.id===course.period_id)?.term,'รหัสวิชา':course.code,'ห้องเรียน':course.classroom,'คะแนนเก็บก่อนกลางภาค':g.phases.before.earned,'คะแนนเก็บหลังกลางภาค':g.phases.after.earned,'คะแนนเก็บ':g.work,'กลางภาค':g.mid??'','ปลายภาค':g.final??'','คะแนนรวม':g.complete?g.total:'','เกรด':g.grade??'รอตรวจ','งานขาด':g.missing,'ชั่วโมงเข้าร่วม':e.attendance?.hours??0,'ร้อยละเข้าร่วม':e.attendance?.percent??0};});}
export type TemplateConfig={sheet:string;startRow:number;idColumn:string;workColumn:string;midColumn:string;finalColumn:string;totalColumn:string;gradeColumn:string;allowOverwrite:boolean};
export async function readTemplate(file:File){if(!/\.xlsx$/i.test(file.name))throw new Error('ไฟล์ต้นแบบต้องเป็น .xlsx');if(file.size>15*1024*1024)throw new Error('ไฟล์ต้องไม่เกิน 15 MB');const excel=await import('exceljs');const ExcelJS=excel.default||excel;const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());return wb;}
export function fillTemplate(wb:any,config:TemplateConfig,rows:Record<string,unknown>[],apply=false){
 const ws=wb.getWorksheet(config.sheet);if(!ws)throw new Error('ไม่พบแผ่นงาน');if(!Number.isInteger(config.startRow)||config.startRow<1||config.startRow>10000)throw new Error('แถวเริ่มต้นไม่ถูกต้อง');
 const columns=[config.idColumn,config.workColumn,config.midColumn,config.finalColumn,config.totalColumn,config.gradeColumn].map(c=>c.trim().toUpperCase());if(!/^[A-Z]{1,3}$/.test(columns[0]))throw new Error('กรุณาระบุคอลัมน์รหัสนักเรียน เช่น A');if(columns.slice(1).some(c=>c&&!/^[A-Z]{1,3}$/.test(c)))throw new Error('คอลัมน์ต้องเป็นตัวอักษร เช่น D');const nonempty=columns.filter(Boolean);if(new Set(nonempty).size!==nonempty.length)throw new Error('คอลัมน์รหัสและคะแนนต้องไม่ซ้ำกัน');if(!columns.slice(1).some(Boolean))throw new Error('ระบุคอลัมน์คะแนนอย่างน้อยหนึ่งคอลัมน์');
 const studentMap=new Map(rows.map(r=>[String(r['รหัสนักเรียน']).trim(),r]));const seen=new Set();const changes:any[]=[];const unmatched:any[]=[];const conflicts:any[]=[];
 for(let row=config.startRow;row<=Math.min(ws.rowCount,10000);row++){const cell=ws.getCell(`${columns[0]}${row}`);const code=String(cell.text||cell.value||'').trim();if(!code)continue;const student=studentMap.get(code);if(!student){unmatched.push({row,code});continue;}if(seen.has(code))throw new Error(`รหัส ${code} ซ้ำในไฟล์ต้นแบบ`);seen.add(code);
  if(student['เกรด']==='รอตรวจ')throw new Error(`ยังตรวจหรือกรอกคะแนนของ ${code} ไม่ครบ`);
  ['คะแนนเก็บ','กลางภาค','ปลายภาค','คะแนนรวม','เกรด'].forEach((field,i)=>{if(!columns[i+1])return;const target=ws.getCell(`${columns[i+1]}${row}`);const value=student[field];if(target.value!==null&&target.value!==undefined&&target.value!==''&&!config.allowOverwrite){conflicts.push({cell:target.address,code});return;}changes.push({cell:target.address,code,field,value});});
 }
 for(const change of changes){if(ws.getCell(change.cell).isMerged)throw new Error(`เซลล์ ${change.cell} ถูกรวม กรุณาแก้ต้นแบบก่อน`);}
 const missing=rows.filter(r=>!seen.has(String(r['รหัสนักเรียน']).trim())).map(r=>r['รหัสนักเรียน']);
 if(apply){if(conflicts.length)throw new Error('มีเซลล์ที่มีข้อมูลเดิม กรุณาตรวจสอบและเลือกอนุญาตเขียนทับก่อน');if(missing.length)throw new Error('ไฟล์ต้นแบบไม่มีรหัสนักเรียนบางคน กรุณาตรวจสอบให้ครบก่อนส่งออก');changes.forEach(c=>{const cell=ws.getCell(c.cell);if(cell.isMerged)throw new Error(`เซลล์ ${c.cell} ถูกรวม กรุณาแก้ต้นแบบก่อน`);cell.value=c.value;});}
 return {changes,unmatched,missing,conflicts,matched:seen.size};
}


export function guessMapping(headers:string[]){
 const code=Math.max(0,headers.findIndex(h=>/รหัส|student.?id|student.?code/i.test(h)));
 const name=Math.max(0,headers.findIndex(h=>/ชื่อ|name/i.test(h)&&!/^(นามสกุล|last.?name|surname)$/i.test(h)));
 const number=headers.findIndex(h=>/เลขที่|number|no\.?$/i.test(h));
 const lastName=headers.findIndex(h=>/นามสกุล|last.?name|surname/i.test(h)&&!/(ชื่อ.*นามสกุล|full)/i.test(h));
 return {code,name,number,lastName};
}
