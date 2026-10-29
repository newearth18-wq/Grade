'use client';
import {useState} from 'react';
import {ArrowLeft,ArrowUpRight,ChevronLeft,ChevronRight,BookOpen,FileText} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {type AppState,type Row,timeThai} from '@/lib/client';
import {bubbleWork} from '@/lib/bubble-work';
import {treeGrowth} from '@/lib/tree-growth';
import {FileLinks} from './shared';

/** The gallery only uses teacher-provided examples, never another student's submission. */
export function BubbleGallery({state,subject,rooms,open,onClose,onRoom,onTask}:{state:AppState;subject:Row;rooms:Row[];open:boolean;onClose:()=>void;onRoom:(id:string,view?:string)=>void;onTask:(assignment:Row)=>void}){
 const [room,setRoom]=useState('all'),[position,setPosition]=useState(-1),[touch,setTouch]=useState<number|null>(null);
 const selectedRooms=room==='all'?rooms:rooms.filter(c=>c.id===room),work=bubbleWork(state,selectedRooms),student=state.user.role==='student';
 const index=Math.min(position,work.length-1),item=index>=0?work[index]:undefined,course=item?rooms.find(c=>c.id===item.assignment.course_id):undefined;
 function move(direction:number){setPosition(i=>{const length=work.length+1;return ((i+1+direction+length)%length)-1;});}
 function enter(id:string,view?:string){onClose();onRoom(id,view);}
 return <Dialog open={open} onOpenChange={v=>{if(!v)onClose();}}><DialogContent fullScreen className="bubble-gallery" showCloseButton={false} onKeyDown={e=>{if((e.target as HTMLElement).closest('input,textarea,select'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}}} onTouchStart={e=>setTouch(e.touches[0].clientX)} onTouchEnd={e=>{if(touch!==null){const distance=e.changedTouches[0].clientX-touch;if(Math.abs(distance)>70)move(distance<0?1:-1);}setTouch(null);}}>
  <div className="gallery-topbar"><button className="gallery-back" onClick={onClose}><ArrowLeft size={17}/> กลับสู่ฟองรายวิชา</button><label className="gallery-room"><span>ห้องเรียน</span><select aria-label="ห้องเรียนในฟอง" value={room} onChange={e=>{setRoom(e.target.value);setPosition(-1);}}><option value="all">ทุกห้อง</option>{rooms.map(c=><option key={c.id} value={c.id}>{c.classroom}</option>)}</select></label><span className="gallery-code">{subject.code}</span></div>
  <div className={`gallery-space ${item?'gallery-task-view':'gallery-intro-view'}`}>
   <div className="gallery-floating-work" aria-hidden="true">{work.slice(0,3).map((t,i)=><div key={t.assignment.id} className={'gallery-float gallery-float-'+i}>{t.preview?<img src={t.preview} alt=""/>:<FileText/>}<span>{t.assignment.title}</span></div>)}</div>
   <div className="gallery-center" key={`${room}:${index}`}>
    {!item?<><span className="gallery-eyebrow">พื้นที่เรียนรู้ของเรา</span><DialogTitle className="gallery-title">{subject.name}</DialogTitle><DialogDescription className="gallery-description">{work.length?`อีก ${work.length} งานกำลังรอความคิดสร้างสรรค์ของคุณ`:'เลือกห้องเรียน เพื่อเปิดงานและคะแนนของคุณ'}</DialogDescription>{work.length>0&&<Button className="gallery-primary" onClick={()=>setPosition(0)}>สำรวจงานที่ยังค้าง <ArrowUpRight size={18}/></Button>}<div className="gallery-classrooms">{selectedRooms.map(c=><button key={c.id} onClick={()=>enter(c.id)}><BookOpen size={18}/><span>ห้อง {c.classroom}<small>ต้นไทรเติบโต {treeGrowth(state,[c]).percent}%</small></span><ArrowUpRight size={18}/></button>)}</div></>:<><div className="gallery-artwork">{item.preview?<img src={item.preview} alt={'ตัวอย่างงาน '+item.assignment.title}/>:<div className="gallery-artwork-empty"><FileText size={64}/><span>พื้นที่สำหรับผลงานของคุณ</span></div>}</div><div className="gallery-task-copy"><span className="gallery-eyebrow">ห้อง {course?.classroom} · {student?(item.returned?'งานที่ต้องแก้ไข':'งานที่ยังไม่ส่ง'):`ยังไม่ส่ง ${item.missing} คน · แก้ไข ${item.returned} คน`}</span><DialogTitle className="gallery-task-title">{item.assignment.title}</DialogTitle><DialogDescription className="gallery-description">{item.assignment.max_score} คะแนน · กำหนดส่ง {Number.isFinite(item.due)?timeThai(new Date(item.due).toISOString()):'ยังไม่ระบุ'}</DialogDescription><div className="gallery-task-details">{item.assignment.description&&<p>{item.assignment.description}</p>}<FileLinks files={state.files.filter(f=>f.assignment_id===item.assignment.id&&!f.student_id&&!f.deleted)}/></div><Button className="gallery-primary" disabled={student&&(!!course?.archived||!!course?.published)} onClick={()=>{if(!course)return;onClose();if(student)onTask(item.assignment);else onRoom(course.id,'followup');}}>{student?(course?.archived||course?.published?'ปิดรับงานแล้ว':item.returned?'แก้ไขและส่งงาน':'เริ่มส่งงาน'):'ติดตามงานห้องนี้'} <ArrowUpRight size={18}/></Button><button className="gallery-course-link" onClick={()=>course&&enter(course.id)}>เปิดงานและคะแนนทั้งหมดของห้อง {course?.classroom}</button></div></>}
   </div>
  </div>
  <nav className="gallery-pagination" aria-label="สำรวจงานในฟอง"><button aria-label="งานก่อนหน้า" disabled={!work.length} onClick={()=>move(-1)}><ChevronLeft/></button><span aria-live="polite">{item?`${index+1} / ${work.length} งาน`:'เริ่มสำรวจ'}</span><button aria-label="งานถัดไป" disabled={!work.length} onClick={()=>move(1)}><ChevronRight/></button></nav>
 </DialogContent></Dialog>;
}
