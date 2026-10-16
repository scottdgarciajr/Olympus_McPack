// Explicit personal-item allowlist: forged products and ordinary resources are
// intentionally absent, so Hephaestus can still sell/store what he crafts.
const PERSONAL_IDS = new Set([
  ...['hermes','zeus','poseidon','hades','ares','apollo','hephaestus','dionysus','kratos'].map(god=>`olympus:${god}_relic`),
  'olympus:crown','olympus:crown_control'
]);
const TOOLS = new Map([
  ['§bPoseidon’s Tidecaller','minecraft:trident'],
  ['§eApollo’s Solar Bow','minecraft:bow'],
  ['§6Apollo’s Prophetic Bow','minecraft:bow'],
  ['§6Hephaestus’s Divine Fortune IV','minecraft:diamond_pickaxe']
]);
export function isPersonalGodItem(item) {
  if(!item)return false;
  if(PERSONAL_IDS.has(item.typeId) || TOOLS.get(item.nameTag)===item.typeId)return true;
  try { return typeof item.getDynamicProperty('olympus:bound_owner')==='string'; } catch { return false; }
}
export function isPersonalGodTool(item) { return !!item && TOOLS.get(item.nameTag)===item.typeId; }
export function lockGodItem(item, owner) {
  if(!isPersonalGodItem(item))return false;
  let changed=false;
  // 'inventory' is the stable ItemLockMode.inventory value. It keeps the item
  // movable within personal inventory/equipment while preventing giving/storing.
  if(item.lockMode!=='inventory'){item.lockMode='inventory';changed=true;}
  if(!item.keepOnDeath){item.keepOnDeath=true;changed=true;}
  if(owner)try {
    if(!item.getDynamicProperty('olympus:bound_owner')) {
      item.setDynamicProperty('olympus:bound_owner',owner);changed=true;
    }
  } catch {}
  return changed;
}

const PENDING='olympus:pending_god_items';
function pending(player) { try{return JSON.parse(player.getDynamicProperty(PENDING)||'[]');}catch{return [];} }
export function serializeGodItem(item) {
  return {type:item.typeId,amount:item.amount,name:item.nameTag,lore:item.getLore(),damage:item.getComponent('minecraft:durability')?.damage,
    properties:Object.fromEntries(item.getDynamicPropertyIds().map(id=>[id,item.getDynamicProperty(id)])),
    enchantments:(item.getComponent('minecraft:enchantable')?.getEnchantments()||[]).map(e=>({id:e.type.id,level:e.level}))};
}
export function restoreGodItem(record,owner,ItemStack,EnchantmentTypes) {
  const item=new ItemStack(record.type,record.amount);
  if(record.name)item.nameTag=record.name;
  item.setLore(record.lore);
  const durability=item.getComponent('minecraft:durability');
  if(durability && typeof record.damage==='number')durability.damage=record.damage;
  for(const [id,value] of Object.entries(record.properties))item.setDynamicProperty(id,value);
  const enchantable=item.getComponent('minecraft:enchantable');
  for(const enchantment of record.enchantments)enchantable.addEnchantment({type:EnchantmentTypes.get(enchantment.id),level:enchantment.level});
  lockGodItem(item,owner);
  return item;
}
export function queueGodItem(player,item) {
  const record=serializeGodItem(item);
  const records=pending(player);
  if(!records.some(existing=>JSON.stringify(existing)===JSON.stringify(record)))records.push(record);
  player.setDynamicProperty(PENDING,JSON.stringify(records));
  player.sendMessage('§6[Olympus] Inventory full: your personal god item is reserved for you. Free a slot and it will arrive automatically.');
}
export function deliverQueuedGodItems(player,ItemStack,EnchantmentTypes) {
  const records=pending(player);if(!records.length)return;
  const bag=player.getComponent('minecraft:inventory')?.container;if(!bag)return;
  const remaining=[];
  for(const record of records) {
    const item=restoreGodItem(record,player.name,ItemStack,EnchantmentTypes);
    if(bag.addItem(item))remaining.push(record);
  }
  if(remaining.length!==records.length)player.sendMessage('§6[Olympus] Your reserved personal god equipment was delivered. It cannot be given away or stored.');
  player.setDynamicProperty(PENDING,remaining.length?JSON.stringify(remaining):undefined);
}
