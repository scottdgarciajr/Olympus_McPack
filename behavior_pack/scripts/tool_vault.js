import { isPersonalGodTool, lockGodItem, serializeGodItem, restoreGodItem } from './god_items.js';
const VAULT='olympus:tool_vault', JOURNAL='olympus:tool_vault_transaction', TOKEN='olympus:tool_token';
const bagOf=player=>player.getComponent('minecraft:inventory')?.container;
export function vaultRecords(player) { try{return JSON.parse(player.getDynamicProperty(VAULT)||'[]');}catch{return [];} }
const save=(player,records)=>player.setDynamicProperty(VAULT,records.length?JSON.stringify(records):undefined);
const token=record=>record.properties[TOKEN];
function availableSlot(bag) { for(let slot=0;slot<bag.size;slot++)if(!bag.getItem(slot))return slot;return -1; }
function findToken(bag,id) { for(let slot=0;slot<bag.size;slot++)if(bag.getItem(slot)?.getDynamicProperty(TOKEN)===id)return slot;return -1; }

export function ownsToolAnywhere(player,item) {
  if(!isPersonalGodTool(item))return false;
  const matches=record=>record.type===item.typeId && record.name===item.nameTag;
  if(vaultRecords(player).some(matches))return true;
  try { if(JSON.parse(player.getDynamicProperty('olympus:pending_god_items')||'[]').some(matches))return true; } catch {}
  const bag=bagOf(player);
  if(bag)for(let slot=0;slot<bag.size;slot++) {
    const other=bag.getItem(slot);if(other?.typeId===item.typeId && other.nameTag===item.nameTag)return true;
  }
  const gear=player.getComponent('minecraft:equippable');
  for(const slot of ['Offhand','Mainhand']) {
    const other=gear?.getEquipment(slot);if(other?.typeId===item.typeId && other.nameTag===item.nameTag)return true;
  }
  return false;
}

// A persisted journal makes interruption recovery idempotent: a transaction is
// reconciled by the item's token, never by minting another named tool.
export function recoverVaultTransaction(player,ItemStack,EnchantmentTypes) {
  const raw=player.getDynamicProperty(JOURNAL);if(!raw)return;
  const transaction=JSON.parse(raw),record=transaction.record,bag=bagOf(player);if(!bag)return;
  let records=vaultRecords(player),slot=findToken(bag,token(record));
  const gear=player.getComponent('minecraft:equippable');
  const equipped=['Offhand','Mainhand'].find(name=>gear?.getEquipment(name)?.getDynamicProperty(TOKEN)===token(record));
  if(transaction.kind==='store') {
    if(slot>=0)bag.setItem(slot,undefined);
    else if(equipped)gear.setEquipment(equipped,undefined);
    if(!records.some(r=>token(r)===token(record)))records.push(record);
    save(player,records);
  } else {
    if(slot<0 && !equipped) {
      slot=availableSlot(bag);
      if(slot<0) {
        if(!records.some(r=>token(r)===token(record)))records.push(record);
        save(player,records);player.setDynamicProperty(JOURNAL,undefined);return;
      }
      bag.setItem(slot,restoreGodItem(record,player.name,ItemStack,EnchantmentTypes));
    }
    save(player,records.filter(r=>token(r)!==token(record)));
  }
  player.setDynamicProperty(JOURNAL,undefined);
}

export function storeTool(player,slot,ItemStack,EnchantmentTypes) {
  recoverVaultTransaction(player,ItemStack,EnchantmentTypes);
  const bag=bagOf(player),item=bag?.getItem(slot);
  if(!isPersonalGodTool(item))return 'not_tool';
  const owner=item.getDynamicProperty('olympus:bound_owner');
  if(owner && owner!==player.name)return 'not_owner';
  if(vaultRecords(player).some(r=>r.type===item.typeId && r.name===item.nameTag))return 'already_stored';
  lockGodItem(item,player.name);
  if(!item.getDynamicProperty(TOKEN)) {
    const serial=Number(player.getDynamicProperty('olympus:tool_serial')||0)+1;
    player.setDynamicProperty('olympus:tool_serial',serial);
    item.setDynamicProperty(TOKEN,`${player.name}:${serial}`);
    bag.setItem(slot,item);
  }
  player.setDynamicProperty(JOURNAL,JSON.stringify({kind:'store',record:serializeGodItem(item)}));
  recoverVaultTransaction(player,ItemStack,EnchantmentTypes);
  return 'stored';
}
export function withdrawTool(player,id,ItemStack,EnchantmentTypes) {
  recoverVaultTransaction(player,ItemStack,EnchantmentTypes);
  const record=vaultRecords(player).find(r=>token(r)===id);
  if(!record)return 'missing';
  const bag=bagOf(player);if(!bag || availableSlot(bag)<0)return 'full';
  player.setDynamicProperty(JOURNAL,JSON.stringify({kind:'withdraw',record}));
  recoverVaultTransaction(player,ItemStack,EnchantmentTypes);
  return 'withdrawn';
}
