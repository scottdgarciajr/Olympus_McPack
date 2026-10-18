// Pure rules shared by gameplay and offline tests.
export function cooldownRemaining(expiryMs, currentMs) {
  return Math.max(0, Number(expiryMs || 0) - currentMs);
}

export function dragonVictoriesAvailable(victories, spent) {
  return Math.max(0, Math.floor(Number(victories) || 0) - Math.floor(Number(spent) || 0));
}

export function abilityNeedsCooldown(ability, storm) {
  return !(storm && ability === 'zeusFlight');
}

export function claimRejection(currentRole, existingOwner, claimedCount, maxPlayers, allowDuplicateGods) {
  if (currentRole) return 'already_assigned';
  if (!allowDuplicateGods && existingOwner) return 'god_taken';
  if (claimedCount >= maxPlayers) return 'full';
  return '';
}

export function aresStrengthAmplifier(rageUntilMs, currentMs) {
  return Number(rageUntilMs || 0) > currentMs ? 4 : 1;
}

export function aresResistanceAmplifier(rageUntilMs, currentMs) {
  return Number(rageUntilMs || 0) > currentMs ? 2 : 1;
}

// Bedrock's movement vector uses positive X for left and positive Y for forward.
export function movementDirection(input, view) {
  const magnitude = Math.hypot(input.x, input.y);
  if (magnitude < 0.01) return { x: 0, z: 0 };
  const horizontal = Math.hypot(view.x, view.z) || 1;
  const forwardX = view.x / horizontal, forwardZ = view.z / horizontal;
  const rightX = -forwardZ, rightZ = forwardX;
  return {
    x: (forwardX * input.y - rightX * input.x) / magnitude || 0,
    z: (forwardZ * input.y - rightZ * input.x) / magnitude || 0
  };
}

export function nextMadnessStacks(previousCount, previousTime, currentTime) {
  const count = currentTime - Number(previousTime || 0) > 120_000 ? 0 : Number(previousCount || 0);
  return Math.min(10, count + 1);
}

export function dionysusBlindnessChance(stacks) {
  return Math.min(0.65, Math.max(0, (stacks - 2) * 0.09));
}

export function dionysusBuffAmplifier(id, currentAmplifier, caps) {
  const next = (Number.isFinite(currentAmplifier) ? currentAmplifier : 0) + 1;
  return Math.min(caps[id] ?? 3, next);
}

const BONUS_ORES = {
  coal_ore: 'minecraft:coal', diamond_ore: 'minecraft:diamond', emerald_ore: 'minecraft:emerald',
  iron_ore: 'minecraft:raw_iron', gold_ore: 'minecraft:raw_gold', copper_ore: 'minecraft:raw_copper',
  lapis_ore: 'minecraft:lapis_lazuli', redstone_ore: 'minecraft:redstone',
  nether_quartz_ore: 'minecraft:quartz', nether_gold_ore: 'minecraft:gold_nugget'
};
export function divineOreDrop(blockId) {
  const ore = blockId.replace('minecraft:', '').replace('deepslate_', '');
  return BONUS_ORES[ore];
}

export function stockMissingRelics(container, gods, createItem) {
  for (const god of gods) {
    const relicId = `olympus:${god}_relic`;
    let stocked = false;
    for (let slot = 0; slot < container.size; slot++) {
      if (container.getItem(slot)?.typeId === relicId) { stocked = true; break; }
    }
    if (!stocked && container.addItem(createItem(relicId))) return false;
  }
  return true;
}

// Chargeable native weapons cannot place/modify Hall blocks by using them.
export function nativeChargeWeapon(item) {return ['minecraft:trident','minecraft:bow','minecraft:crossbow'].includes(item?.typeId);}
