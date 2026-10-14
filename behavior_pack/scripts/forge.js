import { world, system, EquipmentSlot, EntityDamageCause, ItemStack, MolangVariableMap } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { CONFIG } from './config.js';

const KEY = 'olympus:combination';
const MATERIALS = ['diamond', 'emerald', 'lapis_lazuli', 'netherite_ingot'];
const RECIPES = [
  { id: 'sword_pickaxe', name: 'Forgecleaver Sword-Pickaxe', base: 'minecraft:diamond_pickaxe', ingredient: 'minecraft:diamond_sword', output: 'olympus:forge_sword_pickaxe', lore: 'Mines stone and ore; 6 bonus attack damage. Use: a six-block ore pulse every 30 seconds.' },
  { id: 'fireball_pickaxe', name: 'Cinderbolt Pickaxe', base: 'minecraft:diamond_pickaxe', ingredient: 'minecraft:blaze_rod', output: 'olympus:forge_fireball_pickaxe', lore: 'Mines stone and ore. Use: a visible firebolt for 5 damage and 2 seconds of fire, every 15 seconds; never breaks blocks.' },
  { id: 'water_boots', name: 'Undertow Boots', base: 'minecraft:diamond_boots', ingredient: 'minecraft:heart_of_the_sea', output: 'olympus:forge_water_boots', lore: 'Wear: Dolphin’s Grace I in water. Sneak in water: short forward surge every 25 seconds.' },
  { id: 'magnet_axe', name: 'Magnetwood Axe', base: 'minecraft:diamond_axe', ingredient: 'minecraft:lodestone', output: 'olympus:forge_magnet_axe', lore: 'Cuts wood. Use: pull up to 12 nearby dropped items to you every 20 seconds.' }
];
function combinedItem(recipe) {
  const result=new ItemStack(recipe.output,1);
  result.nameTag=`§6${recipe.name}`;
  result.setLore([`§6Divine Forge creation`,`§7${recipe.lore}`,`§8Made by Hephaestus; usable by everyone.`]);
  return result;
}
export function creativeForgeSamples() {
  return RECIPES.map(combinedItem);
}
const damageGuard = new Set();
const fireShots = new Map();
const waterSneakLatch = new Set();
const recentUse = new Map();
let api;
const STATIONS = 'olympus:portableForges';
function stationKey(dimension,location) { return `${dimension}|${location.x},${location.y},${location.z}`; }
function stations() { try { return JSON.parse(world.getDynamicProperty(STATIONS) || '[]'); } catch { return []; } }
function saveStations(value) { world.setDynamicProperty(STATIONS,JSON.stringify(value)); }
export function isForge(dimension,location) {
  return (api.temple()?.dimension || 'minecraft:overworld') === dimension && forgeBlock(location) ||
    stations().includes(stationKey(dimension,location));
}
export function inHall(dimension,location) {
  const t=api.temple();
  return !!t && dimension === (t.dimension || 'minecraft:overworld') &&
    location.x>=t.x && location.x<t.x+33 && location.y>=t.y && location.y<t.y+15 &&
    location.z>=t.z && location.z<t.z+33;
}
export function removePortableForge(dimension,location) {
  const key=stationKey(dimension,location), all=stations();
  if (!all.includes(key)) return false;
  saveStations(all.filter(item=>item!==key));
  return true;
}
export function placePortableForge(event) {
  const player=event.source;
  if (api.role(player)!=='hephaestus') { player.sendMessage('§cOnly Hephaestus can place a Divine Forge.'); return; }
  const offset={Up:[0,1,0],Down:[0,-1,0],North:[0,0,-1],South:[0,0,1],East:[1,0,0],West:[-1,0,0]}[event.blockFace];
  if (!offset) return;
  const b=event.block.location, location={x:b.x+offset[0],y:b.y+offset[1],z:b.z+offset[2]};
  if (inHall(player.dimension.id,location)) { player.sendMessage('§cPlace portable forges outside the protected Hall.'); return; }
  const target=player.dimension.getBlock(location);
  if (!target?.isAir) { player.sendMessage('§cThe forge needs an empty block.'); return; }
  const container=bag(player), slot=player.selectedSlotIndex, held=container?.getItem(slot);
  if (held?.typeId!=='olympus:divine_forge') return;
  target.setType('minecraft:smithing_table');
  const all=stations(); all.push(stationKey(player.dimension.id,location)); saveStations(all);
  if (String(player.getGameMode()).toLowerCase()!=='creative') {
    if (held.amount===1) container.setItem(slot,undefined);
    else { held.amount--; container.setItem(slot,held); }
  }
  player.sendMessage('§6Divine Forge placed. Tap it to browse combinations.');
}

