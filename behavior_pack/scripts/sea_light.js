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
  const p = player.location, velocity = player.getVelocity();
  if (player.isInWater || player.isOnGround) { falls.set(player.id,{top:p.y,used:false}); return false; }
  const fall = falls.get(player.id) || { top: p.y, used: false };
  fall.top = Math.max(fall.top, p.y);
  falls.set(player.id, fall);
  if (!raining || player.dimension.id!=='minecraft:overworld' || velocity.y > -0.5 || fall.used || (fall.top-p.y<2 && velocity.y>-0.9)) return false;
  // Stable raycasts find the actual collidable landing surface. isSolid is a
  // pre-release API and was always undefined in the previous stable build.
  const reach = Math.max(2, Math.ceil(-velocity.y * 2) + 1);
  for (const ahead of [1, 0.5, 0]) {
    try {
      const hit=player.dimension.getBlockFromRay(
        {x:p.x+velocity.x*ahead,y:p.y+0.1,z:p.z+velocity.z*ahead}, {x:0,y:-1,z:0},
        {maxDistance:reach,includePassableBlocks:false,includeLiquidBlocks:false});
      if (!hit?.block || hit.face!=='Up' || hit.block.isAir || hit.block.isLiquid) continue;
      const floor=hit.block;
      const location={x:floor.location.x,y:floor.location.y+1,z:floor.location.z};
      const air = player.dimension.getBlock(location);
      if (!air?.isAir || blocked(player.dimension.id, location) || blocked(player.dimension.id,floor.location)) continue;
      air.setType('minecraft:water');
      try { rememberWater(player.dimension.id,location); }
      catch(error) { air.setType('minecraft:air');throw error; }
      fall.used = true;
      try { player.sendMessage('§b[Olympus v3.4.0] Rain Clutch: water placed automatically; disappears in 5 seconds. No bucket needed.'); } catch {}
      return true;
    } catch {}
  }
  return false;
}
