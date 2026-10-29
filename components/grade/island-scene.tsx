'use client';
import {useEffect,useRef,useState} from 'react';
import {BookOpen,FileText,CheckCircle2,Pause,Play,RotateCcw} from 'lucide-react';
import type {Row} from '@/lib/client';

export type IslandSubject=Row&{preview?:string;roomCount:number;taskTitle?:string;outstandingCount?:number;hasAssignments?:boolean;needsCorrection?:boolean};
export function IslandScene({subjects,focusedId,onPick,growth=0,growthLabel='ต้นอ่อนสองใบ',detailOpen=false,growthScope=''}:{subjects:IslandSubject[];focusedId:string;onPick:(id:string)=>void;growth?:number;growthLabel?:string;detailOpen?:boolean;growthScope?:string}){
 const host=useRef<HTMLDivElement>(null),canvasHost=useRef<HTMLDivElement>(null),buttons=useRef(new Map<string,HTMLButtonElement>()),drag=useRef<{x:number;y:number;last:number;moved:boolean}|null>(null);
 const [ready,setReady]=useState(false),[fallback,setFallback]=useState(false),[paused,setPaused]=useState(false),[zooming,setZooming]=useState('');
 const controls=useRef({angle:0,paused:false,hover:false,px:0,py:0,reduced:false,portal:'',detailOpen:false});const mounted=useRef(true),pickTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const growthIdentity=useRef(growthScope);growthIdentity.current=growthScope;
 const growthTarget=useRef(growth);useEffect(()=>{growthTarget.current=Math.max(0,Math.min(1,growth));},[growth]);
 const currentSubjects=useRef(subjects),pickCallback=useRef(onPick);currentSubjects.current=subjects;pickCallback.current=onPick;
 useEffect(()=>{controls.current.detailOpen=detailOpen;if(!detailOpen){controls.current.portal='';setZooming('');}},[detailOpen]);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>{controls.current.reduced=media.matches;};change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(pickTimer.current)clearTimeout(pickTimer.current);};},[]);
 useEffect(()=>{controls.current.paused=paused;},[paused]);
 useEffect(()=>{let disposed=false,cleanup=()=>{};setReady(false);setFallback(false);
  async function start(){const [T,{createGrowingBanyanTree}]=await Promise.all([import('three'),import('@/lib/models/growing-banyan')]);if(disposed||!canvasHost.current||!host.current)return;const mount=canvasHost.current,container=host.current;let renderer:InstanceType<typeof T.WebGLRenderer>;
   try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{setFallback(true);return;}
   renderer.setPixelRatio(Math.min(window.devicePixelRatio,window.innerWidth<700?1.25:1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;renderer.domElement.setAttribute('aria-hidden','true');mount.appendChild(renderer.domElement);
   const scene=new T.Scene(),camera=new T.OrthographicCamera(-6,6,4.6,-4.6,.1,60);camera.position.set(0,2.2,12);camera.lookAt(0,1.3,0);
   scene.add(new T.HemisphereLight(0xffdfef,0x71607d,2.3));const sun=new T.DirectionalLight(0xfff2d6,3.2);sun.position.set(-4,7,5);scene.add(sun);const fill=new T.DirectionalLight(0xc5cbff,1.8);fill.position.set(5,3,-4);scene.add(fill);
   const world=new T.Group();world.position.y=-.7;scene.add(world);let seed=73821;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
   const grass=new T.MeshStandardMaterial({color:0xbccf68,roughness:1,flatShading:true}),stone=new T.MeshStandardMaterial({color:0x715d87,roughness:1,flatShading:true});
   function island(radius:number,x:number,y:number,z:number){const g=new T.Group(),rock=new T.Mesh(new T.IcosahedronGeometry(radius*.95,0),stone);rock.scale.set(1,.36,.9);rock.rotation.y=.3;rock.position.y=-radius*.95*.36-.05;g.add(rock);const top=new T.Mesh(new T.CylinderGeometry(radius,radius*.93,.22,9),grass);top.position.y=.02;g.add(top);g.position.set(x,y,z);world.add(g);return g;}
   const main=island(2.05,0,0,0);
   const livingTree=createGrowingBanyanTree({detail:window.innerWidth<700?'compact':'full'});livingTree.tree.position.y=.14;main.add(livingTree.tree);let displayedGrowth=growthTarget.current,displayedScope=growthIdentity.current;livingTree.update(displayedGrowth);
   const dummy=new T.Object3D();
   const shards=[island(.55,-2.25,-.05,.45),island(.42,2.1,-.3,-.35),island(.27,-1.9,.35,-1.3),island(.22,1.8,.1,1.3)];
   const flowers=new T.InstancedMesh(new T.IcosahedronGeometry(.065,0),new T.MeshStandardMaterial({color:0xf4b7d1}),28);for(let i=0;i<28;i++){const a=rand()*Math.PI*2,r=.35+rand();dummy.position.set(Math.cos(a)*r,.18,Math.sin(a)*r*.7);dummy.scale.setScalar(.7+rand());dummy.rotation.set(rand(),rand(),rand());dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);}main.add(flowers);
   const bubbleGeometry=new T.SphereGeometry(1,32,20),bubbleMaterials=Array.from({length:8},(_,i)=>new T.MeshPhysicalMaterial({color:[0xf4b7dc,0xe2c5ff,0xffd7b4,0xc2e7f6][i%4],transparent:true,opacity:.3,roughness:.16,metalness:.03,clearcoat:1,clearcoatRoughness:.12,side:T.FrontSide,depthWrite:false}));
   const bubbles=bubbleMaterials.map(material=>{const mesh=new T.Mesh(bubbleGeometry,material);mesh.visible=false;scene.add(mesh);return {mesh};});
   const motes=new T.BufferGeometry(),motePositions=new Float32Array(150*3);for(let i=0;i<150;i++){motePositions[i*3]=(rand()-.5)*15;motePositions[i*3+1]=(rand()-.5)*7;motePositions[i*3+2]=(rand()-.5)*7;}motes.setAttribute('position',new T.BufferAttribute(motePositions,3));const sparkle=new T.Points(motes,new T.PointsMaterial({color:0xfff4cc,size:.035,transparent:true,opacity:.7}));scene.add(sparkle);
   let forceRender=true;let w=1,h=1;function resize(){forceRender=true;w=container.clientWidth;h=container.clientHeight;if(!w||!h)return;camera.left=-4.6*w/h;camera.right=4.6*w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);world.scale.setScalar(w<550?.88:1.1);}
   const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();let visible=true;const observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;});observer.observe(container);
   let frame=0,last=0,time=0;const projection=new T.Vector3();const onLost=(e:Event)=>{e.preventDefault();setFallback(true);};const onRestored=()=>{forceRender=true;setFallback(false);};renderer.domElement.addEventListener('webglcontextlost',onLost);renderer.domElement.addEventListener('webglcontextrestored',onRestored);
   let resting=false,lastAngle=NaN,lastSignature='',lastPx=NaN,lastPy=NaN;
   function animate(now:number){
    if(disposed)return;frame=requestAnimationFrame(animate);
    const delta=last?Math.min((now-last)/1000,.05):1/60;last=now;
    if(!visible||document.hidden)return;
    const ctl=controls.current;
    // Keep the exact rendered pose underneath the compositor-only opening and dialog.
    // Nothing snaps back to the initial camera when the dialog appears.
    if(ctl.portal||ctl.detailOpen)return;
    const still=ctl.paused||ctl.reduced;
    const scopeChanged=displayedScope!==growthIdentity.current;
    const settledGrowth=!scopeChanged&&Math.abs(growthTarget.current-displayedGrowth)<.0005;
    const signature=currentSubjects.current.map(s=>s.id).join('|');
    if(!forceRender&&still&&resting&&settledGrowth&&!drag.current&&lastAngle===ctl.angle&&lastSignature===signature&&lastPx===ctl.px&&lastPy===ctl.py)return;
    forceRender=false;lastAngle=ctl.angle;lastSignature=signature;lastPx=ctl.px;lastPy=ctl.py;
    resting=still;time+=still?0:delta;
    if(!still&&!ctl.hover&&!drag.current)ctl.angle+=delta*.10;
    const smooth=1-Math.exp(-delta*5),cameraSmooth=1-Math.exp(-delta*4);
    world.rotation.y+=(ctl.angle*.3+ctl.px*.15-world.rotation.y)*smooth;
    world.position.y=-1.45+(still?0:Math.sin(time*.7)*.055);
    if(scopeChanged){displayedScope=growthIdentity.current;displayedGrowth=growthTarget.current;}
    displayedGrowth=still?growthTarget.current:displayedGrowth+(growthTarget.current-displayedGrowth)*(1-Math.exp(-delta*3));
    livingTree.update(displayedGrowth);
    camera.position.x+=(ctl.px*.45-camera.position.x)*cameraSmooth;
    camera.position.y+=(2.2+ctl.py*.2-camera.position.y)*cameraSmooth;
    camera.lookAt(0,1.3,0);camera.updateMatrixWorld();
    shards.forEach((s,i)=>{s.rotation.y=time*.06*(i%2?1:-1);});
    const visibleSubjects=currentSubjects.current;
    bubbles.forEach((b,i)=>{
     const subject=visibleSubjects[i];b.mesh.visible=!!subject;if(!subject)return;
     const angle=i*Math.PI*2/Math.max(visibleSubjects.length,1)+ctl.angle+.5;
     const radius=w<550?Math.max(1.45,(camera.right-.9)*.83):Math.min(7.5,(camera.right-1.1)*.82);
     const y=.8+Math.sin(angle)*1.65+(still?0:Math.sin(time+i)*.12),z=Math.sin(angle)*2.15,x=Math.cos(angle)*radius;
     b.mesh.position.set(x,y,z);b.mesh.scale.setScalar(w<550?.49:.68);
     projection.copy(b.mesh.position).project(camera);
     const button=buttons.current.get(subject.id);
     if(button){
      const scale=(w<550?.9:.98)*(1+(z/2.15)*.13),half=(w<550?62:71)*scale;
      const px=Math.max(half+8,Math.min(w-half-8,(projection.x*.5+.5)*w));
      const py=Math.max(half+8,Math.min(h-half-48,(-projection.y*.5+.5)*h));
      button.style.transform=`translate3d(${px}px,${py}px,0) translate(-50%,-50%) scale(${scale})`;
      button.style.zIndex=z>0?'4':'1';button.style.opacity=z<-.5?'.8':'1';
     }
    });
    renderer.render(scene,camera);
   }
   frame=requestAnimationFrame(animate);setReady(true);
   cleanup=()=>{cancelAnimationFrame(frame);resizeObserver.disconnect();observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.domElement.removeEventListener('webglcontextrestored',onRestored);scene.traverse(o=>{const mesh=o as InstanceType<typeof T.Mesh>;mesh.geometry?.dispose();if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>m.dispose());if(o instanceof T.InstancedMesh)o.dispose();});renderer.dispose();renderer.domElement.remove();};
  }
  void start().catch(()=>{if(!disposed)setFallback(true);});return()=>{disposed=true;cleanup();};
 },[]);
 function pick(id:string){
  if(drag.current?.moved||controls.current.portal||controls.current.detailOpen)return;
  setZooming(id);controls.current.portal=id;
  const finish=()=>{pickTimer.current=null;if(mounted.current)pickCallback.current(id);};
  if(pickTimer.current)clearTimeout(pickTimer.current);
  // The dialog starts while the lightweight bubble pulse is finishing.
  if(controls.current.reduced)finish();else pickTimer.current=setTimeout(finish,140);
 }
 return <div className={`island-stage ${fallback?'scene-fallback':''} ${ready?'scene-ready':''} ${zooming?'scene-entering':''}`} ref={host} role="group" tabIndex={0} aria-label="โลกฟองรายวิชา ลากหรือใช้ปุ่มซ้ายขวาเพื่อหมุน กด Enter เพื่อเปิดวิชาที่เลือก" onKeyDown={e=>{if(e.target!==e.currentTarget||controls.current.portal||detailOpen)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();controls.current.angle+=e.key==='ArrowLeft'?-.35:.35;}if(e.key==='Enter'){e.preventDefault();pick(focusedId);}if(e.key===' '){e.preventDefault();setPaused(v=>!v);}}} onPointerDown={e=>{if(controls.current.portal||detailOpen||(e.target as HTMLElement).closest('button'))return;drag.current={x:e.clientX,y:e.clientY,last:e.clientX,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(controls.current.portal||detailOpen)return;const b=e.currentTarget.getBoundingClientRect();controls.current.px=(e.clientX-b.left)/b.width-.5;controls.current.py=(e.clientY-b.top)/b.height-.5;if(drag.current){if(Math.abs(e.clientX-drag.current.x)>8)drag.current.moved=true;controls.current.angle+=(e.clientX-drag.current.last)*.006;drag.current.last=e.clientX;}}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
  <div className="island-canvas" ref={canvasHost} role="img" aria-label={`ต้นไทรสามมิติ ${growthLabel} เติบโต ${Math.round(growth*100)}%`}/>{!ready&&!fallback&&<span className="scene-loading">กำลังเปิดโลกการเรียนรู้…</span>}
  <div className="orbit-subjects">{subjects.map((s,i)=><button key={s.id} ref={el=>{if(el)buttons.current.set(s.id,el);else buttons.current.delete(s.id);}} className={`orbit-bubble task-bubble bubble-tone-${i%4} ${zooming===s.id?'bubble-opening':''}`} title={`${s.code} · ${s.name}${s.taskTitle?` · ${s.taskTitle}`:''}`} aria-label={`เปิดรายวิชา ${s.code} ${s.name}${s.taskTitle?` งานค้าง ${s.outstandingCount} งาน ตัวอย่าง ${s.taskTitle}`:s.hasAssignments?' ไม่มีงานค้าง':' ยังไม่มีงานที่มอบหมาย'}`} aria-pressed={s.id===focusedId} onFocus={()=>{controls.current.hover=true;}} onBlur={()=>{controls.current.hover=false;}} onPointerEnter={()=>{controls.current.hover=true;}} onPointerLeave={()=>{controls.current.hover=false;}} onClick={()=>pick(s.id)}>{s.preview?<img src={s.preview} alt={`ตัวอย่างงาน ${s.taskTitle}`} loading="lazy" draggable={false}/>:s.taskTitle?<FileText size={28} aria-hidden="true"/>:s.hasAssignments?<CheckCircle2 size={28} aria-hidden="true"/>:<BookOpen size={28} aria-hidden="true"/>}<span className="bubble-course-code">{s.code}</span><strong>{s.taskTitle||s.name}</strong><small className={`bubble-work-count ${s.outstandingCount?'has-work':''}`}>{s.outstandingCount?`${s.needsCorrection?'มีงานต้องแก้ · ':'ค้าง '}${s.outstandingCount} งาน`:s.hasAssignments?'ไม่มีงานค้าง':'ยังไม่มีงาน'}</small></button>)}</div>
  <div className="scene-controls"><button aria-label={paused?'เปิดการหมุนฉาก':'หยุดการหมุนฉาก'} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={16}/>:<Pause size={16}/>}</button><button aria-label="กลับมุมเริ่มต้น" onClick={()=>{controls.current.angle=0;controls.current.px=0;controls.current.py=0;}}><RotateCcw size={16}/></button><span>{fallback?'เลือกฟองเพื่อเปิดวิชา':'ลากเพื่อหมุน · คลิกฟองเพื่อเปิดวิชา'}</span></div>
 </div>;
}

