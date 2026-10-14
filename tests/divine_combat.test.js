import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CONFIG } from '../behavior_pack/scripts/config.js';

// The Bedrock runtime is unavailable to Node. Load the real combat module with
// small API doubles so the impact and cooldown paths can still be exercised.
const path = resolve(dirname(fileURLToPath(import.meta.url)),'../behavior_pack/scripts/divine_combat.js');
const source = readFileSync(path,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
function runtime(world,system) {
  const factory = new Function('world','system','EntityDamageCause','MolangVariableMap','CONFIG',
    `${source}\nreturn {configureDivine,armSolarFlare,onDivineProjectileSpawn,onDivineProjectileHitEntity,hellfire,oracleSight};`);
  return factory(world,system,{magic:'magic',projectile:'projectile'},class { setColorRGB() {} },CONFIG);
}
function target(id,typeId='minecraft:zombie') {
  const damage=[],effects=[];
  return {
    id,typeId,location:{x:1,y:0,z:0},damage,effects,
    getComponent: name => name==='minecraft:health'?{}:undefined,
    addEffect:(...args)=>effects.push(args),
    applyDamage:(...args)=>damage.push(args)
  };
}

test('Solar Flare affects secondary targets once and never adds area damage to its direct hit', () => {
  const props=new Map([['olympus:flareArmed',true]]);
  const player={id:'apollo',typeId:'minecraft:player',dimension:{id:'minecraft:overworld'},
    getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v)};
  const direct=target('direct'), nearby=target('nearby');
  const dimension={id:'minecraft:overworld',getEntities:()=>[direct,nearby],
    spawnParticle(){},playSound(){}};
  const world={getAllPlayers:()=>[player]};
  const system={currentTick:100,runTimeout(){}};
  const api=runtime(world,system),cooldowns=[];
  api.configureDivine({role:()=> 'apollo',heldItem:()=>({nameTag:'§eApollo’s Solar Bow'}),
    startCooldown:(_p,id)=>cooldowns.push(id),tell(){},fail: e=>{throw e;}});
  const projectile={id:'arrow-1',typeId:'minecraft:arrow',getComponent:()=>({owner:player})};
  api.onDivineProjectileSpawn(projectile);
  const event={projectile,source:player,dimension,location:{x:0,y:0,z:0},getEntityHit:()=>({entity:direct})};
  assert.equal(api.onDivineProjectileHitEntity(event),'flare');
  assert.equal(direct.damage.length,0);
  assert.deepEqual(nearby.damage.map(([n])=>n),[4]);
  assert.equal(direct.effects[0][0],'blindness');
  assert.equal(nearby.effects[0][0],'blindness');
  assert.deepEqual(cooldowns,['apolloSolarFlare']);
  assert.equal(api.onDivineProjectileHitEntity(event),'duplicate');
  assert.equal(nearby.damage.length,1);
});

test('Hellfire requires fire or lava and launches one non-destructive fireball', () => {
  let block='minecraft:netherrack',shot,velocity;
  const dimension={id:'minecraft:the_nether',
    getBlock:()=>({typeId:block}),
    spawnEntity:(id)=>{assert.equal(id,'olympus:hellfire_bolt');shot={id:'fire-1',typeId:id,
      getComponent:()=>({set owner(value){this._owner=value;},shoot:v=>{velocity=v;}})};return shot;},
    spawnParticle(){},playSound(){}};
  const player={id:'hades',typeId:'minecraft:player',location:{x:0,y:0,z:0},dimension,
    getViewDirection:()=>({x:1,y:0,z:0})};
  const victim=target('victim','minecraft:player');
  const world={getAllPlayers:()=>[player]},system={currentTick:100,runTimeout(){}};
  const api=runtime(world,system),cooldowns=[],messages=[];
  api.configureDivine({role:()=> 'hades',ready:()=>true,
    startCooldown:(_p,id)=>cooldowns.push(id),tell:(_p,m)=>messages.push(m),fail:e=>{throw e;}});
  api.hellfire(player);
  assert.equal(shot,undefined);
  assert.match(messages[0],/Stand in fire/);
  block='minecraft:soul_fire';
  api.hellfire(player);
  assert.equal(velocity.x,CONFIG.hellfire.projectileSpeed);
  assert.deepEqual(cooldowns,['hadesHellfire']);
  const event={projectile:shot,source:player,dimension,location:{x:2,y:0,z:0},getEntityHit:()=>({entity:victim})};
  assert.equal(api.onDivineProjectileHitEntity(event),'hellfire');
  assert.deepEqual(victim.damage.map(([n])=>n),[6]);
  assert.equal(api.onDivineProjectileHitEntity(event),'');
  assert.equal(victim.damage.length,1);
  shot=undefined;
  block='minecraft:lava';
  api.hellfire(player);
  assert.equal(shot?.typeId,'olympus:hellfire_bolt');
});

test('Oracle prioritizes nearby players over a crowd of mobs and reveals no coordinates', () => {
  const action=[];
  const dimension={id:'minecraft:overworld',spawnParticle(){},playSound(){}};
  const apollo={id:'apollo',typeId:'minecraft:player',location:{x:0,y:0,z:0},dimension,
    onScreenDisplay:{setActionBar:value=>action.push(value)},spawnParticle(){}};
  const other={...target('other','minecraft:player'),name:'OtherGod',location:{x:30,y:0,z:0},dimension,
    getGameMode:()=> 'Survival'};
  const mobs=Array.from({length:30},(_,i)=>({...target(`mob-${i}`),dimension}));
  dimension.getEntities=()=>[...mobs,other];
  const api=runtime({getAllPlayers:()=>[apollo]},{currentTick:100,runTimeout(){}});
  const cooldowns=[];
  api.configureDivine({role:()=> 'apollo',ready:()=>true,
    startCooldown:(_p,id)=>cooldowns.push(id),tell(){},fail:e=>{throw e;}});
  api.oracleSight(apollo);
  assert.deepEqual(cooldowns,['apolloOracle']);
  assert.match(action[0],/OtherGod E 30m/);
  assert.doesNotMatch(action[0],/x:|z:|30,0,0/i);
});
