const round=(n:number)=>Math.round(n*100)/100;
export const workPhase=(a:any):'before'|'after'=>a.work_phase==='after'?'after':'before';
export const isActivity=(course:any)=>course?.course_type==='activity';
export const phaseLabel=(phase:string,course?:any)=>isActivity(course)?(phase==='after'?'กิจกรรมช่วงที่ 2':'กิจกรรมช่วงที่ 1'):(phase==='after'?'หลังกลางภาค':'ก่อนกลางภาค');
export function workBudgets(course:any){const before=Number(course.before_work_weight??course.work_weight/2);return {before,after:round(course.work_weight-before)};}
export function submissionPoints(a:any,s:any){return s?.status==='graded'?round(Number(s.score||0)*(1-Number(a?.individual_weight||0)/100)+Number(s.individual_score||0)):0;}
export function calculateGrade(course:any,assignments:any[],submissions:any[],enrollment:any){
 const tasks=assignments.filter(a=>a.course_id===course.id);
 const records=submissions.filter(s=>s.student_id===enrollment.student_id&&tasks.some(a=>a.id===s.assignment_id));
 const max=tasks.reduce((n,a)=>n+Number(a.max_score),0);
 const points=(s:any)=>submissionPoints(tasks.find(a=>a.id===s.assignment_id),s);
 const raw=records.reduce((n,s)=>n+points(s),0);
 const budgets=workBudgets(course),legacy=!!course.archived&&course.grading_mode==='weighted';
 const phases=Object.fromEntries(['before','after'].map(phase=>{const ids=new Set(tasks.filter(a=>workPhase(a)===phase).map(a=>a.id));return [phase,{max:round(tasks.filter(a=>ids.has(a.id)).reduce((n,a)=>n+Number(a.max_score),0)),earned:round(records.filter(s=>ids.has(s.assignment_id)&&s.status==='graded').reduce((n,s)=>n+points(s),0)),budget:budgets[phase as 'before'|'after']}];})) as Record<'before'|'after',{max:number;earned:number;budget:number}>;
 const budgetValid=legacy||(phases.before.max<=budgets.before+.0001&&phases.after.max<=budgets.after+.0001);
 const work=legacy?(max?raw/max*course.work_weight:0):raw;
 const mid=isActivity(course)||enrollment.mid==null?null:Number(enrollment.mid);
 const final=isActivity(course)||enrollment.final==null?null:Number(enrollment.final);
 const awaiting=(s:any)=>s.status==='pending'||s.status==='returned'||s.status==='graded'&&Number(tasks.find(a=>a.id===s.assignment_id)?.individual_weight)>0&&s.individual_score==null;
 const pending=records.some(awaiting);
 const attendanceRequired=isActivity(course)&&(Number(course.attendance_min)>0||Number(course.required_hours)>0),att=enrollment.attendance;
 const attendanceComplete=!attendanceRequired||!!att&&att.sessions>0&&att.unmarked===0;
 const attendancePassed=!attendanceRequired||attendanceComplete&&att.percent>=Number(course.attendance_min||0)&&att.hours>=Number(course.required_hours||0);
 const complete=budgetValid&&!pending&&attendanceComplete&&(course.work_weight===0||max>0)&&(course.mid_weight===0||mid!==null)&&(course.final_weight===0||final!==null);
 const total=Math.round((work+(mid||0)+(final||0))*100)/100;
 const grade=isActivity(course)?(total>=Number(course.pass_threshold??50)&&attendancePassed?'ผ':'มผ'):total>=80?'4':total>=75?'3.5':total>=70?'3':total>=65?'2.5':total>=60?'2':total>=55?'1.5':total>=50?'1':'0';
 return {raw:round(raw),work:round(work),mid,final,total,phases,budgetValid,legacy,attendanceComplete,attendancePassed,grade:enrollment.special||(complete?grade:null),complete:!!enrollment.special||complete,missing:tasks.filter(a=>!records.some(s=>s.assignment_id===a.id)).length,pending:records.filter(awaiting).length,submitted:records.length,max};
}
