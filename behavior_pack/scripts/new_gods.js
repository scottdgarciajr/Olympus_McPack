// Native effect passives plus bounded, resource-costed building/enchanting utilities.
export const NEW_GODS = {
  athena: {
    title: 'Goddess of Wisdom', altar: [10, 5, 6], offering: ['minecraft:book', 3],
    description: 'Resistance I and Haste I; permanent Weakness I. Aegis grants Resistance II for 12s every 3m. Sneak-use: Enchanting Workshop upgrades Unbreaking III, Efficiency IV, Protection III, Feather Falling IV, Sharpness IV, Power IV, Respiration III or Aqua Affinity I. Every upgrade costs XP/lapis near an enchanting table, shared 3m cooldown. Bookbinding consumes a source book, 12 XP levels and 8 lapis, preserving native caps/conflicts. Wisdom: +2 raw XP per credited hostile kill, +1 for common livestock/fish, up to 40 bonus XP/minute. No damage bonus.',
    controls: 'Use relic: Aegis, Resistance II for 12s (3m cooldown). Resistance I and Haste I are passive; Weakness I always. Sneak-use: Enchanting Workshop with eight native upgrades and book transfer/combination. Put ordinary target gear in next hotbar slot and source book in the slot after that. Near enchanting table (2 blocks); listed XP/lapis costs and shared 3m cooldown. Bound equipment and tridents excluded; no over-cap enchants or free rare books. Credited hostile kills earn +2 raw XP, livestock/fish +1, capped at 40 bonus XP per rolling minute.',
    weakness: 'Weakness I', ability: 'athenaAegis', label: 'Aegis', seconds: 12,
    passive: [['resistance', 0], ['haste', 0]], active: [['resistance', 1]], penalty: ['weakness', 0],
    stolen: [['Wisdom guard', 'resistance', 0], ['Wisdom burden', 'weakness', 0]]
  },
  artemis: {
    title: 'Goddess of the Hunt', altar: [16, 5, 6], offering: ['minecraft:flint', 8],
    description: 'Night/darkness counterpart to Apollo: Moon Bow gains Apollo-style arrow steering and +10 damage, Speed II and Night Vision at Overworld night or light level 0-3. Weakness III in brighter daytime. Continuous creature-only Oracle tracking and native invisibility toggle and 1.22 ground sprint at night, in darkness or other dimensions; no flight or chest scans. In actual darkness (light 0-3), press jump again in the air for one extra jump; landing resets it.',
    controls: 'Ground sprint target: 1.22 blocks/tick (other gods unchanged); sprint boost/invisibility require night, darkness or another dimension. Use relic: Huntstride (Speed III/Jump Boost II, 10s/2m), requiring night or darkness. Sneak-use: Hunt Controls for conditional invisibility and continuous creature Oracle (48m, no cooldown); no chest tracking. Moon Bow: Apollo-style aim assist and +10 damage at Overworld night or light 0-3. Speed II/Night Vision in those conditions; otherwise Weakness III. Double jump only at light 0-3: release and press jump again in the air; one extra jump, reset on landing. Night/other dimensions alone do not unlock it. No flight or fall immunity.',
    weakness: 'Weakness III in brighter daytime; no flight or fall protection', ability: 'artemisHunt', label: 'Huntstride', seconds: 10,
    passive: [['speed', 1]], active: [['speed', 2], ['jump_boost', 1]], penalty: ['weakness', 2],
    stolen: [['Hunt pace', 'speed', 1], ['Daylight burden', 'weakness', 1]]
  },
  hestia: {
    title: 'Goddess of the Hearth', altar: [22, 5, 6], offering: ['minecraft:coal', 8],
    description: 'Fire Resistance and Haste I; permanent Weakness II. Use relic: open toolbox, take separate selection wand, paint brush, clipboard, terrain shaper, eraser, building trowel or undo charm. Every placement consumes resources. Hearth Renewal remains inside the toolbox: self-only Regeneration I, 8s every 3m.',
    controls: 'Use relic or toolbox normally to open building tools. Choose a material from anywhere in inventory, take a tool, hold it and use it. Selection Wand: tap two opposite corners, then Fill or Copy. Sneak-use tools for short options menus. Brush paints, Clipboard pastes, Terrain Shaper raises/lowers, Eraser removes, Trowel makes floor/wall/stairs, Undo Charm reverses edits. Small edits have short cooldowns (1-20s scaled by size); 128 blocks/edit, 16m reach, 24 saved undo/redo steps. Put tools away and take them out from the toolbox. Hearth Renewal and Tool Vault are clearly labeled toolbox buttons.',
    weakness: 'Weakness II', ability: 'hestiaRenewal', label: 'Hearth Renewal', seconds: 8,
    passive: [['fire_resistance', 0], ['haste', 0]], active: [['regeneration', 0]], penalty: ['weakness', 1],
    stolen: [['Hearth ward', 'fire_resistance', 0], ['Hearth burden', 'weakness', 1]]
  }
};

