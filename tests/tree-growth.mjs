import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['lib/tree-growth.ts'],outfile:'node_modules/.cache/tree-growth.mjs',bundle:true,platform:'node',format:'esm'});
const {treeGrowth}=await import('../node_modules/.cache/tree-growth.mjs');
const c={id:'c1',work_weight:60,before_work_weight:30,mid_weight:20,final_weight:20,published:0,grading_mode:'points'};
const state={user:{id:'s1',role:'student'},enrollments:[{course_id:'c1',student_id:'s1',active:1,mid:20,final:20}],assignments:[{id:'a1',course_id:'c1',max_score:10}],submissions:[{assignment_id:'a1',student_id:'s1',status:'graded',score:10}]};
let g=treeGrowth(state,[c]);assert.equal(g.earned,10);assert.equal(g.percent,10);assert.equal(g.label,'ต้นกล้า');assert.equal(g.next,25);
g=treeGrowth(state,[{...c,published:1}]);assert.equal(g.earned,50);assert.equal(g.stage,3);
assert.equal(treeGrowth({...state,submissions:[{...state.submissions[0],status:'pending'}]},[c]).earned,0);
assert.equal(treeGrowth({...state,user:{id:'other',role:'student'}},[c]).earned,0);
assert.equal(treeGrowth({...state,enrollments:[{...state.enrollments[0],active:0}]},[c]).participants,0);
assert.equal(treeGrowth(state,[{...c,id:'different-term'}]).percent,0);
assert.equal(treeGrowth(state,[{...c,id:'different-subject'}]).percent,0);
const teacher={...state,user:{id:'t1',role:'teacher'},enrollments:[...state.enrollments,{course_id:'c1',student_id:'s2',active:1,mid:20,final:20}]};g=treeGrowth(teacher,[c]);assert.equal(g.earned,5);assert.equal(g.percent,5);assert.equal(g.capacity,100);
assert.equal(treeGrowth(state,[{...c,archived:1,grading_mode:'weighted'}]).earned,60);
const big={...state,assignments:[{...state.assignments[0],max_score:60}],submissions:[{...state.submissions[0],score:60}]};g=treeGrowth(big,[{...c,published:1}]);assert.equal(g.percent,100);assert.equal(g.stage,5);assert.equal(g.next,null);
for(const [points,stage,next] of [[0,0,10],[9,0,10],[10,1,25],[25,2,45],[45,3,70],[70,4,90],[90,5,100]]){const growth=treeGrowth({...big,submissions:[{...big.submissions[0],score:points}]},[{...c,work_weight:100,before_work_weight:50,mid_weight:0,final_weight:0}]);assert.equal(growth.stage,stage);assert.equal(growth.next,next);}
assert.equal(treeGrowth({...big,submissions:[{...big.submissions[0],score:999}]},[c]).ratio,1);
console.log('PASS tree growth: actual points, hidden exam privacy, ungraded work, own account, active enrollment, subject/term isolation, teacher average, legacy grades, full growth and bounds');

const rooms=[{...c,id:'science-a',subject_id:'science',classroom:'6/1',period_id:'term1',published:1},{...c,id:'science-b',subject_id:'science',classroom:'6/2',period_id:'term1',published:1},{...c,id:'math-a',subject_id:'math',classroom:'6/1',period_id:'term1',published:1},{...c,id:'science-next',subject_id:'science-next',classroom:'6/1',period_id:'term2',published:1}];
const scoped={user:{id:'t',role:'teacher'},enrollments:rooms.map(room=>({course_id:room.id,student_id:'s1',active:1,mid:0,final:0})),assignments:rooms.map(room=>({id:room.id+'-task',course_id:room.id,max_score:30,work_phase:'before'})),submissions:rooms.map((room,i)=>({assignment_id:room.id+'-task',student_id:'s1',status:'graded',score:[10,25,18,3][i]}))};
assert.deepEqual(rooms.map(room=>treeGrowth(scoped,[room]).percent),[10,25,18,3]);
const changed={...scoped,submissions:scoped.submissions.map(mark=>mark.assignment_id==='science-b-task'?{...mark,score:30}:mark)};
assert.deepEqual(rooms.map(room=>treeGrowth(changed,[room]).percent),[10,30,18,3]);
assert.deepEqual(rooms.map(room=>treeGrowth({...scoped,user:{id:'someone-else',role:'student'}},[room]).percent),[0,0,0,0]);
console.log('PASS independent trees for sibling rooms, different subjects and terms; changing one room leaves all other trees unchanged');
