import {BUILDING_BLOCKS} from './forge_rules.js';
import {isPersonalGodItem} from './god_items.js';
import {HEARTH_TOOLS,hearthTool} from './hearth_tools.js';

export const HEARTH_LIMITS={blocks:128,range:16,history:24,radius:3};
const AIR='minecraft:air',PREFIX='olympus:hearth_',CD='hestiaFoundation';
// Full, ordinary blocks only: containers, ores, fluids, machines and block entities
// never enter the clipboard or edit ledger. No Marketplace code/assets are used.
export const HEARTH_MATERIALS=new Set([...BUILDING_BLOCKS,...['clay','terracotta','mud','packed_mud','calcite','tuff','granite','diorite','andesite','netherrack','end_stone','basalt','blackstone','coarse_dirt','rooted_dirt','moss_block'].map(id=>'minecraft:'+id)]);
const permitted=id=>id===AIR||HEARTH_MATERIALS.has(id);
const canonical=state=>JSON.stringify([state.type,Object.entries(state.states||{}).sort(([a],[b])=>a.localeCompare(b))]);
const equal=(a,b)=>canonical(a)===canonical(b);
const positionKey=p=>`${p.x},${p.y},${p.z}`;
const read=block=>({type:block.typeId,states:block.permutation?.getAllStates()||{}});
const get=(p,k,fallback)=>{try{return JSON.parse(p.getDynamicProperty(PREFIX+k)||'null')??fallback;}catch{return fallback;}};
const set=(p,k,v)=>p.setDynamicProperty(PREFIX+k,JSON.stringify(v));
const material=id=>id==='minecraft:grass_block'?'minecraft:dirt':id;

export function selectionPoints(a,b) {
  const min={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),z:Math.min(a.z,b.z)},max={x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),z:Math.max(a.z,b.z)};
  if((max.x-min.x+1)*(max.y-min.y+1)*(max.z-min.z+1)>HEARTH_LIMITS.blocks)throw Error('Selection exceeds 128 blocks. Choose a smaller area.');
  const points=[];
  for(let x=min.x;x<=max.x;x++)for(let y=min.y;y<=max.y;y++)for(let z=min.z;z<=max.z;z++)points.push({x,y,z,edge:x===min.x||x===max.x||y===min.y||y===max.y||z===min.z||z===max.z});
  return {min,max,points};
}

export function brushPoints(center,radius,shape='sphere') {
  radius=Math.max(1,Math.min(HEARTH_LIMITS.radius,Math.floor(radius)||1));
  if(shape==='cube')radius=Math.min(2,radius);
  const points=[];
  for(let x=-radius;x<=radius;x++)for(let y=-radius;y<=radius;y++)for(let z=-radius;z<=radius;z++) {
    if(shape==='sphere'&&x*x+y*y+z*z>radius*radius)continue;
    points.push({x:center.x+x,y:center.y+y,z:center.z+z});
  }
  return points;
}

function available(player,api) {
  if(!api.allowed(player))throw Error('Only the current Hestia holding her relic can use Hearth Builder.');
  if(['adventure','spectator'].includes(String(player.getGameMode()).toLowerCase()))throw Error('Hearth Builder requires Survival or Creative mode; both spend resources.');
}
function checkedBlock(player,at,api) {
  if(![at.x,at.y,at.z].every(Number.isInteger)||Math.hypot(at.x+0.5-player.location.x,at.y+0.5-player.location.y,at.z+0.5-player.location.z)>HEARTH_LIMITS.range)throw Error('Every edited block must be within 16 blocks of you.');
  if(api.blocked(player.dimension.id,at))throw Error('The area includes protected Hall, Forge or Dominion blocks.');
  const block=player.dimension.getBlock(at);
  if(!block||!permitted(block.typeId)||block.isWaterlogged)throw Error('Only air and ordinary full building blocks can be edited. Containers, ores, fluids and special blocks are excluded.');
  return block;
}

