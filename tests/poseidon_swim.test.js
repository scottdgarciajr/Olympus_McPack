import assert from 'node:assert/strict';
import {test} from 'node:test';
import {poseidonSwimCruise,recordTidalBoost,forgetTidalBoost,tidalEnvironment} from '../behavior_pack/scripts/poseidon_swim.js';
import {rememberRainWater,cleanupRainWater,placeClutchWater,removeClutchWater,CLUTCH_WATER,CLUTCH_BOUNDARY} from '../behavior_pack/scripts/rain_water.js';
import {readFileSync} from 'node:fs';

test('swim cruise gently approaches walking speed without sprint or changing vertical motion',()=>{
  const velocity={x:0.1,y:0.4,z:0},impulses=[];
  const player={isInWater:true,isSprinting:false,getVelocity:()=>velocity,
    applyImpulse:v=>{impulses.push(v);velocity.x+=v.x;}};
  for(let tick=0;tick<10;tick++)poseidonSwimCruise(player,{x:1,z:0});
  assert.ok(Math.abs(velocity.x-0.21585)<1e-6);
  assert.ok(impulses.every(v=>v.x<=0.04 && v.y===0 && v.z===0));
  assert.equal(velocity.y,0.4);
});
test('swim cruise respects idle, land, sneak, analog input and already faster movement',()=>{
  const impulses=[];let velocity={x:0,y:0,z:0};
  const player={isInWater:true,getVelocity:()=>velocity,applyImpulse:v=>impulses.push(v)};
  assert.equal(poseidonSwimCruise(player,{x:0,z:0}),false);
  player.isInWater=false;assert.equal(poseidonSwimCruise(player,{x:1,z:0}),false);
  player.isInWater=true;player.isSneaking=true;assert.equal(poseidonSwimCruise(player,{x:1,z:0}),false);
  player.isSneaking=false;velocity.x=1.08;assert.equal(poseidonSwimCruise(player,{x:1,z:0}),false,'do not brake Tidal Sprint/Riptide');
  velocity.x=0.09;poseidonSwimCruise(player,{x:0.5,z:0});assert.ok(impulses[0].x<0.02,'partial stick means partial speed');
});

function worldSetup(){
  const props=new Map(),blocks=new Map();let loaded=true;
  const key=p=>`${p.x},${p.y},${p.z}`;
  const world={getDynamicPropertyIds:()=>[...props.keys()],getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),
    getDimension:()=>({getBlock:p=>{if(!loaded)throw Error('unloaded');return blocks.get(key(p));}})};
  const water=(p,type='minecraft:water')=>{const block={typeId:type,setType(value){this.typeId=value;}};blocks.set(key(p),block);return block;};
  return {world,water,props,setLoaded:value=>{loaded=value;}};
}
test('only recorded rain water expires at five seconds; unrelated water remains',()=>{
  const {world,water}=worldSetup(),at={x:1,y:64,z:1};
  const placed=water(at),unrelated=water({x:2,y:64,z:1});rememberRainWater(world,'minecraft:overworld',at,1000);
  cleanupRainWater(world,5999);assert.equal(placed.typeId,'minecraft:water');
  cleanupRainWater(world,6000);assert.equal(placed.typeId,'minecraft:air');assert.equal(unrelated.typeId,'minecraft:water');
  assert.equal(world.getDynamicProperty('olympus:rain_clutch_water'),undefined);
});
test('rain water cleanup survives a fresh world wrapper/rejoin and retries unloaded chunks',()=>{
  const {world,water,setLoaded}=worldSetup(),at={x:1,y:64,z:1},placed=water(at);
  rememberRainWater(world,'minecraft:overworld',at,0);setLoaded(false);cleanupRainWater({...world},5000);
  assert.ok(world.getDynamicPropertyIds().some(key=>key.startsWith('olympus:rain_water_') && world.getDynamicProperty(key)));assert.equal(placed.typeId,'minecraft:water');
  setLoaded(true);cleanupRainWater({...world},6000);assert.equal(placed.typeId,'minecraft:air');
});
test('cleanup never destroys a building block replacing rain water',()=>{
  const {world,water}=worldSetup(),at={x:1,y:64,z:1},block=water(at);
  rememberRainWater(world,'minecraft:overworld',at,0);block.typeId='minecraft:diamond_block';
  cleanupRainWater(world,5000);assert.equal(block.typeId,'minecraft:diamond_block');
  assert.equal(world.getDynamicProperty('olympus:rain_clutch_water'),undefined);
});

test('Tidal Sprint momentum ends on dry exit without altering vertical motion or native Riptide',()=>{
  const impulses=[],player={id:'tidal-exit',isSprinting:true,getVelocity:()=>({x:1.08,y:0.5,z:0}),applyImpulse:v=>impulses.push(v)};
  recordTidalBoost(player);tidalEnvironment(player,true);assert.equal(impulses.length,0);
  tidalEnvironment(player,false);assert.deepEqual(impulses[0],{x:0.28-1.08,y:0,z:0});
  tidalEnvironment(player,false);assert.equal(impulses.length,1,'only remove our boost once');
  recordTidalBoost(player);forgetTidalBoost(player.id);tidalEnvironment(player,false);
  assert.equal(impulses.length,1,'trident release clears the Tidal marker, retaining native launch momentum');
});
test('clutch uses ordinary water, with passable invisible flow-blocking edges',()=>{
  const changes=[],block={typeId:'minecraft:air',setType(type){this.typeId=type;changes.push(type);},setWaterlogged(){throw Error('ordinary water must not be waterlogged');}};
  placeClutchWater(block);assert.deepEqual(changes,['minecraft:water']);
  removeClutchWater(block);assert.deepEqual(changes,['minecraft:water','minecraft:air']);
  const definition=JSON.parse(readFileSync(new URL('../behavior_pack/blocks/clutch_boundary.json',import.meta.url),'utf8'))['minecraft:block'];
    assert.equal(CLUTCH_BOUNDARY,'minecraft:structure_void');
    assert.equal(definition.description.identifier,'olympus:clutch_boundary','legacy definition is retained for cleanup');
  assert.equal(definition.components['minecraft:collision_box'],false);
  assert.equal(definition.components['minecraft:selection_box'],false);
  const rule=definition.components['minecraft:liquid_detection'].detection_rules[0];
  assert.equal(rule.can_contain_liquid,false);assert.equal(rule.on_liquid_touches,'blocking');
});
test('upgrading cleans up an old waterlogged carrier without releasing its liquid',()=>{
  const changes=[],block={typeId:'olympus:clutch_water',setType(type){this.typeId=type;changes.push(type);},setWaterlogged:value=>changes.push(value)};
  removeClutchWater(block);assert.deepEqual(changes,[false,'minecraft:air']);
});
