import * as T from 'three';
import type {Hat,Accessory,IslandProp,CareCue} from '../companion-play';
export function createCompanionPlayModel(){
 const group=new T.Group(),outfits=new Map<T.Group,{hats:Map<Hat,T.Group>;accessories:Map<Accessory,T.Group>}>(),sphere=new T.SphereGeometry(1,20,14),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,10),cone=new T.ConeGeometry(1,1,10),wood=new T.MeshStandardMaterial({color:0xa58276,roughness:1}),pink=new T.MeshStandardMaterial({color:0xf1a3ca}),gold=new T.MeshStandardMaterial({color:0xffd880}),mint=new T.MeshStandardMaterial({color:0x9acdb6}),blue=new T.MeshStandardMaterial({color:0xa4c8f0}),cream=new T.MeshStandardMaterial({color:0xffe8bf});
 function mesh(parent:T.Group,geo:T.BufferGeometry,mat:T.Material,p:number[],s:number[]){const m=new T.Mesh(geo,mat);m.position.set(...p as [number,number,number]);m.scale.set(...s as [number,number,number]);parent.add(m);return m;}
 function attach(buddy:T.Group,mounts?:{head:T.Group;neck:T.Group}){
  const hats=new Map<Hat,T.Group>(),accessories=new Map<Accessory,T.Group>();
  for(const id of ['flower','crown','cap'] as const){const g=new T.Group();g.visible=false;g.position.set(0,mounts?0:.59,0);(mounts?.head||buddy).add(g);hats.set(id,g);
   if(id==='flower'){g.position.set(.19,.015,.11);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(g,sphere,pink,[Math.cos(a)*.075,.09+Math.sin(a)*.075,.08],[.055,.055,.025]);}mesh(g,sphere,gold,[0,.09,.105],[.042,.042,.025]);}
   if(id==='crown'){mesh(g,cylinder,gold,[0,.025,0],[.27,.065,.235]);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(g,cone,gold,[Math.cos(a)*.23,.105,Math.sin(a)*.20],[.055,.15,.055]);}}
   if(id==='cap'){const dome=new T.SphereGeometry(1,28,16,0,Math.PI*2,0,Math.PI/2);mesh(g,dome,mint,[0,.018,0],[.29,.16,.25]);mesh(g,sphere,mint,[0,.01,.19],[.30,.028,.18]);mesh(g,sphere,cream,[0,.18,0],[.027,.017,.027]);}
  }
  for(const id of ['bow','scarf'] as const){const g=new T.Group();g.visible=false;g.position.set(0,mounts?0:.29,mounts?.neck?0:.15);(mounts?.neck||buddy).add(g);accessories.set(id,g);
   if(id==='bow'){for(const side of [-1,1]){const wing=mesh(g,sphere,pink,[side*.065,0,.01],[.08,.055,.03]);wing.rotation.z=side*.3;}mesh(g,sphere,gold,[0,0,.04],[.035,.035,.025]);}
   else {const collar=new T.Mesh(new T.TorusGeometry(.19,.038,10,30),blue);collar.rotation.x=Math.PI/2;collar.position.z=-.10;g.add(collar);const tail=mesh(g,box,blue,[.10,-.12,.015],[.075,.20,.025]);tail.rotation.z=.3;}
  }outfits.set(buddy,{hats,accessories});
 }
 const props=new Map<IslandProp,T.Group>();for(const id of ['swing','pond','picnic'] as const){const g=new T.Group();g.visible=false;g.position.set(-1.1,.15,-.65);group.add(g);props.set(id,g);}
 const swing=props.get('swing')!;for(const x of [-.35,.35])mesh(swing,box,wood,[x,.5,0],[.065,1,.065]);mesh(swing,box,wood,[0,1,0],[.85,.07,.07]);for(const x of [-.22,.22])mesh(swing,box,cream,[x,.64,0],[.018,.65,.018]);const seat=mesh(swing,box,pink,[0,.31,0],[.57,.05,.28]);
 const pond=props.get('pond')!;mesh(pond,cylinder,blue,[0,.01,0],[.52,.04,.37]);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(pond,sphere,pink,[.10+Math.cos(a)*.07,.10,Math.sin(a)*.07],[.075,.035,.045]);}mesh(pond,sphere,mint,[-.15,.055,.12],[.16,.015,.1]);
 const picnic=props.get('picnic')!;mesh(picnic,box,pink,[0,.02,0],[.80,.03,.57]);for(const x of [-.26,0,.26])mesh(picnic,box,cream,[x,.038,0],[.06,.005,.55]);mesh(picnic,box,wood,[.18,.14,-.08],[.25,.20,.2]);mesh(picnic,sphere,gold,[-.19,.10,.10],[.11,.07,.08]);
 const feed=new T.Group(),play=new T.Group(),love=new T.Group();feed.name='Care feeding bowl';play.name='Care play ball';love.name='Care hearts';group.add(feed,play,love);feed.position.set(.8,.13,1.40);mesh(feed,cylinder,pink,[0,0,0],[.17,.07,.16]);for(let i=0;i<5;i++)mesh(feed,sphere,gold,[Math.cos(i*2.4)*.075,.05,Math.sin(i*2.4)*.075],[.035,.03,.035]);const ball=mesh(play,sphere,mint,[.6,.25,1.35],[.11,.11,.11]);
 const shape=new T.Shape();shape.moveTo(0,-.1);shape.bezierCurveTo(-.20,.02,-.15,.21,0,.10);shape.bezierCurveTo(.15,.21,.20,.02,0,-.1);const heartGeo=new T.ShapeGeometry(shape),heartMat=new T.MeshBasicMaterial({color:0xf19bbe,side:T.DoubleSide}),hearts:T.Mesh[]=[];for(let i=0;i<5;i++)hearts.push(mesh(love,heartGeo,heartMat,[.8,.8,1],[.7,.7,.7]));
 let lastCue=0,start=-100,action='';
 function update(time:number,still:boolean,hat:Hat='none',accessory:Accessory='none',prop:IslandProp='none',cue?:CareCue,buddy?:T.Group){
  outfits.forEach(o=>{o.hats.forEach((g,id)=>g.visible=id===hat);o.accessories.forEach((g,id)=>g.visible=id===accessory);});props.forEach((g,id)=>g.visible=id===prop);
  if(cue&&cue.id!==lastCue){lastCue=cue.id;start=time;action=cue.action;}const elapsed=time-start,active=!!buddy&&elapsed>=0&&elapsed<3.6;feed.visible=active&&action==='feed';play.visible=active&&action==='play';love.visible=active&&action==='love';
  if(!still){seat.rotation.x=Math.sin(time*1.5)*.08;if(active&&buddy){if(action!=='feed')buddy.rotation.x=0;if(action==='feed'){buddy.position.set(.8,.14,1.14);buddy.rotation.y=0;buddy.rotation.x=Math.sin(elapsed*3)*.10;}else if(action==='play'){const x=.55+Math.sin(elapsed*2)*.32;buddy.position.set(x,.14+Math.abs(Math.sin(elapsed*5))*.06,1.12);ball.position.set(x+.2,.23+Math.abs(Math.sin(elapsed*5))*.17,1.40);}else{buddy.rotation.y=Math.sin(elapsed*3)*.15;hearts.forEach((h,i)=>{h.position.set(.8+Math.sin(i*2.4)*.24,.65+(elapsed*.35+i*.16)%.9,1.1+Math.cos(i*2.4)*.13);h.rotation.y=-.35;});}}}
  if(!active&&buddy)buddy.rotation.x=0;
 }
 return {group,attach,update};
}
