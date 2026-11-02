import {studentJourney} from './student-journey';
import type {AppState,Row} from './client';

import {islandRewards,companions,type IslandDecoration,type IslandCompanion} from './adventure-catalog';
export * from './adventure-catalog';
export function islandAdventure(state:AppState,course:Row,time=Date.now()){
 const journey=studentJourney(state,[course],time);
 const rewards=islandRewards.map(r=>({...r,earned:journey.sent>=r.goal}));
 return {journey,rewards,next:rewards.find(r=>!r.earned),unlocked:rewards.filter(r=>r.earned)};
}
/** Decorations retain their earned gates; all companions can be selected from the start. */
export function islandAppearance(sent:number,choice?:{decoration?:unknown;companion?:unknown}){
 const latest=[...islandRewards].reverse().find(r=>sent>=r.goal);
 const decoration:IslandDecoration=choice?.decoration==='none'?'none':islandRewards.find(r=>r.id===choice?.decoration&&sent>=r.goal)?.id||latest?.id||'none';
 const companion:IslandCompanion=companions.find(c=>c.id===choice?.companion)?.id||'bunny';
 return {decoration,companion};
}