// Preview records exact before/after states. Confirmation rechecks every state,
// protection, entity and inventory payment; another player's edits are never erased.
export function previewHearthEdit(player,requests,api) {
  available(player,api);
  if(!requests.length||requests.length>HEARTH_LIMITS.blocks)throw Error('An edit must contain 1–128 blocks.');
  const changes=[],seen=new Set(),resolvedStates=new Map();
  const entities=player.dimension.getEntities({location:player.location,maxDistance:20});
  for(const request of requests) {
    const at={x:request.x,y:request.y,z:request.z},key=positionKey(at);
    if(seen.has(key))throw Error('An edit cannot contain duplicate coordinates.');seen.add(key);
    if(!permitted(request.after.type)||request.after.states?.waterlogged===true)throw Error('That clipboard material is not supported.');
    const block=checkedBlock(player,at,api),before=read(block),stateKey=canonical(request.after);
    if(!resolvedStates.has(stateKey)){const permutation=api.resolve(request.after.type,request.after.states||{});resolvedStates.set(stateKey,permutation.getAllStates?.()||permutation.states||{});}
    const after={type:request.after.type,states:resolvedStates.get(stateKey)};
    if(equal(before,after))continue;
    if(entities.some(entity=>{
      if(['minecraft:item','minecraft:xp_orb','olympus:weather_sensor'].includes(entity.typeId))return false;
      const p=entity.location;return Math.abs(p.x-at.x-0.5)<1&&Math.abs(p.z-at.z-0.5)<1&&p.y<=at.y+1.1&&p.y+2>at.y;
    }))throw Error('An edited block would overlap a player or creature.');
    changes.push({...at,before,after});
  }
  if(!changes.length)throw Error('No blocks would change.');
  const plan={dimension:player.dimension.id,changes};
  if(JSON.stringify(plan).length>30000)throw Error('This selection has too much block state data; choose a smaller area.');
  inventoryPlan(player,plan,api);return plan;
}

// A single material ledger handles placement, cut, replacement, undo and redo.
// Every new block costs one item; removed ordinary blocks are returned. Grass
// yields dirt, as with ordinary digging, rather than generating Silk Touch drops.
function inventoryPlan(player,plan,api) {
  const bag=player.getComponent('minecraft:inventory')?.container;if(!bag)throw Error('Inventory unavailable.');
  const before=Array.from({length:bag.size},(_,i)=>bag.getItem(i)),after=[...before],debit={},credit={};
  for(const change of plan.changes) {
    if(change.after.type!==AIR)debit[change.after.type]=(debit[change.after.type]||0)+1;
    if(change.before.type!==AIR){const id=material(change.before.type);credit[id]=(credit[id]||0)+1;}
  }
  // Net same-material moves need no spare copies, but cannot create resources.
  for(const id of Object.keys(debit)) {
    const offset=Math.min(debit[id],credit[id]||0);debit[id]-=offset;credit[id]=(credit[id]||0)-offset;
    let needed=debit[id];
    for(let i=0;i<after.length&&needed;i++) {
      const item=after[i];if(item?.typeId!==id||isPersonalGodItem(item))continue;
      const count=Math.min(needed,item.amount);needed-=count;
      if(count===item.amount)after[i]=undefined;else{after[i]=item.clone();after[i].amount-=count;}
    }
    if(needed)throw Error(`Need ${needed} more ${id.replace('minecraft:','')} in your inventory.`);
  }
  for(const [id,count] of Object.entries(credit)) {
    let remaining=count;
    for(let i=0;i<after.length&&remaining;i++) {
      const item=after[i];if(item?.typeId!==id||isPersonalGodItem(item)||item.nameTag||item.getLore?.().length||item.amount>=64)continue;
      const amount=Math.min(remaining,64-item.amount);after[i]=item.clone();after[i].amount+=amount;remaining-=amount;
    }
    for(let i=0;i<after.length&&remaining;i++)if(!after[i]){const amount=Math.min(64,remaining);after[i]=new api.ItemStack(id,amount);remaining-=amount;}
    if(remaining)throw Error('Free inventory space for removed blocks first. No blocks were changed.');
  }
  return {bag,before,after,debit,credit};
}

