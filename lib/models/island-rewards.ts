import {createCompanionCharacters} from './companion-characters';
import {createCompanionPlayModel} from './companion-play-model';
import type {Hat,Accessory,IslandProp,CareCue} from '../companion-play';
import type {Personality} from '../adventure-plus';
import * as T from 'three';
import type {IslandCompanion,IslandDecoration} from '../island-adventure';
import type {HouseColor} from '../adventure-life';
import {createIslandLife} from './island-life';

/** Small, unlit-free props: no textures, shadows, extra canvases or per-frame geometry. */
export function createIslandRewards(){
 const life=createIslandLife(),playroom=createCompanionPlayModel();
 const group=new T.Group();group.add(life.group,playroom.group);
 const characters=createCompanionCharacters(),rigs=new Map<IslandCompanion,ReturnType<typeof characters.create>>();
 const decorations=new Map<string,T.Group>(),buddies=new Map<string,T.Group>();
 const material=(color:number,glow=false)=>new T.MeshStandardMaterial({color,roughness:.8,...(glow?{emissive:color,emissiveIntensity:.6}:{})});
 const cream=material(0xffe5c1),pink=material(0xf3a8c3),wood=material(0x82617f),orange=material(0xe3995d),black=material(0x463451);
 const ballGeometry=new T.SphereGeometry(1,10,8);
 function ball(parent:T.Group,mat:T.Material,position:number[],scale:number[]){const mesh=new T.Mesh(ballGeometry,mat);mesh.position.set(...position as [number,number,number]);mesh.scale.set(...scale as [number,number,number]);parent.add(mesh);return mesh;}
 function decoration(id:IslandDecoration){const g=new T.Group();g.visible=false;decorations.set(id,g);group.add(g);return g;}
 const lanterns=decoration('lanterns'),gold=material(0xffcf79,true);
 for(const x of [-1.25,1.25]){ball(lanterns,gold,[x,.36,.70],[.16,.21,.16]);ball(lanterns,wood,[x,.59,.70],[.20,.035,.20]);ball(lanterns,wood,[x,.15,.70],[.19,.035,.19]);}
 const mushrooms=decoration('mushrooms'),purple=material(0xc58cde);
 for(let i=0;i<5;i++){const x=Math.cos(i*2.1)*1.24,z=Math.sin(i*2.1)*.93,s=.7+i%2*.3;ball(mushrooms,cream,[x,.22*s,z],[.07*s,.17*s,.07*s]);ball(mushrooms,i%2?pink:purple,[x,.39*s,z],[.23*s,.12*s,.23*s]);ball(mushrooms,cream,[x+.07*s,.49*s,z],[.04*s,.02*s,.04*s]);}
 const fireflies=decoration('fireflies'),geometry=new T.BufferGeometry(),positions=new Float32Array(24*3);
 for(let i=0;i<24;i++){positions[i*3]=Math.cos(i*2.4)*(1+i%4*.25);positions[i*3+1]=.4+i%7*.25;positions[i*3+2]=Math.sin(i*2.4)*(1+i%3*.3);}
 geometry.setAttribute('position',new T.BufferAttribute(positions,3));const lights=new T.Points(geometry,new T.PointsMaterial({color:0xffeb8d,size:.065,transparent:true,opacity:.9,depthWrite:false}));fireflies.add(lights);
 const rainbow=decoration('rainbow');for(let i=0;i<5;i++){const arc=new T.Mesh(new T.TorusGeometry(1.52+i*.085,.035,5,48,Math.PI),material([0xf3a1c8,0xffbd8c,0xf5dc95,0xa4cead,0xb7ade3][i]));arc.position.set(0,.24,-1.22);rainbow.add(arc);}
 for(const id of ['bunny','fox','owl'] as const){const rig=characters.create(id);playroom.attach(rig.root,{head:rig.hatMount,neck:rig.neckMount});rigs.set(id,rig);buddies.set(id,rig.root);group.add(rig.root);}
 let lastAction=0,lastSent=-1,cheerStart=-100,activeBuddy:T.Group|undefined;
 function update(decoration:IslandDecoration,companion:IslandCompanion|undefined,time:number,still:boolean,options:{homeStage?:number;houseColor?:HouseColor;communityStage?:number;cheer?:number;sent?:number;personality?:Personality;hat?:Hat;accessory?:Accessory;islandProp?:IslandProp;care?:CareCue;portrait?:boolean}={}){
  const sent=options.sent??0,action=options.cheer??0;if(action!==lastAction||lastSent>=0&&sent>lastSent)cheerStart=time;lastAction=action;lastSent=sent;
  const cheering=time-cheerStart<2.8;decorations.forEach((g,id)=>g.visible=id===decoration);activeBuddy=undefined;
  buddies.forEach((g,id)=>{
   g.visible=id===companion;if(!g.visible)return;activeBuddy=g;
   if(!still){const playful=options.personality==='playful',curious=options.personality==='curious',portrait=!!options.portrait,speed=playful?1.5:curious?.8:1,phase=time*.42*speed;
    if(portrait){g.position.set(.8+Math.sin(time*.7)*.015,.14+(cheering?Math.abs(Math.sin(time*6))*.10:0),1.1);g.rotation.y=.12+Math.sin(time*.7)*.06;}
    else{g.position.set(cheering?.55+Math.sin(time*5)*.13:.84+Math.sin(phase)*.28,.14+(cheering?Math.abs(Math.sin(time*7))*.16:Math.abs(Math.sin(time*3*speed))*(playful?.05:.018)),cheering?1.35:1.02+Math.cos(phase)*.20);g.rotation.y=cheering?Math.sin(time*4)*.25:Math.atan2(Math.cos(phase)*.28,-Math.sin(phase)*.20);}
    rigs.get(id as IslandCompanion)?.animate(time,false,cheering,curious,portrait);
   }
  });
  playroom.update(time,still,options.hat,options.accessory,options.islandProp,options.care,activeBuddy);
  fireflies.rotation.y=still?fireflies.rotation.y:time*.12;lights.material.opacity=still?lights.material.opacity:.75+Math.sin(time*2)*.15;
  life.update(options.homeStage??-1,options.houseColor??'lavender',options.communityStage??0,time,still);
 }
 function companionPosition(target:T.Vector3){if(!activeBuddy)return false;activeBuddy.getWorldPosition(target);target.y+=1.20;return true;}
 return {group,update,companionPosition};
}
