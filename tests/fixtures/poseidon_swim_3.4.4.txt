// Small, horizontal-only assistance remains available without Tidal Sprint.
// It adds only missing forward speed, leaving knockback/Riptide and vertical
// swimming controls intact rather than clamping all motion to a target.
const tidalBoosted=new Set();
export function recordTidalBoost(player){tidalBoosted.add(player.id);}
export function forgetTidalBoost(id){tidalBoosted.delete(id);}
export function tidalEnvironment(player,wet) {
  if(wet || !tidalBoosted.delete(player.id))return;
  const v=player.getVelocity(),speed=Math.hypot(v.x,v.z),normal=player.isSprinting?0.28:0.21585;
  if(speed>normal)player.applyImpulse({x:v.x/speed*normal-v.x,y:0,z:v.z/speed*normal-v.z});
}
export function poseidonSwimCruise(player,direction,walkingSpeed=0.21585) {
  if(!player.isInWater || player.isSneaking)return false;
  const magnitude=Math.hypot(direction.x,direction.z);
  if(magnitude<0.2)return false;
  const x=direction.x/magnitude,z=direction.z/magnitude,velocity=player.getVelocity();
  const deficit=walkingSpeed*Math.min(1,magnitude)-(velocity.x*x+velocity.z*z);
  if(deficit<=0)return false;
  const acceleration=Math.min(0.04,deficit);
  player.applyImpulse({x:x*acceleration,y:0,z:z*acceleration});
  return true;
}
