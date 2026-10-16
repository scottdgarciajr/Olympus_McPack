import {placeClutchWater,removeClutchWater} from './rain_water.js';
// Environment powers kept separate from claims, Crown records, and forge systems.
const swimmers = new Map();
const fogged = new Set();
const falls = new Map();
const lightCache = new Map();
const FOG = 'olympus_poseidon_water';

export function poseidonMiningHaste(player, headSlot, targetMultiplier = 1.06) {
  let submerged = player.isInWater, affinity = false;
  try {
    const head=player.dimension.getBlock(player.getHeadLocation());
    submerged=!!head && (['minecraft:water','minecraft:flowing_water'].includes(head.typeId) || head.isWaterlogged===true);
  } catch {}
  try {
    const helmet=player.getComponent('minecraft:equippable')?.getEquipment(headSlot);
    affinity=!!helmet?.getComponent('minecraft:enchantable')?.getEnchantment('minecraft:aqua_affinity');
  } catch {}
  // Bedrock's Haste multiplier is exponential. Compensate only the active
  // fivefold submerged/floating penalties, then round up to a modest bonus.
  const penalty=(submerged && !affinity ? 5 : 1)*(player.isOnGround ? 1 : 5);
  const level=Math.max(1,Math.ceil(Math.log(penalty*targetMultiplier)/Math.log(1.2)));
  return level-1;
}

export function lightPower(player, sunny, daytime, tick) {
  const cached = lightCache.get(player.id);
  if (cached && cached.tick === tick) return cached.value;
  let level = 0;
  try { level = player.dimension.getLightLevel(player.getHeadLocation()); } catch {}
  const value = { sun: sunny, lit: sunny || level > 0,
    weak: !daytime || (!sunny && level === 0), level };
  lightCache.set(player.id, { tick, value });
  return value;
}

export function clearEnvironment(player, force = false) {
  if (force || fogged.has(player.id)) {
    try { player.runCommand(`fog @s remove ${FOG}`); } catch {}
    fogged.delete(player.id);
  }
  swimmers.delete(player.id);
  falls.delete(player.id);
  lightCache.delete(player.id);
}

export function forgetEnvironment(id) {
  fogged.delete(id); swimmers.delete(id); falls.delete(id); lightCache.delete(id);
}

export function seaEnvironment(player, active) {
  if (!active) { clearEnvironment(player); return; }
  // Remove our named layer before reapplying it: reconnects cannot stack fog.
  if (!fogged.has(player.id)) {
    try { player.runCommand(`fog @s remove ${FOG}`); } catch {}
    try {
      player.runCommand(`fog @s push olympus:clear_water ${FOG}`);
      fogged.add(player.id);
    } catch {}
  }
  // Cancel swimming exhaustion without filling an already hungry player's bar.
  const hunger = player.getComponent('minecraft:player.hunger');
  const saturation = player.getComponent('minecraft:player.saturation');
  const exhaustion = player.getComponent('minecraft:player.exhaustion');
  if (!player.isSwimming || !player.isInWater) { swimmers.delete(player.id); return; }
  const previous = swimmers.get(player.id);
  if (previous && hunger && saturation) {
    if (hunger.currentValue < previous.hunger) hunger.setCurrentValue(previous.hunger);
    if (saturation.currentValue < previous.saturation) saturation.setCurrentValue(previous.saturation);
  }
  if (exhaustion) exhaustion.setCurrentValue(0);
  if (hunger && saturation) swimmers.set(player.id, {
    hunger: hunger.currentValue, saturation: saturation.currentValue
  });
}

export function bucketClutch(player, raining, blocked, rememberWater) {
  const p=player.location,velocity=player.getVelocity();
  if(player.isInWater || player.isOnGround){falls.set(player.id,{top:p.y,announced:false});return false;}
  const fall=falls.get(player.id)||{top:p.y,announced:false};
  fall.top=Math.max(fall.top,p.y);falls.set(player.id,fall);
  if(!raining || player.dimension.id!=='minecraft:overworld' || velocity.y> -0.15 || (fall.top-p.y<2 && velocity.y> -0.6))return false;
  const options={includePassableBlocks:false,includeLiquidBlocks:false};
  const footprint=[[0,0],[-0.3,-0.3],[-0.3,0.3],[0.3,-0.3],[0.3,0.3],[-0.75,0],[0.75,0],[0,-0.75],[0,0.75]];
  let position={...p},v={...velocity},floors=[];
  // Recompute every tick, even after an earlier placement: a second Riptide
  // launch can change the landing completely. Sweep four upcoming ticks, not
  // just the column below the player, with all four body corners included.
  for(let tick=0;tick<4 && !floors.length;tick++) {
    const next={x:position.x+v.x,y:position.y+v.y,z:position.z+v.z};
    const delta={x:v.x,y:v.y,z:v.z},length=Math.hypot(v.x,v.y,v.z),seen=new Set();
    for(const [dx,dz] of footprint)for(const vertical of [false,true])try {
      const origin=vertical ? {x:next.x+dx,y:position.y+0.2,z:next.z+dz} : {x:position.x+dx,y:position.y+0.1,z:position.z+dz};
      const direction=vertical?{x:0,y:-1,z:0}:{x:delta.x/length,y:delta.y/length,z:delta.z/length};
      const hit=player.dimension.getBlockFromRay(origin,direction,{...options,maxDistance:vertical?Math.max(0.3,-v.y+0.3):length+0.2});
      if(!hit?.block || hit.face!=='Up' || hit.block.isAir || hit.block.isLiquid)continue;
      if(hit.block.location.y+1>position.y+0.3)continue;
      const at=hit.block.location,key=`${at.x},${at.y},${at.z}`;
      if(!seen.has(key)){seen.add(key);floors.push(at);}
    } catch {}
    position=next;
    v={x:v.x*0.98,y:(v.y-0.08)*0.98,z:v.z*0.98};
  }
  let placed=0;const visited=new Set();
  // A 3x3 cushion above and between the landing blocks catches edge/corner
  // contacts and gives fast
  // falls time to enter water before hitting terrain. Air only; no terrain is
  // replaced (gaps at terrain height are filled with water too). Every source
  // uses real contained water and is tracked for the two-second cleanup.
  for(const floor of floors)for(const dy of [1,0,2])for(const dx of [0,-1,1])for(const dz of [0,-1,1])try {
    if(placed>=48)break;
    const location={x:floor.x+dx,y:floor.y+dy,z:floor.z+dz},key=`${location.x},${location.y},${location.z}`;
    if(visited.has(key))continue;visited.add(key);
    if(blocked(player.dimension.id,location) || blocked(player.dimension.id,floor))continue;
    const air=player.dimension.getBlock(location);
    if(!air?.isAir)continue;
    placeClutchWater(air);
    try{rememberWater(player.dimension.id,location);}catch(error){removeClutchWater(air);throw error;}
    placed++;
  } catch {}
  if(placed && !fall.announced) {
    fall.announced=true;
    try{player.sendMessage('§b[Olympus v3.3.4] Rain Clutch: still landing water placed; disappears in 2 seconds.');}catch{}
  }
  return placed>0;
}
