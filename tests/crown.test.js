import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function crownHarness() {
  const path=new URL('../behavior_pack/scripts/crown.js',import.meta.url);
  const source=readFileSync(path,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=(const|function))/g,'');
  const props=new Map(),counts=new Map(),messages=[];
  const slots={Head:0,Offhand:1};
  class ItemStack {
    constructor(typeId,amount){this.typeId=typeId;this.amount=amount;this.props=new Map();}
    getDynamicProperty(k){return this.props.get(k);}
    setDynamicProperty(k,v){this.props.set(k,v);}
    setLore(lore){this.lore=lore;}
  }
  function player(id,god) {
    const gear=new Map(),bag=[];
    const inventory={size:20,getItem:i=>bag[i],setItem:(i,item)=>{bag[i]=item;},addItem:item=>{bag.push(item);return undefined;}};
    const equippable={getEquipment:slot=>gear.get(slot),setEquipment:(slot,item)=>gear.set(slot,item)};
    return {id,name:id,god,gear,bag,location:{x:16,y:2,z:16},dimension:{id:'minecraft:overworld',playSound(){}},
      getComponent:id=>id==='minecraft:inventory'?{container:inventory}:id==='minecraft:equippable'?equippable:undefined,
      sendMessage:message=>messages.push(message)};
  }
  const owner=player('owner','zeus'),recipient=player('recipient','hades');
  const world={getDynamicProperty:key=>props.get(key),setDynamicProperty:(key,value)=>props.set(key,value),
    getAllPlayers:()=>[owner,recipient],sendMessage:message=>messages.push(message)};
  const api={role:p=>p.god,temple:()=>({x:0,y:0,z:0}),offeringCount:(_p,id)=>counts.get(id)||0,
    takeOffering:(_p,id,n)=>{if ((counts.get(id)||0)<n) return false;counts.set(id,counts.get(id)-n);return true;},fail:error=>{throw error;}};
  const script=new Function('world','system','ItemStack','EquipmentSlot','WeatherType','MolangVariableMap','ActionFormData','activateDominion','dismissDominion','dominionState','dominionTick','CONFIG','dragonVictoriesAvailable',
    `${source}\nreturn {configureCrown,CROWN_OFFERINGS,duplicate};`);
  const crown=script(world,{},ItemStack,slots,{},class {},class {},()=>{},()=>{},()=>{},()=>{}, {}, (wins,used)=>wins-(used||0));
  crown.configureCrown(api);
  props.set('olympus:crown_state',JSON.stringify({crowns:[{serial:1,ownerId:owner.id,ownerName:owner.name,ownerGod:owner.god}]}));
  props.set('olympus:dragonVictories',1);
  for (const offering of crown.CROWN_OFFERINGS) counts.set(offering.id,1);
  counts.set('minecraft:dragon_egg',1);
  return {crown,world,owner,recipient,counts,messages,ItemStack,slots};
}

test('Only a current wearer can consent to a duplicate; their original Crown remains theirs',()=>{
  const h=crownHarness();
  h.crown.duplicate(h.owner,h.recipient);
  assert.equal(JSON.parse(h.world.getDynamicProperty('olympus:crown_state')).crowns.length,1);
  assert.equal(h.counts.get('minecraft:dragon_egg'),1);
  const original=new h.ItemStack('olympus:crown',1);
  original.setDynamicProperty('olympus:crownSerial',1);
  h.owner.gear.set(h.slots.Head,original);
  h.crown.duplicate(h.owner,h.recipient);
  const saved=JSON.parse(h.world.getDynamicProperty('olympus:crown_state'));
  assert.equal(saved.crowns.length,2);
  assert.equal(saved.crowns[0].ownerId,h.owner.id);
  assert.equal(saved.crowns[0].serial,1);
  assert.equal(saved.crowns[1].ownerId,h.recipient.id);
  assert.equal(saved.crowns[1].serial,2);
  assert.equal(h.owner.gear.get(h.slots.Head),original);
  assert.equal(h.recipient.gear.get(h.slots.Head).getDynamicProperty('olympus:crownSerial'),2);
  assert.equal(h.counts.get('minecraft:dragon_egg'),0);
  for (const offering of h.crown.CROWN_OFFERINGS) assert.equal(h.counts.get(offering.id),0);
  assert.equal(saved.dragonUses,1);
});
