import assert from 'node:assert/strict';
import {test} from 'node:test';
import {hermesStepUp} from '../behavior_pack/scripts/hermes_step.js';
import {readFileSync} from 'node:fs';
import {CONFIG} from '../behavior_pack/scripts/config.js';
import {movementDirection} from '../behavior_pack/scripts/rules.js';

function runner() {
  const calls=[],impulses=[],walls=new Set();let floor=true,teleportAllowed=true;
  const player={isSprinting:true,isOnGround:true,isSneaking:false,isInWater:false,
    location:{x:0.5,y:64,z:0.5},getVelocity:()=>({x:1.2,y:0,z:0}),
    dimension:{
      getBlockFromRay:(origin,direction,options)=>{
        if(direction.y!==-1)return {face:'West',faceLocation:{x:0,y:0.1,z:0.5},block:{typeId:'minecraft:stone',location:{x:1,y:64,z:0}}};
        if(options.maxDistance===1.01)return floor?{face:'Up',faceLocation:{x:0.34,y:1,z:0.5},block:{typeId:'minecraft:stone',location:{x:1,y:64,z:0}}}:undefined;
        for(const key of walls) {
          const [x,y,z]=key.split(',').map(Number);
          if(Math.floor(origin.x)===x && Math.floor(origin.z)===z && y+1>origin.y-options.maxDistance && y<origin.y)return {block:{typeId:'minecraft:stone'}};
        }
      },
      getBlock:at=>({isAir:!walls.has(`${at.x},${at.y},${at.z}`)})},
    applyImpulse:value=>impulses.push(value),tryTeleport:(at,options)=>{calls.push({at,options});return teleportAllowed;}};
  return {player,calls,impulses,walls,setFloor:value=>{floor=value;},denyTeleport:()=>{teleportAllowed=false;}};
}
test('Hermes steps directly onto one-block ledges without a jump or velocity reset',()=>{
  const {player,calls}=runner();assert.equal(hermesStepUp(player,{x:1,z:0}),true);
  assert.equal(calls.length,1);assert.ok(calls[0].at.x>1 && calls[0].at.x<1.6);
  assert.equal(calls[0].at.y,65.01);assert.equal(calls[0].at.z,0.5);
  assert.deepEqual(calls[0].options,{checkForBlocks:true,keepVelocity:true});
});
test('airborne, sneaking, swimming and stationary Hermes cannot ramp',()=>{
  for(const [flag,value] of [['isOnGround',false],['isSneaking',true],['isInWater',true],['isGliding',true]]) {
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
test('a rejected direct step gets one automatic hop and never repeats in midair',()=>{
  const {player,calls,impulses,denyTeleport}=runner();denyTeleport();assert.equal(hermesStepUp(player,{x:1,z:0}),true);
  assert.deepEqual(impulses,[{x:0,y:0.42,z:0}]);
  player.isOnGround=false;
  for(let tick=0;tick<20;tick++)assert.equal(hermesStepUp(player,{x:1,z:0}),false);
  assert.equal(calls.length,1,'holding into a wall cannot accumulate height');
});

test('passable plants do not block stepping onto bare or grassy one-block ledges',()=>{
  const {player}=runner();player.dimension.getBlock=()=>({isAir:false,typeId:'minecraft:short_grass'});
  assert.equal(hermesStepUp(player,{x:1,z:0}),true);
});
test('Hermes can step after native sprint is canceled and during his regular fast walk',()=>{
  const {player}=runner();player.isSprinting=false;
  assert.equal(hermesStepUp(player,{x:1,z:0}),true);
});

test('real Hermes motion attempts stepping before the native sprint early return',()=>{
  const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8');
  const body=source.slice(source.indexOf('function hermesMotion('),source.indexOf('function hermesFallProtection('));
  const attempts=[],impulses=[],effects=[],recent=new Map(),turbo=new Map();
  const player={id:'quartz-runner',isSprinting:false,isOnGround:true,isInWater:false,isSneaking:false,location:{x:0,y:64,z:0},
    inputInfo:{getMovementVector:()=>({x:0,y:1})},getViewDirection:()=>({x:1,y:0,z:0}),getVelocity:()=>({x:0,y:0,z:0}),
    applyImpulse:v=>impulses.push(v),onScreenDisplay:{setActionBar(){}},dimension:{spawnParticle(){}},removeEffect(){}};
  const motion=new Function('CONFIG','system','hermesSprintIntent','hermesTurboTick','hermesTrailTick','hermesStepUp','movementDirection','effect','MolangVariableMap','fail',`${body};return hermesMotion;`)
    (CONFIG,{currentTick:100},recent,turbo,new Map(),(_p,d)=>{attempts.push(d);return true;},movementDirection,(_p,id,_seconds,amplifier)=>effects.push({id,amplifier}),class{setColorRGB(){}},e=>{throw e;});
  motion(player);assert.equal(attempts.length,1,'regular Hermes movement still attempts the quartz step');
  assert.equal(impulses.length,0,'walking does not become sprint turbo');
  recent.set(player.id,99);motion(player);
  assert.equal(attempts.length,2);assert.ok(impulses.some(v=>v.x>0),'recent sprint continues after collision interrupted its native flag');
  assert.ok(effects.some(e=>e.amplifier===CONFIG.hermesTurboAmplifier));
});
