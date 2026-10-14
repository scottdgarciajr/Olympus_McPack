import { world, EquipmentSlot, EntityDamageCause, ItemStack } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { CONFIG } from './config.js';

const KEY = 'olympus:combination';
const MATERIALS = ['diamond', 'emerald', 'lapis_lazuli', 'netherite_ingot'];
const RECIPES = [
  { id: 'sword_pickaxe', name: 'Sword-Pickaxe', base: 'minecraft:diamond_pickaxe', ingredient: 'minecraft:diamond_sword', lore: 'Mines as a pickaxe; adds 1 melee damage.' },
  { id: 'ember_axe', name: 'Ember Axe', base: 'minecraft:diamond_axe', ingredient: 'minecraft:blaze_rod', lore: 'Ignites a struck target for 3 seconds.' },
  { id: 'tide_boots', name: 'Tide Boots', base: 'minecraft:diamond_boots', ingredient: 'minecraft:heart_of_the_sea', lore: 'Dolphin’s Grace I while in water.' },
  { id: 'lantern_helm', name: 'Lantern Helm', base: 'minecraft:diamond_helmet', ingredient: 'minecraft:lantern', lore: 'Night Vision while worn.' }
];
function combinedItem(base,recipe) {
  const result=base.clone();
  result.setDynamicProperty(KEY,recipe.id);
  result.nameTag=`§6${recipe.name}`;
  result.setLore([...base.getLore(),`§6Divine Combination: ${recipe.name}`,`§7${recipe.lore}`]);
  return result;
}
export function creativeForgeSamples() {
  return RECIPES.map(recipe=>combinedItem(new ItemStack(recipe.base,1),recipe));
}
const damageGuard = new Set();
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
    .body(`§eCraft a portable Divine Forge at a crafting table: 8 iron ingots around 1 crafting table (III / ICI / III). Place it on an empty block, then tap its smithing table. The Hall forge beside your altar also works.\n\nHold the base item, carry the other item and all listed resources, select a recipe, then confirm. Only Hephaestus can forge; anyone may use or trade the result. Each base item can be combined once.\n\n${lines.join('\n\n')}`)
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
    .body(`${recipe.base.replace('minecraft:','').replaceAll('_',' ')} + ${recipe.ingredient.replace('minecraft:','').replaceAll('_',' ')}\n${recipe.lore}\n\nAdditional cost: ${costText(cost)}\n\nHold the base item before confirming. Its enchantments and durability are retained.`)
    .button(api.role(player)==='hephaestus'?'Combine items':'Only Hephaestus can combine').button('Back').show(player).then(result => {
      if (result.selection === 0 && api.role(player)==='hephaestus') combine(player,recipe,slot);
      if (result.selection === 1) showForge(player);
    }).catch(api.fail);
}
function combine(player,recipe,slot) {
  const container = bag(player), base = container?.getItem(slot), cost = CONFIG.combinations[recipe.id];
  const second = container && ingredientSlot(container,recipe.ingredient,slot);
  if (!nearForge(player) || api.role(player) !== 'hephaestus' || player.selectedSlotIndex !== slot ||
      !base || base.typeId !== recipe.base || base.getDynamicProperty(KEY) || second < 0 ||
      player.level < cost.xp || MATERIALS.some(id => amount(container,`minecraft:${id}`) < cost[id])) {
    player.sendMessage('§cCombination requirements changed or resources are insufficient.'); return;
  }
  const original = [];
  for (let i=0; i<container.size; i++) original.push(container.getItem(i));
  const result = combinedItem(base,recipe);
  try {
    consume(container,recipe.ingredient,1,slot);
    for (const id of MATERIALS) if (cost[id]) consume(container,`minecraft:${id}`,cost[id],slot);
    container.setItem(slot,result);
    player.addLevels(-cost.xp);
    player.sendMessage(`§6Forged ${recipe.name}. Its power remains with the item.`);
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
export function forgeEquipmentTick() {
  for (const player of world.getAllPlayers()) {
    const gear = player.getComponent('minecraft:equippable');
    const boots = gear?.getEquipment(EquipmentSlot.Feet);
    const helm = gear?.getEquipment(EquipmentSlot.Head);
    if (boots?.getDynamicProperty(KEY) === 'tide_boots' && player.isInWater && !player.getEffect('dolphins_grace'))
      player.addEffect('dolphins_grace',30,{amplifier:0,showParticles:false});
    if (helm?.getDynamicProperty(KEY) === 'lantern_helm' && !player.getEffect('night_vision'))
      player.addEffect('night_vision',240,{amplifier:0,showParticles:false});
  }
}
