const LEGACY='olympus:rain_clutch_water',PREFIX='olympus:rain_water_';
export const CLUTCH_WATER='minecraft:water',CLUTCH_BOUNDARY='minecraft:structure_void';
const OLD_BOUNDARY='olympus:clutch_boundary';
const OLD_CARRIER='olympus:clutch_water';
const PLANTS=new Set(['short_grass','tallgrass','tall_grass','fern','large_fern','deadbush','dead_bush','dandelion','poppy','blue_orchid','allium','azure_bluet','oxeye_daisy','cornflower','lily_of_the_valley','white_tulip','orange_tulip','pink_tulip','red_tulip','sunflower','lilac','rose_bush','peony'].map(id=>'minecraft:'+id));
for(const id of ['torchflower','pitcher_plant','pink_petals','wildflowers','firefly_bush','bush','short_dry_grass','tall_dry_grass','closed_eyeblossom','open_eyeblossom','snow_layer','vine','glow_lichen','hanging_roots','waterlily'])PLANTS.add('minecraft:'+id);
const NATURAL_WATER=new Set(['minecraft:water','minecraft:flowing_water']);
export const canPlaceClutchWater=block=>!!block && (block.isAir || block.typeId==='minecraft:air' || PLANTS.has(block.typeId) || NATURAL_WATER.has(block.typeId));
const FULL_BLOCKS=new Set(['stone','grass_block','grass','dirt','coarse_dirt','rooted_dirt','dirt_with_roots','sand','red_sand','gravel','quartz_block','smooth_quartz','sandstone','red_sandstone','cobblestone','deepslate','cobbled_deepslate','snow','ice','packed_ice','blue_ice','bedrock','netherrack','end_stone'].map(id=>'minecraft:'+id));
const sides=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const coordinate=(dimension,p)=>`${dimension}:${p.x},${p.y},${p.z}`;
const shardKey=(dimension,p)=>PREFIX+dimension.replace(/[^a-z0-9]/gi,'_')+'_'+[p.x,p.y,p.z].map(n=>Math.floor(n/8)).join('_');
export function placeClutchWater(block){block.setType(CLUTCH_WATER);}
export function removeClutchWater(block) {
  if(block.typeId===OLD_CARRIER)block.setWaterlogged(false);
  block.setType('minecraft:air');
}
const read=(world,key)=>JSON.parse(world.getDynamicProperty(key)||'null');
const save=(world,key,value)=>{const raw=value?JSON.stringify(value):undefined;if(world.getDynamicProperty(key)!==raw)world.setDynamicProperty(key,raw);};

