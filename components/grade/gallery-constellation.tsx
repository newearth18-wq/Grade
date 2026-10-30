'use client';
import {useEffect,useRef} from 'react';

/** Lightweight real geometry behind the readable assignment controls. */
export function GalleryConstellation({paused}:{paused:boolean}){
 const mount=useRef<HTMLDivElement>(null),pause=useRef(paused);pause.current=paused;
 useEffect(()=>{let disposed=false,cleanup=()=>{};
  async function start(){const T=await import('three');if(disposed||!mount.current)return;const host=mount.current;let renderer:InstanceType<typeof T.WebGLRenderer>;try{renderer=new T.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});}catch{return;}
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(55,1,.1,50);camera.position.set(0,0,12);scene.add(new T.HemisphereLight(0xe0f5ff,0x6964aa,2));const light=new T.DirectionalLight(0xffeedb,2);light.position.set(3,5,8);scene.add(light);
   const geometries=[new T.IcosahedronGeometry(.65,0),new T.OctahedronGeometry(.7,0),new T.TorusGeometry(.7,.012,4,48),new T.TetrahedronGeometry(.8,0)],materials=[new T.MeshStandardMaterial({color:0xc9efe7,roughness:.8,flatShading:true}),new T.MeshStandardMaterial({color:0xf7de9b,roughness:.8,flatShading:true}),new T.MeshBasicMaterial({color:0xf6e6ff,wireframe:true,transparent:true,opacity:.45})];
   const shapes=Array.from({length:12},(_,i)=>{const mesh=new T.Mesh(geometries[i%4],materials[i%3]);mesh.position.set((i%2?1:-1)*(4.5+(i%3)*1.3),Math.sin(i*2.4)*3.8,(i%4)*1.2-2);mesh.rotation.set(i*.3,i*.5,0);scene.add(mesh);return mesh;});
   const points=new T.BufferGeometry(),positions=new Float32Array(140*3);let seed=251;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<140;i++){positions[i*3]=(random()-.5)*26;positions[i*3+1]=(random()-.5)*16;positions[i*3+2]=(random()-.5)*8;}points.setAttribute('position',new T.BufferAttribute(positions,3));const stars=new T.PointsMaterial({size:.025,color:0xfff4df,transparent:true,opacity:.65});scene.add(new T.Points(points,stars));
   let dirty=true,frame=0,last=0,time=0,x=0,y=0;const media=matchMedia('(prefers-reduced-motion: reduce)');function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);dirty=true;}const observer=new ResizeObserver(resize);observer.observe(host);resize();
   const pointer=(e:PointerEvent)=>{if(pause.current||media.matches)return;x=(e.clientX/Math.max(1,host.clientWidth)-.5)*.45;y=(e.clientY/Math.max(1,host.clientHeight)-.5)*.3;};window.addEventListener('pointermove',pointer,{passive:true});
   function render(now:number){if(disposed)return;frame=requestAnimationFrame(render);const delta=last?Math.min((now-last)/1000,.05):0;last=now;if(document.hidden)return;const still=pause.current||media.matches;if(still&&!dirty)return;dirty=false;if(!still){time+=delta;shapes.forEach((shape,i)=>{shape.rotation.y+=delta*(.06+(i%3)*.025);shape.rotation.z+=delta*.025*(i%2?1:-1);shape.position.y=Math.sin(i*2.4)*3.8+Math.sin(time*.3+i)*.13;});camera.position.x+=(x-camera.position.x)*.04;camera.position.y+=(-y-camera.position.y)*.04;}camera.lookAt(0,0,0);renderer.render(scene,camera);}
   frame=requestAnimationFrame(render);cleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('pointermove',pointer);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());points.dispose();stars.dispose();renderer.dispose();renderer.domElement.remove();};
  }
  void start().catch(()=>{});return()=>{disposed=true;cleanup();};
 },[]);
 return <div className="gallery-constellation" ref={mount} aria-hidden="true"/>;
}
