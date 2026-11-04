export const careActions=[{id:'feed',icon:'🥕',name:'ให้อาหาร',message:'อิ่มอร่อยแล้ว พร้อมเป็นกำลังใจให้คุณ!'},{id:'play',icon:'🎾',name:'เล่นด้วยกัน',message:'สนุกจัง! ขอบคุณที่มาเล่นด้วยกันนะ'},{id:'love',icon:'💜',name:'ส่งหัวใจ',message:'ได้รับความอบอุ่นแล้ว ส่งกำลังใจกลับให้คุณด้วย!'}] as const;
export type CareAction=typeof careActions[number]['id'];
export type CareCue={id:number;action:CareAction};
export const hats=[{id:'none',icon:'🌿',name:'สบาย ๆ'},{id:'flower',icon:'🌼',name:'ดอกไม้'},{id:'crown',icon:'👑',name:'มงกุฎ'},{id:'cap',icon:'🧢',name:'หมวกนักสำรวจ'}] as const;
export const accessories=[{id:'none',icon:'🍃',name:'ไม่ใส่'},{id:'bow',icon:'🎀',name:'โบว์สีชมพู'},{id:'scarf',icon:'🧣',name:'ผ้าพันคอ'}] as const;
export const islandProps=[{id:'none',icon:'🌱',name:'สวนเรียบง่าย'},{id:'swing',icon:'🪵',name:'ชิงช้าไม้'},{id:'pond',icon:'🪷',name:'บัวในบ่อ'},{id:'picnic',icon:'🧺',name:'มุมปิกนิก'}] as const;
export type Hat=typeof hats[number]['id'];
export type Accessory=typeof accessories[number]['id'];
export type IslandProp=typeof islandProps[number]['id'];
export const matchSymbols=[{id:'leaf',icon:'🍃',name:'ใบไม้'},{id:'flower',icon:'🌸',name:'ดอกไม้'},{id:'sun',icon:'☀️',name:'ดวงอาทิตย์'}];
export function shuffledCards(random= Math.random){const cards=matchSymbols.flatMap(s=>[0,1].map(n=>({...s,key:s.id+n})));for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
export function matchTurn(first:string,second:string){return first===second;}
export function sameSequence(expected:number[],actual:number[]){return actual.length<=expected.length&&actual.every((n,i)=>n===expected[i]);}
export function careValue(value:any,today:string){return {careDay:today,careDone:value?.careDay===today&&Array.isArray(value?.careDone)?careActions.filter(a=>value.careDone.includes(a.id)).map(a=>a.id):[],careStars:Number.isSafeInteger(value?.careStars)&&value.careStars>=0?Math.min(10000,value.careStars):0};}
/** The server calls this only after validating action and the current account revision. */
export function careStep(value:ReturnType<typeof careValue>,action:CareAction){const done=value.careDone.includes(action)?value.careDone:[...value.careDone,action];return {...value,careDone:done,careStars:Math.min(10000,value.careStars+(value.careDone.length<3&&done.length===3?1:0))};}
