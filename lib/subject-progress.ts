export function subjectProgress(state:{enrollments:any[];assignments:any[];submissions:any[]},rooms:{id:string}[]){
 const ids=new Set(rooms.map(c=>c.id)),enrollments=state.enrollments.filter(e=>e.active&&ids.has(e.course_id));
 const tasks=state.assignments.filter(a=>ids.has(a.course_id)),submissions=state.submissions.filter(s=>{const a=tasks.find(a=>a.id===s.assignment_id);return a&&enrollments.some(e=>e.course_id===a.course_id&&e.student_id===s.student_id);});
 const expected=tasks.reduce((sum,a)=>sum+enrollments.filter(e=>e.course_id===a.course_id).length,0),submitted=submissions.length,graded=submissions.filter(s=>s.status==='graded').length,pending=submissions.filter(s=>s.status==='pending').length,returned=submissions.filter(s=>s.status==='returned').length;
 return {expected,submitted,graded,pending,returned,missing:Math.max(0,expected-submitted),students:new Set(enrollments.map(e=>e.student_id)).size,percentage:expected?Math.round(submitted/expected*100):0};
}
