const HAZARDS=new Set(['minecraft:lava','minecraft:flowing_lava','minecraft:fire','minecraft:soul_fire','minecraft:cactus','minecraft:magma','minecraft:campfire','minecraft:soul_campfire','minecraft:powder_snow']);

// Bounded ground stepping, rather than a vertical impulse that could be
// repeatedly applied against walls. Collision checks remain server-side.
export function hermesStepUp(player,direction) {
  if(!player.isOnGround || player.isSneaking || player.isInWater || player.isGliding)return false;
  const length=Math.hypot(direction.x,direction.z);
  if(length<0.25)return false;
  const forward={x:direction.x/length,y:0,z:direction.z/length};
  const at=player.location,velocity=player.getVelocity();
  if(velocity.y>0.15 || velocity.y< -0.15)return false;
  const ahead=Math.min(1.5,Math.max(0.65,velocity.x*forward.x+velocity.z*forward.z+0.3));
  const options={includeLiquidBlocks:false,includePassableBlocks:false};
  try {
    const obstacle=player.dimension.getBlockFromRay({...at,y:at.y+0.1},forward,{...options,maxDistance:ahead});
    if(!obstacle || obstacle.block.isLiquid || HAZARDS.has(obstacle.block.typeId))return false;
    // faceLocation is relative to the hit block, including slab/stair shapes.
    const face=obstacle.faceLocation;
    if(!face)return false;
    const hit={x:obstacle.block.location.x+face.x,z:obstacle.block.location.z+face.z};
    const travel=(hit.x-at.x)*forward.x+(hit.z-at.z)*forward.z+0.34;
    if(travel<0.05 || travel>1.85)return false;
    const destination={x:at.x+forward.x*travel,y:at.y,z:at.z+forward.z*travel};
    const floor=player.dimension.getBlockFromRay({...destination,y:at.y+1.01},{x:0,y:-1,z:0},{...options,maxDistance:1.01});
    if(!floor || floor.face!=='Up' || floor.block.isLiquid || HAZARDS.has(floor.block.typeId))return false;
    const top=floor.block.location.y+(floor.faceLocation?.y ?? 1),rise=top-at.y;
    if(rise<0.6 || rise>1.001)return false;
    destination.y=top+0.01;
    // Raycasts ignore passable grass/plants but still reject real collision,
    // ceilings and walls across the whole swept standing volume.
    const samples=Math.ceil(travel/0.2);
    for(let i=0;i<=samples;i++) {
      const x=at.x+forward.x*travel*i/samples,z=at.z+forward.z*travel*i/samples;
      for(const [dx,dz] of [[0,0],[-0.29,-0.29],[-0.29,0.29],[0.29,-0.29],[0.29,0.29]]) {
        const head={x:x+dx,y:destination.y+1.79,z:z+dz};
        if(!player.dimension.getBlock(head))return false;
        if(player.dimension.getBlockFromRay(head,{x:0,y:-1,z:0},{...options,maxDistance:1.78}))return false;
      }
    }
    if(player.tryTeleport(destination,{checkForBlocks:true,keepVelocity:true}))return true;
    // A clear, supported ONE-block ledge can use a native-height automatic
    // hop if the engine rejects stepping. Ground-only gating prevents repeats
    // in the air or climbing taller walls.
    player.applyImpulse({x:0,y:Math.max(0,0.42-velocity.y),z:0});
    return true;
  } catch { return false; } // World limits/unloaded chunks must stop a step.
}
