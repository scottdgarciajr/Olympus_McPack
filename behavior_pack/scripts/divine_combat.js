import { world, system, EntityDamageCause, MolangVariableMap } from '@minecraft/server';
import { CONFIG } from './config.js';
import { scanChests } from './oracle_esp.js';

const flareShots = new Map();
const processedFlare = new Map();
const flareInFlight = new Map();
const recentBowRelease = new Map();
const recentShotBows = new Map();
const fallbackOracleParticles = new Set();
const hellfireShots = new Map();
const visions = new Map();
const assistedShots = new Map();
const solarShots = new Map();
const moonShots = new Map();
let lastVisionTick = 0;
const ANIMALS = new Set(['cow','pig','sheep','chicken','horse','donkey','mule','rabbit','fox','wolf','cat','ocelot','bee','goat','llama','camel','panda','polar_bear','turtle','frog','axolotl','dolphin','squid','glow_squid','cod','salmon','tropical_fish']);
const colors = { player: {red:1,green:0.82,blue:0.18}, animal: {red:0.38,green:0.9,blue:0.35}, mob: {red:1,green:0.3,blue:0.18} };
const FIREBALL = 'olympus:hellfire_bolt';
let api;
export function configureDivine(callbacks) { api = callbacks; }
const until = seconds => Date.now()+seconds*1000;
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function particle(dimension,location,color) {
  try {
    const map = new MolangVariableMap();
    map.setColorRGB('variable.color',color);
    dimension.spawnParticle('minecraft:colored_flame_particle',location,map);
  } catch (e) { if (CONFIG.debug) api.fail(e); }
}
function oracleParticle(player,location,color=colors.player) {
  const tint=new MolangVariableMap();
  tint.setColorRGB('variable.color',color);
  if(!fallbackOracleParticles.has(player.id))try { player.spawnParticle('olympus:oracle_glimmer',location,tint);return; }
  catch { fallbackOracleParticles.add(player.id); }
  try {
    player.spawnParticle('minecraft:colored_flame_particle',location,tint);
  } catch {}
}
function sound(dimension,id,location) { try { dimension.playSound(id,location); } catch {} }
function flame(dimension,location) { try { dimension.spawnParticle('minecraft:basic_flame_particle',location); } catch {} }
function eligible(entity,owner) {
  if (!entity || entity.id === owner.id || ['minecraft:item','minecraft:xp_orb','minecraft:arrow','minecraft:snowball'].includes(entity.typeId)) return false;
  if (entity.typeId === 'minecraft:player') {
    if (!CONFIG.friendlyFire) return false;
    try { if (String(entity.getGameMode()).toLowerCase() === 'spectator') return false; } catch {}
  }
  return !!entity.getComponent('minecraft:health');
}
function detectable(entity,viewer) {
  if (!entity || entity.id===viewer.id || ['minecraft:item','minecraft:xp_orb','minecraft:arrow','minecraft:snowball'].includes(entity.typeId)) return false;
  if (entity.typeId==='minecraft:player') {
    try { if (String(entity.getGameMode()).toLowerCase()==='spectator') return false; } catch {}
  }
  return !!entity.getComponent('minecraft:health');
}
export function armSolarFlare(player) {
  if (api.role(player) !== 'apollo') return;
  if (api.power && !api.power(player).lit) { api.tell(player,'Solar Flare needs light.'); return; }
  if (flareInFlight.has(player.id)) { api.tell(player,'Solar Flare arrow is still in flight.'); return; }
  if (!api.ready(player,'apolloSolarFlare','Solar Flare')) return;
  if (!player.getDynamicProperty('olympus:flareArmed')) {
    player.setDynamicProperty('olympus:aimAssist',undefined);
    player.setDynamicProperty('olympus:flareArmed',true);
    api.tell(player,'Solar Flare ARMED. Fire your divine bow; the next arrow will burst on impact.');
  } else {
    player.setDynamicProperty('olympus:flareArmed',undefined);
    api.tell(player,'Solar Flare disarmed.');
  }
}
export function onDivineProjectileSpawn(projectile) {
  if (projectile.typeId !== 'minecraft:arrow') return;
  const tag = () => {
    try {
      const owner = projectile.getComponent('minecraft:projectile')?.owner;
      if(owner?.typeId==='minecraft:player' && api.role(owner)==='artemis') {
        if(moonShots.has(projectile.id))return true;
        const release=recentShotBows.get(owner.id);
        if(api.heldItem(owner)?.nameTag==='§aArtemis’s Moon Bow' || (release?.name==='§aArtemis’s Moon Bow' && system.currentTick-release.tick<=8)) {
          moonShots.set(projectile.id,until(12));
          assistedShots.set(projectile.id,{ownerId:owner.id,god:'artemis',projectile,expires:until(12)});
        }
        return true;
      }
      if (owner?.typeId !== 'minecraft:player' || api.role(owner) !== 'apollo') return !!owner;
      if (assistedShots.has(projectile.id) || solarShots.has(projectile.id) || flareShots.has(projectile.id)) return true;
      const held=api.heldItem(owner)?.nameTag;
      const release=recentShotBows.get(owner.id);
      const bow=['§6Apollo’s Prophetic Bow','§eApollo’s Solar Bow'].includes(held) ? held :
        (release && system.currentTick-release.tick<=8 ? release.name : undefined);
      if (bow === '§6Apollo’s Prophetic Bow') {
        assistedShots.set(projectile.id,{ownerId:owner.id,projectile,expires:until(12)});
        return true;
      }
      if (bow !== '§eApollo’s Solar Bow') return false;
      solarShots.set(projectile.id,until(12));
      if (!owner.getDynamicProperty('olympus:flareArmed') || flareInFlight.has(owner.id) ||
          (api.power && !api.power(owner).lit)) return true;
      flareShots.set(projectile.id,{ownerId:owner.id,projectile,expires:until(CONFIG.solarFlare.arrowTimeoutSeconds)});
      flareInFlight.set(owner.id,projectile.id);
      owner.setDynamicProperty('olympus:flareArmed',undefined);
      api.tell(owner,'Solar Flare arrow launched.');
      return true;
    } catch { return false; }
  };
  if (!tag()) for (const delay of [1,2,3]) system.runTimeout(tag,delay);
}
export function onDivineBowRelease(player,item) {
  if(api.role(player)==='artemis' && item?.nameTag==='§aArtemis’s Moon Bow')recentShotBows.set(player.id,{name:item.nameTag,tick:system.currentTick});
  if(api.role(player)==='apollo' && ['§6Apollo’s Prophetic Bow','§eApollo’s Solar Bow'].includes(item?.nameTag)) {
    recentShotBows.set(player.id,{name:item.nameTag,tick:system.currentTick});
    if(item.nameTag==='§6Apollo’s Prophetic Bow' && api.power && !api.power(player).lit)
      api.tell(player,'Prophetic Bow: darkness disables steering; this arrow flies normally.');
  }
  if (item?.nameTag==='§eApollo’s Solar Bow' && api.role(player)==='apollo' && player.getDynamicProperty('olympus:flareArmed'))
    recentBowRelease.set(player.id,system.currentTick+5);
}
function tagCloseImpact(event) {
  if (assistedShots.has(event.projectile.id)) return;
  if (flareShots.has(event.projectile.id)) return;
  const owner=event.source || event.projectile.getComponent('minecraft:projectile')?.owner;
  if (owner && api.heldItem(owner)?.nameTag==='§6Apollo’s Prophetic Bow') return;
  if (owner?.typeId!=='minecraft:player' || api.role(owner)!=='apollo' || !owner.getDynamicProperty('olympus:flareArmed') ||
      (recentBowRelease.get(owner.id) || 0)<system.currentTick) return;
  flareShots.set(event.projectile.id,{ownerId:owner.id,projectile:event.projectile,expires:until(CONFIG.solarFlare.arrowTimeoutSeconds)});
  owner.setDynamicProperty('olympus:flareArmed',undefined);
  recentBowRelease.delete(owner.id);
}
function releaseFlare(id,record) {
  flareShots.delete(id);
  if (flareInFlight.get(record.ownerId) === id) flareInFlight.delete(record.ownerId);
}
function solarImpact(event,direct) {
  const id = event.projectile.id, record = flareShots.get(id);
  if (processedFlare.has(id)) return 'duplicate';
  if (!record) return false;
  releaseFlare(id,record);
  processedFlare.set(id,until(15));
  const owner = world.getAllPlayers().find(p => p.id === record.ownerId && api.role(p) === 'apollo');
  if (!owner || owner.dimension.id !== event.dimension.id) return 'flare';
  if (api.power && !api.power(owner).lit) return 'flare';
  const point = event.location;
  // A bright vertical sun shaft and two expanding rings make the impact readable at range.
  for (let i=0;i<48;i++) {
    const angle=i*Math.PI/12, r=i<24?1.2:CONFIG.solarFlare.radius;
    particle(event.dimension,{x:point.x+Math.cos(angle)*r,y:point.y+0.15+(i%3)*0.12,z:point.z+Math.sin(angle)*r},colors.player);
  }
  for (let i=0;i<18;i++) {
    const y=point.y+i*0.24;
    particle(event.dimension,{x:point.x,y,z:point.z},colors.player);
    if (i%3===0) for (const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2])
      particle(event.dimension,{x:point.x+Math.cos(angle)*0.35,y,z:point.z+Math.sin(angle)*0.35},colors.player);
  }
  sound(event.dimension,'random.explode',point);
  if (eligible(direct,owner)) try { direct.addEffect('blindness',CONFIG.solarFlare.blindnessSeconds*20,{amplifier:0,showParticles:false}); } catch {}
  for (const target of event.dimension.getEntities({location:point,maxDistance:CONFIG.solarFlare.radius})) {
    if (!eligible(target,owner)) continue;
    try {
      target.addEffect('blindness',CONFIG.solarFlare.blindnessSeconds*20,{amplifier:0,showParticles:false});
      // A direct hit already receives Apollo's normal scripted bow bonus in main.js.
      if (target.id !== direct?.id) target.applyDamage(CONFIG.solarFlare.areaDamage,{cause:EntityDamageCause.magic,damagingEntity:owner});
    } catch (e) { api.fail(e); }
  }
  api.startCooldown(owner,'apolloSolarFlare');
  api.tell(owner,'Solar Flare erupted.');
  return 'flare';
}
function hellfireImpact(event,target) {
  const record = hellfireShots.get(event.projectile.id);
  if (!record) return false;
  hellfireShots.delete(event.projectile.id);
  const owner = world.getAllPlayers().find(p => p.id === record.ownerId && api.role(p) === 'hades');
  const point = event.location;
  for (let i=0;i<12;i++) { const angle=i*Math.PI/6;
    flame(event.dimension,{x:point.x+Math.cos(angle)*0.5,y:point.y+0.25,z:point.z+Math.sin(angle)*0.5});
  }
  sound(event.dimension,'mob.ghast.fireball',point);
  // The projectile's native impact and explosion components deliver damage.
  // Do not add scripted damage here, even if Bedrock also reports a hit event.
  return true;
}
export function onDivineProjectileHitEntity(event) {
  if(event.projectile.typeId==='minecraft:arrow') {
    const owner=event.source||event.projectile.getComponent('minecraft:projectile')?.owner;
    const release=owner&&recentShotBows.get(owner.id);
    if(owner?.typeId==='minecraft:player' && api.role(owner)==='artemis' &&
       (moonShots.has(event.projectile.id)||(release?.name==='§aArtemis’s Moon Bow'&&system.currentTick-release.tick<=8))) {
      if(processedFlare.has(event.projectile.id))return 'duplicate';
      assistedShots.delete(event.projectile.id);
      moonShots.delete(event.projectile.id);processedFlare.set(event.projectile.id,until(15));
      const target=event.getEntityHit().entity;
      if(api.moonPower?.(owner).active && eligible(target,owner))target.applyDamage(10,{cause:EntityDamageCause.projectile,damagingEntity:owner});
      return 'moon';
    }
  }
  if (assistedShots.has(event.projectile.id)) {
    assistedShots.delete(event.projectile.id);
    processedFlare.set(event.projectile.id,until(15));
    return 'aim';
  }
  if (processedFlare.has(event.projectile.id)) return 'duplicate';
  if (event.projectile.typeId === FIREBALL && hellfireImpact(event,event.getEntityHit().entity)) return 'hellfire';
  if (event.projectile.typeId === 'minecraft:arrow') {
    tagCloseImpact(event);
    const kind=solarImpact(event,event.getEntityHit().entity);
    if (kind) return kind;
    if (solarShots.has(event.projectile.id)) { solarShots.delete(event.projectile.id); return 'solar'; }
    return '';
  }
  return '';
}
export function onDivineProjectileHitBlock(event) {
  moonShots.delete(event.projectile.id);
  if (assistedShots.has(event.projectile.id)) {
    assistedShots.delete(event.projectile.id);
    processedFlare.set(event.projectile.id,until(15));
  }
  solarShots.delete(event.projectile.id);
  if (event.projectile.typeId === FIREBALL) hellfireImpact(event,undefined);
  if (event.projectile.typeId === 'minecraft:arrow') { tagCloseImpact(event); solarImpact(event,undefined); }
}
export function hellfire(player) {
  if (api.role(player) !== 'hades') return;
  const p=player.location, fire=['minecraft:fire','minecraft:soul_fire','minecraft:lava','minecraft:flowing_lava'];
  let inside=player.isInLava===true;
  try {
    for (const y of [Math.floor(p.y),Math.floor(p.y+0.9)])
      if (fire.includes(player.dimension.getBlock({x:Math.floor(p.x),y,z:Math.floor(p.z)})?.typeId)) inside=true;
  } catch {}
  if (!inside) { api.tell(player,'Stand in fire or lava to unleash Hellfire.'); return; }
  if (!api.ready(player,'hadesHellfire','Hellfire')) return;
  const view=player.getViewDirection();
  const origin={x:p.x+view.x*1.2,y:p.y+1.5+view.y*0.5,z:p.z+view.z*1.2};
  let shot;
  try {
    shot=player.dimension.spawnEntity(FIREBALL,origin);
    const component=shot.getComponent('minecraft:projectile');
    if (!component) throw new Error('Hellfire projectile component unavailable');
    component.owner=player;
    component.shoot({x:view.x*CONFIG.hellfire.projectileSpeed,y:view.y*CONFIG.hellfire.projectileSpeed,z:view.z*CONFIG.hellfire.projectileSpeed});
    hellfireShots.set(shot.id,{ownerId:player.id,projectile:shot,expiry:system.currentTick+CONFIG.hellfire.lifetimeTicks});
  } catch (e) {
    try { shot?.remove(); } catch {}
    api.fail(e); api.tell(player,'Hellfire could not launch; cooldown was not used.'); return;
  }
  api.startCooldown(player,'hadesHellfire');
  sound(player.dimension,'mob.ghast.fireball',p);
  api.tell(player,'Hellfire launched.');
}
function category(entity) {
  if (entity.typeId === 'minecraft:player') return 'player';
  return ANIMALS.has(entity.typeId.replace('minecraft:','')) ? 'animal' : 'mob';
}
function bearing(origin,target) {
  const a=Math.atan2(target.z-origin.z,target.x-origin.x);
  return ['E','SE','S','SW','W','NW','N','NE'][Math.round(a/(Math.PI/4)+8)%8];
}
const compassColors={player:{red:0.2,green:0.85,blue:1},animal:colors.animal,mob:colors.mob,chest:{red:1,green:0.55,blue:0.08}};
function compassGround(player,point) {
  try {
    const hit=player.dimension.getBlockFromRay({x:point.x,y:point.y+2,z:point.z},{x:0,y:-1,z:0},
      {maxDistance:5,includeLiquidBlocks:true,includePassableBlocks:false});
    if(hit)return {x:point.x,y:hit.block.location.y+1.06,z:point.z};
  } catch {}
  return {...point,y:point.y+0.12};
}
function drawOracleCompass(player,targets,chests) {
  const origin=player.location;
  // World-space points stay anchored to the ground as the camera turns.
  for(let i=0;i<24;i++) {
    const angle=i*Math.PI/12;
    oracleParticle(player,compassGround(player,{x:origin.x+Math.cos(angle)*1.4,y:origin.y,z:origin.z+Math.sin(angle)*1.4}));
  }
  const groups={player:[],animal:[],mob:[],chest:chests.map(at=>({x:at.x+0.5,y:at.y,z:at.z+0.5}))};
  for(const target of targets)try{groups[category(target)].push(target.location);}catch{}
  for(const [kind,points] of Object.entries(groups)) {
    points.sort((a,b)=>distance(a,origin)-distance(b,origin));
    for(const [index,point] of points.slice(0,3).entries()) {
      const dx=point.x-origin.x,dz=point.z-origin.z,d=Math.hypot(dx,dz);
      if(d<0.2)continue;
      const ux=dx/d,uz=dz/d,color=compassColors[kind];
      for(const r of [1.65,1.9,2.15])oracleParticle(player,compassGround(player,{x:origin.x+ux*r,y:origin.y,z:origin.z+uz*r}),color);
      // One complete trail per kind keeps crowded areas readable and bounded.
      if(index===0)for(let r=3;r<d;r+=2.5) {
        const f=r/d;
        oracleParticle(player,compassGround(player,{x:origin.x+dx*f,y:origin.y+(point.y-origin.y)*f,z:origin.z+dz*f}),color);
      }
    }
  }
}
export function oracleSight(player) {
  if (api.role(player) !== 'apollo' || !api.ready(player,'apolloOracle','Oracle’s Sight')) return;
  if (api.power && !api.power(player).lit) { api.tell(player,'Oracle’s Sight needs light.'); return; }
  const found=player.dimension.getEntities({location:player.location,maxDistance:CONFIG.oracle.radius})
    .filter(e=>detectable(e,player));
  const counts={player:0,animal:0,mob:0};
  for (const entity of found) counts[category(entity)]++;
  const targets=found.sort((a,b)=>
      (a.typeId==='minecraft:player'?0:1)-(b.typeId==='minecraft:player'?0:1) ||
      distance(a.location,player.location)-distance(b.location,player.location)).slice(0,CONFIG.oracle.maxTargets);
  visions.set(player.id,{targets,counts,chests:[],scanner:scanChests(player.dimension,player.location,CONFIG.oracle.chestRadius),dimension:player.dimension.id,until:system.currentTick+CONFIG.oracle.durationSeconds*20});
  api.startCooldown(player,'apolloOracle');
  sound(player.dimension,'random.levelup',player.location);
  api.tell(player,`Oracle’s Sight: gold ground compass. Cyan = players, red = mobs, green = animals, orange = chests. Follow matching trails; they indicate direction, not a safe route. Creatures: ${CONFIG.oracle.radius}m; chest scan: ${CONFIG.oracle.chestRadius}m; ${CONFIG.oracle.durationSeconds}s.`);
  for(let i=0;i<16;i++) {
    const angle=i*Math.PI/8;
    oracleParticle(player,{x:player.location.x+Math.cos(angle)*0.8,y:player.location.y+1.5,z:player.location.z+Math.sin(angle)*0.8});
  }
  updateVision(player);
}
function creatureTrackable(entity,viewer) {
  if(!detectable(entity,viewer)||entity.typeId.startsWith('olympus:'))return false;
  const type=entity.typeId.replace('minecraft:','');
  return !['armor_stand','ender_crystal','boat','chest_boat'].includes(type) && !type.includes('minecart') && !type.endsWith('_boat') && !type.endsWith('_raft');
}
function syncArtemisVision(player) {
  if(api.role(player)!=='artemis'||player.getDynamicProperty('olympus:artemisTrackingOff')===true)return;
  const old=visions.get(player.id);
  if(old?.role==='artemis'&&old.dimension===player.dimension.id)return;
  visions.set(player.id,{role:'artemis',targets:[],counts:{player:0,animal:0,mob:0},chests:[],dimension:player.dimension.id,until:Infinity});
}
function updateVision(player) {
  const v=visions.get(player.id);
  if (!v) return;
  if (system.currentTick>=v.until || api.role(player)!==(v.role||'apollo') || player.dimension.id!==v.dimension || (v.role==='artemis' ? player.getDynamicProperty('olympus:artemisTrackingOff')===true : (api.power && !api.power(player).lit))) {
    visions.delete(player.id);
    player.onScreenDisplay.setActionBar('');
    return;
  }
  v.targets=player.dimension.getEntities({location:player.location,maxDistance:CONFIG.oracle.radius})
    .filter(e=>v.role==='artemis'?creatureTrackable(e,player):detectable(e,player))
    .sort((a,b)=>(a.typeId==='minecraft:player'?0:1)-(b.typeId==='minecraft:player'?0:1) ||
      distance(a.location,player.location)-distance(b.location,player.location)).slice(0,CONFIG.oracle.maxTargets);
  v.counts={player:0,animal:0,mob:0};
  for (const target of v.targets) v.counts[category(target)]++;
  const chests=v.role==='artemis'?[]:v.chests.filter(at=>{
    if (distance(at,player.location)>CONFIG.oracle.chestRadius) return false;
    try { return ['minecraft:chest','minecraft:trapped_chest','minecraft:ender_chest'].includes(player.dimension.getBlock(at)?.typeId); }
    catch { return false; }
  });
  const lines=[];
  let particleTargets=0;
  const showParticles=system.currentTick-(v.lastSparkTick ?? -100)>=3;
  for (const target of v.targets) {
    try {
      if (target.dimension.id!==v.dimension || distance(target.location,player.location)>CONFIG.oracle.radius) continue;
      const kind=category(target), color=kind==='player'?'§b':kind==='animal'?'§a':'§c';
      if (showParticles && particleTargets<12) {
        particleTargets++;
        const at=target.getHeadLocation?.() || {...target.location,y:target.location.y+1.5};
        for(let i=0;i<8;i++) {
          const angle=i*Math.PI/4;
          oracleParticle(player,{x:at.x+Math.cos(angle)*0.45,y:at.y+0.12,z:at.z+Math.sin(angle)*0.45},compassColors[kind]);
        }
      }
      const label=kind==='player'?target.name:target.typeId.replace('minecraft:','');
      if (lines.length<3) lines.push(`${color}${label} ${bearing(player.location,target.location)} ${Math.round(distance(target.location,player.location))}m`);
    } catch {}
  }
  if(showParticles) {
    v.lastSparkTick=system.currentTick;
    drawOracleCompass(player,v.targets,chests);
    for(const at of chests.slice(0,16))for(const x of [0.1,0.9])for(const z of [0.1,0.9])
      oracleParticle(player,{x:at.x+x,y:at.y+0.95,z:at.z+z},compassColors.chest);
  }
  if(chests.length && lines.length<3) {
    const nearest=[...chests].sort((a,b)=>distance(a,player.location)-distance(b,player.location))[0];
    lines.push(`§6chest ${bearing(player.location,nearest)} ${Math.round(distance(nearest,player.location))}m`);
  }
  const summary=`§bPlayers:${v.counts.player} §aAnimals:${v.counts.animal} §cMobs:${v.counts.mob}${v.role==='artemis'?'':` §6Chests:${chests.length}`}`;
  player.onScreenDisplay.setActionBar(lines.length ? `§6Oracle ${summary} §7| ${lines.join(' §7| ')}` : `§6Oracle ${summary} §7| no targets remain nearby`);
}
export function assistedArrowTick() {
  // Native arrows can report spawn before their owner is assigned. The release
  // snapshot and bounded rescans catch these arrows even after switching items.
  for(const [id,release] of recentShotBows) {
    if(system.currentTick-release.tick>8){recentShotBows.delete(id);continue;}
    const moon=release.name==='§aArtemis’s Moon Bow';
    if(!moon && release.name!=='§6Apollo’s Prophetic Bow')continue;
    const god=moon?'artemis':'apollo';
    const player=world.getAllPlayers().find(p=>p.id===id && api.role(p)===god);
    if(!player)continue;
    try {
      for(const arrow of player.dimension.getEntities({type:'minecraft:arrow',location:player.location,maxDistance:24})) {
        if(assistedShots.has(arrow.id)||solarShots.has(arrow.id)||flareShots.has(arrow.id))continue;
        if(arrow.getComponent('minecraft:projectile')?.owner?.id!==id)continue;
        const v=arrow.getVelocity();if(Math.hypot(v.x,v.y,v.z)<0.15)continue;
        assistedShots.set(arrow.id,{ownerId:id,god,projectile:arrow,expires:until(12)});
        if(moon)moonShots.set(arrow.id,until(12));
      }
    } catch {}
  }
  for (const [id,shot] of assistedShots) {
    const owner=world.getAllPlayers().find(p=>p.id===shot.ownerId && api.role(p)===(shot.god||'apollo'));
    if (!owner || shot.expires<=Date.now()) { try { shot.projectile.remove(); } catch {} assistedShots.delete(id); continue; }
    // Preserve shot identity while environmental powers are unavailable.
    // Moon arrows retain their existing damage path; Apollo aim arrows stay plain.
    if (shot.god==='artemis' ? !api.moonPower?.(owner).active : (api.power && !api.power(owner).lit)) continue;
    try {
      const projectile=shot.projectile, v=projectile.getVelocity(), speed=Math.hypot(v.x,v.y,v.z);
      if (speed<0.15) continue;
      let best, bestTarget, bestDot=CONFIG.apolloAimCone;
      const locked=shot.target;
      const candidates=locked ? [locked] : projectile.dimension.getEntities({location:projectile.location,maxDistance:32});
      for (const target of candidates) {
        if (!eligible(target,owner)) continue;
        if(target.dimension && target.dimension.id!==projectile.dimension.id)continue;
        const head=target.getHeadLocation?.() || {...target.location,y:target.location.y+1.5};
        const eye={...head,y:head.y-0.35};
        const dx=eye.x-projectile.location.x,dy=eye.y-projectile.location.y,dz=eye.z-projectile.location.z;
        const d=Math.hypot(dx,dy,dz); if (d<0.2 || d>40) continue;
        const dot=(dx*v.x+dy*v.y+dz*v.z)/(d*speed);
        if (dot<=(locked?0.1:bestDot)) continue;
        // Aim assist cannot select a target behind a solid wall.
        const obstruction=projectile.dimension.getBlockFromRay(projectile.location,{x:dx/d,y:dy/d,z:dz/d},{maxDistance:d,includeLiquidBlocks:false,includePassableBlocks:false});
        if (obstruction) continue;
        bestDot=dot; best={x:dx/d,y:dy/d,z:dz/d};bestTarget=target;
      }
      if (best) {
        shot.target=bestTarget;
        // A small turn each tick, normal speed, and a persistent target avoid
        // the old three-tick jumps and rapid switching between nearby mobs.
        const turn=CONFIG.apolloAimTurn;
        const nx=v.x/speed*(1-turn)+best.x*turn, ny=v.y/speed*(1-turn)+best.y*turn, nz=v.z/speed*(1-turn)+best.z*turn;
        const length=Math.hypot(nx,ny,nz);
        projectile.getComponent('minecraft:projectile').shoot({x:nx/length*speed,y:ny/length*speed,z:nz/length*speed});
        oracleParticle(owner,projectile.location);
        if(!shot.lockAnnounced) {
          shot.lockAnnounced=true;
          owner.onScreenDisplay?.setActionBar(`§6${shot.god==='artemis'?'Moon Bow':'Prophetic Bow'}: steering toward ${bestTarget.name || bestTarget.typeId.replace('minecraft:','')}`);
        }
      } else shot.target=undefined;
    } catch { assistedShots.delete(id); }
  }
}
export function divineTick() {
  for(const [id,expiry] of moonShots)if(expiry<=Date.now())moonShots.delete(id);
  for(const player of world.getAllPlayers())syncArtemisVision(player);
  for (const [id,expiry] of solarShots) if (expiry<=Date.now()) solarShots.delete(id);
  for (const [id,v] of visions) {
    if (system.currentTick>=v.until || !world.getAllPlayers().some(p=>p.id===id)) {
      const player=world.getAllPlayers().find(p=>p.id===id);
      try { player?.onScreenDisplay.setActionBar(''); } catch {}
      visions.delete(id); continue;
    }
    if (!v.scanner) continue;
    for (let i=0;i<CONFIG.oracle.scanBudget;i++) {
      const result=v.scanner.next();
      if (result.done || v.chests.length>=CONFIG.oracle.maxChests) { v.scanner=undefined; break; }
      if (result.value) v.chests.push(result.value);
    }
  }
  for (const [id,shot] of flareShots) {
    if (shot.expires<=Date.now()) { releaseFlare(id,shot); continue; }
    try {
      const at=shot.projectile.location, before=shot.last || at;
      for (let i=0;i<7;i++) {
        const f=i/6, p={x:before.x+(at.x-before.x)*f,y:before.y+(at.y-before.y)*f,z:before.z+(at.z-before.z)*f};
        particle(shot.projectile.dimension,p,colors.player);
      }
      shot.last=at;
    } catch { releaseFlare(id,shot); }
  }
  for (const [id,expiry] of processedFlare) if (expiry<=Date.now()) processedFlare.delete(id);
  for (const [id,expiry] of recentBowRelease) if (expiry<system.currentTick) recentBowRelease.delete(id);
  for (const [id,shot] of hellfireShots) {
    if (system.currentTick>=shot.expiry) { try { shot.projectile.remove(); } catch {} hellfireShots.delete(id); continue; }
    try { const p=shot.projectile.location;
      flame(shot.projectile.dimension,p);
      for (const [x,y,z] of [[0.2,0,0],[-0.2,0,0],[0,0.2,0],[0,0,-0.2]])
        flame(shot.projectile.dimension,{x:p.x+x,y:p.y+y,z:p.z+z});
    }
    catch { hellfireShots.delete(id); }
  }
  if (system.currentTick-lastVisionTick>=3) {
    lastVisionTick=system.currentTick;
    for (const player of world.getAllPlayers()) if (visions.has(player.id)) updateVision(player);
  }
}
