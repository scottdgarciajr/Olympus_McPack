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
    // The center ray misses ledges that hit only a shoulder at diagonal
    // mountain edges. Probe the whole leading edge of the player's body.
    const right={x:-forward.z,z:forward.x},hits=[];
    for(const offset of [0,-0.28,0.28]) {
      const origin={x:at.x+right.x*offset,y:at.y+0.1,z:at.z+right.z*offset};
      const hit=player.dimension.getBlockFromRay(origin,forward,{...options,maxDistance:ahead});
      if(hit?.faceLocation)hits.push({hit,offset});
    }
    let hop=false;
    for(const {hit:obstacle,offset} of hits) {
      if(!obstacle || obstacle.block.isLiquid || HAZARDS.has(obstacle.block.typeId))return false;
      // faceLocation is relative to the hit block, including slab/stair shapes.
      const face=obstacle.faceLocation;
      if(!face)return false;
      const hit={x:obstacle.block.location.x+face.x,z:obstacle.block.location.z+face.z};
      const travel=(hit.x-at.x)*forward.x+(hit.z-at.z)*forward.z+0.34;
      if(travel<0.05 || travel>1.85)continue;
      const destination={x:at.x+forward.x*travel+right.x*offset,y:at.y,z:at.z+forward.z*travel+right.z*offset};
      const floor=player.dimension.getBlockFromRay({...destination,y:at.y+1.01},{x:0,y:-1,z:0},{...options,maxDistance:1.01});
      if(!floor || floor.face!=='Up' || floor.block.isLiquid || HAZARDS.has(floor.block.typeId))continue;
      const top=floor.block.location.y+(floor.faceLocation?.y ?? 1),rise=top-at.y;
      if(rise<0.6 || rise>1.001)continue;
      destination.y=top+0.01;
      // Raycasts ignore passable grass/plants but still reject real collision,
      // ceilings and walls across the whole swept standing volume.
      const samples=Math.ceil(travel/0.2);let clear=true;
      for(let i=0;i<=samples;i++) {
        const x=at.x+(destination.x-at.x)*i/samples,z=at.z+(destination.z-at.z)*i/samples;
        for(const [dx,dz] of [[0,0],[-0.29,-0.29],[-0.29,0.29],[0.29,-0.29],[0.29,0.29]]) {
          const head={x:x+dx,y:destination.y+1.79,z:z+dz};
          if(!player.dimension.getBlock(head))clear=false;
          if(player.dimension.getBlockFromRay(head,{x:0,y:-1,z:0},{...options,maxDistance:1.78}))clear=false;
        }
      }
      if(!clear)continue;
      if(player.tryTeleport(destination,{checkForBlocks:true,keepVelocity:true}))return true;
      hop=true;
    }
    // A clear, supported ONE-block ledge can use a native-height automatic
    // hop if the engine rejects stepping. Ground-only gating prevents repeats
    // in the air or climbing taller walls.
    if(hop)player.applyImpulse({x:0,y:Math.max(0,0.42-velocity.y),z:0});
    return hop;
  } catch { return false; } // World limits/unloaded chunks must stop a step.
}
