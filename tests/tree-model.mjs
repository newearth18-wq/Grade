import assert from 'node:assert/strict';
import {build} from 'esbuild';
import * as T from 'three';
await build({entryPoints:['lib/models/banyan-tree.ts'],outfile:'node_modules/.cache/tree-model.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});
const {createBanyanTree}=await import('../node_modules/.cache/tree-model.mjs');
for(const [width,height,worldScale,detail] of [[1200,400,1.1,'full'],[350,370,.88,'compact']]){
 const tree=createBanyanTree({detail,palette:'blossom'}),world=new T.Group();world.position.y=-1.45;world.scale.setScalar(worldScale);world.add(tree);
 const camera=new T.OrthographicCamera(-4.6*width/height,4.6*width/height,4.6,-4.6,.1,60);camera.position.set(0,2.2,12);camera.lookAt(0,1.3,0);camera.updateMatrixWorld();
 for(const ratio of [0,1]){const size=1.1+ratio*.6;tree.scale.set(size*(.96+ratio*.08),size,size*(.96+ratio*.08));world.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(tree);
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new T.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,`Tree clipped at ${width}px, growth ${ratio}: ${p.x},${p.y}`);}
 }
 let calls=0;tree.traverse(o=>{if(o instanceof T.Mesh)calls++;});assert.equal(calls,3);const canopy=tree.getObjectByName('Evergreen canopy');assert.equal(canopy.count,detail==='compact'?1800:3600);
 const geometries=new Set(),materials=new Set();tree.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);if(o instanceof T.InstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
console.log('PASS actual 3D canopy fits desktop/mobile at minimum and full growth, compact leaf limit, three batched draw calls');
