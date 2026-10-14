// Pick a collidable floor with two empty blocks above it. Block.isSolid is not
// available in the pack's pinned Bedrock Script API 2.0.0.
const UNSAFE_FLOORS = new Set([
  'minecraft:magma', 'minecraft:magma_block', 'minecraft:cactus',
  'minecraft:campfire', 'minecraft:soul_campfire', 'minecraft:fire',
  'minecraft:soul_fire', 'minecraft:lava', 'minecraft:powder_snow',
  'minecraft:sweet_berry_bush', 'minecraft:wither_rose'
]);

export function findMadnessLanding(dimension, origin, minRadius, maxRadius, random = Math.random) {
  for (let i=0; i<24; i++) {
    const angle=random()*Math.PI*2;
    const radius=minRadius+random()*(maxRadius-minRadius);
    const x=Math.floor(origin.x+Math.cos(angle)*radius);
    const z=Math.floor(origin.z+Math.sin(angle)*radius);
    try {
      const hit=dimension.getBlockFromRay(
        {x:x+0.5,y:Math.floor(origin.y)+5,z:z+0.5}, {x:0,y:-1,z:0},
        {maxDistance:14,includePassableBlocks:false,includeLiquidBlocks:false});
      const floor=hit?.block;
      if (!floor || hit.face!=='Up' || floor.isAir || floor.isLiquid || UNSAFE_FLOORS.has(floor.typeId) ||
          /(?:_fence|_wall|_gate|_trapdoor)$/.test(floor.typeId)) continue;
      const y=floor.location.y+1;
      const feet=dimension.getBlock({x,y,z});
      const head=dimension.getBlock({x,y:y+1,z});
      if (feet?.isAir && head?.isAir) return {x:x+0.5,y,z:z+0.5};
    } catch { /* unloaded or out-of-world candidate: try another */ }
  }
  return undefined;
}
