const HAZARDS=new Set(['minecraft:lava','minecraft:flowing_lava','minecraft:fire','minecraft:soul_fire','minecraft:cactus','minecraft:magma','minecraft:campfire','minecraft:soul_campfire','minecraft:powder_snow']);
const FULL=new Set(['grass','grass_block','dirt','coarse_dirt','rooted_dirt','dirt_with_roots','sand','red_sand','gravel','stone','cobblestone','deepslate','cobbled_deepslate','sandstone','red_sandstone','quartz_block','smooth_quartz','snow','netherrack','end_stone'].map(id=>'minecraft:'+id));
const PASSABLE=new Set(['air','short_grass','tallgrass','tall_grass','fern','large_fern','deadbush','dead_bush','dandelion','poppy','blue_orchid','allium','azure_bluet','oxeye_daisy','cornflower','lily_of_the_valley','white_tulip','orange_tulip','pink_tulip','red_tulip','sunflower','lilac','rose_bush','peony','structure_void'].map(id=>'minecraft:'+id));
function naturalStep(player,direction) {
  if(!player.teleport || player.isSneaking || player.isInWater || player.isGliding)return false;
  const length=Math.hypot(direction.x,direction.z);if(length<0.25)return false;
  const at=player.location,v=player.getVelocity();if(v.y>0.15)return false;
  const blockAt=(x,y,z)=>player.dimension.getBlock({x:Math.floor(x),y:Math.floor(y),z:Math.floor(z)});
  // Verify physical support rather than trusting isOnGround during fast
  // collision ticks. Only feet actually touching a full block may step.
  const feet=Math.round(at.y);
  if(Math.abs(at.y-feet)>0.1 || !FULL.has(blockAt(at.x,feet-0.05,at.z)?.typeId))return false;
  const forward={x:direction.x/length,z:direction.z/length},right={x:-forward.z,z:forward.x};
  const clear=(x,y,z)=>{
    for(let bx=Math.floor(x-0.29);bx<=Math.floor(x+0.29);bx++)for(let bz=Math.floor(z-0.29);bz<=Math.floor(z+0.29);bz++)for(let by=Math.floor(y);by<=Math.floor(y+1.79);by++) {
      const block=blockAt(bx,by,bz);if(!block || !(block.isAir || PASSABLE.has(block.typeId)))return false;
    }
    return true;
  };
  for(const distance of [0.35,0.55,0.75,1,1.25,1.5])for(const offset of [0,-0.22,0.22]) {
    const x=at.x+forward.x*distance+right.x*offset,z=at.z+forward.z*distance+right.z*offset;
    const floor=blockAt(x,feet+0.05,z);if(!FULL.has(floor?.typeId))continue;
    const y=feet+1.01;if(y-at.y<0.6 || y-at.y>1.12)continue;
    let fits=true;const samples=Math.ceil(distance/0.15);
    for(let i=0;i<=samples;i++)if(!clear(at.x+(x-at.x)*i/samples,y,at.z+(z-at.z)*i/samples)){fits=false;break;}
    if(!fits)continue;
    // The complete swept body was checked above. Native teleport avoids
    // checkForBlocks treating harmless plants as a rejected destination.
    player.teleport({x,y,z},{keepVelocity:true});return true;
  }
  return false;
}

// Bounded ground stepping, rather than a vertical impulse that could be
// repeatedly applied against walls. Collision checks remain server-side.
export function hermesStepUp(player,direction) {
  try{if(naturalStep(player,direction))return true;}catch{return false;}
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