export function artemisPower(player, night) {
  let level=15;
  try { level=player.dimension.getLightLevel(player.getHeadLocation()); } catch {}
  return {active:night||level<=3, dark:level<=3, level};
}

export function newGodTick(player, god, {buff, penalty, clearBuff, clearPenalty=()=>{}, night, now}) {
  const spec = NEW_GODS[god];
  if (!spec) return;
  const active = Number(player.getDynamicProperty('olympus:newGodUntil') || 0) > now;
  if(god==='artemis') {
    clearPenalty(player,'mining_fatigue'); // Remove the retired 3.5.0 burden.
    if(!artemisPower(player,night).active) {
      clearBuff(player,'speed');clearBuff(player,'night_vision');
      penalty(player,'weakness',3,2);return;
    }
    clearPenalty(player,'weakness');
  }
  for (const [id, level] of spec.passive) {
    // Never downgrade a burst on the next passive update.
    if (!active || !spec.active.some(([effect]) => effect === id)) buff(player, id, level);
  }
  if(god!=='artemis')penalty(player, spec.penalty[0], 3, spec.penalty[1]);
  if (god === 'artemis') {
    buff(player, 'night_vision', 0, 15);
  }
}

export function useNewGod(player, god, {ready, startCooldown, now, tell, flair, moonPower}) {
  const spec = NEW_GODS[god];
  if (!spec) return false;
  if(god==='artemis' && moonPower && !moonPower(player).active) {tell(player,'Huntstride requires Overworld night or darkness (light 0-3).');return true;}
  if (!ready(player, spec.ability, spec.label)) return true;
  // One application: regeneration must not restart on every passive tick.
  for (const [id, amplifier] of spec.active) {
    const current = player.getEffect(id);
    if (!current || current.amplifier < amplifier ||
        (current.amplifier === amplifier && current.duration < spec.seconds * 20)) {
      player.addEffect(id, spec.seconds * 20, {amplifier, showParticles: false});
    }
  }
  player.setDynamicProperty('olympus:newGodUntil', now + spec.seconds * 1000);
  startCooldown(player, spec.ability);
  tell(player, `${spec.label}: ${spec.seconds}s. ${spec.controls}`);
  flair(player, god, true);
  return true;
}

// Only fill an empty, loaded footprint in old Halls. Never replace player blocks.
export function installNewAltars(dimension, temple) {
  const blocked = [];
  for (const [god, spec] of Object.entries(NEW_GODS)) {
    const [x, , z] = spec.altar;
    const blocks = [];
    for (const [y, type] of [[3, 'minecraft:chiseled_quartz_block'], [4, 'minecraft:chiseled_quartz_block'], [5, 'minecraft:enchanting_table']]) {
      const block = dimension.getBlock({x: temple.x + x, y: temple.y + y, z: temple.z + z});
      blocks.push([block, type]);
    }
    if (blocks.some(([block, type]) => !block || (!block.isAir && block.typeId !== type))) {
      blocked.push(god); continue;
    }
    for (const [block, type] of blocks) if (block.typeId !== type) block.setType(type);
  }
  return blocked;
}
