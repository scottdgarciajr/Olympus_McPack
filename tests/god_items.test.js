import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isPersonalGodItem,lockGodItem,queueGodItem,deliverQueuedGodItems} from '../behavior_pack/scripts/god_items.js';

class Item {
  constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;this.props=new Map();this.lore=[];}
  getDynamicProperty(id){return this.props.get(id);}
  setDynamicProperty(id,value){this.props.set(id,value);}
  getDynamicPropertyIds(){return [...this.props.keys()];}
  getComponent(){return undefined;}
  getLore(){return this.lore;}
  setLore(lore){this.lore=lore;}
}
test('all personal relics and god tools use inventory locks; forged products stay tradeable',()=>{
  for(const god of ['hermes','zeus','poseidon','hades','ares','apollo','hephaestus','dionysus','kratos']) {
    const relic=new Item(`olympus:${god}_relic`);assert.equal(lockGodItem(relic,'owner'),true);
    assert.equal(relic.lockMode,'inventory');assert.equal(relic.keepOnDeath,true);
    assert.equal(relic.getDynamicProperty('olympus:bound_owner'),'owner');
    assert.equal(lockGodItem(relic,'another'),false);assert.equal(relic.getDynamicProperty('olympus:bound_owner'),'owner');
  }
  const bow=new Item('minecraft:bow');bow.nameTag='§6Apollo’s Prophetic Bow';assert.equal(isPersonalGodItem(bow),true);
  for(const type of ['olympus:divine_forge','olympus:forge_sword_pickaxe','olympus:forge_fireball_pickaxe','olympus:forge_water_boots','olympus:forge_magnet_axe','minecraft:water_bucket']) {
    const product=new Item(type);assert.equal(lockGodItem(product,'owner'),false);assert.equal(product.lockMode,undefined);
  }
});
test('full inventory reserves locked god items persistently and delivers once when a slot opens',()=>{
  const props=new Map(),received=[];let full=true;
  const player={name:'owner',sendMessage(){},getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),
    getComponent:()=>({container:{addItem:item=>{if(full)return item;received.push(item);return undefined;}}})};
  const relic=new Item('olympus:poseidon_relic');relic.setLore(['v3.2.0']);lockGodItem(relic,'owner');
  queueGodItem(player,relic);queueGodItem(player,relic);
  assert.equal(JSON.parse(props.get('olympus:pending_god_items')).length,1);
  deliverQueuedGodItems(player,Item,{});assert.equal(received.length,0);
  full=false;deliverQueuedGodItems(player,Item,{});assert.equal(received.length,1);
  assert.equal(received[0].lockMode,'inventory');assert.equal(received[0].getDynamicProperty('olympus:bound_owner'),'owner');
  deliverQueuedGodItems(player,Item,{});assert.equal(received.length,1);
});
