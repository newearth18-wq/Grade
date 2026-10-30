import type {AppState,Row} from './client';
export function outstandingStatus(state:Pick<AppState,'submissions'|'extensions'>,assignment:Row,studentId:string,time=Date.now()){
 const s=state.submissions.find(s=>s.assignment_id===assignment.id&&s.student_id===studentId);
 if(s)return s.status==='returned'?'returned':'submitted';
 const due=state.extensions.find(x=>x.assignment_id===assignment.id&&x.student_id===studentId)?.due_at||assignment.due_at;
 return new Date(due).getTime()<time?'overdue':'upcoming';
}
