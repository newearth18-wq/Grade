import * as T from 'three';
import type {IslandCompanion,IslandDecoration} from '../island-adventure';

/** Small, unlit-free props: no textures, shadows, extra canvases or per-frame geometry. */
export function createIslandRewards(){
 const group=new T.Group(),decorations=new Map<string,T.Group>(),buddies=new Map<string,T.Group>();
 const material=(color:number,glow=false)=>new T.MeshStandardMaterial({color,roughness:.8,...(glow?{emissive:color,emissiveIntensity:.6}:{})});
 const cream=material(0xffe5c1),pink=material(0xf3a8c3),wood=material(0x82617f),orange=material(0xe3995d),black=material(0x463451);
 const ballGeometry=new T.SphereGeometry(1,10,8);
 function ball(parent:T.Group,mat:T.Material,position:number[],scale:number[]){const mesh=new T.Mesh(ballGeometry,mat);mesh.position.set(...position as [number,number,number]);mesh.scale.set(...scale as [number,number,number]);parent.add(mesh);return mesh;}
 function decoration(id:IslandDecoration){const g=new T.Group();g.visible=false;decorations.set(id,g);group.add(g);return g;}
 const lanterns=decoration('lanterns'),gold=material(0xffcf79,true);
 for(const x of [-1.25,1.25]){ball(lanterns,gold,[x,.36,.70],[.16,.21,.16]);ball(lanterns,wood,[x,.59,.70],[.20,.035,.20]);ball(lanterns,wood,[x,.15,.70],[.19,.035,.19]);}
 const mushrooms=decoration('mushrooms'),purple=material(0xc58cde);
 for(let i=0;i<5;i++){const x=Math.cos(i*2.1)*1.24,z=Math.sin(i*2.1)*.93,s=.7+i%2*.3;ball(mushrooms,cream,[x,.22*s,z],[.07*s,.17*s,.07*s]);ball(mushrooms,i%2?pink:purple,[x,.39*s,z],[.23*s,.12*s,.23*s]);ball(mushrooms,cream,[x+.07*s,.49*s,z],[.04*s,.02*s,.04*s]);}
 const fireflies=decoration('fireflies'),geometry=new T.BufferGeometry(),positions=new Float32Array(24*3);
 for(let i=0;i<24;i++){positions[i*3]=Math.cos(i*2.4)*(1+i%4*.25);positions[i*3+1]=.4+i%7*.25;positions[i*3+2]=Math.sin(i*2.4)*(1+i%3*.3);}
 geometry.setAttribute('position',new T.BufferAttribute(positions,3));const lights=new T.Points(geometry,new T.PointsMaterial({color:0xffeb8d,size:.065,transparent:true,opacity:.9,depthWrite:false}));fireflies.add(lights);
 const rainbow=decoration('rainbow');for(let i=0;i<5;i++){const arc=new T.Mesh(new T.TorusGeometry(1.52+i*.085,.035,5,48,Math.PI),material([0xf3a1c8,0xffbd8c,0xf5dc95,0xa4cead,0xb7ade3][i]));arc.position.set(0,.24,-1.22);rainbow.add(arc);}
 for(const id of ['bunny','fox','owl'] as const){
  const buddy=new T.Group();buddy.visible=false;buddy.position.set(.80,.14,1.10);const fur=id==='fox'?orange:id==='owl'?wood:cream;
  ball(buddy,fur,[0,.18,0],[.18,.22,.15]);ball(buddy,fur,[0,.43,0],[.19,.18,.17]);
  for(const side of [-1,1]){ball(buddy,cream,[side*.11,.025,.06],[.1,.045,.1]);ball(buddy,black,[side*.07,.46,.15],[.025,.033,.018]);if(id==='owl')ball(buddy,cream,[side*.08,.455,.137],[.07,.075,.03]);else{const ear=ball(buddy,fur,[side*.10,id==='bunny'?.71:.62,0],[.06,id==='bunny'?.19:.10,.05]);ear.rotation.z=side*-.22;if(id==='bunny')ball(buddy,pink,[side*.10,.73,.04],[.025,.12,.015]);}}
  if(id==='owl')for(const side of [-1,1])ball(buddy,black,[side*.07,.46,.17],[.025,.033,.018]);
  ball(buddy,id==='owl'?orange:pink,[0,.39,.17],[.035,.025,.025]);
  if(id==='fox'){const tail=ball(buddy,orange,[.21,.18,-.03],[.18,.08,.08]);tail.rotation.z=.5;ball(buddy,cream,[.34,.25,-.03],[.07,.07,.07]);}
  buddies.set(id,buddy);group.add(buddy);
 }
 function update(decoration:IslandDecoration,companion:IslandCompanion|undefined,time:number,still:boolean){
  decorations.forEach((g,id)=>g.visible=id===decoration);buddies.forEach((g,id)=>{g.visible=id===companion;if(g.visible)g.position.y=.14+(still?0:Math.sin(time*1.8)*.015);});
  fireflies.rotation.y=still?0:time*.12;lights.material.opacity=still?.9:.75+Math.sin(time*2)*.15;
 }
 return {group,update};
}
