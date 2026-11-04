import {hats,accessories,islandProps,careValue,type Hat,type Accessory,type IslandProp,type CareAction} from './companion-play';
import {personalities,type Personality} from './adventure-plus';
import {companions,type IslandCompanion} from './adventure-catalog';
import type {AppState,Row} from './client';
import type {studentJourney} from './student-journey';
export const homeStages=[{name:'ลานสร้างบ้าน',goal:0},{name:'เต็นท์อุ่นใจ',goal:1},{name:'กระท่อมเพื่อนรัก',goal:3},{name:'บ้านต้นไม้',goal:5},{name:'บ้านร่มไทร',goal:10}];
export const houseColors=[{id:'lavender',name:'ม่วงลาเวนเดอร์',hex:'#b99bd9'},{id:'mint',name:'เขียวมิ้นต์',hex:'#94cdb5'},{id:'peach',name:'ส้มพีช',hex:'#edb796'}] as const;
export type HouseColor=typeof houseColors[number]['id'];
export type IslandProfile={revision:number;companionName:string;companion:IslandCompanion|null;personality:Personality;houseColor:HouseColor;goalDate:string;goalIds:string[];hat:Hat;accessory:Accessory;islandProp:IslandProp;careDay:string;careDone:CareAction[];careStars:number};
export const bangkokDay=(time=Date.now())=>new Date(time+7*3600000).toISOString().slice(0,10);
export function profileValue(value:any,time=Date.now()):IslandProfile{
 const today=bangkokDay(time);return {...careValue(value,today),hat:hats.find(h=>h.id===value?.hat)?.id||'none',accessory:accessories.find(a=>a.id===value?.accessory)?.id||'none',islandProp:islandProps.find(p=>p.id===value?.islandProp)?.id||'none',revision:Number.isSafeInteger(value?.revision)&&value.revision>=0?value.revision:0,companion:companions.find(c=>c.id===value?.companion)?.id||null,personality:personalities.some(p=>p.id===value?.personality)?value.personality:'gentle',companionName:typeof value?.companionName==='string'?value.companionName.slice(0,24):'',houseColor:houseColors.some(c=>c.id===value?.houseColor)?value.houseColor:'lavender',goalDate:today,goalIds:value?.goalDate===today&&Array.isArray(value?.goalIds)?[...new Set<string>(value.goalIds.filter((id:unknown)=>typeof id==='string'&&id.length<=100))].slice(0,3):[]};
}
export function homeProgress(sent:number){const stage=homeStages.findLastIndex(h=>sent>=h.goal),next=homeStages[stage+1];return {stage,name:homeStages[stage].name,next,parts:sent,remaining:next?Math.max(0,next.goal-sent):0};}
/** Cosmetic greeting only: revisions can trigger delight without granting another house part. */
export function hasNewUpload(current:Record<string,number>,previous:unknown){return !!previous&&typeof previous==='object'&&!Array.isArray(previous)&&Object.entries(current).some(([id,revision])=>revision>Number((previous as Record<string,unknown>)[id]||0));}
export const communityRewards=[{stage:1,goal:60,icon:'💧',name:'น้ำตกแห่งความร่วมมือ'},{stage:2,goal:80,icon:'🌉',name:'สะพานเพื่อนช่วยเพื่อน'},{stage:3,goal:100,icon:'🏝️',name:'เกาะสวนแห่งใหม่'}];
export function communityProgress(courseId:string,expected:number,submitted:number,savedStage=0){
 expected=Math.max(0,Number(expected)||0);submitted=Math.max(0,Math.min(expected,Number(submitted)||0));
 const earned=expected?communityRewards.filter(r=>submitted*100>=expected*r.goal).length:0;
 return {id:courseId,course_id:courseId,expected,submitted,percent:expected?Math.floor(submitted/expected*100):0,savedStage:Math.max(0,Math.min(3,savedStage||0)),stage:Math.max(earned,Math.max(0,Math.min(3,savedStage||0)))};
}
export function dailyGoals(j:ReturnType<typeof studentJourney>,profile:IslandProfile,time=Date.now()){
 const ids=profile.goalDate===bangkokDay(time)?profile.goalIds:[];
 return ids.map(id=>j.entries.find(e=>e.a.id===id)).filter((e):e is typeof j.entries[number]=>!!e).map(e=>({...e,done:!!e.s&&e.s.status!=='returned'}));
}
export function workAlbum(state:AppState,course:Row){
 if(!state.enrollments.some(e=>e.course_id===course.id&&e.student_id===state.user.id&&e.active&&!e.deleted))return [];
 return state.assignments.filter(a=>a.course_id===course.id&&!a.deleted).flatMap(a=>{
  const s=state.submissions.find(s=>s.assignment_id===a.id&&s.student_id===state.user.id&&!s.deleted&&s.status==='graded');if(!s)return [];
  const files=state.files.filter(f=>f.assignment_id===a.id&&f.student_id===state.user.id&&!f.deleted&&Number(f.revision)===Number(s.revision));
  const image=files.find(f=>String(f.mime).startsWith('image/'));
  return [{a,s,files,image}];
 }).sort((a,b)=>String(b.s.reviewed_at||b.s.submitted_at||'').localeCompare(String(a.s.reviewed_at||a.s.submitted_at||''))||a.a.id.localeCompare(b.a.id));
}
