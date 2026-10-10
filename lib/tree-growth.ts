import {calculateGrade} from './grades';
type GrowthState={user:{id:string;[key:string]:any};enrollments:any[];assignments:any[];submissions:any[]};
const round=(n:number)=>Math.round(n*100)/100;
export const growthStages=['ต้นอ่อนสองใบ','ต้นกล้า','ต้นไทรเล็ก','ต้นไทรแตกพุ่ม','ต้นไทรแผ่ร่มเงา','ต้นไทรสมบูรณ์'];
export const growthThresholds=[0,10,25,45,70,90];
/** Uses the same earned points as results; unpublished exam marks never affect the tree. */
export function treeGrowth(state:GrowthState,courses:any[]){
 const student=state.user.role==='student',ids=new Set(courses.map(c=>c.id));
 const enrollments=state.enrollments.filter(e=>e.active&&ids.has(e.course_id)&&(!student||e.student_id===state.user.id));
 let earned=0,capacity=0;
 for(const e of enrollments){const c=courses.find(c=>c.id===e.course_id)!;const g=calculateGrade(c,state.assignments,state.submissions,{...e,mid:c.published?e.mid:null,final:c.published?e.final:null});earned+=g.total;capacity+=Number(c.work_weight)+Number(c.mid_weight)+Number(c.final_weight);}
 const percent=capacity?round(Math.max(0,Math.min(100,earned/capacity*100))):0,stage=growthThresholds.findLastIndex(t=>percent>=t);
 const divisor=student?1:Math.max(1,enrollments.length);
 return {earned:round(earned/divisor),capacity:capacity?round(capacity/divisor):100,percent,ratio:percent/100,stage,label:growthStages[stage],participants:enrollments.length,next:growthThresholds[stage+1]??(percent<100?100:null)};
}
