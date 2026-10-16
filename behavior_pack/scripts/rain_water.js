const LEGACY='olympus:rain_clutch_water',PREFIX='olympus:rain_water_';
export const CLUTCH_WATER='minecraft:water',CLUTCH_BOUNDARY='olympus:clutch_boundary';
const OLD_CARRIER='olympus:clutch_water';
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

export function rememberRainWater(world,dimension,location,now=Date.now(),boundary=false) {
  // Eight-block cubes cap each property at 512 compact records, safely below
  // Bedrock's string size limit even with many simultaneous water cushions.
  const key=shardKey(dimension,location);
  const shard=read(world,key)||{dimension,blocks:[]};
  shard.blocks=shard.blocks.filter(([x,y,z])=>x!==location.x || y!==location.y || z!==location.z);
  shard.blocks.push([location.x,location.y,location.z,now+5_000,boundary?1:0]);
  save(world,key,shard);
}
function expire(world,dimension,blocks,now,boundaryPhase,pending) {
  const remaining=[];
  for(const record of blocks) {
    const [x,y,z,until,kind]=record,at={x,y,z},id=coordinate(dimension,at);
    if(until>now){remaining.push(record);if(kind!==1)pending.add(id);continue;}
    try {
      const block=world.getDimension(dimension).getBlock(at);
      if(!block)throw Error('unloaded');
      if(block.typeId===CLUTCH_BOUNDARY) {
        pending.delete(id);
        if(!boundaryPhase || sides.some(([dx,dy,dz])=>pending.has(coordinate(dimension,{x:x+dx,y:y+dy,z:z+dz})))){remaining.push(record);continue;}
        block.setType('minecraft:air');
      } else if([OLD_CARRIER,CLUTCH_WATER,'minecraft:flowing_water'].includes(block.typeId))removeClutchWater(block);
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
