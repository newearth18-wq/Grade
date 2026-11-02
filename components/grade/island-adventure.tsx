'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,Check,LockKeyhole,Palette,Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {AppState,Row} from '@/lib/client';
import {companions,islandAdventure,islandAppearance,type IslandCompanion,type IslandDecoration} from '@/lib/island-adventure';
import './island-adventure.css';

export function useIslandAdventure(state:AppState,course:Row|undefined){
 const [saved,setSaved]=useState<{key:string;decoration?:unknown;companion?:unknown}>();
 const key=`grade-island:${state.user.id}:${course?.period_id}:${course?.id}`;
 useEffect(()=>{try{const item=JSON.parse(localStorage.getItem(key)||'null');setSaved({key,decoration:item?.decoration,companion:item?.companion});}catch{setSaved({key});}},[key]);
 const game=course?islandAdventure(state,course):undefined;
 const appearance=islandAppearance(game?.journey.sent||0,saved?.key===key?saved:undefined);
 function choose(next:{decoration?:IslandDecoration;companion?:IslandCompanion}){const value={...appearance,...next};setSaved({key,...value});try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
 return {game,appearance,choose};
}
export function IslandAdventure({course,game,appearance,choose,onTask}:{course:Row;game:ReturnType<typeof islandAdventure>;appearance:ReturnType<typeof islandAppearance>;choose:(next:{decoration?:IslandDecoration;companion?:IslandCompanion})=>void;onTask:(assignment:Row)=>void}){
 const [closet,setCloset]=useState(false),[greet,setGreet]=useState(false);
 useEffect(()=>{if(greet){const timer=setTimeout(()=>setGreet(false),2400);return()=>clearTimeout(timer);}},[greet]);
 const {journey:j,next}=game,buddy=companions.find(c=>c.id===appearance.companion)!;
 return <section className='island-adventure' aria-label={`เกาะภารกิจ ${course.name} ห้อง ${course.classroom}`}>
  <div className='adventure-topline'><span><Sparkles size={14}/> เกาะของฉัน · {course.code} · ห้อง {course.classroom}</span><span>เลเวล {j.level} · {j.xp} XP</span></div>
  <div className='adventure-main'><button className={`adventure-buddy ${greet?'buddy-wave':''}`} aria-label={`ทักทาย${buddy.name}`} onClick={()=>setGreet(true)}><span aria-hidden='true'>{buddy.icon}</span><small>{buddy.name}</small></button><div className='adventure-message' aria-live='polite'><h3>{greet?'เราค่อย ๆ ทำไปด้วยกันนะ!':next?`อีก ${next.goal-j.sent} งาน ได้${next.name}`:'เกาะแห่งความพยายามของคุณสมบูรณ์แล้ว!'}</h3><p>{greet?'พร้อมเมื่อไหร่ เลือกภารกิจด้านล่างได้เลย 🌱':j.next?.s?.status==='returned'?'ครูมีคำแนะนำให้ ลองแก้ไขทีละนิด เรารอเป็นกำลังใจอยู่':j.next?`ภารกิจถัดไป: ${j.next.a.title}`:'ตอนนี้ไม่มีงานให้ส่ง พักผ่อนและภูมิใจกับตัวเองได้เลย'}</p></div><div className='adventure-actions'>{j.next&&<Button onClick={()=>onTask(j.next!.a)}>{j.next.s?'ไปแก้ไขงาน':'ไปส่งงาน'}<ArrowRight size={15}/></Button>}<Button variant='outline' aria-expanded={closet} onClick={()=>setCloset(!closet)}><Palette size={15}/> แต่งเกาะ</Button></div></div>
  <ol className='adventure-trail' aria-label='เส้นทางปลดล็อกของตกแต่ง'>{game.rewards.map(r=><li key={r.id} className={r.earned?'unlocked':next?.id===r.id?'current':''}><span aria-hidden='true'>{r.icon}</span><div><strong>{r.name}</strong><small>{r.earned?<><Check size={12}/> ปลดล็อกแล้ว</>:<>{Math.min(j.sent,r.goal)} / {r.goal} งาน</>}</small></div></li>)}</ol>
  {closet&&<div className='adventure-closet'><h4>ของตกแต่งบนเกาะ 3D</h4><div className='adventure-choices'><button aria-pressed={appearance.decoration==='none'} onClick={()=>choose({decoration:'none'})}><span>🌱</span><strong>สวนเรียบง่าย</strong><small>ใช้ได้เสมอ</small></button>{game.rewards.map(r=><button key={r.id} disabled={!r.earned} aria-pressed={appearance.decoration===r.id} onClick={()=>choose({decoration:r.id})}><span aria-hidden='true'>{r.icon}</span><strong>{r.name}</strong><small>{r.earned?r.text:<><LockKeyhole size={12}/> ส่ง {r.goal} งานเพื่อปลดล็อก</>}</small></button>)}</div><h4>เลือกเพื่อนคู่หู</h4><div className='adventure-choices adventure-companions'>{companions.map(c=><button key={c.id} disabled={j.sent<c.goal} aria-pressed={appearance.companion===c.id} onClick={()=>choose({companion:c.id})}><span aria-hidden='true'>{c.icon}</span><strong>{c.name}</strong><small>{j.sent>=c.goal?'มาอยู่บนเกาะด้วยกัน':`ส่ง ${c.goal} งานเพื่อปลดล็อก`}</small></button>)}</div></div>}
  <p className='adventure-note'>นับงานที่ส่งสำเร็จต่างกันในวิชา ห้อง และเทอมนี้ · ส่งซ้ำไม่เพิ่มจำนวน · ของตกแต่งไม่ใช้คะแนนซื้อ · จำรูปแบบที่เลือกบนอุปกรณ์นี้</p>
 </section>;
}
