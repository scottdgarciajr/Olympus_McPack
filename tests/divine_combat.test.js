import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CONFIG } from '../behavior_pack/scripts/config.js';
import { scanChests } from '../behavior_pack/scripts/oracle_esp.js';

// The Bedrock runtime is unavailable to Node. Load the real combat module with
// small API doubles so the impact and cooldown paths can still be exercised.
const path = resolve(dirname(fileURLToPath(import.meta.url)),'../behavior_pack/scripts/divine_combat.js');
const source = readFileSync(path,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
function runtime(world,system,MapType=class { setColorRGB() {} setFloat() {} }) {
  const factory = new Function('world','system','EntityDamageCause','MolangVariableMap','CONFIG','scanChests',
    `${source}\nreturn {onDivineBowRelease,configureDivine,armSolarFlare,onDivineProjectileSpawn,onDivineProjectileHitEntity,hellfire,oracleSight,divineTick,assistedArrowTick};`);
  return factory(world,system,{magic:'magic',projectile:'projectile'},MapType,CONFIG,scanChests);
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

test('Hellfire requires fire or lava and launches a native exploding fireball', () => {
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
  assert.deepEqual(victim.damage.map(([n])=>n),[]); // The projectile definition handles impact.
  assert.equal(api.onDivineProjectileHitEntity(event),'');
  const definition=JSON.parse(readFileSync(resolve(dirname(path),'../entities/hellfire_bolt.json'),'utf8'))['minecraft:entity'];
  assert.equal(definition.component_groups['olympus:exploding']['minecraft:explode'].breaks_blocks,true);
  assert.equal(definition.components['minecraft:projectile'].on_hit.impact_damage.damage,4);
  shot=undefined;
  block='minecraft:lava';
  api.hellfire(player);
  assert.equal(shot?.typeId,'olympus:hellfire_bolt');
});

test('Oracle prioritizes nearby players over a crowd of mobs and reveals no coordinates', () => {
  const action=[];
  const dimension={id:'minecraft:overworld',spawnParticle(){},playSound(){}};
  const apollo={id:'apollo',typeId:'minecraft:player',location:{x:0,y:0,z:0},dimension,
    setPropertyOverrideForEntity(){},removePropertyOverrideForEntity(){},
    getHeadLocation:()=>({x:0,y:1.6,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),
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

test('Prophetic Bow fires a normal arrow that curves without Solar Flare or scripted damage',()=>{
  const props=new Map([['olympus:flareArmed',true]]);
  const player={id:'archer',typeId:'minecraft:player',getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v)};
  const victim=target('near');victim.location={x:10,y:0,z:1};
  const dimension={id:'minecraft:overworld',getEntities:()=>[victim],getBlockFromRay:()=>undefined};
  const impulses=[],cooldowns=[];
  const arrow={id:'aim-1',typeId:'minecraft:arrow',dimension,location:{x:0,y:1,z:0},
    getComponent:()=>({owner:player,shoot:v=>impulses.push(v)}),getVelocity:()=>({x:2,y:0,z:0})};
  player.dimension=dimension; player.getViewDirection=()=>({x:1,y:0,z:0}); player.getHeadLocation=()=>({x:0,y:1,z:0});
  const api=runtime({getAllPlayers:()=>[player]},{currentTick:100,runTimeout(){}});
  api.configureDivine({role:()=> 'apollo',heldItem:()=>({nameTag:'§6Apollo’s Prophetic Bow'}),
    ready:()=>true,power:()=>({lit:true}),startCooldown:(_p,id)=>cooldowns.push(id),tell(){},fail:e=>{throw e;}});
  api.onDivineProjectileSpawn(arrow);
  api.assistedArrowTick(); assert.ok(impulses[0].z>0);
  assert.ok(Math.abs(Math.hypot(impulses[0].x,impulses[0].y,impulses[0].z)-2)<0.0001);
  const event={projectile:arrow,source:player,dimension,location:victim.location,getEntityHit:()=>({entity:victim})};
  assert.equal(api.onDivineProjectileHitEntity(event),'aim');
  assert.deepEqual(victim.damage,[]);assert.deepEqual(victim.effects,[]);assert.deepEqual(cooldowns,[]);
  assert.equal(props.get('olympus:flareArmed'),true);
  assert.equal(api.onDivineProjectileHitEntity(event),'duplicate');
});

test('Oracle and Solar Flare cannot activate in darkness',()=>{
  const messages=[],cooldowns=[],props=new Map();
  const player={id:'dark',getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v)};
  const api=runtime({getAllPlayers:()=>[player]},{currentTick:100,runTimeout(){}});
  api.configureDivine({role:()=> 'apollo',power:()=>({lit:false}),ready:()=>true,
    startCooldown:(_p,id)=>cooldowns.push(id),tell:(_p,m)=>messages.push(m)});
  api.oracleSight(player);api.armSolarFlare(player);
  assert.equal(messages.length,2);assert.deepEqual(cooldowns,[]);
  assert.equal(props.get('olympus:flareArmed'),undefined);
});

test('Oracle draws a gold ground compass and colored trails without touching entity rendering',()=>{
  const particles=[],messages=[],failures=[];
  const dimension={id:'minecraft:overworld',playSound(){},getBlockFromRay:()=>({block:{location:{x:0,y:-1,z:0}}}),
    getBlock:at=>({typeId:at.x===3 && at.y===0 && at.z===3?'minecraft:chest':'minecraft:air'})};
  const viewer={id:'viewer',typeId:'minecraft:player',location:{x:0,y:0,z:0},dimension,
    spawnParticle:(id,at,tint)=>particles.push({id,at,color:tint.color}),
    setPropertyOverrideForEntity(){throw Error('outline unavailable');},removePropertyOverrideForEntity(){},
    onScreenDisplay:{setActionBar:text=>messages.push(text)}};
  const player={...target('player','minecraft:player'),name:'Neighbor',dimension,location:{x:12,y:0,z:0}};
  const animal={...target('animal','minecraft:cow'),dimension,location:{x:0,y:0,z:10}};
  const mob={...target('mob'),dimension,location:{x:-8,y:0,z:0}};
  dimension.getEntities=()=>[player,animal,mob];
  const system={currentTick:100};
  const api=runtime({getAllPlayers:()=>[viewer]},system,class {setColorRGB(_name,color){this.color=color;}});
  api.configureDivine({role:()=> 'apollo',ready:()=>true,startCooldown(){},tell(){},fail:e=>failures.push(e)});
  api.oracleSight(viewer);
  assert.equal(failures.length,0,'compass never invokes the throwing entity-render override');assert.match(messages[0],/Neighbor E 12m/);
  const ground=particles.filter(p=>p.at.y<0.2);
  assert.ok(ground.filter(p=>p.color.red===1 && p.color.green===0.82).length>=24,'gold base ring');
  assert.ok(ground.some(p=>p.color.blue===1 && p.at.x>3),'cyan trail toward player');
  assert.ok(ground.some(p=>p.color.green===0.9 && p.at.z>3),'green trail toward animal');
  assert.ok(ground.some(p=>p.color.green===0.3 && p.at.x< -3),'red trail toward mob');
  system.currentTick+=3;api.divineTick();
  assert.ok(particles.some(p=>p.color.green===0.55 && p.at.x>2 && p.at.z>2),'orange chest direction and destination');
  assert.match(messages.at(-1),/Chests:1/);
  assert.equal(failures.length,0,'compass continues refreshing without entity rendering calls');
});

test('Prophetic release snapshot catches delayed native arrow ownership after switching items',()=>{
  let owner,held,velocity={x:2,y:0,z:0};const adjustments=[];
  const dimension={id:'minecraft:overworld',getBlockFromRay:()=>undefined};
  const player={id:'archer',typeId:'minecraft:player',location:{x:0,y:0,z:0},dimension,spawnParticle(){}};
  const victim=target('target');victim.location={x:12,y:0,z:2};
  const arrow={id:'late-arrow',typeId:'minecraft:arrow',location:{x:0,y:1,z:0},dimension,
    getComponent:()=>({owner,shoot:v=>{velocity=v;adjustments.push(v);}}),getVelocity:()=>velocity};
  dimension.getEntities=query=>query.type==='minecraft:arrow'?[arrow]:[victim];
  const system={currentTick:100,runTimeout(){}},api=runtime({getAllPlayers:()=>[player]},system);
  api.configureDivine({role:()=> 'apollo',heldItem:()=>held,power:()=>({lit:true})});
  api.onDivineProjectileSpawn(arrow);
  api.onDivineBowRelease(player,{nameTag:'§6Apollo’s Prophetic Bow'});
  held={typeId:'minecraft:stone'};owner=player;system.currentTick++;
  api.assistedArrowTick();
  assert.ok(adjustments[0].z>0.06,'visible curve survives delayed owner assignment and item switch');
  assert.ok(Math.abs(Math.hypot(...Object.values(velocity))-2)<0.0001,'native shot speed preserved');
});

test('Prophetic Bow selects the closest aim angle, locks its target, and stops steering through walls',()=>{
  const near=target('near'),wide=target('wide');near.location={x:12,y:0,z:1};wide.location={x:12,y:0,z:3};
  let candidates=[near,wide],blocked=false,queries=0;
  const dimension={id:'minecraft:overworld',getEntities:()=>{queries++;return candidates;},getBlockFromRay:()=>blocked?{}:undefined};
  const player={id:'apollo',typeId:'minecraft:player'};
  const adjustments=[];
  const arrow={id:'locked-arrow',typeId:'minecraft:arrow',dimension,location:{x:0,y:1,z:0},
    getComponent:()=>({owner:player,shoot:v=>adjustments.push(v)}),getVelocity:()=>({x:2,y:0,z:0})};
  const api=runtime({getAllPlayers:()=>[player]},{currentTick:100,runTimeout(){}});
  api.configureDivine({role:()=> 'apollo',heldItem:()=>({nameTag:'§6Apollo’s Prophetic Bow'}),power:()=>({lit:true})});
  api.onDivineProjectileSpawn(arrow);api.assistedArrowTick();
  assert.ok(adjustments[0].z>0 && adjustments[0].z<0.05,'prefer near aim angle, not last mob in query');
  const opposite=target('opposite');opposite.location={x:12,y:0,z:-0.1};candidates=[opposite];
  api.assistedArrowTick();assert.equal(queries,1,'retain live lock');assert.ok(adjustments[1].z>0);
  blocked=true;api.assistedArrowTick();assert.equal(adjustments.length,2,'do not curve toward occluded target');
});
