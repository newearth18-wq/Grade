const round=(n:number)=>Math.round(n*100)/100;
export const workPhase=(a:any):'before'|'after'=>a.work_phase==='after'?'after':'before';
export const phaseLabel=(phase:string)=>phase==='after'?'หลังกลางภาค':'ก่อนกลางภาค';
export function workBudgets(course:any){const before=Number(course.before_work_weight??course.work_weight/2);return {before,after:round(course.work_weight-before)};}
export function calculateGrade(course:any,assignments:any[],submissions:any[],enrollment:any){
 const tasks=assignments.filter(a=>a.course_id===course.id);
 const records=submissions.filter(s=>s.student_id===enrollment.student_id&&tasks.some(a=>a.id===s.assignment_id));
 const max=tasks.reduce((n,a)=>n+Number(a.max_score),0);
 const raw=records.reduce((n,s)=>n+(s.status==='graded'?Number(s.score||0):0),0);
 const budgets=workBudgets(course),legacy=!!course.archived&&course.grading_mode==='weighted';
 const phases=Object.fromEntries(['before','after'].map(phase=>{const ids=new Set(tasks.filter(a=>workPhase(a)===phase).map(a=>a.id));return [phase,{max:round(tasks.filter(a=>ids.has(a.id)).reduce((n,a)=>n+Number(a.max_score),0)),earned:round(records.filter(s=>ids.has(s.assignment_id)&&s.status==='graded').reduce((n,s)=>n+Number(s.score||0),0)),budget:budgets[phase as 'before'|'after']}];})) as Record<'before'|'after',{max:number;earned:number;budget:number}>;
 const budgetValid=legacy||(phases.before.max<=budgets.before+.0001&&phases.after.max<=budgets.after+.0001);
 const work=legacy?(max?raw/max*course.work_weight:0):raw;
 const mid=enrollment.mid==null?null:Number(enrollment.mid);
 const final=enrollment.final==null?null:Number(enrollment.final);
 const pending=records.some(s=>s.status==='pending'||s.status==='returned');
 const complete=budgetValid&&!pending&&(course.work_weight===0||max>0)&&(course.mid_weight===0||mid!==null)&&(course.final_weight===0||final!==null);
 const total=Math.round((work+(mid||0)+(final||0))*100)/100;
 const grade=total>=80?'4':total>=75?'3.5':total>=70?'3':total>=65?'2.5':total>=60?'2':total>=55?'1.5':total>=50?'1':'0';
 return {raw:round(raw),work:round(work),mid,final,total,phases,budgetValid,legacy,grade:enrollment.special||(complete?grade:null),complete:!!enrollment.special||complete,missing:tasks.filter(a=>!records.some(s=>s.assignment_id===a.id)).length,pending:records.filter(s=>s.status!=='graded').length,submitted:records.length,max};
}
