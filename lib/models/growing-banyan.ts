import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const phase=(value:number,start:number,end:number)=>T.MathUtils.smoothstep(value,start,end);
type Shape={anchor:T.Vector3;length:T.Vector3;thickness:number};
type Limb={centres:T.Vector3[];offsets:T.Vector3[];shape:(growth:number,height:number)=>Shape;geometry:T.BufferGeometry;start:number};

/** Living geometry: the stem thickens, branches extend, leaves unfold, then aerial roots descend. */
export function createGrowingBanyanTree({detail='full',seed=1987}:{detail?:'full'|'compact';seed?:number}={}){
 const tree=new T.Group();tree.name='Growing Grade Banyan';
 let state=seed;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
 const bark=new T.MeshStandardMaterial({color:0x8c7355,roughness:1});
 const rootBark=new T.MeshStandardMaterial({color:0x9c856b,roughness:1});
 const leaves=new T.MeshStandardMaterial({color:0xffffff,roughness:.85});
 const wood:Limb[]=[],roots:Limb[]=[],branches:{angle:number;start:number;attach:number;reach:number;rise:number}[]=[];
 function limb(points:number[][],radii:number[],shape:Limb['shape'],target:Limb[],segments=16,sides=7){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number]))),frames=curve.computeFrenetFrames(segments,false);
  const centres:T.Vector3[]=[],offsets:T.Vector3[]=[],positions:number[]=[],indices:number[]=[];
  for(let i=0;i<=segments;i++){const t=i/segments,k=t*(radii.length-1),j=Math.min(Math.floor(k),radii.length-2),radius=T.MathUtils.lerp(radii[j],radii[j+1],k-j),centre=curve.getPointAt(t);
   for(let s=0;s<sides;s++){const a=s/sides*Math.PI*2,offset=frames.normals[i].clone().multiplyScalar(Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius);centres.push(centre);offsets.push(offset);positions.push(0,0,0);}
  }
  for(let i=0;i<segments;i++)for(let s=0;s<sides;s++){const a=i*sides+s,b=i*sides+(s+1)%sides,c=a+sides,d=b+sides;indices.push(a,b,c,b,d,c);}
  for(let s=1;s<sides-1;s++){indices.push(0,s+1,s);const e=segments*sides;indices.push(e,e+s,e+s+1);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);target.push({centres,offsets,shape,geometry,start:0});
 }
 // The seedling has one slender stem. Its own centreline extends and its radius thickens.
 limb([[0,0,0],[-.07,.25,.02],[.045,.6,0],[0,1,0]],[.3,.23,.11,.018],(g,h)=>({anchor:new T.Vector3(),length:new T.Vector3(.15+g*.85,h, .15+g*.85),thickness:(.022+.278*Math.pow(g,1.7))/.3}),wood,28,10);
 for(let i=0;i<7;i++){
  const angle=i*Math.PI*2/7+.12,start=.18+i*.026,attach=.57+(i%3)*.07,reach=1.95+random()*.3,rise=.55+random()*.3;
  const x=Math.cos(angle),z=Math.sin(angle);branches.push({angle,start,attach,reach,rise});
  const age=(g:number)=>phase(g,start,.8+i*.02);
  limb([[0,0,0],[x*reach*.3,rise*.42,z*reach*.3],[x*reach*.7,rise*.8,z*reach*.7],[x*reach,rise,z*reach]],[.14,.10,.06,.015],(g,h)=>({anchor:new T.Vector3(0,h*attach,0),length:new T.Vector3().setScalar(age(g)),thickness:age(g)*(.28+g*.72)}),wood,20,8);
  for(let j=0;j<2;j++){
   const side=j?1:-1,fx=x*.56-z*.40*side,fz=z*.56+x*.40*side;
   limb([[0,0,0],[fx*.5,.14,fz*.5],[fx,.32,fz]],[.055,.03,.008],(g,h)=>{const a=age(g),fork=phase(g,.34+i*.02,.92);return {anchor:new T.Vector3(x*reach*.64*a,h*attach+rise*.72*a,z*reach*.64*a),length:new T.Vector3().setScalar(fork),thickness:fork};},wood,10,6);
  }
  // A young sapling has no root curtains. They grow down from mature branches later.
  for(let j=0;j<3;j++){
   const distance=.62+j*.34,grounded=j===1,rootStart=.64+i*.018+j*.012;
   limb([[0,0,0],[.025,-.35,.02],[-.01,-.7,-.02],[.015,-1,0]],[grounded?.035:.014,.017,.010,.005],(g,h)=>{const a=age(g),top=h*attach+rise*.5*a,drop=phase(g,rootStart,1)*(grounded?top:top*.73);return {anchor:new T.Vector3(x*distance*a,top,z*distance*a),length:new T.Vector3(1,drop,1),thickness:phase(g,rootStart,1)};},roots,12,5);
  }
  limb([[0,0,0],[x*.30,-.15,z*.30],[x*.82,-.18,z*.82]],[.09,.06,.006],(g)=>{const a=phase(g,.63,1);return {anchor:new T.Vector3(0,.19,0),length:new T.Vector3().setScalar(a),thickness:a};},wood,10,6);
 }
 function batch(parts:Limb[],material:T.Material,name:string){
  let offset=0;for(const part of parts){part.start=offset;offset+=part.centres.length;}
  const geometry=mergeGeometries(parts.map(p=>p.geometry))!;parts.forEach(p=>p.geometry.dispose());(geometry.getAttribute('position') as T.BufferAttribute).setUsage(T.DynamicDrawUsage);
  const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.frustumCulled=false;tree.add(mesh);return geometry;
 }
 const woodGeometry=batch(wood,bark,'Growing stem and branches'),rootGeometry=batch(roots,rootBark,'Descending aerial roots');
 const maximum=detail==='compact'?1200:2400,foliage=new T.InstancedMesh(new T.SphereGeometry(1,8,6),leaves,maximum),dummy=new T.Object3D(),color=new T.Color(),jade=new T.Color(),rose=new T.Color();
 foliage.name='Unfolding banyan leaves';foliage.instanceMatrix.setUsage(T.DynamicDrawUsage);foliage.frustumCulled=false;tree.add(foliage);
 const samples=Array.from({length:maximum},(_,i)=>{const angle=random()*Math.PI*2,polar=Math.acos(2*random()-1),radius=Math.cbrt(random());return {branch:i%8,dx:Math.sin(polar)*Math.cos(angle)*radius,dy:Math.cos(polar)*radius,dz:Math.sin(polar)*Math.sin(angle)*radius,size:.085+random()*.08,rotation:random()*Math.PI*2,shade:random()};});
 let last=-1;
 function update(value:number){
  const g=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));if(Math.abs(g-last)<.0005)return;last=g;
  const height=.48+3.92*Math.pow(g,.92),stemRadius=.022+.278*Math.pow(g,1.7);
  function reshape(parts:Limb[],geometry:T.BufferGeometry){const buffer=geometry.getAttribute('position') as T.BufferAttribute;
   for(const part of parts){const shape=part.shape(g,height);for(let i=0;i<part.centres.length;i++){const c=part.centres[i],o=part.offsets[i];buffer.setXYZ(part.start+i,shape.anchor.x+c.x*shape.length.x+o.x*shape.thickness,shape.anchor.y+c.y*shape.length.y+o.y*shape.thickness,shape.anchor.z+c.z*shape.length.z+o.z*shape.thickness);}}
   buffer.needsUpdate=true;geometry.computeVertexNormals();
  }
  reshape(wood,woodGeometry);reshape(roots,rootGeometry);rootGeometry.getAttribute('position').needsUpdate=true;
  const seedLeaves=2+Math.floor(18*Math.min(1,g/.3)),canopyAge=Math.max(0,(g-.3)/.7),count=g<.3?seedLeaves:20+Math.floor((maximum-20)*Math.pow(canopyAge,1.65)),bloom=phase(g,.62,.96);
  for(let i=0;i<count;i++){
   const s=samples[i];
   if(i<20){const pair=Math.floor(i/2),a=pair*2.2+(i%2)*Math.PI,unfold=1-phase(g,.34,.56),size=(.24+Math.min(g,.3)*.12)*unfold;
    const node=.97-pair/Math.max(1,Math.ceil(seedLeaves/2)-1)*.68;
    dummy.position.set(Math.cos(a)*size*.75,height*node,Math.sin(a)*size*.75);dummy.scale.set(size,.034*unfold,size*.48);dummy.rotation.set(0,a,(i%2?1:-1)*.3);
   }else{
    const b=branches[s.branch%7],age=phase(g,b.start,.8+(s.branch%7)*.02),spread=.20+phase(g,.32,1)*.88;
    const centre=s.branch===7?new T.Vector3(0,height,0):new T.Vector3(Math.cos(b.angle)*b.reach*age,height*b.attach+b.rise*age,Math.sin(b.angle)*b.reach*age);
    dummy.position.set(centre.x+s.dx*spread,centre.y+s.dy*spread*.72,centre.z+s.dz*spread*.8);dummy.scale.set(s.size*1.6,s.size*.48,s.size);dummy.rotation.set((s.shade-.5)*1.1,s.rotation,(s.shade-.5)*.8);
   }
   jade.setHSL(.23+s.shade*.055,.52,.31+s.shade*.12);rose.setHSL(.87+s.shade*.065,.58,.40+s.shade*.10);color.copy(jade).lerp(rose,i<20?0:bloom);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);foliage.setColorAt(i,color);
  }
  foliage.count=count;foliage.boundingBox=null;foliage.boundingSphere=null;foliage.instanceMatrix.needsUpdate=true;if(foliage.instanceColor)foliage.instanceColor.needsUpdate=true;
  tree.userData.growth={ratio:g,height,stemRadius,leafCount:count,branchCount:branches.filter(b=>g>b.start).length,rootCount:roots.filter(p=>p.shape(g,height).thickness>0).length};
  tree.updateMatrixWorld(true);
 }
 update(0);return {tree,update};
}
