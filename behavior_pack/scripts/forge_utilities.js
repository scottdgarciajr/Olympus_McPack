import {world,system,ItemStack,EquipmentSlot,BlockPermutation,MolangVariableMap} from '@minecraft/server';
import {ActionFormData} from '@minecraft/server-ui';
import {UTILITY_RECIPES} from './forge_catalog.js';
import {BUILDING_BLOCKS,CROPS,salvageNuggets,cartDriveVelocity} from './forge_rules.js';
import {hermesStepUp} from './hermes_step.js';
const items=new Map(UTILITY_RECIPES.map(recipe=>[recipe.output,recipe]));
const recent=new Map(),visuals=new Map(),emptyLantern=new Set();
const LIGHT='olympus:forge_lantern_light',LIGHTS='olympus:forge_lights';
let api={blocked:()=>false,fail:()=>{}};
export function configureUtilityForge(callbacks){api=callbacks;}
const bag=player=>player.getComponent('minecraft:inventory')?.container;
const tell=(player,text)=>player.sendMessage('§6[Divine Forge] '+text);
const nextSlot=player=>(player.selectedSlotIndex+1)%9;
function take(player,id,count=1) {
  const container=bag(player);let total=0;
  for(let i=0;i<container.size;i++)if(container.getItem(i)?.typeId===id)total+=container.getItem(i).amount;
  if(total<count)return false;
  for(let i=0;i<container.size && count;i++) {
    const item=container.getItem(i);if(item?.typeId!==id)continue;
    const n=Math.min(count,item.amount);count-=n;
    if(n===item.amount)container.setItem(i,undefined);else{item.amount-=n;container.setItem(i,item);}
  }
  return true;
}
function coal(player){return take(player,'minecraft:coal')||take(player,'minecraft:charcoal');}
function held(player,id){return bag(player)?.getItem(player.selectedSlotIndex)?.typeId===id;}
function wear(player,id) {
  const container=bag(player),item=container.getItem(player.selectedSlotIndex);if(item?.typeId!==id)return;
  const durability=item.getComponent('minecraft:durability');if(!durability)return;
  durability.damage++;
  if(durability.damage>=durability.maxDurability){container.setItem(player.selectedSlotIndex,undefined);tell(player,'Your utility tool wore out.');}
  else container.setItem(player.selectedSlotIndex,item);
}
function ready(player,id,seconds) {
  const key='olympus:utility_cd_'+id,until=Number(player.getDynamicProperty(key)||0);
  if(until>Date.now()){tell(player,`${Math.ceil((until-Date.now())/1000)} seconds until ready.`);return false;}
  return true;
}
function finish(player,recipe,seconds=3){player.setDynamicProperty('olympus:utility_cd_'+recipe.id,Date.now()+seconds*1000);wear(player,recipe.output);}
function target(player,passable=false){return player.dimension.getBlockFromRay(player.getHeadLocation(),player.getViewDirection(),{maxDistance:6,includeLiquidBlocks:false,includePassableBlocks:passable});}
function spark(player,at,color={red:0.9,green:0.7,blue:0.3}) {
  try{const tint=new MolangVariableMap();tint.setColorRGB('variable.color',color);player.spawnParticle('olympus:oracle_glimmer',at,tint);}catch{}
}
function bearing(a,b) {
  const angle=Math.atan2(b.z-a.z,b.x-a.x);
  return ['E','SE','S','SW','W','NW','N','NE'][Math.round(angle/(Math.PI/4)+8)%8];
}
function waypoint(player,item,recipe) {
  if(player.isSneaking){item.setDynamicProperty('olympus:waypoint',JSON.stringify({dimension:player.dimension.id,...player.location}));bag(player).setItem(player.selectedSlotIndex,item);tell(player,'Waypoint saved.');return;}
  const raw=item.getDynamicProperty('olympus:waypoint');if(!raw){tell(player,'Sneak-use to save a waypoint first.');return;}
  const point=JSON.parse(raw);if(point.dimension!==player.dimension.id){tell(player,'Your waypoint is in another dimension.');return;}
  const distance=Math.hypot(point.x-player.location.x,point.y-player.location.y,point.z-player.location.z);
  player.onScreenDisplay.setActionBar(`§bWayfinder: ${bearing(player.location,point)} ${Math.round(distance)}m | ${point.y>player.location.y+2?'above':point.y<player.location.y-2?'below':'same height'}`);
  finish(player,recipe,2);
}
function trail(player,item) {
  if(player.isSneaking) {
    const points=JSON.parse(item.getDynamicProperty('olympus:trail')||'[]').filter(point=>point.dimension===player.dimension.id);
    visuals.set(player.id,{dimension:player.dimension.id,until:system.currentTick+160,points:points.slice(-48).map(p=>({...p,y:p.y+0.15})),color:{red:0.7,green:0.3,blue:1}});
    tell(player,points.length?`Retracing ${points.length} saved breadcrumbs; newest markers are nearest your return route.`:'Use while standing to start recording a trail.');return;
  }
  const active=item.getDynamicProperty('olympus:trail_active')!==true;
  item.setDynamicProperty('olympus:trail_active',active);if(active)item.setDynamicProperty('olympus:trail','[]');
  bag(player).setItem(player.selectedSlotIndex,item);tell(player,active?'Recording a new trail while this spool is held. Sneak-use to display it.':'Trail recording stopped; sneak-use to retrace.');
}
function builder(player,recipe) {
  const container=bag(player),slot=nextSlot(player),material=container.getItem(slot),hit=target(player);
  if(!hit || !BUILDING_BLOCKS.has(material?.typeId)){tell(player,'Aim at a block and put ordinary building blocks in the next hotbar slot.');return;}
  const offset={Up:[0,1,0],Down:[0,-1,0],North:[0,0,-1],South:[0,0,1],East:[1,0,0],West:[-1,0,0]}[hit.face];if(!offset)return;
  const p=hit.block.location,view=player.getViewDirection();
  const row=Math.abs(view.x)>Math.abs(view.z)?{x:0,z:1}:{x:1,z:0};
  const positions=[];
  for(let i=0;i<Math.min(8,material.amount);i++) {
    const at={x:p.x+offset[0]+row.x*i,y:p.y+offset[1],z:p.z+offset[2]+row.z*i};
    if(api.blocked(player.dimension.id,at) || !player.dimension.getBlock(at)?.isAir)break;
    if(player.dimension.getPlayers({location:at,maxDistance:2}).some(other=>Math.abs(other.location.x-(at.x+0.5))<0.9 && Math.abs(other.location.z-(at.z+0.5))<0.9 && other.location.y<at.y+1 && other.location.y+1.8>at.y))break;
    positions.push(at);
  }
  if(!positions.length){tell(player,'No clear, unprotected placement space.');return;}
  const placed=[];
  try {
    for(const at of positions){player.dimension.getBlock(at).setPermutation(BlockPermutation.resolve(material.typeId));placed.push(at);}
    if(material.amount===placed.length)container.setItem(slot,undefined);else{material.amount-=placed.length;container.setItem(slot,material);}
  } catch(error){for(const at of placed)player.dimension.getBlock(at).setType('minecraft:air');throw error;}
  finish(player,recipe,3);tell(player,`Placed ${placed.length} blocks; each was consumed.`);
}
function plant(player,recipe) {
  const hit=target(player),container=bag(player),slot=nextSlot(player),seed=container.getItem(slot),crop=CROPS[seed?.typeId];
  if(!hit || !crop){tell(player,'Put seeds/carrots/potatoes in the next hotbar slot and aim at farmland.');return;}
  let count=0;const p=hit.block.location;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++) {
    if(count>=seed.amount)break;
    const at={x:p.x+dx,y:p.y+1,z:p.z+dz},floor={...at,y:at.y-1};
    if(api.blocked(player.dimension.id,at)||player.dimension.getBlock(floor)?.typeId!=='minecraft:farmland'||!player.dimension.getBlock(at)?.isAir)continue;
    // Consume before planting; undo the seed debit if the placement is rejected.
    const current=container.getItem(slot);if(!current || current.typeId!==seed.typeId)break;
    if(current.amount===1)container.setItem(slot,undefined);else{current.amount--;container.setItem(slot,current);}
    try{player.dimension.getBlock(at).setPermutation(BlockPermutation.resolve(crop.block,{growth:0}));count++;}
    catch(error){container.addItem(new ItemStack(seed.typeId,1));throw error;}
  }
  if(count){finish(player,recipe,5);tell(player,`Planted ${count}; seeds consumed, normal growth.`);}else tell(player,'No empty tilled farmland in this 3x3 area.');
}
function harvest(player,recipe) {
  const hit=target(player,true);if(!hit)return;
  const p=hit.block.location;let count=0;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++) {
    const at={x:p.x+dx,y:p.y,z:p.z+dz};if(api.blocked(player.dimension.id,at))continue;
    const block=player.dimension.getBlock(at),entry=Object.entries(CROPS).find(([_id,crop])=>crop.block===block?.typeId);
    if(!entry || Number(block.permutation.getState('growth'))<entry[1].max)continue;
    const [seed,crop]=entry,replant=take(player,seed);
    try {
      player.dimension.runCommand(`setblock ${at.x} ${at.y} ${at.z} air destroy`);
      if(!player.dimension.getBlock(at)?.isAir)throw Error('Harvest was rejected');
      if(replant)player.dimension.getBlock(at).setPermutation(BlockPermutation.resolve(crop.block,{growth:0}));
      count++;
    } catch(error){if(replant)bag(player).addItem(new ItemStack(seed,1));api.fail(error);}
  }
  if(count){finish(player,recipe,12);tell(player,`Harvested ${count} ripe crops with normal drops. Replanting consumed carried seed/crops.`);}else tell(player,'No ripe crops in this 3x3 area.');
}
function salvage(player,recipe) {
  const container=bag(player),options=[];const form=new ActionFormData().title('§6RECLAIMER SALVAGE').body('The chosen item is destroyed. Enchanted, forged and god-bound gear cannot be salvaged. At most half its remaining iron value is recovered.');
  for(let slot=0;slot<container.size;slot++){const item=container.getItem(slot),nuggets=salvageNuggets(item);if(!nuggets)continue;options.push({slot,type:item.typeId,damage:item.getComponent('minecraft:durability').damage,nuggets});form.button(`${item.nameTag||item.typeId.replace('minecraft:','')} → ${nuggets} iron nuggets`);}
  form.button('Cancel').show(player).then(result=>{
    const option=options[result.selection];if(!option || !held(player,recipe.output)||!ready(player,recipe.id))return;
    const current=container.getItem(option.slot);
    if(current?.typeId!==option.type || current.getComponent('minecraft:durability')?.damage!==option.damage || salvageNuggets(current)!==option.nuggets){tell(player,'That item changed; open the tool again.');return;}
    // The destroyed source slot is also the output slot, so a full inventory
    // cannot create an overflow duplicate or lose the recovered material.
    container.setItem(option.slot,new ItemStack('minecraft:iron_nugget',option.nuggets));finish(player,recipe,5);
    tell(player,`Salvaged ${option.nuggets} iron nuggets; the source item was consumed.`);
  }).catch(api.fail);
}
function thermal(player,recipe) {
  const p=player.location;let nearest,best=Infinity;
  for(let x=-8;x<=8;x++)for(let y=-8;y<=8;y++)for(let z=-8;z<=8;z++) {
    const distance=x*x+y*y+z*z;if(distance>64||distance>=best)continue;
    const at={x:Math.floor(p.x)+x,y:Math.floor(p.y)+y,z:Math.floor(p.z)+z};
    try{if(['minecraft:lava','minecraft:flowing_lava'].includes(player.dimension.getBlock(at)?.typeId)){best=distance;nearest=at;}}catch{}
  }
  if(nearest){tell(player,`Lava ${bearing(p,nearest)}, ${Math.round(Math.sqrt(best))}m, ${nearest.y>p.y?'above':'below/level'}.`);visuals.set(player.id,{dimension:player.dimension.id,until:system.currentTick+80,points:[{x:nearest.x+0.5,y:nearest.y+0.8,z:nearest.z+0.5}],color:{red:1,green:0.2,blue:0.05}});}else tell(player,'No loaded lava detected within eight blocks.');
  finish(player,recipe,15);
}
function level(player,item,recipe) {
  const widths=[5,9,13],current=Number(item.getDynamicProperty('olympus:level_width')||5);
  if(player.isSneaking){const next=widths[(widths.indexOf(current)+1)%widths.length];item.setDynamicProperty('olympus:level_width',next);bag(player).setItem(player.selectedSlotIndex,item);tell(player,`Footprint width: ${next}.`);return;}
  const hit=target(player);if(!hit)return;const p=hit.block.location,r=(current-1)/2,points=[];
  for(let i=-r;i<=r;i++)for(const [dx,dz] of [[i,-r],[i,r],[-r,i],[r,i],[i,0]])points.push({x:p.x+dx+0.5,y:p.y+1.08,z:p.z+dz+0.5});
  visuals.set(player.id,{dimension:player.dimension.id,until:system.currentTick+160,points,color:{red:0.2,green:0.9,blue:0.7}});finish(player,recipe,3);
}
function deployCart(player,item,recipe) {
  const hit=target(player);if(!hit || hit.face!=='Up'){tell(player,'Aim at clear ground within six blocks.');return;}
  const at={x:hit.block.location.x+0.5,y:hit.block.location.y+1.1,z:hit.block.location.z+0.5};
  if(api.blocked(player.dimension.id,at)||!player.dimension.getBlock(at)?.isAir||!player.dimension.getBlock({...at,y:at.y+1})?.isAir){tell(player,'The cart needs unprotected clear standing space.');return;}
  let cart;
  try {
    cart=player.dimension.spawnEntity('olympus:trackless_cart',at);cart.nameTag='§6Clockwork Trackless Cart';
    cart.setDynamicProperty('olympus:cart_fuel',Number(item.getDynamicProperty('olympus:cart_fuel')||0));
    const health=Number(item.getDynamicProperty('olympus:cart_health')||20);cart.getComponent('minecraft:health').setCurrentValue(Math.max(1,Math.min(20,health)));
    if(String(player.getGameMode()).toLowerCase()!=='creative')bag(player).setItem(player.selectedSlotIndex,undefined);
    player.setDynamicProperty('olympus:utility_cd_'+recipe.id,Date.now()+2000);
    tell(player,'Cart deployed. Ride and steer normally. Carry coal/charcoal; sneak-interact while empty to pack it.');
  } catch(error){try{cart?.remove();}catch{}throw error;}
}
export function packUtilityCart(event) {
  const player=event.player,cart=event.target;
  if(cart?.typeId!=='olympus:trackless_cart'||!player.isSneaking||cart.getDynamicProperty('olympus:packed'))return;
  if(cart.getComponent('minecraft:rideable')?.getRiders().length){tell(player,'Dismount and empty the cart before packing.');return;}
  const item=new ItemStack('olympus:forge_trackless_cart',1);item.nameTag='§6Clockwork Trackless Cart';
  item.setDynamicProperty('olympus:cart_fuel',Number(cart.getDynamicProperty('olympus:cart_fuel')||0));
  item.setDynamicProperty('olympus:cart_health',cart.getComponent('minecraft:health').currentValue);
  cart.setDynamicProperty('olympus:packed',true);
  try{cart.remove();}catch(error){try{cart.setDynamicProperty('olympus:packed',undefined);}catch{}throw error;}
  const left=bag(player).addItem(item);if(left)player.dimension.spawnItem(left,player.location);
  tell(player,'Cart packed once; remaining fuel and health retained.');
}
export function useUtilityItem(player,itemId) {
  const recipe=items.get(itemId);if(!recipe || recipe.id==='lantern_helmet'||!held(player,itemId))return;
  if(system.currentTick-(recent.get(player.id)??-100)<3)return;recent.set(player.id,system.currentTick);
  if(!ready(player,recipe.id))return;
  const item=bag(player).getItem(player.selectedSlotIndex);
  ({wayfinder:()=>waypoint(player,item,recipe),trail_spool:()=>trail(player,item),builder_wand:()=>builder(player,recipe),planter:()=>plant(player,recipe),harvest_sickle:()=>harvest(player,recipe),salvage_tool:()=>salvage(player,recipe),thermal_lens:()=>thermal(player,recipe),masons_level:()=>level(player,item,recipe),trackless_cart:()=>deployCart(player,item,recipe)})[recipe.id]?.();
}
export function utilityCartTick() {
  for(const id of ['overworld','nether','the_end'])for(const cart of world.getDimension(id).getEntities({type:'olympus:trackless_cart'}))try {
    const rider=cart.getComponent('minecraft:rideable')?.getRiders().find(r=>r.typeId==='minecraft:player');if(!rider)continue;
    const input=rider.inputInfo.getMovementVector();if(Math.hypot(input.x,input.y)<0.15 || cart.isInWater || !cart.isOnGround)continue;
    let fuel=Number(cart.getDynamicProperty('olympus:cart_fuel')||0);
    if(fuel<=0){if(!coal(rider)){if(system.currentTick%40===0)rider.onScreenDisplay.setActionBar('§6Cart needs coal or charcoal.');continue;}fuel=900;}
    const desired=cartDriveVelocity(input,rider.getViewDirection(),fuel,cart.isInWater,cart.isOnGround);if(!desired)continue;
    hermesStepUp(cart,desired);
    const v=cart.getVelocity();cart.applyImpulse({x:Math.max(-0.2,Math.min(0.2,desired.x-v.x)),y:0,z:Math.max(-0.2,Math.min(0.2,desired.z-v.z))});
    cart.setDynamicProperty('olympus:cart_fuel',fuel-1);
    if(system.currentTick%20===0)rider.onScreenDisplay.setActionBar(`§6Trackless Cart | fuel ${Math.ceil(fuel/20)}s | sneak to dismount`);
  }catch(error){api.fail(error);}
}
export function utilityEquipmentTick() {
  const now=Date.now(),wanted=new Map();
  let lights;try{lights=JSON.parse(world.getDynamicProperty(LIGHTS)||'[]');}catch{lights=[];}
  for(const player of world.getAllPlayers())try {
    const gear=player.getComponent('minecraft:equippable'),helmet=gear?.getEquipment(EquipmentSlot.Head);
    if(helmet?.typeId==='olympus:forge_lantern_helmet') {
      let fuel=Number(helmet.getDynamicProperty('olympus:lantern_fuel')||0);
      if(fuel<=0 && coal(player)){fuel=1800;emptyLantern.delete(player.id);}
      if(fuel>0){helmet.setDynamicProperty('olympus:lantern_fuel',Math.max(0,fuel-5));gear.setEquipment(EquipmentSlot.Head,helmet);
        if(!player.isInWater){const head=player.getHeadLocation(),at={dimension:player.dimension.id,x:Math.floor(head.x),y:Math.floor(head.y),z:Math.floor(head.z),until:now+1500};if(!api.blocked(at.dimension,at))wanted.set(`${at.dimension}:${at.x},${at.y},${at.z}`,at);}
      } else if(!emptyLantern.has(player.id)){tell(player,'Lantern Helmet needs coal or charcoal for its light.');emptyLantern.add(player.id);}
    } else emptyLantern.delete(player.id);
    const item=bag(player)?.getItem(player.selectedSlotIndex);
    if(item?.typeId==='olympus:forge_trail_spool' && item.getDynamicProperty('olympus:trail_active')===true) {
      const points=JSON.parse(item.getDynamicProperty('olympus:trail')||'[]'),last=points[points.length-1],at={dimension:player.dimension.id,...player.location};
      if(!last || last.dimension!==at.dimension || Math.hypot(last.x-at.x,last.y-at.y,last.z-at.z)>=4){points.push(at);item.setDynamicProperty('olympus:trail',JSON.stringify(points.slice(-48)));bag(player).setItem(player.selectedSlotIndex,item);spark(player,{...at,y:at.y+0.1},{red:0.7,green:0.3,blue:1});}
    }
    const visual=visuals.get(player.id);
    if(visual && visual.dimension===player.dimension.id && visual.until>system.currentTick)for(const at of visual.points)spark(player,at,visual.color);else visuals.delete(player.id);
  }catch(error){api.fail(error);}
  const kept=[];
  for(const light of lights) {
    const id=`${light.dimension}:${light.x},${light.y},${light.z}`;
    if(wanted.has(id)){kept.push(wanted.get(id));wanted.delete(id);continue;}
    try{const block=world.getDimension(light.dimension).getBlock(light);if(!block)throw Error('unloaded');if(block.typeId===LIGHT)block.setType('minecraft:air');}
    catch{kept.push(light);}
  }
  for(const at of wanted.values())try{const block=world.getDimension(at.dimension).getBlock(at);if(block?.isAir){block.setType(LIGHT);kept.push(at);}}catch{}
  const encoded=kept.length?JSON.stringify(kept):undefined;if(world.getDynamicProperty(LIGHTS)!==encoded)world.setDynamicProperty(LIGHTS,encoded);
}
