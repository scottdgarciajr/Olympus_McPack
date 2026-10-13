import { world, EquipmentSlot, EntityDamageCause } from '@minecraft/server';
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
const damageGuard = new Set();
let api;

export function configureForge(callbacks) { api = callbacks; }
export function forgeBlock(location) {
  const t = api.temple();
  return !!t && location.x === t.x+5 && location.y === t.y+3 && location.z === t.z+29;
}
function nearForge(player) {
  const t = api.temple(), p = player.location;
  return !!t && player.dimension.id === (t.dimension || 'minecraft:overworld') &&
    Math.abs(p.x-(t.x+5)) <= 6 && Math.abs(p.y-(t.y+3)) <= 5 && Math.abs(p.z-(t.z+29)) <= 6;
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
  const options = RECIPES.filter(recipe => held?.typeId === recipe.base && !held.getDynamicProperty(KEY));
  const form = new ActionFormData().title('§6DIVINE COMBINATION FORGE')
    .body(allowed ? `Hold the base item, and carry its second ingredient. The forge consumes both plus resources.\nHeld: ${held?.nameTag || held?.typeId || 'none'}` :
      'Only Hephaestus can combine equipment here. Finished items can be used, traded, dropped, and looted by anyone.');
  if (allowed) for (const recipe of options) form.button(`${recipe.name}\n+ ${recipe.ingredient.replace('minecraft:','')}`);
  form.button('Close').show(player).then(result => {
    if (!allowed || result.selection === undefined || result.selection >= options.length) return;
    preview(player,options[result.selection],player.selectedSlotIndex);
  }).catch(api.fail);
}
function preview(player,recipe,slot) {
  const cost = CONFIG.combinations[recipe.id];
  new ActionFormData().title(`§6${recipe.name}`)
    .body(`${recipe.base.replace('minecraft:','')} + ${recipe.ingredient.replace('minecraft:','')}\n${recipe.lore}\n\nAdditional cost: ${costText(cost)}\n\nThe base item's enchantments and durability are retained.`)
    .button('Combine items').button('Back').show(player).then(result => {
      if (result.selection === 0) combine(player,recipe,slot);
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
  const result = base.clone();
  result.setDynamicProperty(KEY,recipe.id);
  result.nameTag = `§6${recipe.name}`;
  result.setLore([...base.getLore(),`§6Divine Combination: ${recipe.name}`,`§7${recipe.lore}`]);
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