export function hearthCost(player,plan,api) {
  const ledger=inventoryPlan(player,plan,api),format=map=>Object.entries(map).filter(([,n])=>n).map(([id,n])=>`${n} ${id.replace('minecraft:','')}`).join(', ')||'none';
  return `${plan.changes.length} blocks\nSpend: ${format(ledger.debit)}\nReturn: ${format(ledger.credit)}`;
}

export function commitHearthEdit(player,plan,api,persist=()=>{}) {
  available(player,api);
  if(plan.dimension!==player.dimension.id)throw Error('Return to the edit’s dimension.');
  for(const change of plan.changes)if(!equal(read(checkedBlock(player,change,api)),change.before))throw Error('The area changed since the preview/history entry. Operation cancelled.');
  const fresh=previewHearthEdit(player,plan.changes.map(c=>({...c,after:c.after})),api),ledger=inventoryPlan(player,fresh,api),placed=[];
  const permutations=new Map(),resolve=state=>{const id=canonical(state);if(!permutations.has(id))permutations.set(id,api.resolve(state.type,state.states));return permutations.get(id);};
  try {
    for(const change of fresh.changes){player.dimension.getBlock(change).setPermutation(resolve(change.after));placed.push(change);}
    for(let i=0;i<ledger.after.length;i++)if(ledger.after[i]!==ledger.before[i])ledger.bag.setItem(i,ledger.after[i]);
    persist(fresh);
  } catch(error) {
    const failures=[];
    for(const change of placed)try{player.dimension.getBlock(change).setPermutation(resolve(change.before));}catch(e){failures.push(e);}
    for(let i=0;i<ledger.before.length;i++)if(ledger.after[i]!==ledger.before[i])try{ledger.bag.setItem(i,ledger.before[i]);}catch(e){failures.push(e);}
    if(failures.length)api.fail(Error('Hearth rollback encountered unloaded/rejected blocks or inventory writes. '+failures.map(e=>e.message).join('; ')));
    throw error;
  }
  return fresh;
}

function history(player){return get(player,'history',{undo:[],redo:[],next:0});}
export function saveHearthEdit(player,plan) {
  const state=history(player),slot=state.next;
  set(player,'edit_'+slot,plan);
  state.undo=state.undo.filter(i=>i!==slot).concat(slot).slice(-HEARTH_LIMITS.history);state.redo=[];state.next=(slot+1)%HEARTH_LIMITS.history;
  set(player,'history',state);
}
export function hearthHistoryPlan(player,redo=false) {
  const state=history(player),slot=(redo?state.redo:state.undo).at(-1),plan=slot===undefined?undefined:get(player,'edit_'+slot);
  if(!plan)throw Error(redo?'Nothing to redo.':'Nothing to undo.');
  return {plan:redo?plan:{dimension:plan.dimension,changes:plan.changes.map(c=>({...c,before:c.after,after:c.before}))},finish(){
    if(redo){state.redo.pop();state.undo.push(slot);}else{state.undo.pop();state.redo.push(slot);}set(player,'history',state);
  }};
}

function selected(player,api) {
  const selection=get(player,'selection',{});
  if(selection.dimension!==player.dimension.id||!selection.a||!selection.b)throw Error('Mark corners A and B in this dimension first.');
  return selectionPoints(selection.a,selection.b);
}
function aim(player){const hit=player.dimension.getBlockFromRay(player.getHeadLocation(),player.getViewDirection(),{maxDistance:HEARTH_LIMITS.range,includeLiquidBlocks:false,includePassableBlocks:false});if(!hit)throw Error('Aim at a loaded block within 16 blocks.');return hit;}
function palette(player) {
  const saved=get(player,'palette',[]);if(saved.length)return saved;
  const item=player.getComponent('minecraft:inventory')?.container?.getItem((player.selectedSlotIndex+1)%9);
  if(!HEARTH_MATERIALS.has(item?.typeId)||isPersonalGodItem(item))throw Error('Choose building material in your toolbox, or put building blocks in the next hotbar slot.');
  return [item.typeId];
}

