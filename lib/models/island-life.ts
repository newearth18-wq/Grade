import * as T from 'three';
import type {HouseColor} from '../adventure-life';

export function createIslandLife(){
 const group=new T.Group(),homes:T.Group[]=[],wood=new T.MeshStandardMaterial({color:0xa38370,roughness:1}),wall=new T.MeshStandardMaterial({color:0xb99bd9,roughness:.9}),roof=new T.MeshStandardMaterial({color:0x806499,roughness:.9}),glass=new T.MeshStandardMaterial({color:0xffe1a5,emissive:0xffcf8c,emissiveIntensity:.3}),grass=new T.MeshStandardMaterial({color:0xc3d88c,roughness:1}),rock=new T.MeshStandardMaterial({color:0x8e75a9,flatShading:true,roughness:1}),water=new T.MeshBasicMaterial({color:0xa7e1ee,transparent:true,opacity:.7,depthWrite:false});
 const boxGeometry=new T.BoxGeometry(1,1,1),roofGeometry=new T.ConeGeometry(1,1,4),stoneGeometry=new T.IcosahedronGeometry(1,0),discGeometry=new T.CylinderGeometry(1,1,.1,12),sphere=new T.SphereGeometry(1,7,5);
 function block(parent:T.Group,material:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,geometry:T.BufferGeometry=boxGeometry){const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;}
 for(let stage=0;stage<=4;stage++){
  const home=new T.Group();home.name='Companion home stage '+stage;home.position.set(-.95,.15,.55);home.rotation.y=.2;home.visible=false;homes.push(home);group.add(home);
  const floor=stage>=3?.68:.08;
  block(home,wood,0,floor,0,.70,.07,.60);
  if(stage===0){for(const x of [-.21,0,.21])block(home,wood,x,.16,0,.12,.06,.48);block(home,glass,.30,.32,-.18,.18,.2,.025);continue;}
  if(stage===1){const tent=block(home,wall,0,.30,0,.43,.48,.43,roofGeometry);tent.rotation.y=Math.PI/4;block(home,wood,0,.23,.25,.14,.26,.02);continue;}
  if(stage>=3){for(const x of [-.24,.24])block(home,wood,x,.36,-.15,.07,.70,.07);for(let i=0;i<5;i++)block(home,wood,.32,.13+i*.13,.24,.14,.035,.22);}
  block(home,wall,0,floor+.23,0,stage===4?.64:.55,.43,.47);const top=block(home,roof,0,floor+.60,0,.52,.40,.48,roofGeometry);top.rotation.y=Math.PI/4;
  block(home,wood,.10,floor+.17,.247,.16,.30,.025);block(home,glass,-.15,floor+.27,.248,.12,.13,.03);
  if(stage>=3){block(home,wood,0,floor+.09,.35,.68,.04,.15);for(const x of [-.28,.28])block(home,wood,x,floor+.22,.40,.035,.24,.035);block(home,wood,0,floor+.35,.40,.62,.035,.035);}
  if(stage===4){block(home,wood,-.28,floor+.88,-.04,.025,.34,.025);block(home,wall,-.16,floor+.98,-.04,.22,.13,.025);for(const x of [-.35,.35])block(home,grass,x,.12,.2,.11,.15,.11,stoneGeometry);}
 }
 const waterfall=new T.Group(),bridge=new T.Group(),garden=new T.Group();waterfall.name='Class waterfall';bridge.name='Class bridge';garden.name='Class garden island';group.add(waterfall,bridge,garden);
 function platform(parent:T.Group,x:number,z:number,size:number){block(parent,rock,x,-.28,z,size,.5*size,size,stoneGeometry);block(parent,grass,x,.04,z,size,.7,size,discGeometry);}
 platform(waterfall,2.65,-.75,.53);block(waterfall,water,2.91,-.55,-.75,.20,1.20,.10);
 const drops:T.Mesh[]=[];for(let i=0;i<6;i++)drops.push(block(waterfall,water,2.91+(i%2-.5)*.12,-i*.2,-.74,.04,.08,.04,sphere));
 for(let i=0;i<8;i++)block(bridge,wood,1.45+i*.14,.12,-.75,.10,.05,.40);
 for(const z of [-.97,-.53]){block(bridge,wood,1.85,.37,z,1.06,.025,.025);for(const x of [1.4,2.40])block(bridge,wood,x,.25,z,.025,.35,.025);}
 platform(garden,-2.8,-1.0,.64);const blossom=new T.MeshStandardMaterial({color:0xf3b3cc,roughness:1});for(let i=0;i<7;i++){const angle=i*2.4,x=-2.8+Math.cos(angle)*.40,z=-1+Math.sin(angle)*.35;block(garden,wood,x,.19,z,.025,.28,.025);block(garden,blossom,x,.36,z,.13,.09,.13,sphere);}
 let lastColor='';
 function update(stage:number,color:HouseColor,community:number,time:number,still:boolean){
  homes.forEach((home,i)=>home.visible=stage===i);if(color!==lastColor){lastColor=color;wall.color.set(color==='mint'?0x94cdb5:color==='peach'?0xedb796:0xb99bd9);roof.color.copy(wall.color).multiplyScalar(.74);}
  waterfall.visible=community>=1;bridge.visible=community>=2;garden.visible=community>=3;
  if(!still&&waterfall.visible)drops.forEach((drop,i)=>{drop.position.y=-.15-(time*.65+i*.21)%1.28;});
 }
 return {group,update};
}
