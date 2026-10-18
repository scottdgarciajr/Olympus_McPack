import {HEARTH_MATERIALS} from './hearth_builder.js';
import {isPersonalGodItem} from './god_items.js';

export const GOD_UTILITY_OPTIONS={
  hestia:[
    {id:'builder',menu:'World Builder: selection, clipboard, brushes, undo/redo'},
    {id:'foundation',menu:'Foundation: up to 3x3 floor (9 blocks)'},
    {id:'wall',menu:'Hearth Wall: up to 3x3 wall (9 blocks)'},
    {id:'stairs',menu:'Hearth Steps: up to 5 rising steps (5 blocks)'}
  ],
  athena:[
    {id:'unbreaking',label:'Unbreaking',cap:3,xp:6,lapis:3,menu:'Unbreaking +1 (max III) — 6 levels + 3 lapis'},
    {id:'efficiency',label:'Efficiency',cap:4,xp:8,lapis:4,menu:'Efficiency +1 (max IV) — 8 levels + 4 lapis'},
    {id:'protection',label:'Protection',cap:3,xp:10,lapis:6,menu:'Protection +1 (max III) — 10 levels + 6 lapis'},
    {id:'feather_falling',label:'Feather Falling',cap:4,xp:6,lapis:3,menu:'Feather Falling +1 (max IV) — 6 levels + 3 lapis'},
    {id:'sharpness',label:'Sharpness',cap:4,xp:12,lapis:8,menu:'Sharpness +1 (max IV) — 12 levels + 8 lapis'},
    {id:'power',label:'Power',cap:4,xp:12,lapis:8,menu:'Power +1 (max IV) — 12 levels + 8 lapis'},
    {id:'respiration',label:'Respiration',cap:3,xp:6,lapis:4,menu:'Respiration +1 (max III) — 6 levels + 4 lapis'},
    {id:'aqua_affinity',label:'Aqua Affinity',cap:1,xp:6,lapis:4,menu:'Aqua Affinity I — 6 levels + 4 lapis'},
    {id:'books',menu:'Combine/transfer an enchantment from a carried book'}
  ]
};

export function constructionOffsets(shape,view) {
  const forward=Math.abs(view.x)>Math.abs(view.z)?{x:Math.sign(view.x)||1,z:0}:{x:0,z:Math.sign(view.z)||1};
  const side={x:forward.z,z:-forward.x};
  if(shape==='wall')return [0,1,2].flatMap(y=>[0,-1,1].map(n=>[side.x*n,y,side.z*n]));
  if(shape==='stairs')return [0,1,2,3,4].map(n=>[forward.x*n,n,forward.z*n]);
  return [[0,0,0],[-1,0,-1],[0,0,-1],[1,0,-1],[-1,0,0],[1,0,0],[-1,0,1],[0,0,1],[1,0,1]];
}