const toolUses=new Map();
export function forgetHearthTool(id){toolUses.delete(id);}
function guarded(player,api,action){try{available(player,api);action();}catch(error){api.tell(player,error.message);}}
function beginSelection(player,api,after='menu') {
  set(player,'selecting',{phase:'a',after});
  api.tell(player,'Tap the first corner block, then the opposite corner. Looking down works.');
}
function markNextCorner(player,api) {
  const step=get(player,'selecting',{phase:'a',after:'menu'}),p=aim(player).block.location;
  checkedBlock(player,p,api);
  let selection=get(player,'selection',{});
  if(step.phase==='a'||selection.dimension!==player.dimension.id||!selection.a) {
    selection={dimension:player.dimension.id,a:{...p}};set(player,'selection',selection);
    set(player,'selecting',{phase:'b',after:step.after});api.tell(player,'First corner set. Tap the opposite corner.');return;
  }
  selection.b={...p};const area=selectionPoints(selection.a,selection.b);
  set(player,'selection',selection);set(player,'selecting',null);
  api.tell(player,`Area selected: ${area.points.length} blocks.`);
  if(step.after==='fill'||step.after==='copy')runTool(player,step.after,api);
  else new api.Form().title('Area Selected').body('Use the building material chosen in your toolbox. Fill spends resources; Copy saves a blueprint.').button('Fill this area').button('Copy this build').button('Open toolbox').button('Cancel').show(player).then(result=>guarded(player,api,()=>{
    if(result.canceled)return;if(result.selection===0)runTool(player,'fill',api);if(result.selection===1)runTool(player,'copy',api);if(result.selection===2)showHearthToolbox(player,api);
  })).catch(api.fail);
}
function chooseMaterial(player,api) {
  const bag=player.getComponent('minecraft:inventory')?.container,counts=new Map();
  for(let i=0;i<(bag?.size||0);i++){const item=bag.getItem(i);if(HEARTH_MATERIALS.has(item?.typeId)&&!isPersonalGodItem(item))counts.set(item.typeId,(counts.get(item.typeId)||0)+item.amount);}
  const options=[...counts];if(!options.length){api.tell(player,'Carry some ordinary building blocks first.');return;}
  const form=new api.Form().title('Choose Building Material').body('Choose blocks from anywhere in your inventory. No special hotbar position needed. Each placement consumes resources.');
  for(const [id,count] of options)form.button(`${id.replace('minecraft:','')} (${count})`);
  form.button('Cancel').show(player).then(result=>guarded(player,api,()=>{const option=options[result.selection];if(result.canceled||!option)return;set(player,'palette',[option[0]]);api.tell(player,'Building material: '+option[0].replace('minecraft:',''));})).catch(api.fail);
}
export function showHearthToolbox(player,api) {
  available(player,api);
  const form=new api.Form().title('Hestia’s Toolbox').body('Take a tool, hold it, and use it on blocks. Sneak-use a tool for its small options menu. The selection wand needs just two taps. Small strokes have short cooldowns; large edits take longer. Materials are always consumed.');
  const tools=HEARTH_TOOLS.filter(tool=>tool.id!=='toolbox');
  for(const tool of tools)form.button(`Take: ${tool.name}`);
  for(const label of ['Choose building material','Put building tools away','Hearth Renewal (healing)','Advanced builder','Tool Vault','How to build'])form.button(label);
  form.button('Close').show(player).then(result=>guarded(player,api,()=>{
    if(result.canceled)return;
    if(result.selection<tools.length){const tool=tools[result.selection],taken=api.takeTool(player,tool.id);if(taken!==false&&['brush','terrain','trowel'].includes(tool.id)&&!get(player,'palette',[]).length)chooseMaterial(player,api);return;}
    const action=result.selection-tools.length;
    if(action===0)chooseMaterial(player,api);
    if(action===1)api.storeTools(player);
    if(action===2)api.renewal(player);
    if(action===3)showHearthBuilder(player,api);
    if(action===4)api.vault(player);
    if(action===5)new api.Form().title('Build in Three Steps').body('1. Choose building material from your inventory in this toolbox.\n2. Take the Selection Wand. Hold it and tap two opposite corner blocks.\n3. Choose Fill to build there, or Copy to save the build. Use the Clipboard tool to paste it somewhere else.\n\nThe Paint Brush paints where you aim. Terrain Shaper raises/lowers ground. Eraser removes blocks. Trowel builds floors/walls/stairs. Undo Charm reverses an edit. Sneak-use each tool for a short options menu. Resources, protection and undo rules still apply.').button('Back').show(player).then(()=>{if(api.allowed(player))showHearthToolbox(player,api);}).catch(api.fail);
  })).catch(api.fail);
}
function toolOptions(player,definition,api) {
  const actions={builder:[['fill','Fill selected area'],['copy','Copy selected area'],['select','Start a new selection']],brush:[['sphere','Sphere brush'],['cube','Cube brush'],['size','Change brush size']],clipboard:[['copy','Copy selected area'],['paste','Paste'],['rotate','Rotate clipboard'],['mirror','Mirror clipboard']],terrain:[['raise','Raise ground'],['lower','Lower ground']],eraser:[['erase','Erase one block'],['clear','Clear selected area']],trowel:[['foundation','Floor'],['wall','Wall'],['stairs','Stairs']],undo:[['undo','Undo last edit'],['redo','Redo last undone edit']]}[definition.id]||[];
  const form=new api.Form().title(definition.name).body('Choose the tool’s action, or pick materials from your inventory. Normal use performs the saved action.');
  for(const [,label] of actions)form.button(label);
  form.button('Choose building material').button('Open toolbox').button('Close').show(player).then(result=>guarded(player,api,()=>{
    if(result.canceled)return;
    if(result.selection===actions.length){chooseMaterial(player,api);return;}
    if(result.selection===actions.length+1){showHearthToolbox(player,api);return;}
    const action=actions[result.selection]?.[0];if(!action)return;
    if(action==='select'){beginSelection(player,api);return;}
    if(['copy','rotate','mirror','size'].includes(action)){runTool(player,action,api);return;}
    if(definition.id==='builder'){const selection=get(player,'selection',{});if(!selection.a||!selection.b){beginSelection(player,api,action);return;}runTool(player,action,api);return;}
    set(player,'tool_mode_'+definition.id,action);api.tell(player,`${definition.name}: ${actions[result.selection][1]}. Use the tool on your target.`);
  })).catch(api.fail);
}
export function useHearthTool(player,itemId,sneaking,api,time=Date.now()) {
  if(time-(toolUses.get(player.id)??-Infinity)<300)return;
  toolUses.set(player.id,time);
  guarded(player,api,()=>{
    const tool=hearthTool(itemId);
    if(!tool||tool.id==='toolbox'){showHearthToolbox(player,api);return;}
    if(sneaking){toolOptions(player,tool,api);return;}
    if(tool.id==='builder'){markNextCorner(player,api);return;}
    const mode=get(player,'tool_mode_'+tool.id,tool.mode);
    if(tool.id==='trowel'){api.shape(player,mode);return;}
    if(tool.id==='brush'&&player.getDynamicProperty(PREFIX+'radius')===undefined)set(player,'radius',1);
    runTool(player,mode,api,['sphere','cube','raise','lower','erase'].includes(mode));
  });
}
export function copyHearthSelection(player,api) {
  available(player,api);const selection=selected(player,api);
  const blocks=selection.points.map(p=>({x:p.x-selection.min.x,y:p.y-selection.min.y,z:p.z-selection.min.z,...read(checkedBlock(player,p,api))}));
  return {blocks};
}
export function transformHearthClipboard(clipboard,mirror=false) {
  const blocks=clipboard.blocks.map(b=>({...b,x:mirror?-b.x:-b.z,z:mirror?b.z:b.x}));
  const minX=Math.min(...blocks.map(b=>b.x)),minZ=Math.min(...blocks.map(b=>b.z));
  return {blocks:blocks.map(b=>({...b,x:b.x-minX,z:b.z-minZ}))};
}

