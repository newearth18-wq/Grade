export type ImportedQuestion = {type:'choice'|'written';prompt:string;points:number;options:string[];correct:number|null};
export type ExamImportResult = {questions:ImportedQuestion[];warnings:string[]};
export type ExamImportSource = {name:string;text?:string;rows?:string[][]};
const letters = ['A','B','C','D','E','F'];
const thai = ['ก','ข','ค','ง','จ','ฉ'];
const norm = (s:string) => s.trim().toLowerCase().replace(/[\s_\-./()]/g,'');
const aliases:Record<string,string[]> = {
 prompt:['คำถาม','โจทย์','question','prompt'],type:['ประเภท','ชนิด','type'],points:['คะแนน','คะแนนเต็ม','points','score'],answer:['เฉลย','คำตอบ','answer','correct'],
 ...Object.fromEntries(letters.map((l,i)=>[l,[l,thai[i],`ตัวเลือก${l}`,`ตัวเลือก${thai[i]}`,`ตัวเลือก${i+1}`,`option${l}`,`choice${l}`]]))
};
export function answerIndex(answer:string,options:string[]):number|null {
 const clean=answer.trim().replace(/^(?:ตัวเลือก|option|choice)\s*/i,'').replace(/[.)、]$/,'').trim();
 if(!clean)return null;
 let i=letters.indexOf(clean.toUpperCase());if(i<0)i=thai.indexOf(clean);
 if(i<0&&/^[1-6]$/.test(clean))i=Number(clean)-1;
 if(i<0)i=options.findIndex(o=>o.trim()===clean);
 return i>=0&&i<options.length?i:null;
}
export function questionIssues(q:ImportedQuestion):string[] {
 const issues:string[]=[];
 if(!q.prompt.trim())issues.push('ไม่มีคำถาม');if(q.prompt.length>5000)issues.push('คำถามเกิน 5,000 ตัวอักษร');
 if(!Number.isFinite(q.points)||q.points<=0)issues.push('ต้องระบุคะแนนมากกว่า 0');
 if(q.type==='choice'){
  if(q.options.length<2||q.options.length>6)issues.push('ต้องมี 2–6 ตัวเลือก');
  if(q.options.some(o=>!o.trim()||o.length>2000))issues.push('ตัวเลือกว่างหรือยาวเกิน 2,000 ตัวอักษร');
  if(q.correct===null||!Number.isInteger(q.correct)||q.correct<0||q.correct>=q.options.length)issues.push('ต้องเลือกเฉลย');
 }
 return issues;
}
function finish(questions:ImportedQuestion[],warnings:string[]):ExamImportResult {
 if(questions.length>100)throw new Error('นำเข้าได้ไม่เกิน 100 ข้อต่อครั้ง กรุณาแบ่งไฟล์');
 if(!questions.length)throw new Error('ไม่พบข้อสอบ กรุณาใช้ตารางตามแม่แบบ หรือข้อความที่ขึ้นต้นด้วย 1. คำถาม');
 return {questions,warnings};
}
export function parseExamTable(rows:string[][]):ExamImportResult {
 let header=-1;let map:Record<string,number>={};
 for(let r=0;r<Math.min(rows.length,20);r++){
  const candidate:Record<string,number>={};rows[r].forEach((v,i)=>{for(const [key,names] of Object.entries(aliases))if(names.some(n=>norm(n)===norm(v)))candidate[key]=i;});
  if(candidate.prompt!==undefined){header=r;map=candidate;break;}
 }
 if(header<0)throw new Error('ไม่พบหัวคอลัมน์ คำถาม / Question กรุณาใช้แม่แบบ Excel');
 const questions:ImportedQuestion[]=[];const warnings:string[]=[];
 for(let r=header+1;r<rows.length;r++){
  const row=rows[r];if(!row.some(v=>v.trim()))continue;
  const get=(key:string)=>map[key]===undefined?'':String(row[map[key]]??'').trim();
  const opts=letters.map(l=>get(l));while(opts.length&&!opts[opts.length-1])opts.pop();
  const declared=norm(get('type'));const written=['ข้อเขียน','อัตนัย','written','essay'].includes(declared);
  const choice=['เลือกตอบ','ปรนัย','choice','mcq','multiplechoice'].includes(declared);
  if(declared&&!written&&!choice)warnings.push(`แถว ${r+1}: ไม่รู้จักประเภท “${get('type')}” กรุณาตรวจชนิดข้อ`);
  const type=written?'written':choice?'choice':opts.length?'choice':'written';
  const parsedPoints=Number(get('points'));
  const q:ImportedQuestion={type,prompt:get('prompt'),points:Number.isFinite(parsedPoints)?parsedPoints:0,options:type==='choice'?opts:[],correct:type==='choice'?answerIndex(get('answer'),opts):null};
  questions.push(q);
  questionIssues(q).forEach(issue=>warnings.push(`แถว ${r+1}: ${issue}`));
 }
 return finish(questions,warnings);
}
export function parseExamText(text:string):ExamImportResult {
 const lines=text.replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(Boolean);
 const questions:ImportedQuestion[]=[];const warnings:string[]=[];
 let current:ImportedQuestion|null=null;let pendingAnswer='';let optionIndex=-1;let answerSection=false;let ignored=0;let sourceNumber=0;const numbered=new Map<number,ImportedQuestion>();
 const flush=()=>{if(current){current.correct=current.type==='choice'?answerIndex(pendingAnswer,current.options):null;questions.push(current);}current=null;pendingAnswer='';optionIndex=-1;};
 for(const line of lines){
  if(/^(?:เฉลย|answer\s*key)\s*[:：]?$/i.test(line)){flush();answerSection=true;continue;}
  if(answerSection){
   const key=line.match(/^(?:ข้อ\s*)?(\d+)\s*[.)\-:：]\s*(.+)$/i);
   if(key){const q=numbered.get(Number(key[1]));if(q?.type==='choice')q.correct=answerIndex(key[2],q.options);else warnings.push(`เฉลยข้อ ${key[1]}: ไม่พบข้อเลือกตอบที่ตรงกัน`);}else warnings.push(`อ่านบรรทัดเฉลยไม่ได้: ${line.slice(0,100)}`);
   continue;
  }
  const start=line.match(/^(?:ข้อ\s*)?(\d+)\s*[.)\-:：]\s*(.+)$/);
  if(start){flush();const n=Number(start[1]);if(n!==sourceNumber+1)warnings.push(`ลำดับข้อในไฟล์กระโดดหรือซ้ำ (${sourceNumber} → ${n}) กรุณาตรวจว่าข้อสอบครบ`);sourceNumber=n;current={type:'written',prompt:start[2],points:0,options:[],correct:null};numbered.set(n,current);continue;}
  if(!current){ignored++;continue;}
  const answer=line.match(/^(?:เฉลย|คำตอบ|answer|correct)\s*[:：]\s*(.+)$/i);
  if(answer){pendingAnswer=answer[1];optionIndex=-1;continue;}
  const points=line.match(/^(?:คะแนน|points|score)\s*[:：]\s*(\d+(?:\.\d+)?)\s*(?:คะแนน)?$/i);
  if(points){current.points=Number(points[1]);optionIndex=-1;continue;}
  const type=line.match(/^(?:ประเภท|type)\s*[:：]\s*(.+)$/i);
  if(type){current.type=/ข้อเขียน|อัตนัย|written|essay/i.test(type[1])?'written':'choice';optionIndex=-1;continue;}
  const option=line.match(/^([A-Fa-fกขคงจฉ])\s*[.)\-:：]\s*(.*)$/);
  if(option){const i=Math.max(letters.indexOf(option[1].toUpperCase()),thai.indexOf(option[1]));if(current.options[i]!==undefined)warnings.push(`ข้อ ${questions.length+1}: ตัวเลือก ${option[1]} ซ้ำ`);while(current.options.length<=i)current.options.push('');current.options[i]=option[2];current.type='choice';optionIndex=i;continue;}
  if(optionIndex>=0)current.options[optionIndex]+='\n'+line;else current.prompt+='\n'+line;
 }
 flush();
 if(ignored)warnings.push(`มีข้อความก่อนข้อแรก ${ignored} บรรทัดที่ไม่นำเข้า เช่น ชื่อข้อสอบและคำชี้แจง กรุณากรอกแยกในแบบฟอร์ม`);
 questions.forEach((q,i)=>questionIssues(q).forEach(issue=>warnings.push(`ข้อ ${i+1}: ${issue}`)));
 return finish(questions,warnings);
}
export async function readExamFile(file:File):Promise<ExamImportSource[]> {
 if(file.size>15*1024*1024)throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 15 MB');
 const ext=file.name.split('.').pop()?.toLowerCase();const data=await file.arrayBuffer();
 if(['xlsx','xls','csv'].includes(ext||'')){
  const XLSX=await import('xlsx');const wb=XLSX.read(data,{type:'array',cellText:true});
  return wb.SheetNames.map(name=>{const rows=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name],{header:1,defval:'',raw:false});if(rows.length>10000)throw new Error('ชีตมีมากกว่า 10,000 แถว กรุณาแบ่งไฟล์');return {name,rows:rows.map(r=>r.map(v=>String(v??'')))};});
 }
 if(ext==='doc')throw new Error('Word .doc รุ่นเก่า: กรุณาบันทึกเป็น .docx ก่อนนำเข้า');
 if(ext==='docx'){
  const mammoth=await import('mammoth/mammoth.browser');const html=await mammoth.convertToHtml({arrayBuffer:data});
  const doc=new DOMParser().parseFromString(html.value,'text/html');
  const tables=Array.from(doc.querySelectorAll('table')).map((t,i)=>({name:`ตาราง ${i+1}`,rows:Array.from(t.querySelectorAll('tr')).map(r=>Array.from(r.querySelectorAll('td,th')).map(c=>c.textContent||''))}));
  const valid=tables.filter(t=>t.rows.some(row=>row.some(v=>aliases.prompt.some(a=>norm(a)===norm(v)))));
  const raw=await mammoth.extractRawText({arrayBuffer:data});
  // Word's automatic numbering is absent from extractRawText; preserve HTML list structure.
  const blocks:string[]=[];let nextNumber=1;
  const walk=(node:Element,depth=0)=>{
   if(node.tagName==='OL'){
    const start=Number(node.getAttribute('start')||nextNumber);
    Array.from(node.children).forEach((li,i)=>{const own=Array.from(li.childNodes).filter(n=>!(n instanceof Element&&['OL','UL'].includes(n.tagName))).map(n=>n.textContent||'').join('\n').trim();blocks.push(`${depth?letters[i]||String(i+1):String(start+i)}. ${own}`);Array.from(li.children).filter(n=>['OL','UL'].includes(n.tagName)).forEach(n=>walk(n,depth+1));});
    if(!depth)nextNumber=start+node.children.length;
   }else if(node.tagName==='UL'){Array.from(node.children).forEach((li,i)=>blocks.push(`${letters[i]||String(i+1)}. ${li.textContent||''}`));}
   else if(node.tagName!=='TABLE')blocks.push(node.textContent||'');
  };
  Array.from(doc.body.children).forEach(n=>walk(n));
  return [...valid,{name:'ข้อความทั้งหมด',text:doc.querySelector('ol')?blocks.join('\n'):raw.value}];
 }
 if(ext==='pdf'){
  const pdf=await import('pdfjs-dist');pdf.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
  const task=pdf.getDocument({data:new Uint8Array(data),cMapUrl:'/pdf-cmaps/',cMapPacked:true,standardFontDataUrl:'/pdf-fonts/'});
  try{const doc=await task.promise;if(doc.numPages>30)throw new Error('PDF ต้องมีไม่เกิน 30 หน้า');const pages:string[]=[];let empty=0;
   for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n);const content=await page.getTextContent();const lines=new Map<number,{x:number;text:string}[]>();
    for(const item of content.items){if(!('str' in item)||!item.str.trim())continue;const y=Math.round(item.transform[5]/3)*3;const parts=lines.get(y)||[];parts.push({x:item.transform[4],text:item.str});lines.set(y,parts);}
    const text=Array.from(lines).sort((a,b)=>b[0]-a[0]).map(([,p])=>p.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')).join('\n');if(!text.trim())empty++;pages.push(text);
   }
   if(empty)throw new Error(`PDF มี ${empty} หน้าที่อ่านเป็นข้อความไม่ได้ อาจเป็นภาพสแกน กรุณาใช้ OCR แปลงเป็นข้อความ หรือใช้ Word / Excel เพื่อไม่ให้ข้อสอบตกหล่น`);
   return [{name:'ข้อความจาก PDF — ตรวจลำดับข้อก่อนนำเข้า',text:pages.join('\n')}];
  }finally{await task.destroy();}
 }
 throw new Error('รองรับ Excel .xlsx .xls .csv, Word .docx และ PDF ที่มีข้อความ');
}