const ENCHANTMENT_CONFLICTS=[['protection','fire_protection','blast_protection','projectile_protection'],['sharpness','smite','bane_of_arthropods'],['fortune','silk_touch'],['infinity','mending'],['multishot','piercing'],['density','breach']];
// Small, synchronous transactions: no timed jobs, terrain replacement or free XP.
export function useGodUtility(player,god,{ready,startCooldown,tell,blocked,enchantmentType,enchantmentTypes},choice) {
  const mode=String(player.getGameMode()).toLowerCase();
  if(mode==='adventure'||mode==='spectator') {tell(player,'This utility requires Survival or Creative mode.');return false;}
  const bag=player.getComponent('minecraft:inventory')?.container;
  if(!bag)return false;
  let slot=(player.selectedSlotIndex+1)%9,item=bag.getItem(slot);
  if(god==='hestia') {
    let preferred;try{preferred=JSON.parse(player.getDynamicProperty?.('olympus:hearth_palette')||'[]')[0];}catch{}
    if(preferred||!HEARTH_MATERIALS.has(item?.typeId)){let best=-1;for(let i=0;i<bag.size;i++){const candidate=bag.getItem(i);if(!HEARTH_MATERIALS.has(candidate?.typeId)||isPersonalGodItem(candidate)||(preferred&&candidate.typeId!==preferred))continue;if(candidate.amount>best){best=candidate.amount;slot=i;item=candidate;}}if(preferred&&best<0){tell(player,'Carry the building material chosen in your toolbox first.');return false;}}

    const option=GOD_UTILITY_OPTIONS.hestia.find(o=>o.id===(choice||'foundation'));if(!option||option.id==='builder')return false;
    if(!ready(player,'hestiaFoundation','Hearth Foundation'))return false;
    const hit=player.dimension.getBlockFromRay(player.getHeadLocation(),player.getViewDirection(),{maxDistance:6,includeLiquidBlocks:false});
    if(!hit||hit.face!=='Up'||!HEARTH_MATERIALS.has(item?.typeId)||isPersonalGodItem(item)) {
      tell(player,'Hearth Foundation: aim at the top of a block within 6m. Put building blocks in the next hotbar slot. Places up to a 3x3 floor, consuming one block per placement (size-scaled build cooldown).');return false;
    }
    const origin=hit.block.location,positions=[];
    // Keep construction bounded and consume every placed block.
    for(const [dx,dy,dz] of constructionOffsets(option.id,player.getViewDirection())) {
      if(positions.length>=item.amount)break;
      const at={x:origin.x+dx,y:origin.y+1+dy,z:origin.z+dz};
      if(blocked(player.dimension.id,at)||!player.dimension.getBlock(at)?.isAir) {if(option.id==='stairs')break;continue;}
      if(player.dimension.getEntities({location:{x:at.x+0.5,y:at.y+0.5,z:at.z+0.5},maxDistance:3}).some(entity=> {
        if(entity.typeId==='minecraft:item'||entity.typeId==='minecraft:xp_orb')return false;
        const p=entity.location;return Math.abs(p.x-at.x-0.5)<1 && Math.abs(p.z-at.z-0.5)<1 && p.y<at.y+1 && p.y+2>at.y;
      })) {if(option.id==='stairs')break;continue;}
      positions.push(at);
    }
    if(!positions.length){tell(player,'No empty, unprotected foundation space clear of creatures.');return false;}
    const placed=[];
    try {
      for(const at of positions){player.dimension.getBlock(at).setType(item.typeId);placed.push(at);}
      if(placed.length===item.amount)bag.setItem(slot,undefined);
      else {const remainder=item.clone();remainder.amount-=placed.length;bag.setItem(slot,remainder);}
    } catch(error) {
      for(const at of placed)player.dimension.getBlock(at).setType('minecraft:air');
      throw error;
    }
    startCooldown(player,'hestiaFoundation',placed.length);tell(player,`Hearth ${option.id}: placed ${placed.length} blocks from your inventory.`);return true;
  }
  if(god!=='athena')return false;
  const bookChoice=choice?.startsWith('book:')?choice.slice(5):undefined;
  const bookSlot=(player.selectedSlotIndex+2)%9,book=bookChoice?bag.getItem(bookSlot):undefined;
  let study=GOD_UTILITY_OPTIONS.athena.find(o=>o.id===(choice||'unbreaking'));
  if(!bookChoice&&(!study||study.id==='books'))return false;
  if(!ready(player,'athenaStudy','Scholarly Craft'))return false;
  if(!item||isPersonalGodItem(item)||item.typeId==='minecraft:trident') {
    tell(player,'Scholarly Craft: place ordinary enchantable gear in the next hotbar slot. Bound god equipment and tridents are excluded.');return false;
  }
  const enchantable=item.getComponent('minecraft:enchantable');
  let type,target,current;
  if(bookChoice) {
    if(book?.typeId!=='minecraft:enchanted_book'||isPersonalGodItem(book)) {tell(player,'Put an enchanted book in the second hotbar slot after the relic.');return false;}
    const source=book.getComponent('minecraft:enchantable')?.getEnchantments().find(e=>e.type.id.replace('minecraft:','')===bookChoice.replace('minecraft:',''));
    if(!source){tell(player,'That book no longer contains the chosen enchantment.');return false;}
    type=source.type;current=enchantable?.getEnchantment(type)?.level||0;
    target=current===source.level?Math.min(type.maxLevel,current+1):Math.max(current,source.level);
    if(source.level>type.maxLevel||target<=current){tell(player,'The book cannot improve that enchantment within its native cap.');return false;}
    study={id:type.id,label:type.id.replace('minecraft:',''),xp:12,lapis:8,cap:type.maxLevel};
  } else {
    type=enchantmentTypes?.get(study.id)||enchantmentType;
    current=enchantable?.getEnchantment('minecraft:'+study.id)?.level||0;target=current+1;
  }
  const enchantId=type?.id?.replace('minecraft:',''),conflict=ENCHANTMENT_CONFLICTS.find(group=>group.includes(enchantId)&&group.some(id=>id!==enchantId&&enchantable?.getEnchantment('minecraft:'+id)));
  if(conflict){tell(player,'That enchantment conflicts with an existing enchantment on the target. No costs spent.');return false;}
  if(!enchantable||current>=study.cap||!enchantable.canAddEnchantment({type,level:target})) {
    tell(player,`That gear cannot gain another ${study.label} level (maximum ${study.cap}).`);return false;
  }
  const p=player.location;let table=false;
  for(let x=-2;x<=2&&!table;x++)for(let y=-1;y<=1&&!table;y++)for(let z=-2;z<=2&&!table;z++) {
    try {table=player.dimension.getBlock({x:Math.floor(p.x)+x,y:Math.floor(p.y)+y,z:Math.floor(p.z)+z})?.typeId==='minecraft:enchanting_table';}catch{}
  }
  const lapis=[];let count=0;
  for(let i=0;i<bag.size;i++){const stack=bag.getItem(i);if(stack?.typeId==='minecraft:lapis_lazuli'){lapis.push([i,stack]);count+=stack.amount;}}
  if(!table||player.level<study.xp||count<study.lapis) {
    tell(player,`${study.label} study needs a nearby enchanting table (2 blocks), ${study.xp} XP levels and ${study.lapis} lapis per upgrade. Adds one level up to ${study.cap}; shared 3m cooldown.`);return false;
  }
  const upgraded=item.clone();upgraded.getComponent('minecraft:enchantable').addEnchantment({type,level:target});
  let debited=false;
  try {
    player.addLevels(-study.xp);debited=true;
    let remaining=study.lapis;
    for(const [index,stack] of lapis) {
      if(!remaining)break;
      const amount=Math.min(remaining,stack.amount);remaining-=amount;
      if(amount===stack.amount)bag.setItem(index,undefined);
      else {const rest=stack.clone();rest.amount-=amount;bag.setItem(index,rest);}
    }
    bag.setItem(slot,upgraded);
    if(bookChoice){if(book.amount===1)bag.setItem(bookSlot,undefined);else{const rest=book.clone();rest.amount--;bag.setItem(bookSlot,rest);}}
  } catch(error) {
    for(const [index,stack] of lapis)bag.setItem(index,stack);
    bag.setItem(slot,item);
    if(bookChoice)bag.setItem(bookSlot,book);
    if(debited)player.addLevels(study.xp);
    throw error;
  }
  startCooldown(player,'athenaStudy');tell(player,`Scholarly Craft: ${study.label} ${target}/${study.cap}. Consumed ${study.xp} XP levels and ${study.lapis} lapis; ${bookChoice?'the entire source book consumed; ':''}other target enchantments preserved.`);return true;
}
