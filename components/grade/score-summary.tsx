'use client';
import {calculateGrade,isActivity,phaseLabel} from '@/lib/grades';
import type {AppState,Row} from '@/lib/client';
import './score-summary.css';

export function ScoreSummary({state,course,enrollment}:{state:AppState;course:Row;enrollment:Row}){
 const g=calculateGrade(course,state.assignments,state.submissions,enrollment);
 const activity=isActivity(course);
 const phaseCard=(phase:'before'|'after')=><div><span>{phaseLabel(phase,course)}</span><strong>{g.phases[phase].earned}<small> / {g.phases[phase].budget}</small></strong><p>มอบหมายแล้ว {g.phases[phase].max} คะแนน</p></div>;
 const examCard=(field:'mid'|'final')=><div><span>{field==='mid'?'สอบกลางภาค':'สอบปลายภาค'}</span><strong>{g[field]??'—'}<small> / {course[`${field}_weight`]}</small></strong><p>{g[field]===null?'รอคะแนนที่เผยแพร่':'คะแนนที่มีแล้ว'}</p></div>;
 return <section className="student-score-summary" aria-label="คะแนนรวมปัจจุบันของฉัน"><div className="score-summary-grid"><div className="score-summary-total"><span>คะแนนรวมปัจจุบัน</span><strong>{g.total}<small> / 100</small></strong><p>{course.published?'ผลการเรียนที่เผยแพร่แล้ว':'คะแนนที่มีแล้ว · รอผลสรุป'}</p></div>{phaseCard('before')}{!activity&&examCard('mid')}{phaseCard('after')}{!activity&&examCard('final')}<div><span>คะแนนเก็บสะสม</span><strong>{g.work}<small> / {course.work_weight}</small></strong><p>{g.legacy?'คำนวณตามสัดส่วนเดิมของเทอมที่เก็บเป็นประวัติ':'ก่อนและหลังกลางภาครวมกัน · คะแนนจริง'}</p></div></div>{activity&&<p className='score-summary-note'>ไม่มีสอบ · เกณฑ์ผ่าน {course.pass_threshold} / 100 · เข้าร่วม {enrollment.attendance?.hours??0} / {course.required_hours||enrollment.attendance?.scheduled||0} ชม. · {enrollment.attendance?.percent??0}% (ขั้นต่ำ {course.attendance_min||0}%) · ผล {course.published?(g.grade??'รอข้อมูล'):'รอเผยแพร่'}</p>}<p className="score-summary-note">{activity?'รวมคะแนนกิจกรรมที่ครูให้จริง':g.legacy?'ใช้การคำนวณเดิมของเทอมที่เก็บเป็นประวัติ':`ก่อนกลางภาค ${g.phases.before.budget} + สอบกลางภาค ${course.mid_weight} + หลังกลางภาค ${g.phases.after.budget} + สอบปลายภาค ${course.final_weight} = 100 · รวมคะแนนที่ได้จริง ไม่มีการขยายเป็นเต็มคะแนนเก็บ`} งานที่รอตรวจหรือคืนแก้ยังไม่นับคะแนน · คะแนนนี้เป็นของทั้งรายวิชาและไม่เปลี่ยนตามตัวกรองงาน{!course.published&&(activity?' · ผลผ่าน / ไม่ผ่านจะแสดงเมื่อครูเผยแพร่':' · คะแนนสอบและเกรดจะแสดงเมื่อครูเผยแพร่ผลการเรียน')}</p></section>;
}
