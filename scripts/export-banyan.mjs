import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,InstancedMesh,Matrix4,Color,Float32BufferAttribute,Mesh} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createBanyanTree} from '../lib/models/banyan-tree.ts';

// GLTFExporter uses the browser FileReader API; Node has Blob and ArrayBuffer.
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();}).catch(e=>this.onerror?.(e));}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();}).catch(e=>this.onerror?.(e));}
};
const tree=createBanyanTree({optimize:false}),bounds=new Box3().setFromObject(tree);
const batched=createBanyanTree(),batchedBounds=new Box3().setFromObject(batched);
if(!bounds.min.equals(batchedBounds.min)||!bounds.max.equals(batchedBounds.max))throw Error('Batching changed model bounds');
// Bake foliage instances into ordinary coloured vertices for broad GLB importer
// compatibility. The browser still uses the much smaller instanced tree.
const foliage=tree.getObjectByName('Evergreen canopy'),parts=[],matrix=new Matrix4(),tint=new Color();
for(let i=0;i<foliage.count;i++){
  foliage.getMatrixAt(i,matrix);foliage.getColorAt(i,tint);const geometry=foliage.geometry.clone().applyMatrix4(matrix),colours=new Float32Array(geometry.attributes.position.count*3);
  for(let j=0;j<colours.length;j+=3){colours[j]=tint.r;colours[j+1]=tint.g;colours[j+2]=tint.b;}
  geometry.setAttribute('color',new Float32BufferAttribute(colours,3));parts.push(geometry);
}
const canopyGeometry=mergeGeometries(parts);if(!canopyGeometry)throw Error('Canopy export failed');parts.forEach(g=>g.dispose());
const canopyMaterial=foliage.material.clone();canopyMaterial.vertexColors=true;const canopy=new Mesh(canopyGeometry,canopyMaterial);canopy.name=foliage.name;tree.remove(foliage);tree.add(canopy);foliage.geometry.dispose();foliage.material.dispose();foliage.dispose();tree.updateMatrixWorld(true);
// Baked vertex bounds are tighter than the conservative instance bounding boxes.
bounds.setFromObject(tree);
let meshes=0,triangles=0;
tree.traverse(o=>{if(o.isMesh){meshes++;const p=o.geometry.attributes.position;if(!Array.from(p.array).every(Number.isFinite))throw Error('Non-finite vertex');triangles+=(o.geometry.index?.count??p.count)/3*(o instanceof InstancedMesh?o.count:1);}});
const binary=await new GLTFExporter().parseAsync(tree,{binary:true});
if(new DataView(binary).getUint32(0,true)!==0x46546c67)throw Error('Invalid GLB header');
const imported=await new GLTFLoader().parseAsync(binary,'');
let roundtripMeshes=0;imported.scene.traverse(o=>{if(o.isMesh)roundtripMeshes++;});
if(roundtripMeshes!==meshes)throw Error('GLB round-trip mesh mismatch');
const importedBounds=new Box3().setFromObject(imported.scene);if(bounds.min.distanceTo(importedBounds.min)>1e-4||bounds.max.distanceTo(importedBounds.max)>1e-4)throw Error('GLB changed dimensions');
const view=new DataView(binary),jsonLength=view.getUint32(12,true),metadata=JSON.parse(new TextDecoder().decode(new Uint8Array(binary,20,jsonLength)));
if(metadata.extensionsUsed?.includes('EXT_mesh_gpu_instancing'))throw Error('Expected standard baked GLB');
const destinations=[path.resolve('public/models/grade-banyan.glb'),...(process.argv[2]?[path.resolve(process.argv[2])]:[])];
for(const file of destinations){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,Buffer.from(binary));}
console.log(JSON.stringify({bytes:binary.byteLength,meshes,triangles,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},roundtripMeshes,files:destinations}));