const TOOLS=[['a','Mark corner A'],['b','Mark corner B'],['copy','Copy selection'],['cut','Cut selection / return materials'],['paste','Paste clipboard'],['rotate','Rotate clipboard 90°'],['mirror','Mirror clipboard'],['fill','Fill selection'],['outline','Outline selection'],['hollow','Hollow box (clears interior)'],['clear','Clear selection / return materials'],['sphere','Sphere brush'],['cube','Cube brush'],['raise','Raise terrain (3x3)'],['lower','Lower terrain (3x3)'],['size','Brush radius'],['palette','Capture palette from next 4 hotbar slots'],['plain','Use only next-slot material'],['undo','Undo'],['redo','Redo'],['guide','Builder handbook']];
export function showHearthBuilder(player,api) {
  available(player,api);
  const state=get(player,'selection',{}),hist=history(player),radius=get(player,'radius',2);
  const form=new api.Form().title('Hestia’s Hearth Builder').body(`128 blocks/edit • 16m reach • shared 1–20s build cooldown\nEvery placed block uses inventory materials; removed ordinary blocks return to inventory. Undo/redo use the same resource accounting.\nA: ${state.a?positionKey(state.a):'unset'} | B: ${state.b?positionKey(state.b):'unset'}\nBrush radius ${radius} | Undo ${hist.undo.length}/24 | Redo ${hist.redo.length}`);
  for(const [,label] of TOOLS)form.button(label);
  form.button('Close').show(player).then(result=>{
    const tool=TOOLS[result.selection]?.[0];if(result.canceled||!tool)return;
    try {available(player,api);runTool(player,tool,api);}catch(error){api.tell(player,error.message);}
  }).catch(api.fail);
}

