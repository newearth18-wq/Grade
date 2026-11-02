'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,LockKeyhole,Palette,Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {api,type AppState,type Row} from '@/lib/client';
import {companions,islandAdventure,islandAppearance,type IslandCompanion,type IslandDecoration} from '@/lib/island-adventure';
import {communityProgress,homeProgress,profileValue,hasNewUpload,type IslandProfile} from '@/lib/adventure-life';
import {ClassMission,CompanionHome,DailyGoal,WorkAlbum} from './adventure-life';
import './island-adventure.css';
import './adventure-life.css';

export function useIslandAdventure(state:AppState,course:Row|undefined){
 const [saved,setSaved]=useState<{key:string;decoration?:unknown;companion?:unknown}>();
 const [remote,setRemote]=useState<{key:string;profile:IslandProfile;challenge:ReturnType<typeof communityProgress>}>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[action,setAction]=useState(0),saving=useRef(false);
 const key=`grade-island:${state.user.id}:${course?.period_id}:${course?.id}`;
 useEffect(()=>{try{const item=JSON.parse(localStorage.getItem(key)||'null');setSaved({key,decoration:item?.decoration,companion:item?.companion});}catch{setSaved({key});}},[key]);
 const game=course?islandAdventure(state,course):undefined;
 const initialProfile=profileValue(state.islandPreferences?.find(p=>p.course_id===course?.id)),initialChallenge=state.classChallenges?.find(c=>c.course_id===course?.id) as ReturnType<typeof communityProgress>|undefined;
 const profile=remote?.key===key?profileValue(remote.profile):initialProfile,challenge=remote?.key===key?remote.challenge:initialChallenge||communityProgress(course?.id||'',0,0);
 useEffect(()=>{
  if(!course)return;let active=true,fetching=false;setError('');
  if(state.user.role!=='student'){
   const challenge=state.classChallenges?.find(c=>c.course_id===course.id) as ReturnType<typeof communityProgress>|undefined;
   if(challenge)setRemote({key,profile:profileValue(null),challenge});
   if(course.can_edit&&challenge&&challenge.stage>challenge.savedStage)void api('island/'+course.id+'/community',{}).then(r=>{if(active)setRemote({key,profile:profileValue(null),challenge:r.challenge});}).catch(()=>{});
   return()=>{active=false;};
  }
  setRemote({key,profile:profileValue(state.islandPreferences?.find(p=>p.course_id===course.id)),challenge:state.classChallenges?.find(c=>c.course_id===course.id) as ReturnType<typeof communityProgress>||communityProgress(course.id,0,0)});
  const load=async()=>{if(fetching||document.hidden)return;fetching=true;try{const r=await api('island/'+course.id);if(!active)return;setRemote(old=>old?.key===key&&old.profile.revision>r.profile.revision?{...old,challenge:r.challenge}:{key,profile:r.profile,challenge:r.challenge});if(r.challenge.stage>r.challenge.savedStage){const reward=await api('island/'+course.id+'/community',{});if(active)setRemote(old=>old?.key===key?{...old,challenge:reward.challenge}:old);}}catch(e){if(active)setError((e as Error).message);}finally{fetching=false;}};
  void load();const timer=setInterval(()=>void load(),60000);return()=>{active=false;clearInterval(timer);};
 },[key,state]);
 const revisions=JSON.stringify(Object.fromEntries((game?.journey.entries||[]).filter(e=>e.submitted).map(e=>[e.a.id,Number(e.s?.revision)||1])));
 useEffect(()=>{if(state.user.role!=='student'||!course)return;try{const old=JSON.parse(localStorage.getItem(key+':seen-work')||'null');if(hasNewUpload(JSON.parse(revisions),old))setAction(Date.now());localStorage.setItem(key+':seen-work',revisions);}catch{}},[key,revisions,state.user.role]);
 const appearance=islandAppearance(game?.journey.sent||0,saved?.key===key?saved:undefined);
 function choose(next:{decoration?:IslandDecoration;companion?:IslandCompanion}){const value={...appearance,...next};setSaved({key,...value});try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
 async function save(change:Partial<Pick<IslandProfile,'companionName'|'houseColor'|'goalIds'>>){if(!course||saving.current)return false;saving.current=true;setBusy(true);setError('');try{const r=await api('island/'+course.id,{expectedRevision:profile.revision,...change},'PATCH');setRemote({key,profile:r.profile,challenge});return true;}catch(e){setError((e as Error).message);try{const fresh=await api('island/'+course.id);setRemote({key,profile:fresh.profile,challenge:fresh.challenge});}catch{}return false;}finally{saving.current=false;setBusy(false);}}
 return {game,appearance,choose,profile,challenge,save,busy,error,action,greet:()=>setAction(Date.now())};
}
export function IslandAdventure({state,course,control,onTask}:{state:AppState;course:Row;control:ReturnType<typeof useIslandAdventure>;onTask:(assignment:Row)=>void}){
 const {game,appearance,choose,profile,challenge,save,busy,error}=control;
 const [closet,setCloset]=useState(false),[greet,setGreet]=useState(false),[panel,setPanel]=useState('missions');
 useEffect(()=>{if(greet){const timer=setTimeout(()=>setGreet(false),2400);return()=>clearTimeout(timer);}},[greet]);
 if(!game)return null;
 const {journey:j,next}=game,buddy=companions.find(c=>c.id===appearance.companion)!;
 return <section className='island-adventure' aria-label={`เกาะภารกิจ ${course.name} ห้อง ${course.classroom}`}>
  <div className='adventure-topline'><span><Sparkles size={14}/> เกาะของฉัน · {course.code} · ห้อง {course.classroom}</span><span>เลเวล {j.level} · {j.xp} XP</span></div>
  <div className='adventure-main'><button className={`adventure-buddy ${greet?'buddy-wave':''}`} aria-label={`ทักทาย${profile.companionName||buddy.name}`} onClick={()=>{setGreet(true);control.greet();}}><span aria-hidden='true'>{buddy.icon}</span><small>{profile.companionName||buddy.name}</small></button><div className='adventure-message' aria-live='polite'><h3>{greet?'เราค่อย ๆ ทำไปด้วยกันนะ!':next?`อีก ${next.goal-j.sent} งาน ได้${next.name}`:'เกาะแห่งความพยายามของคุณสมบูรณ์แล้ว!'}</h3><p>{greet?'พร้อมเมื่อไหร่ เลือกภารกิจด้านล่างได้เลย 🌱':j.next?.s?.status==='returned'?'ครูมีคำแนะนำให้ ลองแก้ไขทีละนิด เรารอเป็นกำลังใจอยู่':j.next?`ภารกิจถัดไป: ${j.next.a.title}`:'ตอนนี้ไม่มีงานให้ส่ง พักผ่อนและภูมิใจกับตัวเองได้เลย'}</p></div><div className='adventure-actions'>{j.next&&<Button onClick={()=>onTask(j.next!.a)}>{j.next.s?'ไปแก้ไขงาน':'ไปส่งงาน'}<ArrowRight size={15}/></Button>}<Button variant='outline' aria-expanded={closet} onClick={()=>setCloset(!closet)}><Palette size={15}/> แต่งเกาะ</Button></div></div>
  <ol className='adventure-trail' aria-label='เส้นทางปลดล็อกของตกแต่ง'>{game.rewards.map(r=><li key={r.id} className={r.earned?'unlocked':next?.id===r.id?'current':''}><span aria-hidden='true'>{r.icon}</span><div><strong>{r.name}</strong><small>{r.earned?<><Check size={12}/> ปลดล็อกแล้ว</>:<>{Math.min(j.sent,r.goal)} / {r.goal} งาน</>}</small></div></li>)}</ol>
  {closet&&<div className='adventure-closet'><h4>ของตกแต่งบนเกาะ 3D</h4><div className='adventure-choices'><button aria-pressed={appearance.decoration==='none'} onClick={()=>choose({decoration:'none'})}><span>🌱</span><strong>สวนเรียบง่าย</strong><small>ใช้ได้เสมอ</small></button>{game.rewards.map(r=><button key={r.id} disabled={!r.earned} aria-pressed={appearance.decoration===r.id} onClick={()=>choose({decoration:r.id})}><span aria-hidden='true'>{r.icon}</span><strong>{r.name}</strong><small>{r.earned?r.text:<><LockKeyhole size={12}/> ส่ง {r.goal} งานเพื่อปลดล็อก</>}</small></button>)}</div><h4>เลือกเพื่อนคู่หู</h4><div className='adventure-choices adventure-companions'>{companions.map(c=><button key={c.id} disabled={j.sent<c.goal} aria-pressed={appearance.companion===c.id} onClick={()=>choose({companion:c.id})}><span aria-hidden='true'>{c.icon}</span><strong>{c.name}</strong><small>{j.sent>=c.goal?'มาอยู่บนเกาะด้วยกัน':`ส่ง ${c.goal} งานเพื่อปลดล็อก`}</small></button>)}</div></div>}
  <div className='life-navigation' role='group' aria-label='กิจกรรมบนเกาะ'>{[{id:'missions',label:'🎯 ภารกิจวันนี้'},{id:'home',label:'🏡 บ้านคู่หู'},{id:'album',label:'📖 สมุดผลงาน'}].map(item=><Button key={item.id} variant={panel===item.id?'default':'outline'} aria-pressed={panel===item.id} onClick={()=>setPanel(item.id)}>{item.label}</Button>)}</div>
  {error&&<p className='error' role='alert'>{error}</p>}
  {panel==='missions'&&<><DailyGoal course={course} journey={j} profile={profile} busy={busy} save={save} onTask={onTask}/><ClassMission course={course} challenge={challenge}/></>}
  {panel==='home'&&<CompanionHome sent={j.sent} profile={profile} busy={busy} save={save}/>}
  {panel==='album'&&<WorkAlbum state={state} course={course}/>}
  <p className='adventure-note'>นับงานที่ส่งสำเร็จต่างกันในวิชา ห้อง และเทอมนี้ · ส่งซ้ำไม่เพิ่มจำนวน · ของตกแต่งไม่ใช้คะแนนซื้อ · จำรูปแบบที่เลือกบนอุปกรณ์นี้</p>
 </section>;
}
