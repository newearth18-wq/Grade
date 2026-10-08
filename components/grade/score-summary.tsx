'use client';
import {calculateGrade} from '@/lib/grades';
import type {AppState,Row} from '@/lib/client';
import './score-summary.css';

export function ScoreSummary({state,course,enrollment}:{state:AppState;course:Row;enrollment:Row}){
 const g=calculateGrade(course,state.assignments,state.submissions,enrollment);
 return <section className="student-score-summary" aria-label="คะแนนรวมปัจจุบันของฉัน"><div className="score-summary-grid"><div className="score-summary-total"><span>คะแนนรวมปัจจุบัน</span><strong>{g.total}<small> / 100</small></strong><p>{course.published?'ผลการเรียนที่เผยแพร่แล้ว':'คะแนนที่มีแล้ว · รอผลสรุป'}</p></div><div><span>คะแนนงานรวม</span><strong>{g.raw}<small> / {g.max}</small></strong><p>รวมทุกงานในรายวิชานี้</p></div><div><span>คะแนนเก็บตามสัดส่วน</span><strong>{g.work}<small> / {course.work_weight}</small></strong><p>คำนวณจากคะแนนงานรวม</p></div><div><span>กลางภาค</span><strong>{g.mid??'—'}<small> / {course.mid_weight}</small></strong><p>{g.mid===null?'รอคะแนนที่เผยแพร่':'คะแนนที่มีแล้ว'}</p></div><div><span>ปลายภาค</span><strong>{g.final??'—'}<small> / {course.final_weight}</small></strong><p>{g.final===null?'รอคะแนนที่เผยแพร่':'คะแนนที่มีแล้ว'}</p></div></div><p className="score-summary-note">รวมคะแนนเก็บกับคะแนนสอบที่แสดงแล้ว งานที่รอตรวจหรือคืนแก้ยังไม่นับคะแนน · คะแนนนี้เป็นของทั้งรายวิชาและไม่เปลี่ยนตามตัวกรองงาน{!course.published&&' · คะแนนสอบและเกรดจะแสดงเมื่อครูเผยแพร่ผลการเรียน'}</p></section>;
}
