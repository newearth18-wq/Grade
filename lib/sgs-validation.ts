import {publicationCheck,scorePlan} from './teacher-logic';
import {calculateGrade,isActivity,workPhase} from './grades';
import {sgsStage,sgsStageLabel,type SgsStage} from './sgs-stage';
export function sgsPreflight(state:any,course:any,requested:SgsStage='all'){
 const stage=sgsStage(requested),errors:string[]=[],warnings:string[]=[];
 const enrolls=state.enrollments.filter((e:any)=>e.course_id===course.id&&e.active);
 if(stage!=='all'&&isActivity(course))errors.push('วิชากิจกรรมไม่มีสอบ ให้เลือกตลอดภาคเรียน');
 if(!enrolls.length)errors.push('ไม่มีนักเรียน');
 if(stage==='all'){
  const check=publicationCheck(state,course);
  if(check.incomplete.length)errors.push(`คะแนน/เช็กชื่อยังไม่ครบ ${check.incomplete.length} คน`);
  if(check.over.length)errors.push('คะแนนงานเกินแผน');
  if(check.unallocated>0)warnings.push(`คะแนนงานยังจัดสรรไม่ครบ ${check.unallocated} คะแนน`);
 }else{
  const phase=stage==='midterm'?'before':'after',exam=stage==='midterm'?'mid':'final';
  const plan=scorePlan(course,state.assignments).find(p=>p.phase===phase)!;
  const tasks=state.assignments.filter((a:any)=>a.course_id===course.id&&workPhase(a)===phase);
  if(plan.remaining<0)errors.push(`คะแนนงาน${sgsStageLabel(stage)}เกินแผน`);
  if(plan.budget>0&&!tasks.length)errors.push(`ยังไม่มีงาน${sgsStageLabel(stage)}`);
  if(plan.remaining>0)warnings.push(`คะแนนงาน${sgsStageLabel(stage)}ยังจัดสรรไม่ครบ ${plan.remaining} คะแนน`);
  let incomplete=0,missing=0;
  for(const e of enrolls){
   const grade=calculateGrade(course,state.assignments,state.submissions,e);
   const records=state.submissions.filter((s:any)=>s.student_id===e.student_id&&tasks.some((a:any)=>a.id===s.assignment_id));
   const awaiting=records.some((s:any)=>s.status==='pending'||s.status==='returned'||s.status==='graded'&&Number(tasks.find((a:any)=>a.id===s.assignment_id)?.individual_weight)>0&&s.individual_score==null);
   const weight=Number(course[exam+'_weight']),value=e[exam];
   if(awaiting||weight>0&&(value==null||value===''||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>weight)||!Number.isFinite(grade.phases[phase].earned)||grade.phases[phase].earned<0||grade.phases[phase].earned>plan.budget+.0001)incomplete++;
   if(grade.legacy&&Math.abs(grade.phases.before.earned+grade.phases.after.earned-grade.work)>.0001)errors.push('เทอมเก่าคำนวณคะแนนตามสัดส่วน ให้เลือกตลอดภาคเรียนและช่องคะแนนเก็บรวม');
   missing+=tasks.filter((a:any)=>!records.some((s:any)=>s.assignment_id===a.id)).length;
  }
  if(incomplete)errors.push(`คะแนน${sgsStageLabel(stage)}ยังไม่ครบ ${incomplete} คน`);
  if(missing)warnings.push(`งานที่ยังไม่ส่งในช่วงนี้ ${missing} รายการ คิดเป็น 0 คะแนน กรุณาตรวจสอบก่อนส่งออก`);
 }
 const codes=new Set();for(const e of enrolls){if(codes.has(e.student_code))errors.push('รหัสนักเรียนซ้ำ');codes.add(e.student_code);}
 if(!course.published)warnings.push(stage==='all'?'ผลการเรียนยังไม่เผยแพร่ ตรวจและเผยแพร่ก่อนใช้เป็นผลทางการ':'คะแนนช่วงนี้ยังไม่ใช่ผลการเรียนปลายภาค');
 if(isActivity(course))warnings.push('วิชากิจกรรมส่งผล ผ / มผ ตรวจว่าคอลัมน์ต้นแบบรับค่าดังกล่าว');
 return {errors:[...new Set(errors)],warnings,ready:errors.length===0};
}
