import type {AppState,Row} from './client';

/** Only the viewer's active roster and teacher-provided task samples belong in bubbles. */
export function bubbleWork(state:AppState,courses:Row[]){
 const student=state.user.role==='student',ids=new Set(courses.filter(c=>!c.deleted).map(c=>c.id));
 const roster=state.enrollments.filter(e=>e.active&&!e.deleted&&ids.has(e.course_id)&&(!student||e.student_id===state.user.id));
 return state.assignments.filter(a=>ids.has(a.course_id)&&!a.deleted).map(assignment=>{
  const students=roster.filter(e=>e.course_id===assignment.course_id);
  let missing=0,returned=0,due=Infinity;
  for(const e of students){
   const submission=state.submissions.find(s=>s.assignment_id===assignment.id&&s.student_id===e.student_id&&!s.deleted);
   if(submission&&submission.status!=='returned')continue;
   if(submission)returned++;else missing++;
   const extension=state.extensions.find(x=>x.assignment_id===assignment.id&&x.student_id===e.student_id&&!x.deleted);
   const deadline=Date.parse(extension?.due_at||assignment.due_at);if(Number.isFinite(deadline))due=Math.min(due,deadline);
  }
  const image=state.files.find(f=>f.assignment_id===assignment.id&&!f.student_id&&!f.deleted&&f.mime?.startsWith('image/'));
  return {assignment,missing,returned,due,preview:image?`/api/file/${image.id}`:undefined};
 }).filter(t=>t.missing+t.returned>0).sort((a,b)=>Number(b.returned>0)-Number(a.returned>0)||(a.due-b.due)||a.assignment.id.localeCompare(b.assignment.id));
}
