import { world, system, EntityDamageCause, MolangVariableMap } from '@minecraft/server';
import { CONFIG } from './config.js';

const flareShots = new Map();
const processedFlare = new Map();
const flareInFlight = new Map();
const recentBowRelease = new Map();
const hellfireShots = new Map();
const visions = new Map();
let lastVisionTick = 0;
const ANIMALS = new Set(['cow','pig','sheep','chicken','horse','donkey','mule','rabbit','fox','wolf','cat','ocelot','bee','goat','llama','camel','panda','polar_bear','turtle','frog','axolotl','dolphin','squid','glow_squid','cod','salmon','tropical_fish']);
const colors = { player: {red:1,green:0.82,blue:0.18}, animal: {red:0.38,green:0.9,blue:0.35}, mob: {red:1,green:0.3,blue:0.18} };
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
function sound(dimension,id,location) { try { dimension.playSound(id,location); } catch {} }
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
  if (flareInFlight.has(player.id)) { api.tell(player,'Solar Flare arrow is still in flight.'); return; }
  if (!api.ready(player,'apolloSolarFlare','Solar Flare')) return;
  if (!player.getDynamicProperty('olympus:flareArmed')) {
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
      if (owner?.typeId !== 'minecraft:player' || api.role(owner) !== 'apollo' ||
          !owner.getDynamicProperty('olympus:flareArmed') || flareInFlight.has(owner.id) ||
          api.heldItem(owner)?.nameTag !== '§eApollo’s Solar Bow') return !!owner;
      flareShots.set(projectile.id,{ownerId:owner.id,expires:until(CONFIG.solarFlare.arrowTimeoutSeconds)});
      flareInFlight.set(owner.id,projectile.id);
      owner.setDynamicProperty('olympus:flareArmed',undefined);
      api.tell(owner,'Solar Flare arrow launched.');
      return true;
    } catch { return false; }
  };
  if (!tag()) for (const delay of [1,2,3]) system.runTimeout(tag,delay);
}
export function onDivineBowRelease(player,item) {
  if (item?.nameTag==='§eApollo’s Solar Bow' && api.role(player)==='apollo' && player.getDynamicProperty('olympus:flareArmed'))
    recentBowRelease.set(player.id,system.currentTick+5);
}
function tagCloseImpact(event) {
  if (flareShots.has(event.projectile.id)) return;
  const owner=event.source || event.projectile.getComponent('minecraft:projectile')?.owner;
  if (owner?.typeId!=='minecraft:player' || api.role(owner)!=='apollo' || !owner.getDynamicProperty('olympus:flareArmed') ||
      (recentBowRelease.get(owner.id) || 0)<system.currentTick) return;
  flareShots.set(event.projectile.id,{ownerId:owner.id,expires:until(CONFIG.solarFlare.arrowTimeoutSeconds)});
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
  const point = event.location;
  for (let i=0;i<18;i++) {
    const angle = i*2.39996, r = 0.3+(i%5)*0.5;
    particle(event.dimension,{x:point.x+Math.cos(angle)*r,y:point.y+0.15+(i%4)*0.24,z:point.z+Math.sin(angle)*r},colors.player);
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
  for (let i=0;i<8;i++) particle(event.dimension,{x:point.x+(i%3-1)*0.2,y:point.y+(i%4)*0.17,z:point.z+(i%5-2)*0.1},colors.mob);
  sound(event.dimension,'mob.ghast.fireball',point);
  if (owner && owner.dimension.id === event.dimension.id && eligible(target,owner))
    try {
      // Vanilla snowballs already deal 3 damage to blazes.
      const scripted=target.typeId==='minecraft:blaze' ? Math.max(0,CONFIG.hellfire.damage-3) : CONFIG.hellfire.damage;
      if (scripted) target.applyDamage(scripted,{cause:EntityDamageCause.projectile,damagingEntity:owner});
    } catch (e) { api.fail(e); }
  return true;
}
export function onDivineProjectileHitEntity(event) {
  if (event.projectile.typeId === 'minecraft:snowball' && hellfireImpact(event,event.getEntityHit().entity)) return 'hellfire';
  if (event.projectile.typeId === 'minecraft:arrow') { tagCloseImpact(event); return solarImpact(event,event.getEntityHit().entity) || ''; }
  return '';
}
export function onDivineProjectileHitBlock(event) {
  if (event.projectile.typeId === 'minecraft:snowball') hellfireImpact(event,undefined);
  if (event.projectile.typeId === 'minecraft:arrow') { tagCloseImpact(event); solarImpact(event,undefined); }
}
export function hellfire(player) {
  if (api.role(player) !== 'hades') return;
  const p=player.location, fire=['minecraft:fire','minecraft:soul_fire'];
  let inside=false;
  try {
    for (const y of [Math.floor(p.y),Math.floor(p.y+0.9)])
      if (fire.includes(player.dimension.getBlock({x:Math.floor(p.x),y,z:Math.floor(p.z)})?.typeId)) inside=true;
  } catch {}
  if (!inside) { api.tell(player,'Stand in fire to unleash Hellfire.'); return; }
  if (!api.ready(player,'hadesHellfire','Hellfire')) return;
  const view=player.getViewDirection();
  const origin={x:p.x+view.x*1.2,y:p.y+1.5+view.y*0.5,z:p.z+view.z*1.2};
  let shot;
  try {
    shot=player.dimension.spawnEntity('minecraft:snowball',origin);
    const component=shot.getComponent('minecraft:projectile');
    if (!component) throw new Error('Snowball projectile component unavailable');
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
export function oracleSight(player) {
  if (api.role(player) !== 'apollo' || !api.ready(player,'apolloOracle','Oracle’s Sight')) return;
  const found=player.dimension.getEntities({location:player.location,maxDistance:CONFIG.oracle.radius})
    .filter(e=>detectable(e,player));
  const counts={player:0,animal:0,mob:0};
  for (const entity of found) counts[category(entity)]++;
  const targets=found.sort((a,b)=>
      (a.typeId==='minecraft:player'?0:1)-(b.typeId==='minecraft:player'?0:1) ||
      distance(a.location,player.location)-distance(b.location,player.location)).slice(0,24);
  const players=counts.player;
  visions.set(player.id,{targets,counts,dimension:player.dimension.id,until:system.currentTick+CONFIG.oracle.durationSeconds*20});
  api.startCooldown(player,'apolloOracle');
  sound(player.dimension,'random.levelup',player.location);
  api.tell(player,players ? `Oracle’s Sight senses ${players} nearby player${players===1?'':'s'} for 8 seconds.` : 'Oracle’s Sight found no nearby players. Creatures may still appear.');
  updateVision(player);
}
function updateVision(player) {
  const v=visions.get(player.id);
  if (!v) return;
  if (system.currentTick>=v.until || api.role(player)!=='apollo' || player.dimension.id!==v.dimension) {
    visions.delete(player.id);
    player.onScreenDisplay.setActionBar('');
    return;
  }
  const lines=[];
  for (const target of v.targets) {
    try {
      if (target.dimension.id!==v.dimension || distance(target.location,player.location)>CONFIG.oracle.radius) continue;
      const kind=category(target), color=kind==='player'?'§e':kind==='animal'?'§a':'§c';
      const label=kind==='player'?target.name:target.typeId.replace('minecraft:','');
      lines.push(`${color}${label} ${bearing(player.location,target.location)} ${Math.ceil(distance(target.location,player.location)/10)*10}m`);
      if (lines.length>=3) break;
    } catch {}
  }
  const summary=`§eP:${v.counts.player} §aA:${v.counts.animal} §cM:${v.counts.mob}`;
  player.onScreenDisplay.setActionBar(lines.length ? `§6Oracle ${summary} §7| ${lines.join(' §7| ')}` : `§6Oracle ${summary} §7| no targets remain nearby`);
  particle(player.dimension,{x:player.location.x,y:player.location.y+2,z:player.location.z},colors.player);
}
export function divineTick() {
  for (const [id,shot] of flareShots) if (shot.expires<=Date.now()) releaseFlare(id,shot);
  for (const [id,expiry] of processedFlare) if (expiry<=Date.now()) processedFlare.delete(id);
  for (const [id,expiry] of recentBowRelease) if (expiry<system.currentTick) recentBowRelease.delete(id);
  for (const [id,shot] of hellfireShots) {
    if (system.currentTick>=shot.expiry) { try { shot.projectile.remove(); } catch {} hellfireShots.delete(id); continue; }
    try { particle(shot.projectile.dimension,shot.projectile.location,colors.mob); }
    catch { hellfireShots.delete(id); }
  }
  if (system.currentTick-lastVisionTick>=10) {
    lastVisionTick=system.currentTick;
    for (const player of world.getAllPlayers()) if (visions.has(player.id)) updateVision(player);
  }
}
