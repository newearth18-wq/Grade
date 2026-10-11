'use client';
import {useEffect,useRef,useState} from 'react';
import './banyan-viewer.css';

export function BanyanViewer(){
 const host=useRef<HTMLDivElement>(null),actions=useRef({reset:()=>{},rotate:true}),[ready,setReady]=useState(false),[error,setError]=useState(false),[rotate,setRotate]=useState(true);
 useEffect(()=>{let gone=false,dispose=()=>{};
  async function init(){
   const [T,{OrbitControls},{createBanyanTree}]=await Promise.all([import('three'),import('three/addons/controls/OrbitControls.js'),import('@/lib/models/banyan-tree')]);
   if(gone||!host.current)return;const mount=host.current;
   const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;mount.appendChild(renderer.domElement);
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.1,80);camera.position.set(5.5,3.4,7);scene.add(new T.HemisphereLight(0xf5ffe8,0x6e655a,2.1));const sun=new T.DirectionalLight(0xffedd3,3);sun.position.set(-3,7,5);scene.add(sun);const fill=new T.DirectionalLight(0xc2e3e6,1.5);fill.position.set(4,4,-4);scene.add(fill);
   const tree=createBanyanTree();scene.add(tree);
   const ground=new T.Mesh(new T.CylinderGeometry(2.52,2.43,.14,64),new T.MeshStandardMaterial({color:0xb6bf87,roughness:1}));ground.position.y=-.075;scene.add(ground);
   const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.48,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=4;controls.maxDistance=15;controls.maxPolarAngle=Math.PI*.49;controls.autoRotateSpeed=.65;
   const media=matchMedia('(prefers-reduced-motion: reduce)');let fit=1;actions.current.reset=()=>{controls.target.set(0,1.48,0);camera.position.set(5.5,3.4,7).sub(controls.target).multiplyScalar(fit).add(controls.target);controls.update();};
   const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;const nextFit=Math.max(1,1/camera.aspect);camera.position.sub(controls.target).multiplyScalar(nextFit/fit).add(controls.target);fit=nextFit;controls.minDistance=4*fit;controls.maxDistance=15*fit;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(mount);resize();
   let frame=0,last=0;function draw(now:number){if(gone)return;frame=requestAnimationFrame(draw);if(now-last<32||document.hidden)return;last=now;controls.autoRotate=actions.current.rotate&&!media.matches;controls.update();renderer.render(scene,camera);}frame=requestAnimationFrame(draw);setReady(true);
   dispose=()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();scene.traverse(o=>{const m=o as InstanceType<typeof T.Mesh>;m.geometry?.dispose();if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>x.dispose());if(o instanceof T.InstancedMesh)o.dispose();});renderer.dispose();renderer.domElement.remove();};
  }
  void init().catch(()=>{if(!gone)setError(true);});return()=>{gone=true;dispose();};
 },[]);
 return <main className="banyan-viewer"><header><a href="/">← กลับ Grade</a><span>GRADE · 3D STUDIO</span></header><div className="banyan-title"><p>ร่มเงาแห่งการเรียนรู้</p><h1>ต้นไทร</h1><span>พุ่มแผ่กว้าง · รากอากาศ · รากค้ำยัน</span></div><div className="banyan-viewport" ref={host} role="img" aria-label="โมเดลต้นไทรสามมิติ ลากหมุนและเลื่อนเพื่อซูม">{!ready&&!error&&<p>กำลังเปิดโมเดล…</p>}{error&&<p>อุปกรณ์นี้เปิดภาพ 3D ไม่ได้ ยังดาวน์โหลดโมเดลได้ด้านล่าง</p>}</div><footer><p>ลากเพื่อหมุน · เลื่อนเพื่อซูม · ใช้สองนิ้วบนมือถือ</p><div><button onClick={()=>{actions.current.rotate=!rotate;setRotate(!rotate);}} aria-pressed={rotate}>{rotate?'หยุดหมุน':'หมุนอัตโนมัติ'}</button><button onClick={()=>actions.current.reset()}>มุมเริ่มต้น</button><a href="/models/grade-banyan.glb" download="Grade-banyan.glb">ดาวน์โหลด GLB ↓</a></div><small>โมเดลต้นฉบับสำหรับ Grade · ใช้งานและแก้ไขต่อได้</small></footer></main>;
}
