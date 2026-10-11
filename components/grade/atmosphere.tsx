'use client';
import {useEffect,useRef} from 'react';
/** Decorative geometry only; every classroom action has a separate labelled control. */
export function Atmosphere(){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;let frame=0;const move=(e:PointerEvent)=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{ref.current?.style.setProperty('--scene-x',`${(e.clientX/window.innerWidth-.5)*22}px`);ref.current?.style.setProperty('--scene-y',`${(e.clientY/window.innerHeight-.5)*18}px`);});};window.addEventListener('pointermove',move,{passive:true});return()=>{cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);};},[]);
 return <div className="experience-atmosphere" ref={ref} aria-hidden="true"><div className="atmosphere-light"/><div className="atmosphere-bubbles">{Array.from({length:18},(_,i)=><i key={i} style={{'--bubble-i':i} as React.CSSProperties}/>)}</div></div>;
}
