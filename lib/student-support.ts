export const studentStatusLabels:Record<string,string>={normal:'ปกติ',moved:'ย้ายออก',long_absence:'ขาดเรียนต่อเนื่อง',leave:'พักการเรียน / ลาระยะยาว',other:'อื่น ๆ'};
export function supportValues(b:any,e:any={}){
 const status='studentStatus' in b?b.studentStatus:e.student_status??'normal',note='studentNote' in b?b.studentNote:e.student_note??'',date='statusDate' in b?b.statusDate:e.status_date??'';
 if(typeof status!=='string'||!Object.hasOwn(studentStatusLabels,status))throw Error('สถานะนักเรียนไม่ถูกต้อง');
 if(typeof note!=='string'||note.length>2000)throw Error('หมายเหตุต้องไม่เกิน 2,000 ตัวอักษร');
 if(typeof date!=='string'||date!==''&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date))throw Error('วันที่เริ่มสถานะไม่ถูกต้อง');
 return {status,note:note.trim(),date};
}
