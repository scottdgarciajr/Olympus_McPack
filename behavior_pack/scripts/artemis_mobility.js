import {movementDirection} from './rules.js';
const hidden=new Map();
const jumps=new Map();

// One extra press per airborne period, only at actual block light level 0–3.
// Night or another dimension alone does not bypass the darkness requirement.
export function artemisDoubleJump(player,pressed,dark) {
  let state=jumps.get(player.id);
  if(!state||state.dimension!==player.dimension.id){state={dimension:player.dimension.id,pressed:!!pressed,used:false,grounded:false};jumps.set(player.id,state);}
  const edge=!!pressed&&!state.pressed;state.pressed=!!pressed;
  if(player.isInWater||player.isGliding||player.isFlying||player.isClimbing){state.used=true;state.grounded=false;return false;}
  if(player.isOnGround){state.used=false;state.grounded=true;return false;}
  if(!dark||!edge||!state.grounded||state.used)return false;
  state.used=true;
  const velocity=player.getVelocity();
  // Add only the missing vertical lift; preserve horizontal/external momentum.
  const lift=Math.max(0,0.55-velocity.y);
  if(lift)player.applyImpulse({x:0,y:lift,z:0});
  return true;
}

export function artemisMobilityAvailable(player,daytime) {
  if(player.dimension.id!=='minecraft:overworld' || !daytime)return true;
  try {return player.dimension.getLightLevel(player.getHeadLocation())<=3;}catch{return false;}
}

export function artemisSprint(player,speed=1.22,available=false) {
  if(!available)return false;
  if(!player.isSprinting || !player.isOnGround || player.isSneaking || player.isInWater || player.isGliding || player.isFlying)return false;
  const input=player.inputInfo.getMovementVector();
  if(Math.hypot(input.x,input.y)<0.2)return false;
  const direction=movementDirection(input,player.getViewDirection()),v=player.getVelocity();
  // Preserve faster knockback/launches. Only grounded sprinting gets thrust;
  // vertical motion and ordinary airborne/fall rules belong to Minecraft.
  if(Math.hypot(v.x,v.z)>speed)return false;
  const limit=0.55;
  player.applyImpulse({x:Math.max(-limit,Math.min(limit,direction.x*speed-v.x)),y:0,z:Math.max(-limit,Math.min(limit,direction.z*speed-v.z))});
  return true;
}

// Own only short effects installed here; never shorten/remove an invisibility
// potion supplied by another source. Native invisibility still shows equipment.
export function artemisInvisibility(player,enabled,tick,available=false) {
  enabled=enabled&&available;
  if(!enabled && !hidden.has(player.id))return;
  const active=player.getEffect('invisibility');
  if(!enabled) {
    if(active && active.duration<=60 && (hidden.get(player.id)||0)>=tick)player.removeEffect('invisibility');
    hidden.delete(player.id);return;
  }
  if(active && (!hidden.has(player.id)||active.duration>60)) {hidden.delete(player.id);return;}
  if(!active || active.duration<=20) {
    player.addEffect('invisibility',60,{amplifier:0,showParticles:false});hidden.set(player.id,tick+60);
  }
}

export function forgetArtemis(id) {hidden.delete(id);jumps.delete(id);}
