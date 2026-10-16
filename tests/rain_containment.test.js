import assert from 'node:assert/strict';
import {test} from 'node:test';
import {rememberRainWater,cleanupRainWater,CLUTCH_BOUNDARY} from '../behavior_pack/scripts/rain_water.js';
test('legacy invisible edges clean up after old water; new sources expire after five seconds',()=>{
 const props=new Map(),cells=new Map([['7,1,0','minecraft:water'],['8,1,0',CLUTCH_BOUNDARY]]),events=[];
 const world={getDynamicPropertyIds:()=>[...props.keys()],getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),getDimension:()=>({getBlock:p=>({get typeId(){return cells.get(`${p.x},${p.y},${p.z}`);},setType(type){events.push(this.typeId);cells.set(`${p.x},${p.y},${p.z}`,type);}})})};
 rememberRainWater(world,'minecraft:overworld',{x:7,y:1,z:0},0);rememberRainWater(world,'minecraft:overworld',{x:8,y:1,z:0},0,true);
 cleanupRainWater(world,4999);assert.equal(events.length,0);cleanupRainWater(world,5000);assert.deepEqual(events,['minecraft:water',CLUTCH_BOUNDARY]);
});