export function configureForge(callbacks) { api = callbacks; }
export function forgeBlock(location) {
  const t = api.temple();
  return !!t && location.x === t.x+5 && location.y === t.y+3 && location.z === t.z+29;
}
function nearForge(player) {
  const p=player.location;
  const t=api.temple();
  if (t && player.dimension.id===(t.dimension || 'minecraft:overworld') &&
      Math.abs(p.x-(t.x+5))<=6 && Math.abs(p.y-(t.y+3))<=5 && Math.abs(p.z-(t.z+29))<=6) return true;
  return stations().some(key=>{ const [dim,coords]=key.split('|'); const [x,y,z]=coords.split(',').map(Number);
    return dim===player.dimension.id && Math.abs(p.x-x)<=6 && Math.abs(p.y-y)<=5 && Math.abs(p.z-z)<=6 &&
      player.dimension.getBlock({x,y,z})?.typeId==='minecraft:smithing_table'; });
}
export function showForgeGuide(player) {
  const lines=RECIPES.map(recipe=>{
    const cost=CONFIG.combinations[recipe.id];
    return `§6${recipe.name}§r: ${recipe.base.replace('minecraft:','').replaceAll('_',' ')} + ${recipe.ingredient.replace('minecraft:','').replaceAll('_',' ')}\n§7${recipe.lore} Cost: ${costText(cost)}.`;
  });
  const form=new ActionFormData().title('§6HEPHAESTUS FORGE GUIDE')
    .body(`§eCraft a portable Divine Forge at a crafting table: 8 iron ingots around 1 crafting table (III / ICI / III). Place it on an empty block, then tap its smithing table. The Hall forge beside your altar also works.\n\nHold the plain diamond base item, carry the other item and all listed resources, select a recipe, then confirm. The forge consumes both source items and creates a unique tool. Source enchantments do not carry over. Only Hephaestus can forge; anyone may use or trade the result.\n\n${lines.join('\n\n')}`)
    .button('Close');
  form.show(player).catch(api.fail);
}
function bag(player) { return player.getComponent('minecraft:inventory')?.container; }
function amount(container,id) {
  let count = 0;
  for (let i=0; i<container.size; i++) if (container.getItem(i)?.typeId === id) count += container.getItem(i).amount;
  return count;
}
function ingredientSlot(container,id,skip) {
  for (let i=0; i<container.size; i++) if (i !== skip && container.getItem(i)?.typeId === id) return i;
  return -1;
}
function consume(container,id,count,skip=-1) {
  for (let i=0; i<container.size && count>0; i++) {
    if (i === skip) continue;
    const item = container.getItem(i);
    if (item?.typeId !== id) continue;
    const taken = Math.min(count,item.amount);
    if (taken === item.amount) container.setItem(i,undefined);
    else { item.amount -= taken; container.setItem(i,item); }
    count -= taken;
  }
  if (count) throw new Error(`Missing ${id}`);
}
function costText(cost) {
  return `${cost.xp} levels, ${cost.diamond} diamonds, ${cost.emerald} emeralds, ${cost.lapis_lazuli} lapis${cost.netherite_ingot ? `, ${cost.netherite_ingot} netherite` : ''}`;
}
export function showForge(player) {
  if (!nearForge(player)) return;
  const allowed = api.role(player) === 'hephaestus';
  const held = bag(player)?.getItem(player.selectedSlotIndex);
  const options = RECIPES;
  const form = new ActionFormData().title('§6DIVINE COMBINATION FORGE')
    .body(allowed ? `Select a recipe to see its ingredients and price. To forge it, hold the diamond base item and carry everything else.\nHeld: ${held?.nameTag || held?.typeId || 'none'}` :
      'Only Hephaestus can combine equipment. Select a recipe to see its ingredients and price; finished gear is usable by everyone.');
  for (const recipe of options) form.button(`${recipe.name}\n${recipe.base.replace('minecraft:','').replaceAll('_',' ')} + ${recipe.ingredient.replace('minecraft:','').replaceAll('_',' ')}`);
  form.button('Close').show(player).then(result => {
    if (result.selection === undefined || result.selection >= options.length) return;
    preview(player,options[result.selection],player.selectedSlotIndex);
  }).catch(api.fail);
}
function preview(player,recipe,slot) {
  const cost = CONFIG.combinations[recipe.id];
  new ActionFormData().title(`§6${recipe.name}`)
    .body(`${recipe.base.replace('minecraft:','').replaceAll('_',' ')} + ${recipe.ingredient.replace('minecraft:','').replaceAll('_',' ')}\n${recipe.lore}\n\nAdditional cost: ${costText(cost)}\n\nHold a fresh, unenchanted base item before confirming. Both inputs are consumed to make a distinct new item; their enchantments and durability do not transfer.`)
    .button(api.role(player)==='hephaestus'?'Combine items':'Only Hephaestus can combine').button('Back').show(player).then(result => {
      if (result.selection === 0 && api.role(player)==='hephaestus') combine(player,recipe,slot);
      if (result.selection === 1) showForge(player);
    }).catch(api.fail);
}
function combine(player,recipe,slot) {
  const container = bag(player), base = container?.getItem(slot), cost = CONFIG.combinations[recipe.id];
  const second = container && ingredientSlot(container,recipe.ingredient,slot);
  if (!nearForge(player) || api.role(player) !== 'hephaestus' || player.selectedSlotIndex !== slot ||
      !base || base.typeId !== recipe.base || base.getDynamicProperty(KEY) || base.getComponent('minecraft:durability')?.damage > 0 || base.getComponent('minecraft:enchantable')?.getEnchantments()?.length > 0 || second < 0 ||
      player.level < cost.xp || MATERIALS.some(id => amount(container,`minecraft:${id}`) < cost[id])) {
    player.sendMessage('§cCombination requirements changed or resources are insufficient.'); return;
  }
  const original = [];
  for (let i=0; i<container.size; i++) original.push(container.getItem(i));
  const result = combinedItem(recipe);
  try {
    consume(container,recipe.ingredient,1,slot);
    for (const id of MATERIALS) if (cost[id]) consume(container,`minecraft:${id}`,cost[id],slot);
    container.setItem(slot,result);
    player.addLevels(-cost.xp);
    player.sendMessage(`§6Forged ${recipe.name}. Its power and appearance remain with the item, even when traded.`);
    try { player.dimension.playSound('random.anvil_use',player.location); } catch {}
  } catch (error) {
    for (let i=0; i<container.size; i++) container.setItem(i,original[i]);
    api.fail(error);
    player.sendMessage('§cCombination failed; your items were restored.');
  }
}
export function onForgeHurt(event) {
  const attacker = event.damageSource?.damagingEntity, target = event.hurtEntity;
  if (attacker?.typeId !== 'minecraft:player' || event.damageSource.cause !== EntityDamageCause.entityAttack || damageGuard.has(target.id)) return;
  const item = bag(attacker)?.getItem(attacker.selectedSlotIndex);
  const id = item?.getDynamicProperty(KEY);
  if (id === 'ember_axe') {
    try { target.setOnFire(3,true); } catch {}
  } else if (id === 'sword_pickaxe') {
    damageGuard.add(target.id);
    try { target.applyDamage(1,{ cause: EntityDamageCause.magic, damagingEntity: attacker }); }
    finally { damageGuard.delete(target.id); }
  }
}
const powerKey = id => `olympus:forge_${id}_ready`;
function remaining(player,id) { return Math.max(0,Number(player.getDynamicProperty(powerKey(id)) || 0)-Date.now()); }
function powerReady(player,id) {
  const wait=remaining(player,id);
  if (wait) { player.sendMessage(`§e${Math.ceil(wait/1000)} seconds until this forge power is ready.`); return false; }
  return true;
}
function startPower(player,id,seconds) { player.setDynamicProperty(powerKey(id),Date.now()+seconds*1000); }
function spark(dimension,point,color) {
  try {
    const map=new MolangVariableMap(); map.setColorRGB('variable.color',color);
    dimension.spawnParticle('minecraft:colored_flame_particle',point,map);
  } catch (e) { if (CONFIG.debug) api.fail(e); }
}
function orePulse(player) {
  if (!powerReady(player,'ore')) return;
  const p=player.location, ores=[]; const radius=CONFIG.forgePowers.orePulseRadius;
  for (let x=-radius;x<=radius;x++) for (let y=-radius;y<=radius;y++) for (let z=-radius;z<=radius;z++) {
    if (x*x+y*y+z*z>radius*radius) continue;
    try {
      const block=player.dimension.getBlock({x:Math.floor(p.x)+x,y:Math.floor(p.y)+y,z:Math.floor(p.z)+z});
      if (block?.typeId.endsWith('_ore')) ores.push({point:block.center(),distance:Math.hypot(x,y,z)});
    } catch {}
  }
  ores.sort((a,b)=>a.distance-b.distance);
  for (const ore of ores.slice(0,4)) {
    for (let i=1;i<=10;i++) {
      const t=i/11;
      spark(player.dimension,{x:p.x+(ore.point.x-p.x)*t,y:p.y+1.3+(ore.point.y-p.y-1.3)*t,z:p.z+(ore.point.z-p.z)*t},{red:0.15,green:0.85,blue:1});
    }
  }
  player.dimension.playSound('random.levelup',p);
  player.sendMessage(ores.length ? `§bOre Pulse found ${ores.length} ore blocks within ${radius} blocks. Blue rays point to the four closest.` : `§bOre Pulse found no ore within ${radius} blocks.`);
  startPower(player,'ore',CONFIG.forgePowers.orePulseCooldownSeconds);
}
function firebolt(player) {
  if (!powerReady(player,'fire')) return;
  const direction=player.getViewDirection(), p=player.location;
  const origin={x:p.x+direction.x*1.2,y:p.y+1.5+direction.y*0.5,z:p.z+direction.z*1.2};
  let shot;
  try {
    shot=player.dimension.spawnEntity('olympus:forge_firebolt',origin);
    const projectile=shot.getComponent('minecraft:projectile');
    if (!projectile) throw new Error('Firebolt projectile component unavailable');
    projectile.owner=player;
    projectile.shoot({x:direction.x*1.45,y:direction.y*1.45,z:direction.z*1.45});
    fireShots.set(shot.id,{ownerId:player.id,projectile:shot,expiry:system.currentTick+40});
  } catch (e) {
    try { shot?.remove(); } catch {}
    api.fail(e); player.sendMessage('§cFirebolt could not launch; cooldown was not used.'); return;
  }
  startPower(player,'fire',CONFIG.forgePowers.fireboltCooldownSeconds);
  player.dimension.playSound('mob.ghast.fireball',p);
  player.sendMessage('§6Cinderbolt fired. It cannot ignite or break terrain.');
}
function magnet(player) {
  if (!powerReady(player,'magnet')) return;
  const items=player.dimension.getEntities({type:'minecraft:item',location:player.location,maxDistance:CONFIG.forgePowers.magnetRadius}).slice(0,CONFIG.forgePowers.magnetMaxItems);
  if (!items.length) { player.sendMessage('§eNo dropped items are close enough to gather.'); return; }
  for (const item of items) {
    try {
      spark(player.dimension,item.location,{red:0.35,green:1,blue:0.4});
      item.teleport({x:player.location.x,y:player.location.y+0.5,z:player.location.z},{dimension:player.dimension});
    } catch (e) { if (CONFIG.debug) api.fail(e); }
  }
  player.dimension.playSound('random.orb',player.location);
  player.sendMessage(`§aMagnetwood gathered ${items.length} dropped item stacks.`);
  startPower(player,'magnet',CONFIG.forgePowers.magnetCooldownSeconds);
}
export function useForgeItem(player,itemId) {
  if (!player || !['olympus:forge_sword_pickaxe','olympus:forge_fireball_pickaxe','olympus:forge_magnet_axe'].includes(itemId)) return;
  if (bag(player)?.getItem(player.selectedSlotIndex)?.typeId!==itemId) return;
  if (system.currentTick-(recentUse.get(player.id)||-100)<3) return;
  recentUse.set(player.id,system.currentTick);
  if (itemId==='olympus:forge_sword_pickaxe') orePulse(player);
  if (itemId==='olympus:forge_fireball_pickaxe') firebolt(player);
  if (itemId==='olympus:forge_magnet_axe') magnet(player);
}
function fireImpact(event,target) {
  const shot=fireShots.get(event.projectile.id);
  if (!shot) return false;
  fireShots.delete(event.projectile.id);
  const owner=world.getAllPlayers().find(p=>p.id===shot.ownerId);
  const p=event.location;
  for (let i=0;i<12;i++) {
    const angle=i*Math.PI/6;
    try { event.dimension.spawnParticle('minecraft:basic_flame_particle',{x:p.x+Math.cos(angle)*0.65,y:p.y+0.3,z:p.z+Math.sin(angle)*0.65}); } catch {}
  }
  event.dimension.playSound('mob.ghast.fireball',p);
  if (owner && owner.dimension.id===event.dimension.id && target?.id!==owner.id && target?.getComponent('minecraft:health') && (CONFIG.friendlyFire || target.typeId!=='minecraft:player')) {
    try {
      target.applyDamage(CONFIG.forgePowers.fireboltDamage,{cause:EntityDamageCause.projectile,damagingEntity:owner});
      target.setOnFire(CONFIG.forgePowers.fireboltIgniteSeconds,true);
    } catch (e) { api.fail(e); }
  }
  return true;
}
export function onForgeProjectileHitEntity(event) {
  if (event.projectile.typeId==='olympus:forge_firebolt') return fireImpact(event,event.getEntityHit().entity);
  return false;
}
export function onForgeProjectileHitBlock(event) {
  if (event.projectile.typeId==='olympus:forge_firebolt') fireImpact(event,undefined);
}
export function forgeProjectileTick() {
  for (const [id,shot] of fireShots) {
    if (system.currentTick>=shot.expiry) { try { shot.projectile.remove(); } catch {} fireShots.delete(id); continue; }
    try { shot.projectile.dimension.spawnParticle('minecraft:basic_flame_particle',shot.projectile.location); }
    catch { fireShots.delete(id); }
  }
}
export function forgeEquipmentTick() {
  for (const player of world.getAllPlayers()) {
    const gear = player.getComponent('minecraft:equippable');
    const boots = gear?.getEquipment(EquipmentSlot.Feet);
    const helm = gear?.getEquipment(EquipmentSlot.Head);
    if (boots?.getDynamicProperty(KEY) === 'tide_boots' && player.isInWater && !player.getEffect('dolphins_grace'))
      player.addEffect('dolphins_grace',30,{amplifier:0,showParticles:false});
    if (helm?.getDynamicProperty(KEY) === 'lantern_helm' && !player.getEffect('night_vision'))
      player.addEffect('night_vision',240,{amplifier:0,showParticles:false});
    const newBoots=boots?.typeId==='olympus:forge_water_boots';
    if (newBoots && player.isInWater && !player.getEffect('dolphins_grace'))
      player.addEffect('dolphins_grace',30,{amplifier:0,showParticles:false});
    const surge=newBoots && player.isInWater && player.isSneaking;
    if (!surge) { waterSneakLatch.delete(player.id); continue; }
    if (waterSneakLatch.has(player.id)) continue;
    waterSneakLatch.add(player.id);
    if (remaining(player,'water')) continue;
    const direction=player.getViewDirection();
    try {
      player.applyImpulse({x:direction.x*0.9,y:Math.max(0.12,direction.y*0.45),z:direction.z*0.9});
      for (let i=0;i<12;i++) { const angle=i*Math.PI/6;
        spark(player.dimension,{x:player.location.x+Math.cos(angle),y:player.location.y+0.3,z:player.location.z+Math.sin(angle)},{red:0.15,green:0.55,blue:1});
      }
      player.dimension.playSound('random.splash',player.location);
      player.sendMessage('§bUndertow surge! Sneak again in water after 25 seconds.');
      startPower(player,'water',CONFIG.forgePowers.waterSurgeCooldownSeconds);
    } catch (e) { api.fail(e); }
  }
}
