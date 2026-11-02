export const islandRewards=[
 {id:'lanterns',icon:'🏮',name:'โคมแห่งก้าวแรก',goal:1,text:'แสงอบอุ่นรอบต้นไทร'},
 {id:'mushrooms',icon:'🍄',name:'หมู่บ้านเห็ด',goal:3,text:'เติมบ้านจิ๋วให้เพื่อนในสวน'},
 {id:'fireflies',icon:'✨',name:'หิ่งห้อยแห่งความพยายาม',goal:5,text:'แสงน้อย ๆ ที่คอยเป็นกำลังใจ'},
 {id:'rainbow',icon:'🌈',name:'สายรุ้งแห่งความสำเร็จ',goal:10,text:'สะพานสีสันเหนือเกาะของคุณ'}
] as const;
export type IslandDecoration='none'|typeof islandRewards[number]['id'];
export const companions=[{id:'bunny',icon:'🐰',name:'น้องกระต่าย',goal:0},{id:'fox',icon:'🦊',name:'น้องจิ้งจอก',goal:3},{id:'owl',icon:'🦉',name:'น้องฮูก',goal:5}] as const;
export type IslandCompanion=typeof companions[number]['id'];
