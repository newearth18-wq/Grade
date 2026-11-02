/** One pointer displacement maps to one view change, independent of event frequency. */
// A floating island can be viewed from below, but the view must never flip over.
export const MIN_PITCH=-.5,MAX_PITCH=1.18;
export const clampPitch=(pitch:number)=>Math.max(MIN_PITCH,Math.min(MAX_PITCH,pitch));
export function dragOrbit(start:{angle:number;pitch:number},dx:number,dy:number,width:number,height:number){
 return {angle:start.angle+dx/Math.max(320,width)*Math.PI*2,pitch:clampPitch(start.pitch+dy/Math.max(320,height)*Math.PI*.8)};
}
