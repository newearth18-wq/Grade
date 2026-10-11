import type {AppState,Row} from './client';

const DAY=86400000;
const stamp=(v:unknown)=>typeof v==='string'?Date.parse(v):NaN;
/** All progress comes from the signed-in student's visible, live records. No grade writes. */
export function studentJourney(state:AppState,courses:Row[],time=Date.now()){
 const ids=new Set(courses.filter(c=>state.enrollments.some(e=>e.active&&e.course_id===c.id&&e.student_id===state.user.id)).map(c=>c.id));
 const tasks=state.assignments.filter(a=>ids.has(a.course_id)&&!a.deleted);
 const entries=tasks.map(a=>{
  const s=state.submissions.find(s=>s.student_id===state.user.id&&s.assignment_id===a.id&&!s.deleted);
  const files=state.files.filter(f=>f.student_id===state.user.id&&f.assignment_id===a.id&&!f.deleted);
  const first=files.map(f=>stamp(f.created_at)).filter(Number.isFinite).sort((a,b)=>a-b)[0]??(s?.source!=='paper'&&s?.revision===1?stamp(s.submitted_at):NaN);
  const due=stamp(state.extensions.find(e=>e.assignment_id===a.id&&e.student_id===state.user.id)?.due_at||a.due_at);
  const submitted=!!s&&(files.length>0||s.source!=='paper'&&Number.isFinite(first));
  const onTime=submitted&&Number.isFinite(first)&&Number.isFinite(due)&&first<=due;
  const improved=submitted&&(files.some(f=>Number(f.revision)>=2)||s!.revision>=2&&s!.status!=='returned');
  return {a,s,first,due,submitted,onTime,improved,xp:submitted?20+(onTime?5:0)+(improved?10:0):0};
 });
 const xp=entries.reduce((n,e)=>n+e.xp,0),level=Math.floor(xp/100)+1;
 // Monday 00:00 in Bangkok, irrespective of the student's device timezone.
 const local=new Date(time+7*3600000),weekday=(local.getUTCDay()+6)%7;
 const weekStart=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()-weekday)-7*3600000;
 const weekly=entries.filter(e=>e.submitted&&stamp(e.s!.submitted_at)>=weekStart&&stamp(e.s!.submitted_at)<weekStart+7*DAY).length;
 const remaining=entries.filter(e=>!e.s||e.s.status==='returned').filter(e=>{const c=courses.find(c=>c.id===e.a.course_id);return !c?.archived&&!c?.published;}).sort((a,b)=>Number(b.s?.status==='returned')-Number(a.s?.status==='returned')||((Number.isFinite(a.due)?a.due:Infinity)-(Number.isFinite(b.due)?b.due:Infinity))||a.a.id.localeCompare(b.a.id));
 const weekGoal=Math.min(3,weekly+remaining.length);
 const sent=entries.filter(e=>e.submitted).length,onTime=entries.filter(e=>e.onTime).length,improved=entries.filter(e=>e.improved).length,group=entries.filter(e=>e.submitted&&e.a.is_group).length;
 const badges=[
  {id:'first',icon:'🌱',name:'ก้าวแรก',text:'ส่งงานแรกผ่านระบบ',value:sent,goal:1},
  {id:'steady',icon:'🌼',name:'นักสะสมภารกิจ',text:'ส่งงานต่างกัน 5 งาน',value:sent,goal:5},
  {id:'timely',icon:'☀️',name:'มาไวพร้อมเรียน',text:'ส่งตรงเวลา 3 งาน',value:onTime,goal:3},
  {id:'comeback',icon:'🦋',name:'ลองใหม่ได้เสมอ',text:'ส่งงานแก้ไขกลับถึงครู',value:improved,goal:1},
  {id:'team',icon:'🤝',name:'ทีมเวิร์ก',text:'ร่วมส่งงานกลุ่ม 1 งาน',value:group,goal:1},
  {id:'complete',icon:'🌳',name:'สวนพร้อมเติบโต',text:'ทุกงานส่งแล้วและไม่มีงานรอแก้ไข',value:tasks.length&&entries.every(e=>e.s&&e.s.status!=='returned')?1:0,goal:1}
 ].map(b=>({...b,earned:b.value>=b.goal}));
 return {entries,xp,level,levelProgress:xp%100,nextLevel:100-xp%100,weekly,weekGoal,weekStart,weekEnd:weekStart+7*DAY,sent,onTime,improved,badges,remaining,next:remaining[0]};
}

export function journeyReward(before:ReturnType<typeof studentJourney>,after:ReturnType<typeof studentJourney>){
 return {xp:Math.max(0,after.xp-before.xp),level:after.level,leveled:after.level>before.level,badges:after.badges.filter(b=>b.earned&&!before.badges.find(x=>x.id===b.id)?.earned).map(b=>b.name),themes:[{xp:60,name:'สวนอาทิตย์ตก'},{xp:150,name:'สวนใต้แสงดาว'}].filter(t=>before.xp<t.xp&&after.xp>=t.xp).map(t=>t.name)};
}
