const LEGACY='olympus:rain_clutch_water',PREFIX='olympus:rain_water_';
export const CLUTCH_WATER='olympus:clutch_water';
export function placeClutchWater(block) {
  block.setType(CLUTCH_WATER);
  try {block.setWaterlogged(true);}
  catch(error) {block.setType('minecraft:air');throw error;}
}
export function removeClutchWater(block) {
  if(block.typeId===CLUTCH_WATER)block.setWaterlogged(false);
  block.setType('minecraft:air');
}
const read=(world,key)=>JSON.parse(world.getDynamicProperty(key)||'null');
const save=(world,key,value)=>world.setDynamicProperty(key,value?JSON.stringify(value):undefined);

export function rememberRainWater(world,dimension,location,now=Date.now()) {
  // Eight-block cubes cap each property at 512 compact records, safely below
  // Bedrock's string size limit even with many simultaneous water cushions.
  const key=PREFIX+dimension.replace(/[^a-z0-9]/gi,'_')+'_'+[location.x,location.y,location.z].map(n=>Math.floor(n/8)).join('_');
  const shard=read(world,key)||{dimension,blocks:[]};
  shard.blocks=shard.blocks.filter(([x,y,z])=>x!==location.x || y!==location.y || z!==location.z);
  shard.blocks.push([location.x,location.y,location.z,now+2_000]);
  save(world,key,shard);
}
function expire(world,dimension,blocks,now) {
  const remaining=[];
  for(const record of blocks) {
    const [x,y,z,until]=record;
    if(until>now){remaining.push(record);continue;}
    try {
      const block=world.getDimension(dimension).getBlock({x,y,z});
      if(!block){remaining.push(record);continue;}
      if([CLUTCH_WATER,'minecraft:water','minecraft:flowing_water'].includes(block.typeId))removeClutchWater(block);
    } catch {remaining.push(record);} // Retry when the chunk loads again.
  }
  return remaining;
}
export function cleanupRainWater(world,now=Date.now()) {
  for(const key of world.getDynamicPropertyIds().filter(key=>key.startsWith(PREFIX))) {
    const shard=read(world,key);if(!shard)continue;
    const remaining=expire(world,shard.dimension,shard.blocks,now);
    if(remaining.length!==shard.blocks.length)save(world,key,remaining.length?{...shard,blocks:remaining}:undefined);
  }
  // Clean up sources still scheduled by v3.3.2 after upgrading.
  const legacy=read(world,LEGACY);
  if(legacy) {
    const remaining=legacy.filter(record=>expire(world,record.dimension,[[record.x,record.y,record.z,record.until]],now).length);
    if(remaining.length!==legacy.length)save(world,LEGACY,remaining.length?remaining:undefined);
  }
}
