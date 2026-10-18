import {test} from 'node:test';
import assert from 'node:assert/strict';
import {useGodUtility,GOD_UTILITY_OPTIONS,constructionOffsets} from '../behavior_pack/scripts/god_utilities.js';

function stack(typeId,amount=1,level=0,enchants) {
  const values={...(enchants||{})};if(level)values.unbreaking=level;
  return {typeId,amount,level,enchants:values,getDynamicProperty(){},clone(){return stack(this.typeId,this.amount,this.level,this.enchants);},getComponent(id){
    if(id!=='minecraft:enchantable'||!/(pickaxe|boots|chestplate|sword|bow|helmet|enchanted_book)$/.test(this.typeId))return;
    const item=this;
    const enchantId=id=>(typeof id==='string'?id:id.id).replace('minecraft:','');
    return {getEnchantment:id=>item.enchants[enchantId(id)]?{level:item.enchants[enchantId(id)]}:undefined,
      getEnchantments:()=>Object.entries(item.enchants).map(([id,level])=>({type:{id:'minecraft:'+id,maxLevel:{unbreaking:3,efficiency:5,protection:4,mending:1,fortune:3,sharpness:5}[id]||5},level})),
      canAddEnchantment:e=>e.type.id.replace('minecraft:','')==='unbreaking'||(e.type.id.replace('minecraft:','')==='efficiency'&&typeId.endsWith('pickaxe'))||(e.type.id.replace('minecraft:','')==='protection'&&/(boots|chestplate)$/.test(typeId))||(e.type.id.replace('minecraft:','')==='feather_falling'&&typeId.endsWith('boots'))||(e.type.id==='sharpness'&&typeId.endsWith('sword'))||(e.type.id==='power'&&typeId.endsWith('bow'))||(['respiration','aqua_affinity'].includes(e.type.id)&&typeId.endsWith('helmet'))||(['mending','fortune'].includes(e.type.id.replace('minecraft:',''))&&typeId.endsWith('pickaxe')),
      addEnchantment:e=>{item.enchants[e.type.id.replace('minecraft:','')]=e.level;if(e.type.id.replace('minecraft:','')==='unbreaking')item.level=e.level;}};
  }};
}
function scene() {
  const items=new Map(),blocks=new Map(),cooldowns=[],messages=[];let table=true,mode='survival',entities=[],denied=false,failAt,failWrite=false,failSlot;
  const key=p=>`${p.x},${p.y},${p.z}`;
  const bag={size:36,getItem:i=>items.get(i)?.clone(),setItem(i,item){if(failWrite||i===failSlot){failWrite=false;failSlot=undefined;throw Error('write rejected');}if(item)items.set(i,item);else items.delete(i);}};
  const player={id:'utility',selectedSlotIndex:0,level:12,location:{x:0,y:64,z:0},getGameMode:()=>mode,getHeadLocation:()=>({x:0,y:66,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),getComponent:()=>({container:bag}),addLevels(n){this.level+=n;},dimension:{id:'minecraft:overworld',
    getBlockFromRay:()=>({face:'Up',block:{location:{x:3,y:63,z:0}}}),getEntities:()=>entities,
    getBlock(p){const k=key(p);return {get typeId(){return table&&p.x===0&&p.y===63&&p.z===0?'minecraft:enchanting_table':blocks.get(k)||'minecraft:air';},get isAir(){return this.typeId==='minecraft:air';},setType(type){if(k===failAt)throw Error('placement rejected');blocks.set(k,type);}};}}};
  const hooks={ready:()=>!denied,startCooldown:(_p,id)=>cooldowns.push(id),tell:(_p,m)=>messages.push(m),blocked:(_d,p)=>p.x===4,enchantmentType:{id:'unbreaking'},enchantmentTypes:{get:id=>({id})}};
  return {player,items,blocks,cooldowns,messages,run:(god,choice)=>useGodUtility(player,god,hooks,choice),table:v=>table=v,mode:v=>mode=v,entities:v=>entities=v,deny:()=>denied=true,failPlacement:k=>failAt=k,failWrite:()=>failWrite=true,failSlot:i=>failSlot=i};
}
test('Hestia builds a bounded foundation from carried blocks, skips protected/occupied spaces and preserves terrain',()=>{
  const s=scene();s.items.set(1,stack('minecraft:stone',20));s.blocks.set('2,64,-1','minecraft:diamond_block');
  s.entities([{typeId:'minecraft:cow',location:{x:3.5,y:64,z:1.5}}]);
  assert.equal(s.run('hestia'),true);
  assert.equal(s.blocks.get('2,64,-1'),'minecraft:diamond_block');
  const count=[...s.blocks.values()].filter(t=>t==='minecraft:stone').length;
  assert.equal(count,4);assert.equal(s.items.get(1).amount,20-count);assert.deepEqual(s.cooldowns,['hestiaFoundation']);
  assert.equal(s.blocks.has('3,64,1'),false);assert.equal(s.blocks.has('4,64,0'),false);
});
test('Hestia cannot create free blocks or consume a relic; failed placement rolls back',()=>{
  const s=scene();assert.equal(s.run('hestia'),false);s.items.set(1,stack('olympus:hestia_relic'));assert.equal(s.run('hestia'),false);
  s.items.set(1,stack('minecraft:stone',2));s.failPlacement('2,64,-1');assert.throws(()=>s.run('hestia'),/placement rejected/);
  assert.equal(s.items.get(1).amount,2);assert.ok([...s.blocks.values()].every(t=>t==='minecraft:air'));assert.equal(s.cooldowns.length,0);
});
test('Hestia rolls back terrain if material debit fails; small stacks cap placement count',()=>{
  const s=scene();s.items.set(1,stack('minecraft:stone',2));s.failWrite();assert.throws(()=>s.run('hestia'),/write rejected/);
  assert.equal(s.items.get(1).amount,2);assert.ok([...s.blocks.values()].every(t=>t==='minecraft:air'));
  assert.equal(s.run('hestia'),true);assert.equal(s.items.has(1),false);assert.equal([...s.blocks.values()].filter(t=>t==='minecraft:stone').length,2);
});
test('Athena spends levels and lapis, upgrades only one Unbreaking level, caps at vanilla III',()=>{
  const s=scene();s.items.set(1,stack('minecraft:diamond_pickaxe'));s.items.set(2,stack('minecraft:lapis_lazuli',2));s.items.set(3,stack('minecraft:lapis_lazuli',5));
  assert.equal(s.run('athena'),true);assert.equal(s.player.level,6);assert.equal(s.items.get(1).level,1);assert.equal(s.items.has(2),false);assert.equal(s.items.get(3).amount,4);
  assert.deepEqual(s.cooldowns,['athenaStudy']);s.items.set(1,stack('minecraft:diamond_pickaxe',1,3));assert.equal(s.run('athena'),false);assert.equal(s.player.level,6);
});
test('Athena requires a table and full payment, never alters tridents',()=>{
  const s=scene();s.items.set(1,stack('minecraft:diamond_pickaxe'));s.items.set(2,stack('minecraft:lapis_lazuli',3));
  s.table(false);assert.equal(s.run('athena'),false);s.table(true);s.player.level=5;assert.equal(s.run('athena'),false);s.player.level=12;
  s.items.set(2,stack('minecraft:lapis_lazuli',2));assert.equal(s.run('athena'),false);
  s.items.set(1,stack('minecraft:trident'));assert.equal(s.run('athena'),false);assert.equal(s.player.level,12);assert.equal(s.cooldowns.length,0);
});
test('Athena refunds rejected inventory changes and both utilities respect cooldown/game-mode restrictions',()=>{
  const s=scene();s.items.set(1,stack('minecraft:diamond_pickaxe'));s.items.set(2,stack('minecraft:lapis_lazuli',3));s.failWrite();
  assert.throws(()=>s.run('athena'),/write rejected/);assert.equal(s.player.level,12);assert.equal(s.items.get(2).amount,3);assert.equal(s.items.get(1).level,0);
  s.deny();assert.equal(s.run('athena'),false);assert.equal(s.run('hestia'),false);assert.equal(s.cooldowns.length,0);
  const a=scene();a.mode('adventure');a.items.set(1,stack('minecraft:stone',9));assert.equal(a.run('hestia'),false);assert.equal(a.run('athena'),false);
});

for(const id of ['wall','stairs'])test(`Hestia ${id} places only a bounded shape, consumes exact materials and shares construction cooldown`,()=>{
  const s=scene();s.items.set(1,stack('minecraft:stone',20));assert.equal(s.run('hestia',id),true);
  const offsets=constructionOffsets(id,{x:1,z:0}),count=[...s.blocks.values()].filter(type=>type==='minecraft:stone').length;
  assert.ok(count>0&&count<=offsets.length);assert.equal(s.items.get(1).amount,20-count);assert.deepEqual(s.cooldowns,['hestiaFoundation']);
  assert.ok([...s.blocks.keys()].every(key=>{const [x,y,z]=key.split(',').map(Number);return offsets.some(([dx,dy,dz])=>x===3+dx&&y===64+dy&&z===dz);}));
});
test('stairs stop at the first obstruction, and neither construction option permits free or protected placement',()=>{
  const s=scene();s.items.set(1,stack('minecraft:stone',20));s.blocks.set('3,64,0','minecraft:diamond_block');
  assert.equal(s.run('hestia','stairs'),false);assert.equal(s.items.get(1).amount,20);assert.equal(s.cooldowns.length,0);
  assert.equal(s.run('hestia','unknown'),false);
  assert.equal(constructionOffsets('wall',{x:0,z:-1}).length,9);assert.equal(constructionOffsets('stairs',{x:0,z:-1}).length,5);
});
for(const [id,gear] of [['efficiency','diamond_pickaxe'],['protection','diamond_chestplate'],['feather_falling','diamond_boots']])test(`Athena ${id} respects vanilla compatibility, costs, cap and shared cooldown while preserving enchantments`,()=>{
  const spec=GOD_UTILITY_OPTIONS.athena.find(o=>o.id===id),s=scene();s.player.level=30;
  s.items.set(1,stack('minecraft:'+gear,1,1,{[id]:spec.cap-1}));s.items.set(2,stack('minecraft:lapis_lazuli',12));
  assert.equal(s.run('athena',id),true);assert.equal(s.items.get(1).enchants[id],spec.cap);assert.equal(s.items.get(1).enchants.unbreaking,1);
  assert.equal(s.player.level,30-spec.xp);assert.equal(s.items.get(2).amount,12-spec.lapis);assert.deepEqual(s.cooldowns,['athenaStudy']);
  assert.equal(s.run('athena',id),false);assert.equal(s.player.level,30-spec.xp);
});
test('Athena rejects incompatible upgrades, missing protection cost and unknown choices without debits',()=>{
  const s=scene();s.items.set(1,stack('minecraft:diamond_pickaxe'));s.items.set(2,stack('minecraft:lapis_lazuli',20));
  assert.equal(s.run('athena','protection'),false);assert.equal(s.run('athena','feather_falling'),false);assert.equal(s.run('athena','mending'),false);
  s.items.set(1,stack('minecraft:diamond_chestplate'));s.player.level=7;assert.equal(s.run('athena','protection'),false);
  s.player.level=12;s.items.set(2,stack('minecraft:lapis_lazuli',5));assert.equal(s.run('athena','protection'),false);
  assert.equal(s.player.level,12);assert.equal(s.items.get(2).amount,5);assert.equal(s.cooldowns.length,0);
});

test('Athena consumes an entire source book and exact XP/lapis to transfer or combine within native caps',()=>{
 for(const current of [0,2]) {
  const s=scene();s.player.level=30;s.items.set(1,stack('minecraft:diamond_pickaxe',1,1,{efficiency:current}));
  s.items.set(2,stack('minecraft:enchanted_book',1,0,{efficiency:2,fortune:1}));s.items.set(3,stack('minecraft:lapis_lazuli',10));
  assert.equal(s.run('athena','book:minecraft:efficiency'),true);assert.equal(s.items.has(2),false);assert.equal(s.items.get(1).enchants.efficiency,current?3:2);
  assert.equal(s.items.get(1).enchants.unbreaking,1);assert.equal(s.items.get(1).enchants.fortune,undefined,'other book enchantments do not create extra transfers');
  assert.equal(s.player.level,18);assert.equal(s.items.get(3).amount,2);assert.deepEqual(s.cooldowns,['athenaStudy']);
 }
});
test('bookbinding rejects absent, incompatible, conflicting and capped books without consuming anything',()=>{
 const s=scene();s.player.level=30;s.items.set(1,stack('minecraft:diamond_pickaxe',1,0,{silk_touch:1}));s.items.set(2,stack('minecraft:enchanted_book',1,0,{fortune:3}));s.items.set(3,stack('minecraft:lapis_lazuli',10));
 assert.equal(s.run('athena','book:minecraft:fortune'),false);assert.equal(s.items.has(2),true);assert.equal(s.player.level,30);
 s.items.set(1,stack('minecraft:diamond_pickaxe',1,0,{mending:1}));s.items.set(2,stack('minecraft:enchanted_book',1,0,{mending:1}));
 assert.equal(s.run('athena','book:minecraft:mending'),false);assert.equal(s.run('athena','book:minecraft:sharpness'),false);
 s.items.set(1,stack('minecraft:diamond_pickaxe'));assert.equal(s.run('athena','book:minecraft:mending'),true);assert.equal(s.items.get(1).enchants.mending,1);
});

test('bookbinding refunds XP, lapis, target and book when the source-book debit is rejected',()=>{
 const s=scene();s.player.level=30;s.items.set(1,stack('minecraft:diamond_pickaxe',1,1));s.items.set(2,stack('minecraft:enchanted_book',1,0,{efficiency:2}));s.items.set(3,stack('minecraft:lapis_lazuli',10));
 s.failSlot(2);assert.throws(()=>s.run('athena','book:minecraft:efficiency'),/write rejected/);
 assert.equal(s.player.level,30);assert.equal(s.items.get(1).enchants.efficiency,undefined);assert.equal(s.items.get(2).enchants.efficiency,2);assert.equal(s.items.get(3).amount,10);assert.equal(s.cooldowns.length,0);
});

for(const [id,gear] of [['sharpness','diamond_sword'],['power','bow'],['respiration','diamond_helmet'],['aqua_affinity','diamond_helmet']])test(`Athena workshop ${id} charges its recipe and never exceeds its stated cap`,()=>{
 const spec=GOD_UTILITY_OPTIONS.athena.find(o=>o.id===id),s=scene();s.player.level=30;s.items.set(1,stack('minecraft:'+gear,1,0,{[id]:spec.cap-1}));s.items.set(2,stack('minecraft:lapis_lazuli',20));
 assert.equal(s.run('athena',id),true);assert.equal(s.items.get(1).enchants[id],spec.cap);assert.equal(s.player.level,30-spec.xp);assert.equal(s.items.get(2).amount,20-spec.lapis);
 assert.equal(s.run('athena',id),false);assert.equal(s.player.level,30-spec.xp);
});

test('Hestia quick shapes honor chosen toolbox material from inventory and do not silently substitute missing resources',()=>{
 const s=scene();s.player.getDynamicProperty=()=>JSON.stringify(['minecraft:stone']);s.items.set(1,stack('minecraft:dirt',20));assert.equal(s.run('hestia'),false);assert.equal(s.items.get(1).amount,20);
 s.items.set(8,stack('minecraft:stone',20));assert.equal(s.run('hestia'),true);assert.equal(s.items.get(1).amount,20);assert.ok(s.items.get(8).amount<20);
});
