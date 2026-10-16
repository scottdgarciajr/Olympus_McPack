import assert from 'node:assert/strict';
import {test} from 'node:test';
import {hermesStepUp} from '../behavior_pack/scripts/hermes_step.js';

function runner() {
  const calls=[],walls=new Set();let floor=true,teleportAllowed=true;
  const player={isSprinting:true,isOnGround:true,isSneaking:false,isInWater:false,
    location:{x:0.5,y:64,z:0.5},getVelocity:()=>({x:1.2,y:0,z:0}),
    dimension:{
      getBlockFromRay:(origin,direction)=>direction.y===-1 ? (floor?{face:'Up',faceLocation:{x:0.34,y:1,z:0.5},block:{typeId:'minecraft:stone',location:{x:1,y:64,z:0}}}:undefined) :
        {face:'West',faceLocation:{x:0,y:0.1,z:0.5},block:{typeId:'minecraft:stone',location:{x:1,y:64,z:0}}},
      getBlock:at=>({isAir:!walls.has(`${at.x},${at.y},${at.z}`)})},
    tryTeleport:(at,options)=>{calls.push({at,options});return teleportAllowed;}};
  return {player,calls,walls,setFloor:value=>{floor=value;},denyTeleport:()=>{teleportAllowed=false;}};
}
test('Hermes steps directly onto one-block ledges without a jump or velocity reset',()=>{
  const {player,calls}=runner();assert.equal(hermesStepUp(player,{x:1,z:0}),true);
  assert.equal(calls.length,1);assert.ok(calls[0].at.x>1 && calls[0].at.x<1.6);
  assert.equal(calls[0].at.y,65.01);assert.equal(calls[0].at.z,0.5);
  assert.deepEqual(calls[0].options,{checkForBlocks:true,keepVelocity:true});
});
test('airborne, sneaking, swimming, stationary and non-sprinting Hermes cannot ramp',()=>{
  for(const [flag,value] of [['isOnGround',false],['isSprinting',false],['isSneaking',true],['isInWater',true],['isGliding',true],['isFlying',true]]) {
    const {player,calls}=runner();player[flag]=value;
    assert.equal(hermesStepUp(player,{x:1,z:0}),false,flag);assert.equal(calls.length,0);
  }
  const {player,calls}=runner();assert.equal(hermesStepUp(player,{x:0,z:0}),false);assert.equal(calls.length,0);
  player.getVelocity=()=>({x:1,y:0.4,z:0});assert.equal(hermesStepUp(player,{x:1,z:0}),false,'no stepping during jump');
});
test('two-block walls and low ceilings block the whole standing volume',()=>{
  for(const block of ['1,65,0','1,66,0','0,66,0']) {
    const {player,calls,walls}=runner();walls.add(block);
    assert.equal(hermesStepUp(player,{x:1,z:0}),false,block);assert.equal(calls.length,0);
  }
});
test('no ledge, no supported landing, hazards and unloaded blocks cannot trigger a step',()=>{
  let setup=runner();setup.setFloor(false);
  assert.equal(hermesStepUp(setup.player,{x:1,z:0}),false);
  setup=runner();setup.player.dimension.getBlockFromRay=()=>undefined;
  assert.equal(hermesStepUp(setup.player,{x:1,z:0}),false);
  setup=runner();setup.player.dimension.getBlockFromRay=()=>({block:{typeId:'minecraft:cactus'}});
  assert.equal(hermesStepUp(setup.player,{x:1,z:0}),false);
  setup=runner();setup.player.dimension.getBlock=()=>undefined;
  assert.equal(hermesStepUp(setup.player,{x:1,z:0}),false);
});
test('collision-rejected teleports stop safely, and stepping never repeats in midair',()=>{
  const {player,calls,denyTeleport}=runner();denyTeleport();assert.equal(hermesStepUp(player,{x:1,z:0}),false);
  player.isOnGround=false;
  for(let tick=0;tick<20;tick++)assert.equal(hermesStepUp(player,{x:1,z:0}),false);
  assert.equal(calls.length,1,'holding into a wall cannot accumulate height');
});
