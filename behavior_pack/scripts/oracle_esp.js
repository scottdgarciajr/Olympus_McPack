// Bounded chest discovery. Rendering is native animated geometry in oracle_render.
export function* scanChests(dimension, origin, radius) {
  const p={x:Math.floor(origin.x),y:Math.floor(origin.y),z:Math.floor(origin.z)};
  // Near shells appear first; scan work is bounded by the caller each tick.
  for (let r=0;r<=radius;r++) for (let x=-r;x<=r;x++) for (let y=-r;y<=r;y++) for (let z=-r;z<=r;z++) {
    if (Math.max(Math.abs(x),Math.abs(y),Math.abs(z))!==r) continue;
    const at={x:p.x+x,y:p.y+y,z:p.z+z};
    let chest;
    if (x*x+y*y+z*z<=radius*radius) try {
      const block=dimension.getBlock(at);
      if (['minecraft:chest','minecraft:trapped_chest','minecraft:ender_chest'].includes(block?.typeId)) chest=at;
    } catch {} // Unloaded chunks and world limits are deliberately skipped.
    yield chest;
  }
}
