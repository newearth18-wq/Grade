export function roundedResults(rows:Record<string,unknown>[],config:{rounding?:string;precision?:number;beforeWorkColumn?:string;afterWorkColumn?:string}){
 if(!config.rounding||config.rounding==='none')return rows;
 const factor=10**(config.precision??2),round=(n:number)=>{const x=n*factor;return (config.rounding==='floor'?Math.floor(x+1e-9):config.rounding==='ceil'?Math.ceil(x-1e-9):Math.round(x+1e-9))/factor;};
 return rows.map(row=>{
  const next={...row},fields=['คะแนนเก็บ','กลางภาค','ปลายภาค'],phases=['คะแนนเก็บก่อนกลางภาค','คะแนนเก็บหลังกลางภาค'];
  if((config.beforeWorkColumn||config.afterWorkColumn)&&phases.every(f=>typeof row[f]==='number')){
   if(Math.abs(Number(row[phases[0]])+Number(row[phases[1]])-Number(row['คะแนนเก็บ']))>.0001)throw new Error('คะแนนเก็บแยกช่วงไม่ตรงคะแนนเก็บรวม กรุณาใช้ช่องคะแนนเก็บรวมสำหรับเทอมเก่าที่คำนวณตามสัดส่วน');
   phases.forEach(f=>{next[f]=round(row[f] as number);});
   next['คะแนนเก็บ']=Math.round((Number(next[phases[0]])+Number(next[phases[1]]))*factor)/factor;
   fields.slice(1).forEach(f=>{if(typeof row[f]==='number')next[f]=round(row[f] as number);});
  }else for(const field of fields)if(typeof row[field]==='number')next[field]=round(row[field] as number);
  if(typeof row['คะแนนรวม']==='number'&&fields.every(f=>typeof next[f]==='number')){const total=round(fields.reduce((n,f)=>n+(next[f] as number),0));next['คะแนนรวม']=total;if(!['ร','มส'].includes(String(row['เกรด']))&&['0','1','1.5','2','2.5','3','3.5','4'].includes(String(row['เกรด'])))next['เกรด']=total>=80?'4':total>=75?'3.5':total>=70?'3':total>=65?'2.5':total>=60?'2':total>=55?'1.5':total>=50?'1':'0';}
  return next;
 });
}
