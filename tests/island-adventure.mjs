import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({stdin:{contents:"export * from './lib/island-adventure';export * from './lib/island-controls';export * from './lib/models/island-rewards';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'.sites-runtime/island-adventure-test.mjs'});
const {islandAdventure,islandAppearance,dragOrbit,MIN_PITCH,MAX_PITCH,createIslandRewards}=await import('../.sites-runtime/island-adventure-test.mjs');
const c={id:'c',period_id:'term',archived:0,published:0};
const tasks=Array.from({length:11},(_,i)=>({id:'a'+i,course_id:'c',due_at:'2027-01-01T00:00:00Z'}));
const state={user:{id:'me',role:'student'},courses:[c],enrollments:[{course_id:'c',student_id:'me',active:1}],assignments:tasks,submissions:[],files:[],extensions:[]};
function submitted(count){return {...state,submissions:tasks.slice(0,count).map(a=>({id:'s'+a.id,assignment_id:a.id,student_id:'me',status:'pending',source:'upload',revision:1,submitted_at:'2026-11-02T01:00:00Z'}))};}
for(const [sent,unlocks] of [[0,0],[1,1],[2,1],[3,2],[5,3],[10,4]]){const g=islandAdventure(submitted(sent),c);assert.equal(g.journey.sent,sent);assert.equal(g.unlocked.length,unlocks);}
const repeat=submitted(1);repeat.submissions[0].revision=15;repeat.files=Array.from({length:15},(_,i)=>({id:'f'+i,assignment_id:'a0',student_id:'me',revision:i+1,created_at:'2026-11-02T01:00:00Z'}));assert.equal(islandAdventure(repeat,c).unlocked.length,1);
assert.equal(islandAdventure({...submitted(5),enrollments:[]},c).unlocked.length,0);
assert.equal(islandAdventure(submitted(5),{...c,id:'other-room'}).unlocked.length,0);
assert.equal(islandAdventure({...submitted(5),submissions:submitted(5).submissions.map(s=>({...s,student_id:'other'}))},c).unlocked.length,0);
assert.equal(islandAdventure({...submitted(5),submissions:submitted(5).submissions.map(s=>({...s,source:'paper'}))},c).unlocked.length,0);
assert.deepEqual(islandAppearance(0,{decoration:'rainbow',companion:'owl'}),{decoration:'none',companion:'bunny'});
assert.deepEqual(islandAppearance(3,{decoration:'rainbow',companion:'owl'}),{decoration:'mushrooms',companion:'bunny'});
assert.equal(islandAppearance(10,{decoration:'none'}).decoration,'none');
// A gesture is mapped from its origin: coalesced/sparse pointer events cannot change the result.
const origin={angle:1,pitch:.1},finish=dragOrbit(origin,120,-70,800,600);
for(const events of [1,2,10,120]){let result;for(let i=1;i<=events;i++)result=dragOrbit(origin,120*i/events,-70*i/events,800,600);assert.deepEqual(result,finish);}
assert.equal(dragOrbit(origin,0,0,800,600).pitch,origin.pitch);
assert.equal(dragOrbit(origin,0,10000,390,844).pitch,MAX_PITCH);assert.equal(dragOrbit(origin,0,-10000,390,844).pitch,MIN_PITCH);
assert(dragOrbit(origin,0,50,800,600).pitch>origin.pitch); // Foreground follows the finger down.
assert.equal(dragOrbit(origin,800,0,800,600).angle,origin.angle+Math.PI*2);
// Props keep their geometry across frames and reward changes; no per-frame resource allocation.
const props=createIslandRewards(),geometries=new Set();props.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
for(let i=0;i<120;i++)props.update(['none','lanterns','mushrooms','fireflies','rainbow'][i%5],['bunny','fox','owl'][i%3],i/60,false);
props.group.traverse(o=>{if(o.geometry)assert(geometries.has(o.geometry));});assert(props.group.children.every(o=>typeof o.visible==='boolean'));
console.log('PASS Island: actual distinct uploads, room/user isolation, retry cap, local unlock tamper guard, event-frequency-independent dragging, pitch bounds, reusable 3D props');
