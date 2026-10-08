export function calculateGrade(course:any,assignments:any[],submissions:any[],enrollment:any){
 const tasks=assignments.filter(a=>a.course_id===course.id);
 const records=submissions.filter(s=>s.student_id===enrollment.student_id&&tasks.some(a=>a.id===s.assignment_id));
 const max=tasks.reduce((n,a)=>n+a.max_score,0);
 const raw=records.reduce((n,s)=>n+(s.status==='graded'?Number(s.score||0):0),0);
 const work=max?raw/max*course.work_weight:0;
 const mid=enrollment.mid===null?null:enrollment.mid;
 const final=enrollment.final===null?null:enrollment.final;
 const pending=records.some(s=>s.status==='pending'||s.status==='returned');
 const complete=!pending&&(course.work_weight===0||max>0)&&(course.mid_weight===0||mid!==null)&&(course.final_weight===0||final!==null);
 const total=Math.round((work+(mid||0)+(final||0))*100)/100;
 const grade=total>=80?'4':total>=75?'3.5':total>=70?'3':total>=65?'2.5':total>=60?'2':total>=55?'1.5':total>=50?'1':'0';
 return {work:Math.round(work*100)/100,mid,final,total,grade:enrollment.special||(complete?grade:null),complete:!!enrollment.special||complete,missing:tasks.filter(a=>!records.some(s=>s.assignment_id===a.id)).length,pending:records.filter(s=>s.status!=='graded').length,submitted:records.length,max};
}
