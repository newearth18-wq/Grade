import assert from 'node:assert/strict';
import {build} from 'esbuild';
import * as T from 'three';
await build({entryPoints:['lib/models/growing-banyan.ts'],outfile:'node_modules/.cache/growing-banyan.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});
const {createGrowingBanyanTree}=await import('../node_modules/.cache/growing-banyan.mjs');
for(const [width,height,worldScale,detail] of [[1280,720,1.12,'full'],[390,844,1,'compact'],[600,720,1.12,'full']]){
 const living=createGrowingBanyanTree({detail}),world=new T.Group();world.position.y=-.45;world.scale.setScalar(worldScale);living.tree.position.y=.46;world.add(living.tree);
 const camera=new T.PerspectiveCamera(width<600?49:43,width/height,.1,80);camera.position.set(0,2.3,width<600?14:width/height<1.3?18:14);camera.lookAt(0,1.1,0);camera.updateMatrixWorld();
 const seed=structuredClone(living.tree.userData.growth);assert.equal(seed.leafCount,2);assert.equal(seed.branchCount,0);assert.equal(seed.rootCount,0);assert.ok(seed.stemRadius<.03);
 const stem= living.tree.getObjectByName('Growing stem and branches'),firstGeometry=stem.geometry;
 let prior=seed;
 for(const ratio of [0,.1,.25,.45,.7,.9,1]){
  living.update(ratio);const state=living.tree.userData.growth;assert.ok(state.height>=prior.height);assert.ok(state.stemRadius>=prior.stemRadius);assert.ok(state.leafCount>=prior.leafCount);assert.equal(living.tree.scale.x,1);assert.equal(living.tree.scale.y,1);assert.equal(stem.geometry,firstGeometry);assert.equal(state.rootCount===0,ratio<=.45);prior={...state};
  for(const angle of [0,.7,1.4,2.8]){world.rotation.y=angle;world.updateMatrixWorld(true);const point=new T.Vector3(),instance=new T.Matrix4(),matrix=new T.Matrix4();living.tree.traverse(mesh=>{if(!(mesh instanceof T.Mesh))return;const positions=mesh.geometry.attributes.position;for(let i=0;i<(mesh instanceof T.InstancedMesh?mesh.count:1);i++){if(mesh instanceof T.InstancedMesh){mesh.getMatrixAt(i,instance);matrix.multiplyMatrices(mesh.matrixWorld,instance);}else matrix.copy(mesh.matrixWorld);for(let v=0;v<positions.count;v++){point.fromBufferAttribute(positions,v).applyMatrix4(matrix).project(camera);assert.ok(Math.abs(point.x)<(width<600?2:1)&&Math.abs(point.y)<1,`clipped ${detail} at ${ratio}: ${point.x},${point.y}`);}}});}
 }
 assert.equal(prior.branchCount,7);assert.equal(prior.rootCount,21);assert.ok(prior.stemRadius>seed.stemRadius*10);assert.equal(prior.leafCount,detail==='compact'?1200:2400);
 let calls=0;living.tree.traverse(o=>{if(o instanceof T.Mesh)calls++;if(o.geometry?.attributes.position)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});assert.equal(calls,3);
 living.update(.1);assert.equal(living.tree.userData.growth.branchCount,0);assert.equal(living.tree.userData.growth.rootCount,0);assert.ok(living.tree.userData.growth.leafCount<20);
 living.update(NaN);assert.equal(living.tree.userData.growth.ratio,0);living.update(2);assert.equal(living.tree.userData.growth.ratio,1);
 living.tree.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();if(o instanceof T.InstancedMesh)o.dispose();});
}
console.log('PASS growing banyan: two-leaf seedling, extending/thickening stem, new branches, late aerial roots, leaf unfolding, unchanged whole-tree scale, reusable geometry, reversibility, three draw calls, desktop/mobile camera bounds');
