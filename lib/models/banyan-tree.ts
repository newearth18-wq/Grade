import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Original procedural banyan. Y is up; dimensions are metres, origin at ground. */
export function createBanyanTree({detail='full',seed=1987,optimize=true,palette='jade'}:{detail?:'full'|'compact';seed?:number;optimize?:boolean;palette?:'jade'|'blossom'}={}) {
  const tree=new T.Group();tree.name='Grade Banyan';tree.userData={species:'Ficus benghalensis',artist:'Grade',units:'metres',seed};
  let state=seed;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
  const bark=new T.MeshStandardMaterial({name:'Warm grey bark',color:0x817361,roughness:1});
  const rootBark=new T.MeshStandardMaterial({name:'Young aerial roots',color:0x9c856b,roughness:1});
  const leaves=new T.MeshStandardMaterial({name:'Jade banyan leaves',color:0xffffff,roughness:.88,flatShading:true});
  const wood=new T.Group();wood.name='Trunk and spreading branches';tree.add(wood);
  const roots=new T.Group();roots.name='Aerial and buttress roots';tree.add(roots);
  function limb(name:string,points:number[][],radii:number[],group:T.Group=wood,material=bark,segments=18,sides=8) {
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number]))),frames=curve.computeFrenetFrames(segments,false);
    const position:number[]=[],indices:number[]=[];
    for(let i=0;i<=segments;i++){
      const t=i/segments,k=t*(radii.length-1),j=Math.min(Math.floor(k),radii.length-2),radius=T.MathUtils.lerp(radii[j],radii[j+1],k-j),p=curve.getPointAt(t);
      for(let s=0;s<sides;s++){const a=s/sides*Math.PI*2,v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius);position.push(v.x,v.y,v.z);}
    }
    for(let i=0;i<segments;i++)for(let s=0;s<sides;s++){const a=i*sides+s,b=i*sides+(s+1)%sides,c=a+sides,d=b+sides;indices.push(a,b,c,b,d,c);}
    // Close both ends so the exported mesh also renders correctly from below.
    for(let s=1;s<sides-1;s++){indices.push(0,s+1,s);const end=segments*sides;indices.push(end,end+s,end+s+1);}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,material);mesh.name=name;group.add(mesh);return mesh;
  }
  limb('Ancient curved trunk',[[0,0,0],[-.08,.45,.02],[.08,1.05,0],[.01,1.65,-.02],[.08,2.2,0]],[.33,.28,.20,.15,.07],wood,bark,28,12);
  // Fused vertical root ridges make a fluted, mature trunk rather than a cylinder.
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9,x=Math.cos(a),z=Math.sin(a);
    limb(`Trunk flute ${i+1}`,[[x*.36,0,z*.34],[x*.24,.48,z*.23],[x*.15,1.08,z*.14],[x*.13,1.61,z*.10]],[.09,.075,.055,.016],wood,bark,16,6);
    limb(`Surface buttress ${i+1}`,[[x*.22,.42,z*.22],[x*.48,.13,z*.45],[x*.90,.04,z*.8],[x*1.16,.01,z*1.02]],[.095,.095,.045,.009],roots,bark,12,7);
  }
  const crowns:{x:number;y:number;z:number;radius:number}[]=[{x:0,y:2.62,z:0,radius:.86}];
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9+.12,x=Math.cos(a),z=Math.sin(a),height=2.15+random()*.30,reach=1.50+random()*.15;
    limb(`Spreading bough ${i+1}`,[[0,1.35,0],[x*.50,1.86,z*.45],[x*1.0,height,z*.82],[x*reach,height+.12,z*reach*.83]],[.15,.12,.075,.025],wood,bark,22,9);
    limb(`Fork ${i+1}`,[[x*.70,1.99,z*.60],[x*1.13-z*.33,height+.16,z*.95+x*.28],[x*1.64-z*.35,height+.3,z*1.36+x*.29]],[.068,.042,.008],wood,bark,14,7);
    crowns.push({x:x*1.25,y:height+.45,z:z*1.08,radius:.73+random()*.15});
    crowns.push({x:x*1.58-z*.22,y:height+.32,z:z*1.27+x*.20,radius:.56});
    // Several root curtains underneath each branch, including roots reaching soil.
    for(let j=0;j<5;j++){
      const r=.65+j*.19,a2=a+(random()-.5)*.22,rx=Math.cos(a2)*r,rz=Math.sin(a2)*r*.83,top=1.98+(r-.65)*.32;
      const grounded=j===3||j===1&&i%3===0,bottom=grounded?.02:.42+random()*.64;
      limb(`Hanging root ${i+1}.${j+1}`,[[rx,top,rz],[rx+.04,top*.68,rz+.035],[rx-.015,bottom+.20,rz-.035],[rx+.01,bottom,rz]],[grounded?.026:.014,.014,.011,.006],roots,rootBark,12,5);
      if(grounded){limb(`Prop root ${i+1}.${j+1}`,[[rx,.04,rz],[rx-.03,.52,rz+.04],[rx+.02,1.13,rz],[rx,top,rz]],[.075,.04,.028,.02],roots,bark,16,7);
        limb(`Prop foot ${i+1}.${j+1}`,[[rx,.20,rz],[rx+x*.12,.05,rz+z*.12],[rx+x*.27,.015,rz+z*.20]],[.055,.04,.008],roots,bark,8,6);}
    }
  }
  // Dense, layered clusters leave a clear view of branches and hanging roots below.
  const count=detail==='compact'?1800:3600,foliage=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),leaves,count),dummy=new T.Object3D(),color=new T.Color();
  foliage.name='Evergreen canopy';
  for(let i=0;i<count;i++){
    const c=crowns[i%crowns.length],a=random()*Math.PI*2,b=Math.acos(2*random()-1),r=Math.cbrt(random()),size=.08+random()*.095;
    dummy.position.set(c.x+Math.sin(b)*Math.cos(a)*r*c.radius,c.y+Math.cos(b)*r*c.radius*(palette==='blossom'?.68:.47),c.z+Math.sin(b)*Math.sin(a)*r*c.radius*.78);
    dummy.scale.set(size*1.45,size*.40,size);dummy.rotation.set((random()-.5)*1.8,random()*Math.PI*2,(random()-.5)*1.3);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);
    const sun=(dummy.position.y-2.1)/1.15;const variation=random();color.setHSL(palette==='blossom'?.86+variation*.08:.23+variation*.08,palette==='blossom'?.55+random()*.2:.34+random()*.22,palette==='blossom'?.32+Math.max(0,sun)*.1+random()*.08:.20+Math.max(0,sun)*.15+random()*.12);foliage.setColorAt(i,color);
  }
  foliage.userData.fullCount=count;foliage.instanceMatrix.needsUpdate=true;foliage.computeBoundingSphere();tree.add(foliage);
  // Batch static wood by material: the web scene needs only three tree draw calls.
  // Exporting with optimize:false retains individually named, editable parts.
  if(optimize){
    const batches=new Map<T.Material,T.Mesh[]>();
    for(const group of [wood,roots])for(const child of group.children){const mesh=child as T.Mesh,material=mesh.material as T.Material;const list=batches.get(material)??[];list.push(mesh);batches.set(material,list);}
    wood.clear();roots.clear();
    for(const [material,meshes] of batches){const geometry=mergeGeometries(meshes.map(m=>m.geometry));if(!geometry)throw Error('Banyan geometry batch failed');const mesh=new T.Mesh(geometry,material);mesh.name=material===bark?'Mature wood':'Aerial root curtains';wood.add(mesh);meshes.forEach(m=>m.geometry.dispose());}
  }
  tree.updateMatrixWorld(true);return tree;
}