export function rememberRainWater(world,dimension,location,now=Date.now(),boundary=false,restore) {
  // Eight-block cubes cap each property at 512 compact records, safely below
  // Bedrock's string size limit even with many simultaneous water cushions.
  const key=shardKey(dimension,location);
  const shard=read(world,key)||{dimension,blocks:[]};
  shard.blocks=shard.blocks.filter(([x,y,z])=>x!==location.x || y!==location.y || z!==location.z);
  const previous=read(world,key)?.blocks.find(([x,y,z])=>x===location.x && y===location.y && z===location.z)?.[5];
  const record=[location.x,location.y,location.z,now+5_000,boundary?1:0];
  if(restore||previous)record.push(restore||previous);
  shard.blocks.push(record);
  save(world,key,shard);
}
export function spawnRainWater(world,dimensionId,locations,blocked,now=Date.now(),report=()=>{}) {
  const dimension=world.getDimension(dimensionId),water=new Map(),edges=new Map(),changed=[],snapshots=new Map();
  const tracked=p=>(read(world,shardKey(dimensionId,p))?.blocks||[]).some(([x,y,z,,kind])=>x===p.x && y===p.y && z===p.z && kind!==1);
  const reject=reason=>{report(reason);return 0;};
  const replaceable=canPlaceClutchWater;
  const edge=(block,p)=>block.typeId===OLD_BOUNDARY || block.typeId===CLUTCH_BOUNDARY && (read(world,shardKey(dimensionId,p))?.blocks||[]).some(([x,y,z,,kind])=>x===p.x && y===p.y && z===p.z && kind===1);
  // Preserve pre-existing water (including its flow level); never snapshot
  // another temporary pool as permanent water when pools overlap.
  const restore=(block,p)=>PLANTS.has(block.typeId) || NATURAL_WATER.has(block.typeId)&&!tracked(p)?{type:block.typeId,states:block.permutation.getAllStates()}:undefined;
  try {
    for(const p of locations) {
      const block=dimension.getBlock(p);
      if(!block || blocked(dimensionId,p))return reject('Pool reaches unloaded or protected terrain.');
      if(replaceable(block) || edge(block,p))water.set(coordinate(dimensionId,p),{p,block,restore:restore(block,p)});
    }
    if(!water.size)return reject('No replaceable space at landing.');
    // A 1x1x1 selection is the original working native-water mode.
    // Larger pools use native structure voids as pass-through fluid stops.
    if(locations.length!==1)for(const {p} of water.values())for(const [dx,dy,dz] of sides) {
      // Water never flows upward. Leave the top open so an invisible cap
      // cannot hide the water surface or interfere with rain exposure.
      if(dy===1)continue;
      const at={x:p.x+dx,y:p.y+dy,z:p.z+dz},id=coordinate(dimensionId,at);
      if(water.has(id)||edges.has(id))continue;
      const block=dimension.getBlock(at);if(!block)return reject('Pool perimeter is unloaded.');
      if(replaceable(block) || edge(block,at)) {
        if(blocked(dimensionId,at))return reject('Pool perimeter is protected.');
        edges.set(id,{p:at,block,restore:restore(block,at)});
      } else if(block.typeId!==CLUTCH_BOUNDARY && !FULL_BLOCKS.has(block.typeId) && !block.isLiquidBlocking?.('Water'))return reject(`Perimeter cannot contain water beside ${block.typeId}.`);
    }
    const mutate=(block,type)=>{changed.push({block,permutation:block.permutation,type:block.typeId});block.setType(type);};
    // Seal all exposed faces BEFORE spawning ordinary water. These edges have
    // no collision or selection box; they only block fluid updates.
    for(const {block} of edges.values())if(block.typeId!==CLUTCH_BOUNDARY)mutate(block,CLUTCH_BOUNDARY);
    for(const {block} of water.values())mutate(block,CLUTCH_WATER);
    for(const [group,boundary] of [[edges,true],[water,false]])for(const {p,restore} of group.values()) {
      const key=shardKey(dimensionId,p);
      if(!snapshots.has(key))snapshots.set(key,world.getDynamicProperty(key));
      rememberRainWater(world,dimensionId,p,now,boundary,restore);
    }
    return water.size;
  } catch(error) {
    // No partial uncontained pool or abandoned temporary edges on failure.
    for(const {block,type,permutation} of changed.reverse())try{if(permutation && block.setPermutation)block.setPermutation(permutation);else block.setType(type);}catch{}
    for(const [key,value] of snapshots)try{world.setDynamicProperty(key,value);}catch{}
    return reject(`Placement failed: ${error.message||error}`);
  }
}
function expire(world,dimension,blocks,now,boundaryPhase,pending) {
  const remaining=[];
  for(const record of blocks) {
    const [x,y,z,until,kind,restore]=record,at={x,y,z},id=coordinate(dimension,at);
    if(until>now){remaining.push(record);if(kind!==1)pending.add(id);continue;}
    try {
      const block=world.getDimension(dimension).getBlock(at);
      if(!block)throw Error('unloaded');
      if([CLUTCH_BOUNDARY,OLD_BOUNDARY].includes(block.typeId)) {
        pending.delete(id);
        if(!boundaryPhase || sides.some(([dx,dy,dz])=>pending.has(coordinate(dimension,{x:x+dx,y:y+dy,z:z+dz})))){remaining.push(record);continue;}
        block.setType(restore?.type||'minecraft:air');
      } else if([OLD_CARRIER,CLUTCH_WATER,'minecraft:flowing_water'].includes(block.typeId)){removeClutchWater(block);if(restore)block.setType(restore.type);}
      else continue; // Preserve blocks the player placed during the timer.
      if(restore)for(const [state,value] of Object.entries(restore.states))block.setPermutation(block.permutation.withState(state,value));
    } catch {remaining.push(record);if(kind!==1)pending.add(id);}
  }
  return remaining;
}
export function cleanupRainWater(world,now=Date.now()) {
  const entries=world.getDynamicPropertyIds().filter(key=>key.startsWith(PREFIX)).map(key=>({key,...read(world,key)})).filter(entry=>entry.blocks);
  const legacy=read(world,LEGACY);
  if(legacy)for(const record of legacy)entries.push({legacy:record,dimension:record.dimension,blocks:[[record.x,record.y,record.z,record.until]]});
  const pending=new Set();
  // Across ALL spatial shards, remove water first, then edges. Unloaded water
  // keeps its shared edges until it can be removed without leaking.
  for(const phase of [false,true])for(const entry of entries)entry.blocks=expire(world,entry.dimension,entry.blocks,now,phase,pending);
  for(const entry of entries)if(!entry.legacy)save(world,entry.key,entry.blocks.length?{dimension:entry.dimension,blocks:entry.blocks}:undefined);
  if(legacy) {
    const remaining=entries.filter(entry=>entry.legacy && entry.blocks.length).map(entry=>entry.legacy);
    save(world,LEGACY,remaining.length?remaining:undefined);
  }
}
