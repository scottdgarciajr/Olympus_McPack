import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {UTILITY_RECIPES} from '../behavior_pack/scripts/forge_catalog.js';
import {CONFIG} from '../behavior_pack/scripts/config.js';
import {forgeRequirements,salvageNuggets,cartDriveVelocity,BUILDING_BLOCKS,CROPS} from '../behavior_pack/scripts/forge_rules.js';
import {isPersonalGodItem} from '../behavior_pack/scripts/god_items.js';

class Item {
  constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;this.props=new Map();this.lore=[];this.damage=0;this.max=384;this.enchants=[];}
  getDynamicProperty(id){return this.props.get(id);}
  setDynamicProperty(id,value){this.props.set(id,value);}
  setLore(value){this.lore=value;}
  getComponent(id){
    if(id==='minecraft:durability'){const item=this;return {get damage(){return item.damage;},set damage(v){item.damage=v;},maxDurability:item.max};}
    if(id==='minecraft:enchantable')return {getEnchantments:()=>this.enchants};
  }
  clone(){const item=new Item(this.typeId,this.amount);Object.assign(item,this);item.props=new Map(this.props);item.lore=[...this.lore];item.enchants=[...this.enchants];return item;}
}
function inventory(){
  const slots=Array(36);return {slots,container:{size:36,getItem:i=>slots[i]?.clone(),setItem:(i,item)=>{slots[i]=item?.clone();},addItem:item=>{const slot=slots.findIndex(value=>!value);if(slot<0)return item;slots[slot]=item.clone();}}};
}
function forgeRuntime(){
  const source=readFileSync(new URL('../behavior_pack/scripts/forge.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
  return new Function('world','ItemStack','CONFIG','UTILITY_RECIPES','forgeRequirements','isPersonalGodItem','useUtilityItem',source+'\nreturn {configureForge,combine,creativeForgeSamples};')
    ({getDynamicProperty:()=>undefined},Item,CONFIG,UTILITY_RECIPES,forgeRequirements,isPersonalGodItem,()=>{});
}
test('ten distinct utility recipes are cheaper at entry and costly at the top, with no personal-item locks',()=>{
  assert.equal(UTILITY_RECIPES.length,10);assert.equal(new Set(UTILITY_RECIPES.map(r=>r.output)).size,10);
  const helmet=CONFIG.combinations.lantern_helmet,cart=CONFIG.combinations.trackless_cart;
  assert.equal(helmet.xp,8);assert.ok(cart.xp>=40 && cart.netherite_ingot>=2 && cart.diamond>=20);
  for(const recipe of UTILITY_RECIPES){assert.ok(recipe.cost.xp>=8);assert.ok(recipe.cost.diamond>=2);assert.equal(isPersonalGodItem(new Item(recipe.output)),false);}
  assert.equal(BUILDING_BLOCKS.has('minecraft:chest'),false);assert.equal(BUILDING_BLOCKS.has('minecraft:tnt'),false);
  assert.equal(BUILDING_BLOCKS.has('minecraft:quartz_block'),true);
});
test('forge resource requirements include the consumed ingredient even when it is also a currency',()=>{
  assert.deepEqual(forgeRequirements({ingredient:'minecraft:diamond'},{diamond:2,xp:8,materials:{iron_ingot:4}}),{'minecraft:diamond':3,'minecraft:iron_ingot':4});
});
function forgePlayer(recipe) {
  const inv=inventory(),messages=[];inv.slots[0]=new Item(recipe.base);
  let slot=1;for(const [id,count] of Object.entries(forgeRequirements(recipe,CONFIG.combinations[recipe.id])))inv.slots[slot++]=new Item(id,count);
  const player={id:'smith',name:'Smith',selectedSlotIndex:0,level:80,location:{x:5,y:3,z:29},dimension:{id:'minecraft:overworld',playSound(){}},getComponent:()=>({container:inv.container}),sendMessage:m=>messages.push(m),addLevels(n){this.level+=n;}};
  return {...inv,player,messages};
}
test('real forge consumes every material and XP exactly once and refuses a second craft from the output',()=>{
  const recipe=UTILITY_RECIPES.find(r=>r.id==='lantern_helmet'),setup=forgePlayer(recipe),runtime=forgeRuntime();
  runtime.configureForge({role:()=> 'hephaestus',temple:()=>({x:0,y:0,z:0}),fail:e=>{throw e;}});
  runtime.combine(setup.player,recipe,0);assert.equal(setup.slots[0].typeId,recipe.output);assert.equal(setup.player.level,72);
  assert.equal(setup.slots.filter(Boolean).length,1);runtime.combine(setup.player,recipe,0);assert.equal(setup.player.level,72);
  assert.equal(setup.slots[0].lockMode,undefined,'forged output remains tradeable');
});
test('forge rejects missing special resources, non-Hephaestus and bound base tools without consumption',()=>{
  const recipe=UTILITY_RECIPES.find(r=>r.id==='builder_wand');
  for(const mode of ['missing','wrong-god','bound']) {
    const setup=forgePlayer(recipe),runtime=forgeRuntime();
    if(mode==='missing')setup.slots.find(item=>item?.typeId==='minecraft:redstone').amount=1;
    if(mode==='bound')setup.slots[0].setDynamicProperty('olympus:bound_owner','Smith');
    runtime.configureForge({role:()=>mode==='wrong-god'?'apollo':'hephaestus',temple:()=>({x:0,y:0,z:0}),fail:e=>{throw e;}});
    runtime.combine(setup.player,recipe,0);assert.equal(setup.slots[0].typeId,recipe.base);assert.equal(setup.player.level,80);
  }
});
test('forge rolls back item and XP debits if an XP operation fails after mutation',()=>{
  const recipe=UTILITY_RECIPES[0],setup=forgePlayer(recipe),runtime=forgeRuntime();let first=true;
  setup.player.addLevels=function(n){this.level+=n;if(first){first=false;throw Error('interrupted');}};
  runtime.configureForge({role:()=> 'hephaestus',temple:()=>({x:0,y:0,z:0}),fail(){}});
  runtime.combine(setup.player,recipe,0);assert.equal(setup.slots[0].typeId,recipe.base);assert.equal(setup.player.level,80);
  for(const [id,count] of Object.entries(forgeRequirements(recipe,recipe.cost)))assert.equal(setup.slots.filter(item=>item?.typeId===id).reduce((n,item)=>n+item.amount,0),count);
});
test('salvage never exceeds half remaining iron and rejects enchanted or god equipment',()=>{
  const item=new Item('minecraft:iron_chestplate');item.max=240;
  assert.equal(salvageNuggets(item),36);item.damage=120;assert.equal(salvageNuggets(item),18);
  item.enchants=[{}];assert.equal(salvageNuggets(item),0);item.enchants=[];item.setDynamicProperty('olympus:bound_owner','god');assert.equal(salvageNuggets(item),0);
  assert.equal(salvageNuggets(new Item('minecraft:diamond_pickaxe')),0);
});
test('trackless cart needs fuel, solid ground and water-free operation; diagonal speed is capped',()=>{
  assert.equal(cartDriveVelocity({x:0,y:1},{x:1,z:0},0,false,true),undefined);
  assert.equal(cartDriveVelocity({x:0,y:1},{x:1,z:0},1,true,true),undefined);
  assert.equal(cartDriveVelocity({x:0,y:1},{x:1,z:0},1,false,false),undefined);
  const diagonal=cartDriveVelocity({x:1,y:1},{x:1,z:0},1,false,true);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-0.32)<1e-9);
  assert.equal(Object.hasOwn(diagonal,'y'),false,'cart has no flying control');
});
function utilityRuntime(world,system,Form=class{}) {
  const source=readFileSync(new URL('../behavior_pack/scripts/forge_utilities.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
  return new Function('world','system','ItemStack','EquipmentSlot','BlockPermutation','MolangVariableMap','ActionFormData','UTILITY_RECIPES','BUILDING_BLOCKS','CROPS','salvageNuggets','cartDriveVelocity','hermesStepUp',source+'\nreturn {configureUtilityForge,useUtilityItem,utilityEquipmentTick,utilityCartTick,packUtilityCart};')
    (world,system,Item,{Head:'head'},{resolve:(id,states)=>({id,states})},class{setColorRGB(){}},Form,UTILITY_RECIPES,BUILDING_BLOCKS,CROPS,salvageNuggets,cartDriveVelocity,()=>false);
}
function utilityPlayer(id) {
  const inv=inventory(),properties=new Map(),blocks=new Map();
  const key=p=>`${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
  const block=p=>({location:{x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z)},get typeId(){return blocks.get(key(p))?.id||'minecraft:air';},get isAir(){return this.typeId==='minecraft:air';},get permutation(){return {getState:name=>blocks.get(key(p))?.states?.[name]};},setType:id=>blocks.set(key(p),{id}),setPermutation:value=>blocks.set(key(p),value)});
  const dimension={id:'minecraft:overworld',getBlock:block,getPlayers:()=>[],getBlockFromRay:()=>({face:'Up',block:block({x:0,y:0,z:0})}),spawnItem(){},runCommand:command=>{const parts=command.split(' ');blocks.set(`${parts[1]},${parts[2]},${parts[3]}`,{id:'minecraft:air'});}};
  const player={id,name:id,selectedSlotIndex:0,location:{x:10,y:1,z:10},dimension,inputInfo:{getMovementVector:()=>({x:0,y:1})},getHeadLocation:()=>({x:10.5,y:2.6,z:10.5}),getViewDirection:()=>({x:1,y:0,z:0}),getGameMode:()=> 'Survival',getDynamicProperty:k=>properties.get(k),setDynamicProperty:(k,v)=>properties.set(k,v),getComponent:()=>({container:inv.container}),onScreenDisplay:{setActionBar(){}},spawnParticle(){},sendMessage(){}};
  return {...inv,player,dimension,blocks,properties,block};
}
test('builder wand consumes exactly the blocks it places and never places forbidden blocks',()=>{
  const setup=utilityPlayer('builder'),runtime=utilityRuntime({}, {currentTick:100});runtime.configureUtilityForge({blocked:()=>false,fail:e=>{throw e;}});
  setup.slots[0]=new Item('olympus:forge_builder_wand');setup.slots[1]=new Item('minecraft:quartz_block',12);
  runtime.useUtilityItem(setup.player,setup.slots[0].typeId);assert.equal(setup.slots[1].amount,4);
  assert.equal([...setup.blocks.values()].filter(block=>block.id==='minecraft:quartz_block').length,8);assert.equal(setup.slots[0].damage,1);
});
test('planter consumes one carried seed per planted crop and never accelerates growth',()=>{
  const setup=utilityPlayer('planter'),runtime=utilityRuntime({}, {currentTick:100});runtime.configureUtilityForge({blocked:()=>false,fail:e=>{throw e;}});
  for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)setup.blocks.set(`${x},0,${z}`,{id:'minecraft:farmland'});
  setup.slots[0]=new Item('olympus:forge_planter');setup.slots[1]=new Item('minecraft:wheat_seeds',2);
  runtime.useUtilityItem(setup.player,setup.slots[0].typeId);assert.equal(setup.slots[1],undefined);
  const crops=[...setup.blocks.values()].filter(block=>block.id==='minecraft:wheat');assert.equal(crops.length,2);assert.ok(crops.every(block=>block.states.growth===0));
});
test('lantern consumes fuel for real emitted light, never grants vision or combat effects, and cleans up on unequip',()=>{
  const setup=utilityPlayer('lamp'),props=new Map(),gear=new Map([['head',new Item('olympus:forge_lantern_helmet')]]);
  setup.slots[1]=new Item('minecraft:coal');
  setup.player.getComponent=id=>id==='minecraft:equippable'?{getEquipment:slot=>gear.get(slot)?.clone(),setEquipment:(slot,item)=>gear.set(slot,item)}:{container:setup.container};
  setup.player.addEffect=()=>{throw Error('lantern must not grant divine status effects');};
  const world={getAllPlayers:()=>[setup.player],getDimension:()=>setup.dimension,getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v)};
  const runtime=utilityRuntime(world,{currentTick:100});runtime.configureUtilityForge({blocked:()=>false,fail:e=>{throw e;}});
  runtime.utilityEquipmentTick();assert.equal(setup.slots[1],undefined);assert.equal(gear.get('head').getDynamicProperty('olympus:lantern_fuel'),1795);
  assert.ok([...setup.blocks.values()].some(block=>block.id==='olympus:forge_lantern_light'));
  gear.clear();runtime.utilityEquipmentTick();assert.ok(![...setup.blocks.values()].some(block=>block.id==='olympus:forge_lantern_light'));
});
test('packing an empty cart returns one kit with exact fuel and health, never a second copy',()=>{
  const setup=utilityPlayer('packer'),props=new Map([['olympus:cart_fuel',321]]);let removed=0;
  setup.player.isSneaking=true;
  const cart={typeId:'olympus:trackless_cart',getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),getComponent:id=>id==='minecraft:rideable'?{getRiders:()=>[]}:{currentValue:13},remove:()=>removed++};
  const runtime=utilityRuntime({}, {currentTick:100});runtime.configureUtilityForge({blocked:()=>false,fail:e=>{throw e;}});
  runtime.packUtilityCart({player:setup.player,target:cart});runtime.packUtilityCart({player:setup.player,target:cart});
  assert.equal(removed,1);const kits=setup.slots.filter(item=>item?.typeId==='olympus:forge_trackless_cart');assert.equal(kits.length,1);
  assert.equal(kits[0].getDynamicProperty('olympus:cart_fuel'),321);assert.equal(kits[0].getDynamicProperty('olympus:cart_health'),13);
});

test('deploying a packed cart consumes the kit once and restores its health and fuel',()=>{
  const setup=utilityPlayer('driver'),props=new Map();let health;
  const cart={setDynamicProperty:(k,v)=>props.set(k,v),getComponent:()=>({setCurrentValue:v=>health=v}),remove(){throw Error('unexpected deployment rollback');}};
  setup.dimension.spawnEntity=(id)=>{assert.equal(id,'olympus:trackless_cart');return cart;};
  setup.slots[0]=new Item('olympus:forge_trackless_cart');setup.slots[0].setDynamicProperty('olympus:cart_fuel',321);setup.slots[0].setDynamicProperty('olympus:cart_health',13);
  const runtime=utilityRuntime({}, {currentTick:100});runtime.configureUtilityForge({blocked:()=>false,fail:e=>{throw e;}});
  runtime.useUtilityItem(setup.player,setup.slots[0].typeId);
  assert.equal(setup.slots[0],undefined);assert.equal(health,13);assert.equal(props.get('olympus:cart_fuel'),321);
});

test('actual cart driving consumes coal only on grounded movement and pauses fuel use while idle or wet',()=>{
  const setup=utilityPlayer('driver'),props=new Map();let input={x:0,y:0},impulses=0;
  setup.slots[1]=new Item('minecraft:coal',2);setup.player.typeId='minecraft:player';setup.player.inputInfo.getMovementVector=()=>input;
  const cart={isOnGround:true,isInWater:false,getComponent:()=>({getRiders:()=>[setup.player]}),getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),getVelocity:()=>({x:0,y:0,z:0}),applyImpulse:()=>impulses++};
  const world={getDimension:id=>({getEntities:()=>id==='overworld'?[cart]:[]})};
  const runtime=utilityRuntime(world,{currentTick:100});runtime.configureUtilityForge({blocked:()=>false,fail:e=>{throw e;}});
  runtime.utilityCartTick();assert.equal(setup.slots[1].amount,2);assert.equal(impulses,0);
  input={x:0,y:1};runtime.utilityCartTick();assert.equal(setup.slots[1].amount,1);assert.equal(props.get('olympus:cart_fuel'),899);
  cart.isInWater=true;runtime.utilityCartTick();cart.isInWater=false;cart.isOnGround=false;runtime.utilityCartTick();
  assert.equal(props.get('olympus:cart_fuel'),899);assert.equal(impulses,1);
});

test('harvest consumes replant seeds only for ripe unprotected crops',()=>{
  const setup=utilityPlayer('farmer');
  setup.dimension.getBlockFromRay=()=>({face:'Up',block:setup.block({x:0,y:1,z:0})});
  setup.slots[0]=new Item('olympus:forge_harvest_sickle');setup.slots[1]=new Item('minecraft:wheat_seeds',2);
  setup.blocks.set('0,1,0',{id:'minecraft:wheat',states:{growth:7}});
  setup.blocks.set('1,1,0',{id:'minecraft:wheat',states:{growth:6}});
  setup.blocks.set('-1,1,0',{id:'minecraft:wheat',states:{growth:7}});
  const runtime=utilityRuntime({}, {currentTick:100});runtime.configureUtilityForge({blocked:(_d,p)=>p.x===-1,fail:e=>{throw e;}});
  runtime.useUtilityItem(setup.player,setup.slots[0].typeId);
  assert.equal(setup.slots[1].amount,1);assert.equal(setup.blocks.get('0,1,0').states.growth,0);
  assert.equal(setup.blocks.get('1,1,0').states.growth,6);assert.equal(setup.blocks.get('-1,1,0').states.growth,7);
});
