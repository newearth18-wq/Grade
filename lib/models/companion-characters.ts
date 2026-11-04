import * as T from 'three';
import type {IslandCompanion} from '../adventure-catalog';

/** Original soft-toy characters. Facial parts and hats share the articulated head. */
export function createCompanionCharacters(){
 const sphere=new T.SphereGeometry(1,28,20),disc=new T.CircleGeometry(1,36);
 const mat=(color:number,roughness=.68)=>new T.MeshStandardMaterial({color,roughness,metalness:0});
 const ivory=mat(0xfff0dc),white=mat(0xfff8ec),cream=mat(0xf2ddc3),coral=mat(0xf0acb7),fur=mat(0xe79861),darkFur=mat(0xb36748),plum=mat(0x8c748e),wingColor=mat(0x715f7c),gold=mat(0xe7b465),noseMat=mat(0x725064),mouthMat=mat(0x875e65),eyeMat=new T.MeshPhysicalMaterial({color:0x302d3f,roughness:.14,clearcoat:1,clearcoatRoughness:.1}),shine=new T.MeshBasicMaterial({color:0xfffcf7});
 const shadowMats=Array.from({length:5},(_,i)=>new T.MeshBasicMaterial({color:0x5b5268,transparent:true,opacity:.025+i*.004,depthWrite:false}));
 function ball(parent:T.Object3D,material:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number){const m=new T.Mesh(sphere,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 function curve(parent:T.Object3D,material:T.Material,points:T.Vector3[],radius=.006){const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),14,radius,6,false),material);parent.add(m);return m;}
 function pointedEar(material:T.Material,inner:T.Material,side:number){
  const group=new T.Group(),shape=new T.Shape();shape.moveTo(-.10,0);shape.bezierCurveTo(-.14,.12,-.075,.23,0,.30);shape.bezierCurveTo(.08,.22,.14,.10,.10,0);shape.quadraticCurveTo(0,-.035,-.10,0);
  const geometry=new T.ExtrudeGeometry(shape,{depth:.045,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.025,curveSegments:10}),outer=new T.Mesh(geometry,material),inside=new T.Mesh(geometry,inner);outer.position.z=-.06;inside.scale.set(.60,.70,.28);inside.position.set(0,.04,.014);group.add(outer,inside);group.rotation.z=-side*.23;return group;
 }
 function eye(parent:T.Group,x:number,y:number,z:number,owl=false){
  const group=new T.Group();group.position.set(x,y,z);parent.add(group);ball(group,eyeMat,0,0,0,owl?.063:.045,owl?.080:.059,.030);ball(group,shine,-.014,.024,.025,.014,.018,.008);ball(group,shine,.015,-.015,.027,.006,.008,.005);return group;
 }
 function smile(head:T.Group,z:number,width=.055,y=-.12){for(const side of [-1,1])curve(head,mouthMat,[new T.Vector3(0,y+.013,z),new T.Vector3(side*width*.48,y-.012,z+.001),new T.Vector3(side*width,y+.008,z-.004)],.0045);}
 function tailSegment(curvePath:T.Curve<T.Vector3>,from:number,to:number,material:T.Material){
  const points=Array.from({length:16},(_,i)=>curvePath.getPoint(from+(to-from)*i/15)),path=new T.CatmullRomCurve3(points),geometry=new T.TubeGeometry(path,24,1,14,false),position=geometry.getAttribute('position');
  for(let i=0;i<=24;i++){const t=from+(to-from)*i/24,center=path.getPointAt(i/24),r=.018+Math.sin(Math.PI*t)*.115;for(let j=0;j<=14;j++){const k=i*15+j;position.setXYZ(k,center.x+(position.getX(k)-center.x)*r,center.y+(position.getY(k)-center.y)*r,center.z+(position.getZ(k)-center.z)*r);}}geometry.computeVertexNormals();return new T.Mesh(geometry,material);
 }
 function create(id:IslandCompanion){
  const root=new T.Group();root.name=`Companion ${id}`;root.visible=false;root.position.set(.8,.14,1.1);
  const body=new T.Group(),head=new T.Group(),eyes:T.Group[]=[],feet:T.Group[]=[],arms:T.Group[]=[],ears:T.Group[]=[];root.add(body,head);head.position.y=id==='owl'?.57:.60;head.name='Character head';
  const coat=id==='fox'?fur:id==='owl'?plum:ivory;
  ball(body,coat,0,.28,0,id==='owl'?.25:.215,.285,.185);ball(body,id==='owl'?cream:white,0,.26,.145,id==='owl'?.175:.145,.19,.065);
  if(id==='owl'){
   ball(head,plum,0,0,0,.305,.265,.235);
   for(const side of [-1,1]){ball(head,white,side*.12,.015,.195,.145,.17,.060);eyes.push(eye(head,side*.123,.035,.247,true));ball(head,coral,side*.21,-.07,.222,.043,.021,.012);const tuft=pointedEar(plum,cream,side);tuft.position.set(side*.21,.17,-.055);tuft.scale.set(.62,.56,.75);head.add(tuft);ears.push(tuft);}
   const beak=new T.Mesh(new T.ConeGeometry(.042,.10,16),gold);beak.position.set(0,-.061,.291);beak.rotation.x=-.45;beak.rotation.z=Math.PI;head.add(beak);
   for(const side of [-1,1]){const wing=new T.Group();wing.position.set(side*.22,.30,-.01);wing.rotation.z=side*.22;ball(wing,wingColor,side*.015,0,0,.092,.19,.11);for(let i=0;i<3;i++)ball(wing,plum,side*.035,-.07+i*.065,.086,.042,.057,.014);body.add(wing);arms.push(wing);}
   for(let i=0;i<3;i++)ball(body,gold,(i-1)*.075,.24,.204,.018,.03,.008);
  }else{
   ball(head,coat,0,0,0,id==='fox'?.305:.28,.25,.23);
   if(id==='fox'){
    for(const side of [-1,1]){const ear=pointedEar(fur,darkFur,side);ear.position.set(side*.205,.15,-.025);head.add(ear);ears.push(ear);ball(head,white,side*.13,-.10,.182,.145,.106,.075);}
    ball(head,white,0,-.15,.21,.115,.075,.055);
   }else{
    for(const side of [-1,1]){const ear=new T.Group();ear.position.set(side*.13,.19,-.02);ear.rotation.z=-side*.15;ball(ear,ivory,0,.185,0,.083,.26,.064);ball(ear,coral,0,.195,.057,.042,.192,.015);head.add(ear);ears.push(ear);ball(head,white,side*.055,-.09,.213,.083,.065,.047);}
   }
   for(const side of [-1,1]){eyes.push(eye(head,side*.102,.024,.215));ball(head,coral,side*.173,-.047,.210,.050,.027,.012);curve(head,id==='fox'?darkFur:cream,[new T.Vector3(side*.073,.105,.205),new T.Vector3(side*.105,.12,.205),new T.Vector3(side*.131,.109,.197)],.007);}
   ball(head,id==='bunny'?coral:noseMat,0,-.069,.284,.029,.021,.020);smile(head,.264,id==='fox'?.047:.036,-.119);
   for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*.20,.31,.025);arm.rotation.z=side*.26;ball(arm,coat,0,-.045,0,.074,.14,.077);ball(arm,white,0,-.13,.013,.057,.041,.061);body.add(arm);arms.push(arm);}
  }
  for(const side of [-1,1]){const foot=new T.Group();foot.position.set(side*(id==='owl'?.12:.125),.035,.09);ball(foot,id==='owl'?gold:coat,0,0,0,.105,.052,.135);if(id!=='owl'){ball(foot,white,0,.014,.075,.080,.030,.067);for(let i=0;i<2;i++)ball(foot,coral,(i-.5)*.035,.022,.117,.012,.012,.008);}root.add(foot);feet.push(foot);}
  const tail=new T.Group();root.add(tail);tail.name='Character tail';
  if(id==='fox'){const path=new T.CatmullRomCurve3([new T.Vector3(.08,.16,-.15),new T.Vector3(.32,.16,-.23),new T.Vector3(.49,.30,-.18),new T.Vector3(.48,.49,-.05)]);tail.add(tailSegment(path,0,.72,fur),tailSegment(path,.72,1,white));ball(tail,white,.48,.49,-.05,.025,.03,.025);}
  else if(id==='bunny'){ball(tail,white,.11,.20,-.19,.10,.10,.095);for(let i=0;i<3;i++)ball(tail,ivory,.10+Math.cos(i*2.1)*.06,.20+Math.sin(i*2.1)*.06,-.235,.055,.055,.042);}
  else ball(tail,wingColor,0,.15,-.17,.12,.08,.13);
  const hatMount=new T.Group(),neckMount=new T.Group();hatMount.position.set(0,id==='owl'?.235:.225,0);hatMount.name='Hat attachment';head.add(hatMount);neckMount.position.set(0,.385,.24);neckMount.name='Neck attachment';root.add(neckMount);
  for(let i=0;i<5;i++){const shadow=new T.Mesh(disc,shadowMats[i]);shadow.rotation.x=-Math.PI/2;shadow.scale.set(.34-i*.035,.21-i*.020,1);shadow.position.set(0,.002+i*.0004,.02);root.add(shadow);}
  ears.forEach(e=>e.userData.restZ=e.rotation.z);arms.forEach(e=>e.userData.restZ=e.rotation.z);
  function animate(time:number,still:boolean,cheer:boolean,curious:boolean,portrait:boolean){if(still)return;const gait=portrait?0:Math.sin(time*4)*.17;feet.forEach((foot,i)=>foot.rotation.x=gait*(i?1:-1));arms.forEach((arm,i)=>{arm.rotation.x=cheer?Math.sin(time*6)*.28:gait*(i?-1:1);arm.rotation.z=arm.userData.restZ+(cheer?(i?-.35:.35):0);});head.rotation.z=Math.sin(time*1.4)*(curious?.10:.035);head.rotation.x=Math.sin(time*1.1)*.025;ears.forEach((ear,i)=>ear.rotation.z=ear.userData.restZ+Math.sin(time*1.6+i)*.035);tail.rotation.z=Math.sin(time*2.2)*.065;const blink=(time+(id==='bunny'?0:id==='fox'?1.7:3.1))%5.5;eyes.forEach(e=>e.scale.y=blink>5.30?Math.max(.09,Math.abs(blink-5.4)*10):1);body.scale.y=1+Math.sin(time*2)*.013;}
  return {root,head,hatMount,neckMount,animate};
 }
 return {create};
}
