import type {Hat,Accessory,IslandProp} from './companion-play';
import type {IslandCompanion} from './adventure-catalog';
import type {Row} from './client';
import type {studentJourney} from './student-journey';
export const personalities=[{id:'gentle',name:'อบอุ่น',icon:'🌿',line:'ค่อย ๆ ทำทีละนิด เราจะอยู่ข้าง ๆ นะ'},{id:'playful',name:'ขี้เล่น',icon:'🎈',line:'ภารกิจมาแล้ว! ไปผจญภัยด้วยกันไหม?'},{id:'curious',name:'ช่างสงสัย',icon:'🔎',line:'วันนี้เราจะค้นพบอะไรจากงานชิ้นนี้นะ?'}] as const;
export type Personality=typeof personalities[number]['id'];
export const praiseKinds=[{id:'progress',name:'พัฒนาขึ้นมาก',icon:'🌱'},{id:'creative',name:'ไอเดียสร้างสรรค์',icon:'🎨'},{id:'effort',name:'เห็นความพยายาม',icon:'✨'},{id:'teamwork',name:'เพื่อนร่วมทีมที่ดี',icon:'🤝'}] as const;
export function buddyLine(personality:Personality,j:ReturnType<typeof studentJourney>){const p=personalities.find(p=>p.id===personality)||personalities[0];return j.remaining.length===0&&j.entries.length?'ทุกงานถึงครูแล้ว! มาพักใต้ต้นไทรด้วยกันนะ':j.remaining.some(e=>e.s?.status==='returned')?(personality==='playful'?'ด่านแก้ไขมาแล้ว เราลองใหม่ด้วยกันได้!':'ครูฝากคำแนะนำไว้ เราลองใหม่ทีละขั้นด้วยกันนะ'):p.line;}
export function adventureMap(j:ReturnType<typeof studentJourney>){return [...j.entries].sort((a,b)=>(a.a.work_phase==='after'?1:0)-(b.a.work_phase==='after'?1:0)||a.due-b.due||a.a.id.localeCompare(b.a.id)).map((e,i)=>({...e,step:i+1,done:!!e.s&&e.s.status!=='returned',status:e.s?.status==='returned'?'ลองใหม่':e.s?.status==='graded'?'ครูตรวจแล้ว':e.s?'ถึงครูแล้ว':'พร้อมเริ่ม'}));}
export function recoveryProgress(j:ReturnType<typeof studentJourney>,ids:string[]){const items=ids.map(id=>j.entries.find(e=>e.a.id===id)).filter((e):e is typeof j.entries[number]=>!!e);const done=items.filter(e=>e.s&&e.s.status!=='returned');return {items,done:done.length,total:items.length,remaining:items.filter(e=>!e.s||e.s.status==='returned')};}
export type Memory={day:string;at:string;sent:number;earned:number;capacity:number;ratio:number;house:number;xp:number;houseColor?:'lavender'|'mint'|'peach';companionName?:string;companion?:IslandCompanion;personality?:Personality;communityStage?:number;hat?:Hat;accessory?:Accessory;islandProp?:IslandProp};
export function memoryFrames(memories:Memory[]){return [{day:'เริ่มต้น',at:'',sent:0,earned:0,capacity:100,ratio:0,house:0,xp:0},...memories];}
export type ExploreData={praises:Row[];exhibits:Row[];gardens:Row[];memories:Memory[];recovery:{revision:number;ids:string[];activeId:string};};
