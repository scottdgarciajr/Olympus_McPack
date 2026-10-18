import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {HEARTH_TOOLS,hearthTool} from '../behavior_pack/scripts/hearth_tools.js';
import {isPersonalGodItem,isPersonalGodTool} from '../behavior_pack/scripts/god_items.js';
import assert from 'node:assert/strict';
import {HEARTH_LIMITS,selectionPoints,brushPoints,previewHearthEdit,commitHearthEdit,hearthCost,saveHearthEdit,hearthHistoryPlan,copyHearthSelection,transformHearthClipboard,showHearthBuilder,showHearthToolbox,useHearthTool,forgetHearthTool} from '../behavior_pack/scripts/hearth_builder.js';

class Stack {
  constructor(typeId,amount){this.typeId=typeId;this.amount=amount;}
  clone(){const item=new Stack(this.typeId,this.amount);item.owner=this.owner;return item;}
  getDynamicProperty(){return this.owner;}
  getLore(){return [];}
}
function scene() {
  const cells=new Map(),props=new Map(),items=new Map(),messages=[],forms=[];let protectedAt,failBlock,failInventory=false,allowed=true,entities=[],mode='survival';
  const key=p=>`${p.x},${p.y},${p.z}`;
  const bag={size:9,getItem:i=>items.get(i)?.clone(),setItem(i,item){if(failInventory){failInventory=false;throw Error('inventory rejected');}if(item)items.set(i,item);else items.delete(i);}};
  const player={id:'hestia',selectedSlotIndex:0,location:{x:0,y:64,z:0},getGameMode:()=>mode,
    getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),getComponent:()=>({container:bag}),getHeadLocation:()=>({x:0,y:65,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),
    dimension:{id:'minecraft:overworld',getEntities:()=>entities,getBlockFromRay:()=>({block:{location:{x:2,y:63,z:0}},face:'Up'}),getBlock(p){
      return {get typeId(){return cells.get(key(p))?.type||'minecraft:air';},get isAir(){return this.typeId==='minecraft:air';},get isWaterlogged(){return cells.get(key(p))?.states?.waterlogged===true;},
        get permutation(){return {getAllStates:()=>cells.get(key(p))?.states||{}};},setPermutation(state){if(key(p)===failBlock)throw Error('block rejected');cells.set(key(p),{type:state.type,states:{...state.states}});}};
    }}};
  class Form {
    constructor(){this.buttons=[];forms.push(this);}title(t){this.heading=t;return this;}body(t){this.text=t;return this;}button(t){this.buttons.push(t);return this;}
    show(){return new Promise(resolve=>{this.answer=selection=>resolve({selection,canceled:selection===undefined});});}
  }
  const api={ItemStack:Stack,resolve:(type,states)=>({type,states}),allowed:()=>allowed,blocked:(_dim,p)=>key(p)===protectedAt,
    tell:(_p,m)=>messages.push(m),fail:e=>messages.push(e.message),ready:()=>true,startCooldown:()=>messages.push('cooldown'),Form};
  forgetHearthTool(player.id);
  return {player,api,cells,props,items,messages,forms,block:(at,type,states={})=>cells.set(at,{type,states}),request:(x=2,type='minecraft:stone')=>({x,y:64,z:0,after:{type,states:{}}}),
    protect:at=>protectedAt=at,failBlock:at=>failBlock=at,failInventory:()=>failInventory=true,allowed:v=>allowed=v,entities:v=>entities=v,mode:v=>mode=v};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('selection and brushes have hard work bounds, including the largest sphere/cube',()=>{
  assert.equal(selectionPoints({x:0,y:0,z:0},{x:3,y:3,z:7}).points.length,128);
  assert.throws(()=>selectionPoints({x:0,y:0,z:0},{x:4,y:4,z:5}),/128/);
  assert.equal(brushPoints({x:0,y:0,z:0},3).length,123);
  assert.equal(brushPoints({x:0,y:0,z:0},3,'cube').length,125);assert.equal(HEARTH_LIMITS.history,24);
});
test('copy/paste spends one block for each new position and cannot mint copied material',()=>{
  const s=scene();s.block('2,64,0','minecraft:stone');s.props.set('olympus:hearth_selection',JSON.stringify({dimension:'minecraft:overworld',a:{x:2,y:64,z:0},b:{x:2,y:64,z:0}}));
  const clip=copyHearthSelection(s.player,s.api);assert.equal(clip.blocks[0].type,'minecraft:stone');
  const request=[s.request(3,clip.blocks[0].type)];assert.throws(()=>previewHearthEdit(s.player,request,s.api),/Need 1/);
  s.items.set(1,new Stack('minecraft:stone',2));const plan=previewHearthEdit(s.player,request,s.api);assert.match(hearthCost(s.player,plan,s.api),/Spend: 1 stone/);
  commitHearthEdit(s.player,plan,s.api);assert.equal(s.items.get(1).amount,1);assert.equal(s.cells.get('3,64,0').type,'minecraft:stone');assert.equal(s.cells.get('2,64,0').type,'minecraft:stone');
});
test('replacement, cut, undo and redo conserve resources and persist history across wrappers',()=>{
  const s=scene();s.block('2,64,0','minecraft:stone');s.items.set(1,new Stack('minecraft:dirt',2));
  const plan=previewHearthEdit(s.player,[s.request(2,'minecraft:dirt')],s.api);commitHearthEdit(s.player,plan,s.api,p=>saveHearthEdit(s.player,p));
  assert.equal(s.items.get(1).amount,1);assert.equal([...s.items.values()].find(i=>i.typeId==='minecraft:stone').amount,1);
  let action=hearthHistoryPlan({...s.player});commitHearthEdit(s.player,action.plan,s.api,action.finish);assert.equal(s.cells.get('2,64,0').type,'minecraft:stone');assert.equal(s.items.get(1).amount,2);
  action=hearthHistoryPlan(s.player,true);commitHearthEdit(s.player,action.plan,s.api,action.finish);assert.equal(s.cells.get('2,64,0').type,'minecraft:dirt');
  const cut=previewHearthEdit(s.player,[s.request(2,'minecraft:air')],s.api);commitHearthEdit(s.player,cut,s.api,p=>saveHearthEdit(s.player,p));
  assert.equal(s.items.get(1).amount,2);assert.equal(s.cells.get('2,64,0').type,'minecraft:air');assert.throws(()=>hearthHistoryPlan(s.player,true),/Nothing/);
});
test('undo cannot restore spent materials or overwrite intervening world edits',()=>{
  const s=scene();s.block('2,64,0','minecraft:stone');const plan=previewHearthEdit(s.player,[s.request(2,'minecraft:air')],s.api);
  commitHearthEdit(s.player,plan,s.api,p=>saveHearthEdit(s.player,p));s.items.clear();const undo=hearthHistoryPlan(s.player);
  assert.throws(()=>commitHearthEdit(s.player,undo.plan,s.api),/Need 1/);
  s.items.set(1,new Stack('minecraft:stone',1));s.block('2,64,0','minecraft:dirt');assert.throws(()=>commitHearthEdit(s.player,undo.plan,s.api),/area changed/);
});
test('full inventories reject cut before changing blocks; same-material moves need no spare copies',()=>{
  const s=scene();s.block('2,64,0','minecraft:stone');for(let i=0;i<9;i++)s.items.set(i,new Stack('minecraft:dirt',64));
  assert.throws(()=>previewHearthEdit(s.player,[s.request(2,'minecraft:air')],s.api),/Free inventory/);assert.equal(s.cells.get('2,64,0').type,'minecraft:stone');
  const move=previewHearthEdit(s.player,[s.request(2,'minecraft:air'),s.request(3)],s.api);commitHearthEdit(s.player,move,s.api);
  assert.equal(s.cells.get('3,64,0').type,'minecraft:stone');assert.equal(s.items.get(0).amount,64);
});
test('Hearth Builder rejects protected, remote, special, waterlogged and occupied blocks and other roles/modes',()=>{
  const s=scene();s.items.set(1,new Stack('minecraft:stone',64));
  s.protect('2,64,0');assert.throws(()=>previewHearthEdit(s.player,[s.request()],s.api),/protected/);s.protect(undefined);
  assert.throws(()=>previewHearthEdit(s.player,[s.request(50)],s.api),/within 16/);
  for(const type of ['minecraft:chest','minecraft:diamond_ore','minecraft:water','olympus:forge_lights']) {s.block('2,64,0',type);assert.throws(()=>previewHearthEdit(s.player,[s.request()],s.api),/ordinary/);}
  s.block('2,64,0','minecraft:dirt',{waterlogged:true});assert.throws(()=>previewHearthEdit(s.player,[s.request()],s.api),/ordinary/);s.cells.clear();
  s.entities([{typeId:'minecraft:player',location:{x:2.5,y:64,z:0.5}}]);assert.throws(()=>previewHearthEdit(s.player,[s.request()],s.api),/overlap/);s.entities([]);
  s.allowed(false);assert.throws(()=>previewHearthEdit(s.player,[s.request()],s.api),/Only the current/);s.allowed(true);
  for(const mode of ['adventure','spectator']){s.mode(mode);assert.throws(()=>previewHearthEdit(s.player,[s.request()],s.api),/Survival/);}
});
test('rejected block/inventory/history writes roll back terrain and payment without dropping copies',()=>{
  for(const failure of ['block','inventory','history']) {
    const s=scene();s.items.set(1,new Stack('minecraft:stone',3));const plan=previewHearthEdit(s.player,[s.request(2),s.request(3)],s.api);
    if(failure==='block')s.failBlock('3,64,0');if(failure==='inventory')s.failInventory();
    assert.throws(()=>commitHearthEdit(s.player,plan,s.api,()=>{if(failure==='history')throw Error('history rejected');}),/rejected/);
    assert.equal(s.items.get(1).amount,3);assert.ok([...s.cells.values()].every(b=>b.type==='minecraft:air'));
  }
});
test('confirmation rechecks role, protection, resources and entities instead of trusting a stale preview',()=>{
  for(const mutation of [s=>s.allowed(false),s=>s.protect('2,64,0'),s=>s.items.clear(),s=>s.entities([{typeId:'minecraft:cow',location:{x:2.5,y:64,z:0.5}}])]) {
    const s=scene();s.items.set(1,new Stack('minecraft:stone',1));const plan=previewHearthEdit(s.player,[s.request()],s.api);mutation(s);
    assert.throws(()=>commitHearthEdit(s.player,plan,s.api));assert.equal(s.cells.size,0);
  }
});
test('clipboard rotation/mirror are bounded, history wraps at 24 and new edits discard redo',()=>{
  const clip={blocks:[{x:0,y:0,z:0,type:'minecraft:stone',states:{}},{x:2,y:1,z:1,type:'minecraft:dirt',states:{}}]};
  let rotated=clip;for(let i=0;i<4;i++)rotated=transformHearthClipboard(rotated);assert.deepEqual(rotated,clip);
  assert.deepEqual(transformHearthClipboard(transformHearthClipboard(clip,true),true),clip);
  const s=scene();for(let i=0;i<30;i++)saveHearthEdit(s.player,{dimension:'minecraft:overworld',changes:[]});
  const state=JSON.parse(s.props.get('olympus:hearth_history'));assert.equal(state.undo.length,24);assert.equal(new Set(state.undo).size,24);
});
test('grass removal returns dirt and undo requires a real grass block rather than minting Silk Touch drops',()=>{
  const s=scene();s.block('2,64,0','minecraft:grass_block');const plan=previewHearthEdit(s.player,[s.request(2,'minecraft:air')],s.api);
  commitHearthEdit(s.player,plan,s.api,p=>saveHearthEdit(s.player,p));assert.equal([...s.items.values()][0].typeId,'minecraft:dirt');
  assert.throws(()=>commitHearthEdit(s.player,hearthHistoryPlan(s.player).plan,s.api),/grass_block/);
});
test('actual toolbox marks corners, previews fill costs, and cancellation leaves resources/world unchanged',async()=>{
  const s=scene();s.items.set(1,new Stack('minecraft:stone',4));
  showHearthBuilder(s.player,s.api);s.forms.at(-1).answer(0);await tick();
  showHearthBuilder(s.player,s.api);s.forms.at(-1).answer(1);await tick();
  showHearthBuilder(s.player,s.api);s.forms.at(-1).answer(7);await tick();
  const preview=s.forms.at(-1);assert.equal(preview.heading,'Confirm Hearth Edit');assert.match(preview.text,/Spend: 1 stone/);
  preview.answer(1);await tick();assert.equal(s.cells.size,0);assert.equal(s.items.get(1).amount,4);
  showHearthBuilder(s.player,s.api);s.forms.at(-1).answer(7);await tick();s.forms.at(-1).answer(0);await tick();
  assert.equal(s.items.get(1).amount,3);assert.equal(s.cells.get('2,63,0').type,'minecraft:stone');assert.ok(s.messages.includes('cooldown'));
});

test('builder cannot cut the floor out from under players or creatures',()=>{
 const s=scene();s.block('2,64,0','minecraft:stone');s.entities([{typeId:'minecraft:player',location:{x:2.5,y:65,z:0.5}}]);
 assert.throws(()=>previewHearthEdit(s.player,[s.request(2,'minecraft:air')],s.api),/overlap/);assert.equal(s.cells.get('2,64,0').type,'minecraft:stone');
});
test('selection, clipboard, cut and paste toolbox flow consume and return resources exactly',async()=>{
 const s=scene();s.block('2,63,0','minecraft:stone');
 const choose=async index=>{showHearthBuilder(s.player,s.api);s.forms.at(-1).answer(index);await tick();};
 await choose(0);await choose(1);await choose(2);assert.equal(JSON.parse(s.props.get('olympus:hearth_clipboard')).blocks.length,1);
 await choose(4);assert.match(s.messages.at(-1),/Need 1/);assert.equal(s.cells.has('2,64,0'),false);
 await choose(3);s.forms.at(-1).answer(0);await tick();assert.equal(s.cells.get('2,63,0').type,'minecraft:air');assert.equal([...s.items.values()][0].amount,1);
 await choose(4);s.forms.at(-1).answer(0);await tick();assert.equal(s.cells.get('2,64,0').type,'minecraft:stone');assert.equal(s.items.size,0);
});

test('native default block states are normalized before history so undo recognizes real placed permutations',()=>{
 const s=scene();s.api.resolve=(type,states)=>({type,states:type==='minecraft:air'?{}:{axis:'y',...states},getAllStates(){return this.states;}});
 s.items.set(1,new Stack('minecraft:stone',1));const plan=previewHearthEdit(s.player,[s.request()],s.api);
 assert.deepEqual(plan.changes[0].after.states,{axis:'y'});commitHearthEdit(s.player,plan,s.api,p=>saveHearthEdit(s.player,p));
 const undo=hearthHistoryPlan(s.player);assert.doesNotThrow(()=>commitHearthEdit(s.player,undo.plan,s.api,undo.finish));
 assert.equal(s.cells.get('2,64,0').type,'minecraft:air');assert.equal([...s.items.values()][0].amount,1);
});

test('Hestia relic opens toolbox normally and healing happens only through the labeled Renewal button',async()=>{
 const s=scene();let healed=0;s.api.renewal=()=>healed++;useHearthTool(s.player,'olympus:hestia_relic',false,s.api,1000);
 const box=s.forms.at(-1);assert.equal(box.heading,'Hestia’s Toolbox');assert.equal(healed,0);assert.ok(box.buttons.some(label=>label==='Take: Hearth Selection Wand'));
 box.answer(box.buttons.indexOf('Hearth Renewal (healing)'));await tick();assert.equal(healed,1);
});
test('selection wand marks two corners with ordinary use, including looking straight down, without opening vault',async()=>{
 const s=scene();let corner={x:2,y:63,z:0};s.player.dimension.getBlockFromRay=()=>({block:{location:corner},face:'Up'});
 useHearthTool(s.player,'olympus:hestia_builder',false,s.api,1000);assert.equal(s.forms.length,0);assert.match(s.messages.at(-1),/First corner set/);
 corner={x:3,y:63,z:0};useHearthTool(s.player,'olympus:hestia_builder',false,s.api,1400);assert.equal(s.forms.at(-1).heading,'Area Selected');
 const saved=JSON.parse(s.props.get('olympus:hearth_selection'));assert.deepEqual(saved.a,{x:2,y:63,z:0});assert.deepEqual(saved.b,{x:3,y:63,z:0});
 s.forms.at(-1).answer(3);await tick();
});
test('toolbox takes separate tools and material choice works from anywhere in inventory',async()=>{
 const s=scene(),taken=[];s.api.takeTool=(_p,id)=>taken.push(id);s.items.set(7,new Stack('minecraft:stone',30));
 showHearthToolbox(s.player,s.api);s.forms.at(-1).answer(1);await tick();assert.deepEqual(taken,['brush']);
 showHearthToolbox(s.player,s.api);s.forms.at(-1).answer(7);await tick();assert.equal(s.forms.at(-1).heading,'Choose Building Material');s.forms.at(-1).answer(0);await tick();
 assert.deepEqual(JSON.parse(s.props.get('olympus:hearth_palette')),['minecraft:stone']);
});
test('paint brush and eraser perform their direct action without an extra menu; duplicates are debounced',()=>{
 const s=scene();s.items.set(7,new Stack('minecraft:stone',30));s.props.set('olympus:hearth_palette',JSON.stringify(['minecraft:stone']));
 useHearthTool(s.player,'olympus:hestia_brush',false,s.api,1000);assert.equal(s.forms.length,0);assert.equal(s.items.get(7).amount,23);
 useHearthTool(s.player,'olympus:hestia_brush',false,s.api,1001);assert.equal(s.items.get(7).amount,23);
 useHearthTool(s.player,'olympus:hestia_eraser',false,s.api,1400);assert.equal(s.cells.get('2,63,0').type,'minecraft:air');assert.equal(s.items.get(7).amount,24);
});
test('dedicated tool metadata is personal/vaultable and generated items all have the native use component',()=>{
 for(const tool of HEARTH_TOOLS){const typeId='olympus:hestia_'+tool.id,item={typeId,nameTag:tool.name};assert.ok(isPersonalGodItem(item));assert.ok(isPersonalGodTool(item));
  const data=JSON.parse(readFileSync(new URL('../behavior_pack/items/hestia_'+tool.id+'.json',import.meta.url),'utf8'))['minecraft:item'];
  assert.equal(data.description.identifier,typeId);assert.ok(data.components['olympus:relic_use']);assert.equal(data.components['minecraft:max_stack_size'],1);
 }
});
test('actual relic dispatcher sends Hestia straight to toolbox tools before generic Renewal or vault handling',()=>{
 const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8'),body=source.slice(source.indexOf('function useRelic('),source.indexOf('let mountainBuilding',source.indexOf('function useRelic(')));
 const calls=[];const dispatch=new Function('hearthTool','useHearthTool','hearthBuilderApi',body+';return useRelic;')(hearthTool,(_p,id,sneaking)=>calls.push([id,sneaking]),()=>({}));
 const p={isSneaking:false};dispatch(p,'olympus:hestia_relic');dispatch(p,'olympus:hestia_builder');assert.deepEqual(calls,[['olympus:hestia_relic',false],['olympus:hestia_builder',false]]);
});

test('construction cooldown scales from 1s for small tools to 20s for full edits without changing other gods',()=>{
 const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8'),body=source.slice(source.indexOf('function remaining('),source.indexOf('function mountain(')),properties=new Map();
 const cooldown=new Function('key','now','zeusStorm','CONFIG','abilityNeedsCooldown','crownCooldownSeconds',body+';return startCooldown;')(k=>k,()=>1000,()=>false,{cooldownSeconds:{hestiaFoundation:20,athenaStudy:180}},()=>true,(_p,n)=>n);
 const p={setDynamicProperty:(k,v)=>properties.set(k,v)};cooldown(p,'hestiaFoundation',1);assert.equal(properties.get('cd_hestiaFoundation'),2000);
 cooldown(p,'hestiaFoundation',128);assert.equal(properties.get('cd_hestiaFoundation'),21000);cooldown(p,'athenaStudy');assert.equal(properties.get('cd_athenaStudy'),181000);
});
