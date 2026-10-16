import assert from 'node:assert/strict';
import {test} from 'node:test';
import {storeTool,withdrawTool,vaultRecords,recoverVaultTransaction,ownsToolAnywhere} from '../behavior_pack/scripts/tool_vault.js';

class Item {
  constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;this.props=new Map();this.lore=[];this.durability={damage:0};this.enchantments=[];}
  getDynamicProperty(k){return this.props.get(k);}
  setDynamicProperty(k,v){this.props.set(k,v);}
  getDynamicPropertyIds(){return [...this.props.keys()];}
  getLore(){return this.lore;}
  setLore(value){this.lore=value;}
  getComponent(id){
    if(id==='minecraft:durability')return this.durability;
    if(id==='minecraft:enchantable')return {getEnchantments:()=>this.enchantments,addEnchantment:e=>this.enchantments.push(e)};
  }
}
const enchantments={get:id=>({id})};
function setup(){
  const props=new Map(),items=Array(2),equipment=new Map();
  const bag={size:2,getItem:i=>items[i],setItem:(i,v)=>{items[i]=v;}};
  const gear={getEquipment:k=>equipment.get(k),setEquipment:(k,v)=>equipment.set(k,v)};
  const player={name:'Apollo',getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),
    getComponent:id=>id==='minecraft:inventory'?{container:bag}:id==='minecraft:equippable'?gear:undefined};
  const bow=new Item('minecraft:bow');bow.nameTag='§6Apollo’s Prophetic Bow';bow.setLore(['exact saved lore']);
  bow.durability.damage=57;bow.enchantments=[{type:{id:'infinity'},level:1}];items[0]=bow;
  return {player,items,props,bow,equipment};
}
test('vault frees space, preserves durability/enchantments/ownership, and withdraws once',()=>{
  const {player,items,bow}=setup();
  assert.equal(storeTool(player,0,Item,enchantments),'stored');assert.equal(items[0],undefined);
  const [record]=vaultRecords(player);assert.ok(record);assert.equal(ownsToolAnywhere(player,bow),true);
  const id=record.properties['olympus:tool_token'];
  assert.equal(withdrawTool(player,id,Item,enchantments),'withdrawn');
  assert.equal(items[0].durability.damage,57);assert.deepEqual(items[0].enchantments,bow.enchantments);
  assert.deepEqual(items[0].getLore(),['exact saved lore']);assert.equal(items[0].lockMode,'inventory');
  assert.equal(items[0].getDynamicProperty('olympus:bound_owner'),'Apollo');
  assert.equal(withdrawTool(player,id,Item,enchantments),'missing');assert.equal(items[1],undefined);
});
test('vault cannot store someone else’s tool, ordinary resources, or withdraw into full inventory',()=>{
  const {player,items,bow}=setup();bow.setDynamicProperty('olympus:bound_owner','Poseidon');
  assert.equal(storeTool(player,0,Item,enchantments),'not_owner');
  bow.setDynamicProperty('olympus:bound_owner','Apollo');storeTool(player,0,Item,enchantments);
  const id=vaultRecords(player)[0].properties['olympus:tool_token'];
  items.fill(new Item('minecraft:stone'));assert.equal(storeTool(player,0,Item,enchantments),'not_tool');
  assert.equal(withdrawTool(player,id,Item,enchantments),'full');assert.equal(vaultRecords(player).length,1);
});
test('replaying interrupted store and withdrawal transactions cannot duplicate a token',()=>{
  const {player,items,props}=setup();storeTool(player,0,Item,enchantments);
  const record=vaultRecords(player)[0],id=record.properties['olympus:tool_token'];
  const withdrawal=JSON.stringify({kind:'withdraw',record});props.set('olympus:tool_vault_transaction',withdrawal);
  recoverVaultTransaction(player,Item,enchantments);assert.equal(vaultRecords(player).length,0);
  props.set('olympus:tool_vault_transaction',withdrawal);recoverVaultTransaction(player,Item,enchantments);
  assert.equal(items.filter(Boolean).length,1);assert.equal(items[0].getDynamicProperty('olympus:tool_token'),id);
  const storing=JSON.stringify({kind:'store',record});props.set('olympus:tool_vault_transaction',storing);
  recoverVaultTransaction(player,Item,enchantments);assert.equal(items.filter(Boolean).length,0);
  props.set('olympus:tool_vault_transaction',storing);recoverVaultTransaction(player,Item,enchantments);
  assert.equal(vaultRecords(player).length,1);
});
test('interrupted withdrawal recognizes a tool moved to offhand',()=>{
  const {player,items,props,equipment}=setup();storeTool(player,0,Item,enchantments);
  const record=vaultRecords(player)[0];withdrawTool(player,record.properties['olympus:tool_token'],Item,enchantments);
  equipment.set('Offhand',items[0]);items[0]=undefined;
  props.set('olympus:tool_vault_transaction',JSON.stringify({kind:'withdraw',record}));
  recoverVaultTransaction(player,Item,enchantments);assert.equal(items.filter(Boolean).length,0);
  assert.equal(vaultRecords(player).length,0);assert.equal(ownsToolAnywhere(player,equipment.get('Offhand')),true);
});