function runTool(player,tool,api,instant=false) {
  if(tool==='guide') {
    new api.Form().title('Hearth Builder Handbook').body('1. Mark corners A/B while aiming at blocks. Maximum selection: 128 blocks.\n2. Copy is free; Paste spends your blocks. Cut returns ordinary materials and saves a clipboard. Fill, outline and hollow use the next-slot material or captured palette.\n3. Brushes paint a bounded sphere/cube. Raise/lower sculpts a 3x3 patch near the aimed surface. Radius cycles 1–3 (cube capped at 2).\n4. Every edit previews costs before confirmation. Replacements return the old basic blocks. Grass returns dirt. Undo restores the exact previous blocks, but requires their materials; it never refunds free copies.\n5. Undo/redo stores 24 edits per player across reloads. New edits discard redo. Intervening changes, missing resources, full inventory, protected areas, containers, ores, fluids, special blocks and creature overlap reject edits.\n6. Creative also spends resources. Other gods cannot use this toolbox. Normal relic use remains Hearth Renewal.').button('Back').show(player).then(()=>{if(api.allowed(player))showHearthBuilder(player,api);}).catch(api.fail);return;
  }
  if(tool==='a'||tool==='b') {const hit=aim(player),selection=get(player,'selection',{});if(selection.dimension!==player.dimension.id){delete selection.a;delete selection.b;}selection.dimension=player.dimension.id;selection[tool]={...hit.block.location};set(player,'selection',selection);api.tell(player,`Corner ${tool.toUpperCase()} saved.`);return;}
  if(tool==='size'){const radius=get(player,'radius',2)%3+1;set(player,'radius',radius);api.tell(player,`Brush radius ${radius}. Cubes use at most radius 2.`);return;}
  if(tool==='plain'){set(player,'palette',[]);api.tell(player,'Builder uses the next hotbar slot.');return;}
  if(tool==='palette') {
    const bag=player.getComponent('minecraft:inventory').container,ids=[];
    for(let n=1;n<=4;n++){const item=bag.getItem((player.selectedSlotIndex+n)%9);if(HEARTH_MATERIALS.has(item?.typeId)&&!isPersonalGodItem(item))ids.push(item.typeId);}
    if(!ids.length)throw Error('Put building materials in the next four hotbar slots.');set(player,'palette',[...new Set(ids)]);api.tell(player,'Palette captured: '+[...new Set(ids)].map(id=>id.replace('minecraft:','')).join(', '));return;
  }
  if(tool==='copy'){set(player,'clipboard',copyHearthSelection(player,api));api.tell(player,'Selection copied. Pasting will consume your resources.');return;}
  if(tool==='rotate'||tool==='mirror'){const clip=get(player,'clipboard');if(!clip)throw Error('Copy a selection first.');set(player,'clipboard',transformHearthClipboard(clip,tool==='mirror'));api.tell(player,'Clipboard transformed.');return;}
  if(!api.ready(player,CD,'Hearth Builder'))return;
  let requests,historyAction,clipboard;
  if(tool==='undo'||tool==='redo') {historyAction=hearthHistoryPlan(player,tool==='redo');requests=historyAction.plan.changes;if(historyAction.plan.dimension!==player.dimension.id)throw Error('Return to that edit’s dimension.');}
  else if(tool==='paste') {
    const clip=get(player,'clipboard');if(!clip)throw Error('Copy a selection first.');const hit=aim(player),p={...hit.block.location,y:hit.block.location.y+1};
    requests=clip.blocks.filter(b=>b.type!==AIR).map(b=>({x:p.x+b.x,y:p.y+b.y,z:p.z+b.z,after:{type:b.type,states:b.states}}));
  } else if(tool==='cut'||tool==='clear'||tool==='erase') {
    const points=tool==='erase'?[aim(player).block.location]:selected(player,api).points;if(tool==='cut')clipboard=copyHearthSelection(player,api);
    requests=points.map(p=>({...p,after:{type:AIR,states:{}}}));
  } else {
    const colors=tool==='lower'?[AIR]:palette(player),color=p=>colors[Math.abs(p.x*31+p.y*17+p.z*13)%colors.length];
    if(['fill','outline','hollow'].includes(tool)) {
      requests=selected(player,api).points.filter(p=>tool!=='outline'||p.edge).map(p=>({...p,after:{type:tool==='hollow'&&!p.edge?AIR:color(p),states:{}}}));
    } else if(tool==='sphere'||tool==='cube')requests=brushPoints(aim(player).block.location,get(player,'radius',2),tool).map(p=>({...p,after:{type:color(p),states:{}}}));
    else if(tool==='raise'||tool==='lower') {
      const hit=aim(player).block.location;requests=[];
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let dy=3;dy>=-3;dy--) {
        const p={x:hit.x+dx,y:hit.y+dy,z:hit.z+dz},block=player.dimension.getBlock(p),above=player.dimension.getBlock({...p,y:p.y+1});
        if(block?.typeId!==AIR&&above?.isAir){checkedBlock(player,p,api);requests.push({...p,y:p.y+(tool==='raise'?1:0),after:{type:tool==='raise'?color(p):AIR,states:{}}});break;}
      }
    } else throw Error('Unknown builder tool.');
  }
  // History actions must match their saved expected world states, not just the
  // newly observed preview, otherwise undo could overwrite somebody else's edit.
  if(historyAction)for(const c of requests)if(!equal(read(checkedBlock(player,c,api)),c.before))throw Error('The area changed after that edit; history cannot overwrite it.');
  const plan=previewHearthEdit(player,requests,api);
  const apply=()=>{
    try {
      available(player,api);if(!api.ready(player,CD,'Hearth Builder'))return;
      // History must still be the same entry if another menu completed first.
      if(historyAction){const current=hearthHistoryPlan(player,tool==='redo');if(JSON.stringify(current.plan)!==JSON.stringify(historyAction.plan))throw Error('History changed. Open the tool again.');}
      commitHearthEdit(player,plan,api,fresh=>{if(historyAction)historyAction.finish();else saveHearthEdit(player,fresh);});
      if(clipboard)set(player,'clipboard',clipboard);
      api.startCooldown(player,CD,plan.changes.length);api.tell(player,`Hearth Builder ${tool}: ${plan.changes.length} blocks changed; resource ledger settled.`);
    } catch(error){api.tell(player,error.message);api.fail(error);}
  };
  if(instant){apply();return;}
  new api.Form().title('Confirm Hearth Edit').body(`${tool.toUpperCase()}\n${hearthCost(player,plan,api)}\nResources will be consumed/returned. Cooldown scales with edit size (1–20s). Protected and special blocks cannot be changed.`).button('Apply edit').button('Cancel').show(player).then(result=>{
    if(!result.canceled&&result.selection===0)apply();
  }).catch(api.fail);
}
