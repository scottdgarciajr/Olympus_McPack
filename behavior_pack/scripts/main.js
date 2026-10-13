import { world, system, ItemStack, EnchantmentTypes, MolangVariableMap, InputButton, ButtonState, EntityDamageCause, EquipmentSlot } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { CONFIG } from './config.js';
import { cooldownRemaining, abilityNeedsCooldown, claimRejection, aresStrengthAmplifier, aresResistanceAmplifier, movementDirection, nextMadnessStacks, dionysusBlindnessChance, divineOreDrop, stockMissingRelics } from './rules.js';
import { FLAIR, flairPoints } from './flair.js';
import { configureCrown, crowned, crownCooldownSeconds, atThrone, showThrone, showStatus, showLeaderboard, resetCrown, recoverCrown, transferOnDeath, crownTick, crownDominionTick, crownOwnerLeft, cleanCrownDrops, crownFlair, revealCrown, crownHelp, crownSetup, crownControl } from './crown.js';
import { configureDominion, inUnderworldDominion, temporaryBlock, dominionFlair } from './dominion.js';
import { configureForge, forgeBlock, showForge, onForgeHurt, forgeEquipmentTick } from './forge.js';

const GODS = ['hermes', 'zeus', 'poseidon', 'hades', 'ares', 'apollo', 'hephaestus', 'dionysus'];
const TITLES = {
  hermes: 'God of Travelers', zeus: 'God of Thunder', poseidon: 'God of the Sea',
  hades: 'God of the Underworld', ares: 'God of War', apollo: 'God of the Sun',
  hephaestus: 'God of Craftsmanship', dionysus: 'God of Wine and Madness'
};
const DESCRIPTIONS = {
  hermes: 'Speed VI, Flash-fast sprint, and fall protection; Weakness III. Divine Pearl every 5 minutes.',
  zeus: 'Mining Fatigue II always. Lightning has a 5-second interval in thunder; 30-second flight remains unrestricted in rain or thunder.',
  poseidon: 'Conduit Power, Dolphin’s Grace III, and toggled fast movement in water or open rain; rain-only fall protection. Slowness III and Weakness III in Nether/desert.',
  hades: 'Fire Resistance and Night Vision; Slowness III and Weakness III by day. Strength IV and Haste IV in Nether or End.',
  ares: 'Strength II and Resistance II; Slowness III. Strength V and Resistance III rage for 30 seconds every 5 minutes.',
  apollo: 'Infinite Solar Bow with heavy sunlight damage; Weakness III and Mining Fatigue II outside direct sunlight. Daylight flight every 3 minutes.',
  hephaestus: 'Haste IV, Divine Fortune IV pickaxe, and exclusive costly item combinations at the Hall forge; permanent Weakness III.',
  dionysus: 'Every new foe can be cursed immediately. Each hit stacks buffs and Nausea, teleports you, and may blind you as madness grows. Infinite Bone Meal.'
};
const CONTROLS = {
  hermes: 'Speed VI always; sprint for Speed XIV with extra momentum. Use relic: pearl (5m). Sneak-use: Slow Falling on/off. Weakness III.',
  zeus: 'Aim at a block or enemy, use relic: lightning. Sneak-use: 30s flight. Each has a 3m cooldown in clear weather; thunder lightning has a 5s interval. Flight stays unrestricted in rain/thunder.',
  poseidon: 'Sneak-use relic: Tidal Sprint on/off in water or open rain. Conduit Power and Dolphin’s Grace III; no fall damage during rain. Tidecaller uses Riptide.',
  hades: 'Fire Resistance and Night Vision always; Slowness III/Weakness III by day; Strength IV/Haste IV in Nether and End.',
  ares: 'Use relic: War Rage, Strength V and Resistance III for 30s (5m). Strength II, Resistance II, Slowness III are passive.',
  apollo: 'Use relic in direct daylight: 30s Sunflight (3m). Jump up, sneak down, release to hover. One arrow fuels your infinite Solar Bow.',
  hephaestus: 'Haste IV and permanent Weakness III. Your pickaxe has Divine Fortune IV bonus drops. Combine equipment at the Hall forge.',
  dionysus: 'Melee-hit different foes to stack buffs instantly. The same foe has a 3s cooldown. Madness builds Nausea and Blindness risk. Bone Meal refills.'
};
const MANAGED = ['speed', 'weakness', 'slow_falling', 'strength', 'mining_fatigue', 'conduit_power',
  'dolphins_grace', 'slowness', 'fire_resistance', 'night_vision', 'haste', 'resistance',
  'levitation', 'jump_boost', 'nausea', 'blindness', 'regeneration'];
const prefix = '§6[Olympus]§r ';
const PACK_VERSION = '2.2.0';
const TEMPLE_SIZE = { x: 33, y: 15, z: 33 };
const TEMPLE_ALTARS = {
  hermes: [5, 5, 6], zeus: [27, 5, 6], poseidon: [5, 5, 13], hades: [27, 5, 13],
  ares: [5, 5, 20], apollo: [27, 5, 20], hephaestus: [5, 5, 27], dionysus: [27, 5, 27]
};
const OFFERINGS = {
  hermes: ['minecraft:feather', 8], zeus: ['minecraft:copper_ingot', 1],
  poseidon: ['minecraft:cod', 3], hades: ['minecraft:bone', 4],
  ares: ['minecraft:stone_sword', 1], apollo: ['minecraft:bow', 1],
  hephaestus: ['minecraft:furnace', 1], dionysus: ['minecraft:sweet_berries', 3]
};
const WEAKNESSES = {
  hermes: 'Weakness III', zeus: 'Mining Fatigue II', poseidon: 'Slowness III and Weakness III in Nether or desert',
  hades: 'Slowness III and Weakness III by day', ares: 'Slowness III',
  apollo: 'Weakness III and Mining Fatigue II outside direct sunlight',
  hephaestus: 'Weakness III', dionysus: 'Rising Nausea and possible Blindness as madness stacks'
};
const NEW_MOUNTAIN_HEIGHT = 24;
const MOUNTAIN_RADIUS = 31;
const lastRelicUse = new Map();
const lastFlairUse = new Map();
const hermesTrailTick = new Map();
const hermesFallTick = new Map();
const hermesTurboTick = new Map();
const poseidonTrailTick = new Map();
const poseidonFallGuardTick = new Map();
const dionysusTargetCooldowns = new Map();
const warnedFlair = new Set();
const godPenalties = new Map();
const godBuffs = new Map();
const PERSONAL_TOOLS = {
  poseidon: ['minecraft:trident', '§bPoseidon’s Tidecaller'],
  apollo: ['minecraft:bow', '§eApollo’s Solar Bow'],
  hephaestus: ['minecraft:diamond_pickaxe', '§6Hephaestus’s Divine Fortune IV']
};
let currentWeather;
const key = (name) => `olympus:${name}`;
const role = (p) => p.getDynamicProperty(key('role')) || '';
const hermesSlowfallEnabled = (p) => p.getDynamicProperty(key('hermesSlowfall')) !== false;
const poseidonSpeedEnabled = (p) => p.getDynamicProperty(key('poseidonSpeed')) !== false;
function weather() {
  if (currentWeather) return currentWeather;
  currentWeather = world.getDynamicProperty(key('weather')) || 'Clear';
  return currentWeather;
}
function inRain(player) {
  if (player.dimension.id !== 'minecraft:overworld' || weather() === 'Clear') return false;
  try {
    const biome = player.dimension.getBiome(player.location).id;
    if (['desert', 'savanna', 'badlands'].some(name => biome.includes(name))) return false;
    const top = player.dimension.getTopmostBlock({ x: Math.floor(player.location.x), z: Math.floor(player.location.z) });
    return !!top && top.location.y < player.location.y + 1;
  } catch { return false; }
}
function zeusStorm(player) {
  return player.dimension.id === 'minecraft:overworld' && weather() !== 'Clear';
}
function zeusThunder(player) { return player.dimension.id === 'minecraft:overworld' && weather() === 'Thunder'; }
function submerged(player) {
  if (!player.isInWater) return false;
  if (player.isSwimming) return true;
  const p = player.location;
  try { return player.dimension.getBlock({ x: Math.floor(p.x), y: Math.floor(p.y + 1.5), z: Math.floor(p.z) })?.typeId === 'minecraft:water'; }
  catch { return false; }
}
function skyExposed(player) {
  if (player.dimension.id !== 'minecraft:overworld') return false;
  const p = player.location;
  try {
    const top = player.dimension.getTopmostBlock({ x: Math.floor(p.x), z: Math.floor(p.z) });
    return !!top && top.location.y < p.y + 1;
  } catch { return false; }
}
function owners(god) {
  const raw = world.getDynamicProperty(key(`owner_${god}`));
  if (typeof raw !== 'string' || !raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [raw]; }
  catch { return [raw]; }
}
const owner = (god) => owners(god)[0] || '';
const now = () => Date.now();
configureCrown({ role, temple: () => temple(), offeringCount: (p,id) => offeringCount(p,id), takeOffering: (p,id,n) => takeOffering(p,id,n), weather, setWeather: value => { currentWeather = value; world.setDynamicProperty(key('weather'), value); }, fail });
configureDominion(fail);
configureForge({ role, temple: () => temple(), fail });
const nameOf = (god) => god.charAt(0).toUpperCase() + god.slice(1);
function tell(player, message) { player.sendMessage(prefix + message); }
function fail(e) { console.warn(`[Olympus] ${e?.stack || e}`); }
function effect(entity, id, seconds, amplifier = 0) {
  entity.addEffect(id, seconds * 20, { amplifier, showParticles: false });
}
function godPenalty(player, id, seconds, amplifier = 0) {
  if (crowned(player) && role(player) !== 'zeus') return;
  effect(player, id, seconds, amplifier);
  godPenalties.set(`${player.id}:${id}`, { amplifier, tick: system.currentTick });
}
function godBuff(player, id, amplifier) {
  const k = `${player.id}:${id}`;
  const old = godBuffs.get(k);
  const active = player.getEffect(id);
  if (old && old.amplifier > amplifier && active?.amplifier === old.amplifier) { player.removeEffect(id); godBuffs.delete(k); }
  const current = player.getEffect(id);
  if (current && current.amplifier > amplifier) return;
  effect(player, id, 3, amplifier);
  godBuffs.set(k, { amplifier, tick: system.currentTick });
}
function clearGodBuff(player, id) {
  const k = `${player.id}:${id}`;
  const tracked = godBuffs.get(k);
  if (!tracked) return;
  try { if (player.getEffect(id)?.amplifier === tracked.amplifier && system.currentTick-tracked.tick < 80) player.removeEffect(id); } catch {}
  godBuffs.delete(k);
}
function clearGodPenalty(player, id) {
  const k = `${player.id}:${id}`;
  const tracked = godPenalties.get(k);
  if (!tracked) return;
  try { if (player.getEffect(id)?.amplifier === tracked.amplifier && system.currentTick-tracked.tick < 120) player.removeEffect(id); } catch {}
  godPenalties.delete(k);
}
function suppressOldPenalties(player) {
  if (!crowned(player) || role(player) === 'zeus') return;
  for (const id of ['weakness', 'slowness', 'mining_fatigue', 'nausea', 'blindness']) {
    const key = `${player.id}:${id}`;
    const tracked = godPenalties.get(key);
    if (!tracked) continue;
    const active = player.getEffect(id);
    if (active?.amplifier === tracked.amplifier && system.currentTick - tracked.tick < 120) player.removeEffect(id);
    godPenalties.delete(key);
  }
}
function showFlair(player, god, full = false) {
  const design = FLAIR[god];
  if (!design) return;
  try {
    const points = flairPoints(god);
    const view = player.getViewDirection();
    const horizontal = Math.hypot(view.x, view.z) || 1;
    const rightX = -view.z / horizontal, rightZ = view.x / horizontal;
    const forwardX = view.x / horizontal, forwardZ = view.z / horizontal;
    const at = player.location;
    const color = new MolangVariableMap();
    color.setColorRGB('variable.color', { red: design.color[0], green: design.color[1], blue: design.color[2] });
    const selected = full ? points : [points[(system.currentTick + 1) % points.length], points[(system.currentTick + 9) % points.length], points[(system.currentTick + 17) % points.length]];
    for (const point of selected) {
      player.dimension.spawnParticle('minecraft:colored_flame_particle', {
        x: at.x + rightX * point.x + forwardX * point.z,
        y: at.y + 1.45 + point.y,
        z: at.z + rightZ * point.x + forwardZ * point.z
      }, color);
    }
  } catch (e) {
    if (!warnedFlair.has(`particle_${god}`)) { warnedFlair.add(`particle_${god}`); fail(e); }
  }
  if (full) {
    try { player.dimension.playSound(design.sound, player.location, { volume: 0.6, pitch: 1 }); }
    catch (e) {
      if (!warnedFlair.has(`sound_${god}`)) { warnedFlair.add(`sound_${god}`); fail(e); }
    }
  }
}
function cosmeticFlair(player, god) {
  const previous = lastFlairUse.get(player.id) || 0;
  if (now() - previous < 10000) return;
  lastFlairUse.set(player.id, now());
  showFlair(player, god, true);
}
function hermesMotion(player) {
  try {
    const input = player.inputInfo.getMovementVector();
    const magnitude = Math.hypot(input.x, input.y);
    const turbo = player.isSprinting && !player.isInWater && !player.isSneaking && magnitude >= 0.25;
    if (!turbo) {
      if (hermesTurboTick.has(player.id)) {
        hermesTurboTick.delete(player.id);
        player.removeEffect('speed');
        effect(player, 'speed', 5, CONFIG.hermesSpeedAmplifier);
      }
      return;
    }
    // A very high sprint-only speed effect is the reliable floor. Directional
    // momentum pushes beyond it, while walking returns to a controllable pace.
    const lastBoost = hermesTurboTick.get(player.id);
    if (lastBoost === undefined || system.currentTick - lastBoost >= 10) {
      effect(player, 'speed', 2, CONFIG.hermesTurboAmplifier);
      hermesTurboTick.set(player.id, system.currentTick);
      if (lastBoost === undefined) player.onScreenDisplay.setActionBar('§e⚡ Hermes super speed');
    }
    const view = player.getViewDirection();
    const horizontal = Math.hypot(view.x, view.z) || 1;
    const forwardX = view.x / horizontal, forwardZ = view.z / horizontal;
    const rightX = -forwardZ, rightZ = forwardX;
    const { x: directionX, z: directionZ } = movementDirection(input, view);
    const velocity = player.getVelocity();
    const targetX = directionX * CONFIG.hermesSprintSpeed;
    const targetZ = directionZ * CONFIG.hermesSprintSpeed;
    const acceleration = player.isOnGround ? 0.55 : 0.18;
    const impulseX = Math.max(-acceleration, Math.min(acceleration, targetX - velocity.x));
    const impulseZ = Math.max(-acceleration, Math.min(acceleration, targetZ - velocity.z));
    player.applyImpulse({ x: impulseX, y: 0, z: impulseZ });
    const previous = hermesTrailTick.get(player.id) || 0;
    if (system.currentTick - previous >= 2) {
      hermesTrailTick.set(player.id, system.currentTick);
      const color = new MolangVariableMap();
      color.setColorRGB('variable.color', { red: 1, green: 0.8, blue: 0.2 });
      for (const side of [-0.45, -0.2, 0.2, 0.45]) player.dimension.spawnParticle('minecraft:colored_flame_particle', {
        x: player.location.x - directionX * (0.65 + Math.abs(side)) + rightX * side,
        y: player.location.y + (Math.abs(side) > 0.3 ? 0.65 : 0.15),
        z: player.location.z - directionZ * (0.65 + Math.abs(side)) + rightZ * side
      }, color);
    }
  } catch (e) { if (CONFIG.debug) fail(e); }
}
function hermesFallProtection(player) {
  if (hermesSlowfallEnabled(player)) return;
  try {
    if (!player.isFalling || player.getVelocity().y >= -0.38) return;
    const previous = hermesFallTick.get(player.id) || -20;
    if (system.currentTick - previous < 10) return;
    hermesFallTick.set(player.id, system.currentTick);
    effect(player, 'slow_falling', 2);
  } catch (e) { if (CONFIG.debug) fail(e); }
}
function poseidonMotion(player) {
  try {
    if ((!player.isInWater && !inRain(player)) || !poseidonSpeedEnabled(player)) return;
    const input = player.inputInfo.getMovementVector();
    const magnitude = Math.hypot(input.x, input.y);
    if (magnitude < 0.2) return;
    const view = player.getViewDirection();
    const horizontal = Math.hypot(view.x, view.z) || 1;
    const forwardX = view.x / horizontal, forwardZ = view.z / horizontal;
    const direction = movementDirection(input, view);
    const desiredX = direction.x * CONFIG.poseidonSwimSpeed;
    const desiredZ = direction.z * CONFIG.poseidonSwimSpeed;
    const velocity = player.getVelocity();
    player.applyImpulse({
      x: Math.max(-0.5, Math.min(0.5, desiredX - velocity.x)),
      y: player.isInWater ? Math.max(-0.2, Math.min(0.2, view.y * input.y * 0.6 - velocity.y)) : 0,
      z: Math.max(-0.5, Math.min(0.5, desiredZ - velocity.z))
    });
    const previous = poseidonTrailTick.get(player.id) || 0;
    if (system.currentTick - previous >= 2) {
      poseidonTrailTick.set(player.id, system.currentTick);
      const color = new MolangVariableMap();
      color.setColorRGB('variable.color', { red: 0.1, green: 0.7, blue: 1 });
      player.dimension.spawnParticle('minecraft:colored_flame_particle', {
        x: player.location.x - forwardX * 0.65, y: player.location.y + 0.85,
        z: player.location.z - forwardZ * 0.65
      }, color);
    }
  } catch (e) { if (CONFIG.debug) fail(e); }
}
function poseidonFallProtection(player) {
  try {
    const lastGuardTick = poseidonFallGuardTick.get(player.id);
    if (zeusStorm(player) && player.isFalling && player.getVelocity().y < -0.35) {
      // Resistance V blocks landing damage without changing descent speed.
      effect(player, 'resistance', 1, 4);
      poseidonFallGuardTick.set(player.id, system.currentTick);
    } else if (lastGuardTick !== undefined &&
        (!zeusStorm(player) || system.currentTick - lastGuardTick > 2)) {
      player.removeEffect('resistance');
      poseidonFallGuardTick.delete(player.id);
    }
  } catch (e) { if (CONFIG.debug) fail(e); }
}
function remaining(player, ability) {
  return cooldownRemaining(player.getDynamicProperty(key(`cd_${ability}`)), now());
}
function ready(player, ability, label) {
  if (ability === 'zeusLightning') {
    const stormMs = cooldownRemaining(player.getDynamicProperty(key('cd_zeusStormLightning')), now());
    const normalMs = weather() === 'Clear' ? remaining(player, ability) : 0;
    const ms = Math.max(stormMs, normalMs);
    if (!ms) return true;
    const seconds = Math.ceil(ms / 1000);
    player.onScreenDisplay.setActionBar(`§e${label}: ${Math.floor(seconds / 60)}m ${seconds % 60}s remaining`);
    return false;
  }
  if (!abilityNeedsCooldown(ability, zeusStorm(player))) return true;
  const ms = remaining(player, ability);
  if (!ms) return true;
  const seconds = Math.ceil(ms / 1000);
  player.onScreenDisplay.setActionBar(`§e${label}: ${Math.floor(seconds / 60)}m ${seconds % 60}s remaining`);
  return false;
}
function startCooldown(player, ability) {
  if (ability === 'zeusLightning') {
    if (zeusThunder(player)) player.setDynamicProperty(key('cd_zeusStormLightning'), now() + CONFIG.zeusThunderLightningSeconds * 1000);
    else if (!zeusStorm(player)) player.setDynamicProperty(key('cd_zeusLightning'), now() + CONFIG.cooldownSeconds.zeusLightning * 1000);
    return;
  }
  if (!abilityNeedsCooldown(ability, zeusStorm(player))) {
    player.setDynamicProperty(key(`cd_${ability}`), undefined);
    return;
  }
  player.setDynamicProperty(key(`cd_${ability}`), now() + crownCooldownSeconds(player, CONFIG.cooldownSeconds[ability]) * 1000);
}
function mountain() {
  const raw = world.getDynamicProperty(key('mountain'));
  if (typeof raw !== 'string') return undefined;
  try { return JSON.parse(raw); } catch { return undefined; }
}
function restockSummitChest(m) {
  const dimension = world.getDimension(m.dimension);
  if ((m.height || 16) === NEW_MOUNTAIN_HEIGHT) {
    const altar = dimension.getBlock({ x: m.x + 3, y: m.y + NEW_MOUNTAIN_HEIGHT + 1, z: m.z });
    if (altar?.typeId === 'minecraft:gold_block' || altar?.isAir) altar.setType('minecraft:enchanting_table');
  }
  const block = dimension.getBlock({ x: m.x, y: m.y + (m.height || 16) + 1, z: m.z });
  if (!block) return false; // The mountain's chunk has not loaded yet.
  if (block.typeId !== 'minecraft:chest') block.setType('minecraft:chest');
  const container = block.getComponent('minecraft:inventory')?.container;
  if (!container) throw new Error('Summit chest has no inventory component');
  return stockMissingRelics(container, GODS, relicId => new ItemStack(relicId, 1));
}
function atSummit(player) {
  const m = mountain();
  if (!m || player.dimension.id !== m.dimension) return false;
  const l = player.location;
  const height = m.height || 16;
  const radius = m.height ? 7.5 : 5.5;
  return Math.abs(l.x - m.x) <= radius && Math.abs(l.z - m.z) <= radius &&
    l.y >= m.y + height - 1 && l.y <= m.y + height + 10;
}
function onlineRoleCount() {
  return GODS.reduce((total, god) => total + owners(god).length, 0);
}
function claim(player, god) {
  const old = role(player);
  const refusal = claimRejection(old, owner(god), onlineRoleCount(), CONFIG.maxPlayers, CONFIG.allowDuplicateGods);
  if (refusal === 'already_assigned') { tell(player, `You are already ${nameOf(old)}. An operator must reset your role.`); return; }
  if (refusal === 'god_taken') { tell(player, `${nameOf(god)} has already been claimed.`); return; }
  if (refusal === 'full') { tell(player, 'All god places are taken.'); return; }
  player.setDynamicProperty(key('role'), god);
  world.setDynamicProperty(key(`owner_${god}`), JSON.stringify([...owners(god), player.name]));
  tell(player, CONFIG.claimMessage.replace('{god}', nameOf(god)).replace('{title}', TITLES[god]));
  tell(player, CONTROLS[god]);
  try { player.onScreenDisplay.setTitle(`§6${nameOf(god)}`, { subtitle: TITLES[god], fadeInDuration: 10, stayDuration: 70, fadeOutDuration: 20 }); }
  catch (e) { if (CONFIG.debug) fail(e); }
  giveEquipment(player, god);
  protectOwnedGear(player);
  if (!hasOwnedRelic(player, god)) {
    const relic = new ItemStack(`olympus:${god}_relic`, 1);
    relic.keepOnDeath = true;
    giveItem(player, relic);
  }
  updatePlayer(player);
  showFlair(player, god, true);
}
function temple() {
  const raw = world.getDynamicProperty(key('temple'));
  if (typeof raw !== 'string') return undefined;
  try { return JSON.parse(raw); } catch { return undefined; }
}
function reservation(god) {
  const raw = world.getDynamicProperty(key(`reservation_${god}`));
  if (typeof raw !== 'string') return undefined;
  try {
    const value = JSON.parse(raw);
    if (value.until > now()) return value;
  } catch {}
  world.setDynamicProperty(key(`reservation_${god}`), undefined);
  return undefined;
}
function offeringCount(player, type) {
  const bag = player.getComponent('minecraft:inventory')?.container;
  if (!bag) return 0;
  let total = 0;
  for (let slot = 0; slot < bag.size; slot++) {
    const item = bag.getItem(slot);
    if (item?.typeId === type) total += item.amount;
  }
  return total;
}
function takeOffering(player, type, count) {
  const bag = player.getComponent('minecraft:inventory')?.container;
  if (!bag || offeringCount(player, type) < count) return false;
  for (let slot = 0; slot < bag.size && count > 0; slot++) {
    const item = bag.getItem(slot);
    if (item?.typeId !== type) continue;
    const used = Math.min(count, item.amount);
    if (used === item.amount) bag.setItem(slot, undefined);
    else { item.amount -= used; bag.setItem(slot, item); }
    count -= used;
  }
  return count === 0;
}
function atTempleAltar(player, god) {
  const t = temple();
  if (!t || player.dimension.id !== (t.dimension || 'minecraft:overworld')) return false;
  const [dx, dy, dz] = TEMPLE_ALTARS[god];
  const p = player.location;
  return Math.abs(p.x - (t.x + dx + 0.5)) <= 5 && Math.abs(p.y - (t.y + dy)) <= 4 &&
    Math.abs(p.z - (t.z + dz + 0.5)) <= 5;
}
function showTempleAltar(player, god) {
  if (!atTempleAltar(player, god)) return;
  const [type, count] = OFFERINGS[god];
  const r = reservation(god);
  const claimed = owner(god);
  const offer = `${count} ${type.replace('minecraft:', '').replaceAll('_', ' ')}`;
  const state = claimed ? `Claimed by ${claimed}` : r ? `Reserved by ${r.name} for ${Math.ceil((r.until-now())/60000)} more minute(s)` : 'Available';
  const form = new ActionFormData().title(`§6${nameOf(god)} — ${TITLES[god]}`)
    .body(`Abilities: ${DESCRIPTIONS[god]}\n\nWeakness: ${WEAKNESSES[god]}\nOffering: ${offer}\n${state}\n\nRelic: ${CONTROLS[god]}`);
  if (!claimed && !role(player)) form.button(r?.name === player.name ? `Offer ${offer} and claim` : r ? 'Reserved' : 'Reserve for 10 minutes');
  else form.button('Close');
  form.show(player).then(result => {
    if (result.canceled || result.selection !== 0 || !atTempleAltar(player, god)) return;
    if (owner(god) || role(player)) { tell(player, 'This god is unavailable.'); return; }
    const active = reservation(god);
    if (!active) {
      const other = GODS.find(g => reservation(g)?.name === player.name);
      if (other) { tell(player, `You already reserved ${nameOf(other)}.`); return; }
      world.setDynamicProperty(key(`reservation_${god}`), JSON.stringify({ name: player.name, until: now() + 600000 }));
      tell(player, `${nameOf(god)} is yours for 10 minutes. Bring ${offer} back to this altar.`);
    } else if (active.name === player.name) {
      if (!takeOffering(player, type, count)) { tell(player, `You need ${offer} in your inventory.`); return; }
      claim(player, god);
      world.setDynamicProperty(key(`reservation_${god}`), undefined);
    } else tell(player, `${nameOf(god)} is reserved by ${active.name}.`);
  }).catch(fail);
}
const NATURAL_SURFACE = new Set(['minecraft:grass_block', 'minecraft:dirt', 'minecraft:stone', 'minecraft:sand',
  'minecraft:red_sand', 'minecraft:gravel', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:mycelium',
  'minecraft:snow', 'minecraft:deepslate', 'minecraft:clay']);
const NATURAL_PLANTS = new Set(['minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:tallgrass',
  'minecraft:fern', 'minecraft:large_fern', 'minecraft:double_plant', 'minecraft:deadbush',
  'minecraft:poppy', 'minecraft:dandelion', 'minecraft:azure_bluet', 'minecraft:oxeye_daisy',
  'minecraft:cornflower', 'minecraft:allium', 'minecraft:blue_orchid', 'minecraft:lily_of_the_valley',
  'minecraft:torchflower', 'minecraft:sunflower', 'minecraft:snow_layer']);
function* checkTempleSite(dimension, x, z) {
  let low = Infinity, high = -Infinity;
  for (let dx = 0; dx < TEMPLE_SIZE.x; dx++) {
    for (let dz = 0; dz < TEMPLE_SIZE.z; dz++) {
      let top = dimension.getTopmostBlock({ x: x + dx, z: z + dz });
      for (let step = 0; top && NATURAL_PLANTS.has(top.typeId) && step < 3; step++)
        top = dimension.getBlock({ x: x + dx, y: top.location.y - 1, z: z + dz });
      if (!top || !NATURAL_SURFACE.has(top.typeId)) return undefined;
      low = Math.min(low, top.location.y);
      high = Math.max(high, top.location.y);
    }
    yield;
  }
  if (high - low > 3 || high < -50 || high > 290) return undefined;
  // The entire volume above the highest natural surface must be empty.
  for (let dx = 0; dx < TEMPLE_SIZE.x; dx++) {
    for (let dz = 0; dz < TEMPLE_SIZE.z; dz++) {
      for (let dy = 0; dy < TEMPLE_SIZE.y; dy++) {
        const block = dimension.getBlock({ x: x + dx, y: high + 1 + dy, z: z + dz });
        if (!block || (!block.isAir && !NATURAL_PLANTS.has(block.typeId))) return undefined;
      }
    }
    yield;
  }
  return { x, y: high + 1, z };
}
let templeBuilding = false;
function giveTempleSeal(player) {
  if (offeringCount(player, 'olympus:temple_seal') === 0) giveItem(player, new ItemStack('olympus:temple_seal', 1));
  tell(player, 'A Hall Placement Seal is ready. Use it where you want the Hall centered; it replaces blocks in a 33×15×33 area.');
}
function placeTemple(dimension, site) {
  world.structureManager.place('olympus:hall_of_eight', dimension, site, { includeBlocks: true, includeEntities: false });
  world.setDynamicProperty(key('temple'), JSON.stringify({ ...site, dimension: dimension.id }));
  world.sendMessage(prefix + `Hall of Eight Gods placed in ${dimension.id} at ${site.x}, ${site.y}, ${site.z}.`);
}
function ensureForgeStation(player) {
  const t = temple();
  if (!t) return;
  try {
    const block = world.getDimension(t.dimension || 'minecraft:overworld').getBlock({ x:t.x+5, y:t.y+3, z:t.z+29 });
    if (block?.typeId === 'minecraft:smithing_table') return;
    if (block?.isAir) { block.setType('minecraft:smithing_table'); tell(player, 'The Divine Combination Forge was added beside Hephaestus’s altar.'); }
    else tell(player, 'The forge location is occupied. Clear the block two spaces behind Hephaestus’s altar, then run setup again.');
  } catch (e) { fail(e); tell(player, 'The Hall chunk must be loaded to add the forge. Return to the Hall and run setup again.'); }
}
function placeTempleWithSeal(player) {
  if (temple()) { tell(player, 'The Hall of Eight Gods is already placed.'); return; }
  if (templeBuilding) { tell(player, 'Temple placement is already running.'); return; }
  templeBuilding = true;
  const dimension = player.dimension;
  const site = { x: Math.floor(player.location.x) - 16, y: Math.floor(player.location.y), z: Math.floor(player.location.z) - 16 };
  system.runJob((function* () {
    try {
      if (site.y < dimension.heightRange.min || site.y + TEMPLE_SIZE.y > dimension.heightRange.max) {
        tell(player, 'This height cannot fit the 15-block-tall Hall. Move up or down and use the seal again.');
        return;
      }
      yield;
      placeTemple(dimension, site);
      player.teleport({ x: site.x + 16.5, y: site.y + 3, z: site.z + 16.5 }, { dimension });
    } catch (e) { fail(e); tell(player, `Seal placement failed: ${e?.name || 'Error'}: ${String(e?.message || e).slice(0, 160)}`); }
    finally { templeBuilding = false; }
  })());
}
function setupTemple(player) {
  if (temple()) { ensureForgeStation(player); tell(player, 'The Hall of Eight Gods is already placed.'); return; }
  if (templeBuilding) { tell(player, 'Temple site search is already running.'); return; }
  if (player.dimension.id !== 'minecraft:overworld') { tell(player, 'Run setup in the Overworld.'); return; }
  templeBuilding = true;
  tell(player, 'Searching for a clear natural site near world spawn. Keep the spawn area loaded.');
  system.runJob((function* () {
    let lastIssue = '';
    try {
      const spawn = world.getDefaultSpawnLocation();
      const dimension = world.getDimension('overworld');
      try { dimension.runCommand('tickingarea remove olympus_setup_temp'); } catch {}
      if (!world.structureManager.getPackStructureIds().includes('olympus:hall_of_eight')) {
        tell(player, 'The Hall structure is missing from the active behavior pack. Reimport the current add-on and activate it in this world.');
        return;
      }
      const candidates = [];
      for (const distance of [48, 80, 112]) for (const [ox, oz] of [
        [distance, 0], [-distance-32, 0], [0, distance], [0, -distance-32],
        [distance, distance], [-distance-32, distance], [distance, -distance-32], [-distance-32, -distance-32]
      ]) candidates.push([ox, oz]);
      for (const [ox, oz] of candidates) {
        const x = Math.floor(spawn.x) + ox, z = Math.floor(spawn.z) + oz;
        const areaName = 'olympus_setup_temp';
        let areaAdded = false;
        try {
          // Site probes outside the player's simulation distance need their own
          // temporary ticking area; otherwise getTopmostBlock throws immediately.
          dimension.runCommand(`tickingarea add circle ${x+16} ${Math.floor(spawn.y)} ${z+16} 2 ${areaName} true`);
          areaAdded = true;
          for (let ticks = 0; ticks < 20; ticks++) yield;
          const probe = checkTempleSite(dimension, x, z);
          let step = probe.next();
          while (!step.done) { yield; step = probe.next(); }
          if (!step.value) continue;
          const site = step.value;
          placeTemple(dimension, site);
          return;
        } catch (e) {
          lastIssue = `${e?.name || 'Error'}: ${e?.message || e}`;
          fail(e);
        } finally {
          if (areaAdded) try { dimension.runCommand(`tickingarea remove ${areaName}`); }
          catch (e) { fail(e); }
        }
      }
      tell(player, lastIssue
        ? `Temple setup could not finish: ${lastIssue.slice(0, 160)}. Try again near world spawn.`
        : 'No safe 33×33 site was found within 144 blocks of spawn. Clear a flat natural area near spawn, then retry.');
      giveTempleSeal(player);
    } catch (e) { fail(e); tell(player, `Temple setup failed: ${e?.name || 'Error'}: ${String(e?.message || e).slice(0, 160)}`); giveTempleSeal(player); }
    finally { templeBuilding = false; }
  })());
}
function showChoice(player, god) {
  if (!atSummit(player) || role(player)) { tell(player, 'You must be unclaimed and at the summit to choose.'); return; }
  new ActionFormData().title(`§6${nameOf(god)} — ${TITLES[god]}`)
    .body(`${DESCRIPTIONS[god]}\n\n${CONTROLS[god]}`)
    .button('Find this god at the Hall of Eight Gods', `textures/items/${god}_relic`)
    .button('Back to all gods')
    .show(player).then(result => {
      if (result.canceled) return;
      if (result.selection === 1) { showAltar(player); return; }
      if (result.selection !== 0 || !atSummit(player) || role(player)) return;
      tell(player, 'Use /function olympus/setup to place the Hall near spawn, then visit its altar with the offering.');
    }).catch(fail);
}
function showAltar(player) {
  if (!atSummit(player)) { tell(player, 'Climb to the summit to choose your god.'); return; }
  const chosen = role(player);
  if (chosen) { tell(player, CONTROLS[chosen]); return; }
  const form = new ActionFormData().title('§6The Olympian Altar')
    .body('Choose your god. Each role is unique and stays with you after death. Tap a god to inspect its powers.');
  for (const god of GODS) form.button(`${nameOf(god)}${owner(god) ? ' §8— claimed' : ''}\n§7${TITLES[god]}`, `textures/items/${god}_relic`);
  form.show(player).then(result => {
    if (result.canceled || result.selection === undefined) return;
    const god = GODS[result.selection];
    if (god) showChoice(player, god);
  }).catch(fail);
}
function reset(player) {
  const god = role(player);
  if (!god) { tell(player, 'You have no god role.'); return; }
  const remainingOwners = owners(god).filter(name => name !== player.name);
  world.setDynamicProperty(key(`owner_${god}`), remainingOwners.length ? JSON.stringify(remainingOwners) : undefined);
  player.setDynamicProperty(key('role'), undefined);
  for (const id of MANAGED) { try { player.removeEffect(id); } catch {} }
  for (const ability of Object.keys(CONFIG.cooldownSeconds)) player.setDynamicProperty(key(`cd_${ability}`), undefined);
  player.setDynamicProperty(key('rageUntil'), undefined);
  player.setDynamicProperty(key('hermesSlowfall'), undefined);
  player.setDynamicProperty(key('poseidonSpeed'), undefined);
  player.setDynamicProperty(key('flightUntil'), undefined);
  player.setDynamicProperty(key('madnessStacks'), undefined);
  player.setDynamicProperty(key('madnessLast'), undefined);
  lastFlairUse.delete(player.id);
  hermesTrailTick.delete(player.id);
  hermesFallTick.delete(player.id);
  hermesTurboTick.delete(player.id);
  poseidonTrailTick.delete(player.id);
  poseidonFallGuardTick.delete(player.id);
  for (const targetKey of dionysusTargetCooldowns.keys()) if (targetKey.startsWith(`${player.id}:`)) dionysusTargetCooldowns.delete(targetKey);
  tell(player, `${nameOf(god)} has been released. Its place is available again.`);
}
function giveItem(player, item) {
  const inventory = player.getComponent('minecraft:inventory')?.container;
  if (!inventory) { tell(player, 'Inventory unavailable; equipment could not be delivered.'); return; }
  const left = inventory.addItem(item);
  if (left) {
    player.dimension.spawnItem(left, player.location);
    tell(player, 'Your inventory was full, so the equipment dropped at your feet.');
  }
}
function enchantedItem(type, name, enchants, lore = []) {
  const item = new ItemStack(type, 1);
  item.nameTag = name;
  item.keepOnDeath = true;
  const component = item.getComponent('minecraft:enchantable');
  if (!component) throw new Error(`Missing enchantable component on ${type}`);
  for (const [id, level] of enchants) {
    const enchantmentType = EnchantmentTypes.get(`minecraft:${id}`);
    if (!enchantmentType) throw new Error(`Unknown enchantment ${id}`);
    component.addEnchantment({ type: enchantmentType, level: Math.min(level, enchantmentType.maxLevel) });
  }
  if (lore.length) item.setLore(lore);
  return item;
}
function isOwnedGear(item, god) {
  if (!item) return false;
  if (item.typeId === `olympus:${god}_relic`) return true;
  const tool = PERSONAL_TOOLS[god];
  return !!tool && item.typeId === tool[0] && item.nameTag === tool[1];
}
function hasOwnedRelic(player, god) {
  const inventory = player.getComponent('minecraft:inventory')?.container;
  if (!inventory) return false;
  for (let slot = 0; slot < inventory.size; slot++) if (inventory.getItem(slot)?.typeId === `olympus:${god}_relic`) return true;
  return player.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Offhand)?.typeId === `olympus:${god}_relic`;
}
function protectOwnedGear(player) {
  const god = role(player);
  if (!god) return;
  try {
    const inventory = player.getComponent('minecraft:inventory')?.container;
    if (!inventory) return;
    for (let slot = 0; slot < inventory.size; slot++) {
      const item = inventory.getItem(slot);
      if (!isOwnedGear(item, god)) continue;
      const durability = item.getComponent('minecraft:durability');
      if (!item.keepOnDeath || (durability && durability.damage > 0)) {
        item.keepOnDeath = true;
        if (durability) durability.damage = 0;
        inventory.setItem(slot, item);
      }
    }
    const equippable = player.getComponent('minecraft:equippable');
    const offhand = equippable?.getEquipment(EquipmentSlot.Offhand);
    if (isOwnedGear(offhand, god)) {
      const durability = offhand.getComponent('minecraft:durability');
      if (!offhand.keepOnDeath || (durability && durability.damage > 0)) {
        offhand.keepOnDeath = true;
        if (durability) durability.damage = 0;
        equippable.setEquipment(EquipmentSlot.Offhand, offhand);
      }
    }
  } catch (e) { if (CONFIG.debug) fail(e); }
}
function giveEquipment(player, god) {
  try {
    if (god === 'poseidon') giveItem(player, enchantedItem('minecraft:trident', '§bPoseidon’s Tidecaller', [['riptide', 3], ['unbreaking', 3]], ['§bLaunch yourself in water or rain', '§7Riptide III is the game maximum.']));
    if (god === 'apollo') {
      giveItem(player, enchantedItem('minecraft:bow', '§eApollo’s Solar Bow', [['power', 5], ['infinity', 1], ['unbreaking', 3]], ['§eSolar shot: +6 damage in sunlight', '§e+2 damage out of sunlight', '§7Carry one arrow for Infinity.']));
      giveItem(player, new ItemStack('minecraft:arrow', 1));
    }
    if (god === 'hephaestus') {
      const pick = enchantedItem('minecraft:diamond_pickaxe', '§6Hephaestus’s Divine Fortune IV', [['fortune', 3], ['efficiency', 5], ['unbreaking', 3]], ['§6Divine Fortune IV: extra ore chance', '§7Fortune III plus a scripted bonus.']);
      pick.setDynamicProperty(key('divineFortune'), true);
      giveItem(player, pick);
    }
    if (god === 'dionysus') giveItem(player, new ItemStack('minecraft:bone_meal', 64));
  } catch (e) { fail(e); tell(player, 'Equipment could not be created. Ask the operator to check the content log.'); }
}
function refillDionysusBoneMeal(player) {
  try {
    const inventory = player.getComponent('minecraft:inventory')?.container;
    if (!inventory) return;
    let freeSlot = -1;
    let foundBoneMeal = false;
    for (let slot = 0; slot < inventory.size; slot++) {
      const item = inventory.getItem(slot);
      if (item?.typeId === 'minecraft:bone_meal') {
        foundBoneMeal = true;
        if (item.amount < 64) {
          item.amount = 64;
          inventory.setItem(slot, item);
        }
        continue;
      }
      if (!item && freeSlot < 0) freeSlot = slot;
    }
    if (!foundBoneMeal && freeSlot >= 0) inventory.setItem(freeSlot, new ItemStack('minecraft:bone_meal', 64));
  } catch (e) { if (CONFIG.debug) fail(e); }
}
function heldItem(player) {
  return player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);
}
function daylight() { const t = world.getTimeOfDay(); return t >= 0 && t < 12000; }
function sunlight(player) {
  if (!daylight() || player.dimension.id !== 'minecraft:overworld') return false;
  try { return player.dimension.getSkyLightLevel(player.location) >= 14; } catch { return false; }
}
function startFlight(player, seconds, label) {
  player.setDynamicProperty(key('flightUntil'), now() + seconds * 1000);
  effect(player, 'slow_falling', seconds + 7);
  tell(player, `${label}: ${seconds}s. Jump rises, sneak descends, release both to hover. Move normally to steer.`);
}
function updateFlight(player) {
  const until = Number(player.getDynamicProperty(key('flightUntil')) || 0);
  if (!until) return;
  if (until <= now() || !['zeus', 'apollo'].includes(role(player)) ||
      (role(player) === 'apollo' && !sunlight(player))) {
    player.setDynamicProperty(key('flightUntil'), undefined);
    if (role(player) === 'apollo' && until > now()) tell(player, 'Sunflight ended when direct sunlight was lost.');
    return;
  }
  try {
    const jump = player.inputInfo.getButtonState(InputButton.Jump) === ButtonState.Pressed || player.isJumping;
    const sneak = player.inputInfo.getButtonState(InputButton.Sneak) === ButtonState.Pressed || player.isSneaking;
    const target = jump ? 0.30 : sneak ? -0.18 : 0.035;
    const velocity = player.getVelocity();
    const vertical = velocity.y;
    player.applyImpulse({ x: 0, y: Math.max(-0.45, Math.min(0.45, target - vertical)), z: 0 });
    const input = player.inputInfo.getMovementVector();
    const view = player.getViewDirection();
    const direction = movementDirection(input, view);
    const desiredX = direction.x * Math.min(1, Math.hypot(input.x, input.y)) * 0.32;
    const desiredZ = direction.z * Math.min(1, Math.hypot(input.x, input.y)) * 0.32;
    player.applyImpulse({
      x: Math.max(-0.09, Math.min(0.09, desiredX - velocity.x)),
      y: 0,
      z: Math.max(-0.09, Math.min(0.09, desiredZ - velocity.z))
    });
  } catch (e) { if (CONFIG.debug) fail(e); }
}
function updatePlayer(player) {
  const god = role(player);
  if (!god) return;
  suppressOldPenalties(player);
  const dim = player.dimension.id;
  const otherworld = dim === 'minecraft:nether' || dim === 'minecraft:the_end';
  try {
    switch (god) {
      case 'hermes':
        if (!hermesTurboTick.has(player.id)) effect(player, 'speed', 5, CONFIG.hermesSpeedAmplifier);
        godPenalty(player, 'weakness', 5, 2);
        if (hermesSlowfallEnabled(player)) effect(player, 'slow_falling', 5);
        break;
      case 'zeus':
        godPenalty(player, 'mining_fatigue', 5, 1);
        break;
      case 'poseidon':
        if (player.isInWater || inRain(player)) { effect(player, 'conduit_power', 5); effect(player, 'dolphins_grace', 5, 2); }
        if (dim !== 'minecraft:nether' && submerged(player)) godBuff(player, 'strength', 1);
        else if (inRain(player)) godBuff(player, 'strength', 0);
        else clearGodBuff(player, 'strength');
        if (dim === 'minecraft:nether' || (dim === 'minecraft:overworld' && player.dimension.getBiome(player.location).id === 'minecraft:desert')) {
          godPenalty(player, 'slowness', 5, 2); godPenalty(player, 'weakness', 5, 2);
        }
        break;
      case 'hades':
        effect(player, 'fire_resistance', 5); effect(player, 'night_vision', 15);
        if (dim === 'minecraft:overworld' && daylight() && skyExposed(player) && !inUnderworldDominion(player)) { godPenalty(player, 'slowness', 5, 2); godPenalty(player, 'weakness', 5, 2); }
        else { clearGodPenalty(player, 'slowness'); clearGodPenalty(player, 'weakness'); }
        if (otherworld || inUnderworldDominion(player)) { godBuff(player, 'strength', 3); godBuff(player, 'haste', 3); }
        else if (dim === 'minecraft:overworld' && !daylight()) { godBuff(player, 'strength', 0); godBuff(player, 'haste', 0); }
        else { clearGodBuff(player, 'strength'); clearGodBuff(player, 'haste'); }
        break;
      case 'ares':
        effect(player, 'strength', 5, aresStrengthAmplifier(player.getDynamicProperty(key('rageUntil')), now()));
        effect(player, 'resistance', 5, aresResistanceAmplifier(player.getDynamicProperty(key('rageUntil')), now()));
        godPenalty(player, 'slowness', 5, 2);
        break;
      case 'apollo':
        if (!sunlight(player)) { godPenalty(player, 'weakness', 5, 2); godPenalty(player, 'mining_fatigue', 5, 1); }
        break;
      case 'hephaestus':
        effect(player, 'haste', 5, 3); godPenalty(player, 'weakness', 5, 2); break;
    }
  } catch (e) { if (CONFIG.debug) fail(e); }
}
function safeTeleport(player) {
  const origin = player.location;
  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = CONFIG.dionysusTeleportMin + Math.random() * (CONFIG.dionysusTeleportMax - CONFIG.dionysusTeleportMin);
    const x = Math.floor(origin.x + Math.cos(angle) * radius), z = Math.floor(origin.z + Math.sin(angle) * radius);
    for (let dy = 3; dy >= -4; dy--) {
      const y = Math.floor(origin.y) + dy;
      try {
        const floor = player.dimension.getBlock({ x, y: y - 1, z });
        const feet = player.dimension.getBlock({ x, y, z });
        const head = player.dimension.getBlock({ x, y: y + 1, z });
        const hazardous = ['minecraft:magma', 'minecraft:cactus', 'minecraft:campfire', 'minecraft:soul_campfire'];
        if (floor?.isSolid && !hazardous.includes(floor.typeId) && feet?.isAir && head?.isAir) {
          player.teleport({ x: x + 0.5, y, z: z + 0.5 });
          return true;
        }
      } catch {}
    }
  }
  return false;
}
function special(player, god, sneaking) {
  try {
    if (god === 'hermes') {
      if (sneaking) {
        const enabled = !hermesSlowfallEnabled(player);
        player.setDynamicProperty(key('hermesSlowfall'), enabled);
        if (enabled) effect(player, 'slow_falling', 5);
        else player.removeEffect('slow_falling');
        tell(player, `Slow Falling ${enabled ? 'ON' : 'OFF'}. Dangerous falls are still cushioned automatically.`);
        showFlair(player, god, true);
        return;
      }
      if (!ready(player, 'hermesPearl', 'Divine Pearl')) return;
      giveItem(player, new ItemStack('minecraft:ender_pearl', 1));
      startCooldown(player, 'hermesPearl'); tell(player, 'Divine Ender Pearl granted. Use it to teleport; another is available in 5 minutes.'); showFlair(player, god, true);
    } else if (god === 'zeus') {
      if (sneaking) {
        if (!ready(player, 'zeusFlight', 'Storm Ascension')) return;
        startFlight(player, CONFIG.zeusFlightSeconds, 'Storm Ascension');
        startCooldown(player, 'zeusFlight');
        if (zeusStorm(player)) tell(player, 'Storm power: flight has no cooldown while rain or thunder lasts.');
        showFlair(player, god, true);
        return;
      }
      if (!ready(player, 'zeusLightning', 'Lightning Strike')) return;
      const target = player.getEntitiesFromViewDirection({ maxDistance: 24 })
        .find(hit => hit.entity.id !== player.id && hit.entity.typeId !== 'minecraft:item')?.entity;
      const hit = player.getBlockFromViewDirection({ maxDistance: 24 });
      const aim = target?.location || hit?.block?.location;
      if (!aim) { tell(player, 'Aim at a block or enemy within 24 blocks.'); return; }
      player.dimension.spawnEntity('minecraft:lightning_bolt', target ? { x: aim.x, y: aim.y, z: aim.z } : { x: aim.x + 0.5, y: aim.y + 1, z: aim.z + 0.5 });
      startCooldown(player, 'zeusLightning');
      tell(player, zeusThunder(player) ? 'Lightning Strike! Another strike is ready in 5 seconds.' : zeusStorm(player) ? 'Lightning Strike! Rain power.' : 'Lightning Strike!');
      showFlair(player, god, true);
    } else if (god === 'poseidon') {
      if (sneaking) {
        const enabled = !poseidonSpeedEnabled(player);
        player.setDynamicProperty(key('poseidonSpeed'), enabled);
        tell(player, `Tidal Sprint ${enabled ? 'ON' : 'OFF'}. Water and open rain grant Conduit Power and Dolphin’s Grace; rain protects you from falls.`);
        showFlair(player, god, true);
      } else tell(player, CONTROLS.poseidon);
    } else if (god === 'ares') {
      if (!ready(player, 'aresRage', 'War Rage')) return;
      player.setDynamicProperty(key('rageUntil'), now() + CONFIG.aresRageSeconds * 1000);
      effect(player, 'strength', CONFIG.aresRageSeconds, 4);
      effect(player, 'resistance', CONFIG.aresRageSeconds, 2);
      startCooldown(player, 'aresRage'); tell(player, 'War Rage: Strength V and Resistance III for 30 seconds.'); showFlair(player, god, true);
    } else if (god === 'apollo') {
      if (!sunlight(player)) { tell(player, 'Sunstep requires direct daylight.'); return; }
      if (!ready(player, 'apolloSunstep', 'Sunstep')) return;
      startFlight(player, CONFIG.apolloSunstepSeconds, 'Sunflight');
      startCooldown(player, 'apolloSunstep'); showFlair(player, god, true);
    } else if (god === 'dionysus') {
      tell(player, 'Divine Madness triggers on melee hits. New foes trigger instantly; the same foe needs 3 seconds. Bone Meal refills automatically.');
      cosmeticFlair(player, god);
    } else {
      tell(player, `${nameOf(god)}'s powers are passive or equipment-based. Your relic can display your divine signature.`);
      cosmeticFlair(player, god);
    }
  } catch (e) { fail(e); tell(player, 'The ability failed. Ask the operator to check the content log.'); }
}
function useRelic(player, id, sneaking = player.isSneaking) {
  if (id !== 'olympus:crown_control' && id !== 'olympus:mountain_sigil' && id !== 'olympus:temple_seal' && !(id.startsWith('olympus:') && id.endsWith('_relic'))) return;
  const last = lastRelicUse.get(player.id) || 0;
  if (now() - last < 1500) return;
  lastRelicUse.set(player.id, now());
  if (id === 'olympus:temple_seal') { placeTempleWithSeal(player); return; }
  if (id === 'olympus:crown_control') { crownControl(player); return; }
  if (id === 'olympus:mountain_sigil') { summonMountain(player); return; }
  const god = id.startsWith('olympus:') && id.endsWith('_relic') ? id.slice(8, -6) : '';
  if (!GODS.includes(god)) return;
  if (!role(player)) tell(player, `Claim ${nameOf(god)} at its temple altar with the required offering.`);
  else if (role(player) === god) special(player, god, sneaking);
  else tell(player, `You are already ${nameOf(role(player))}. An operator must reset your role.`);
}
let mountainBuilding = false;
function buildMountain(player, m) {
  if (mountainBuilding) { tell(player, 'Mount Olympus is already rising.'); return; }
  mountainBuilding = true;
  tell(player, 'Mount Olympus is rising. Keep the area loaded until the golden temple appears.');
  const dimension = world.getDimension(m.dimension);
  const previousMountain = mountain();
  const savedChestItems = [];
  if (previousMountain && previousMountain.x === m.x && previousMountain.z === m.z) {
    try {
      const oldChest = dimension.getBlock({ x: m.x, y: m.y + (m.height || 16) + 1, z: m.z });
      const oldContainer = oldChest?.typeId === 'minecraft:chest' ? oldChest.getComponent('minecraft:inventory')?.container : undefined;
      if (oldContainer) for (let slot = 0; slot < oldContainer.size; slot++) {
        const item = oldContainer.getItem(slot);
        if (item && !GODS.some(god => item.typeId === `olympus:${god}_relic`)) savedChestItems.push(item);
      }
    } catch (e) { fail(e); }
  }
  system.runJob((function* () {
    try {
      const summit = m.y + NEW_MOUNTAIN_HEIGHT + 1;
      for (let layer = 0; layer <= NEW_MOUNTAIN_HEIGHT; layer++) {
        const r = MOUNTAIN_RADIUS - layer;
        const material = layer === NEW_MOUNTAIN_HEIGHT ? 'minecraft:gold_block' : layer % 5 === 0 ? 'minecraft:polished_andesite' : 'minecraft:stone';
        dimension.runCommand(`fill ${m.x-r} ${m.y+layer} ${m.z-r} ${m.x+r} ${m.y+layer} ${m.z+r} ${material}`);
        yield;
        if (layer < NEW_MOUNTAIN_HEIGHT) for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
          dimension.runCommand(`setblock ${m.x+dx} ${m.y+layer} ${m.z+dz} ${layer % 4 === 0 ? 'minecraft:sea_lantern' : 'minecraft:quartz_block'}`);
        }
        yield;
      }
      for (const [dx, dz] of [[-5,-5],[-5,5],[5,-5],[5,5]]) {
        dimension.runCommand(`fill ${m.x+dx} ${summit} ${m.z+dz} ${m.x+dx} ${summit+6} ${m.z+dz} minecraft:quartz_block`);
        dimension.runCommand(`setblock ${m.x+dx} ${summit+5} ${m.z+dz} minecraft:sea_lantern`);
        yield;
      }
      dimension.runCommand(`fill ${m.x-7} ${summit+7} ${m.z-7} ${m.x+7} ${summit+7} ${m.z+7} minecraft:quartz_block`);
      dimension.runCommand(`fill ${m.x-6} ${summit+7} ${m.z-6} ${m.x+6} ${summit+7} ${m.z+6} minecraft:gold_block`);
      dimension.runCommand(`setblock ${m.x} ${summit+7} ${m.z} minecraft:sea_lantern`);
      dimension.runCommand(`setblock ${m.x} ${summit} ${m.z} minecraft:chest`);
      m.height = NEW_MOUNTAIN_HEIGHT;
      if (!restockSummitChest(m)) throw new Error('Summit chest could not be stocked');
      const chest = dimension.getBlock({ x: m.x, y: summit, z: m.z })?.getComponent('minecraft:inventory')?.container;
      if (chest) for (const item of savedChestItems) {
        const left = chest.addItem(item);
        if (left) dimension.spawnItem(left, { x: m.x + 0.5, y: summit + 1, z: m.z + 0.5 });
      }
      world.setDynamicProperty(key('mountain'), JSON.stringify(m));
      world.sendMessage(prefix + `Mount Olympus has risen at ${m.x}, ${m.y}, ${m.z}. Climb to its golden temple to choose a god!`);
      try { tell(player, 'The summit is 24 blocks above the base. Follow the four marked ridges upward.'); } catch {}
    } catch (e) { fail(e); try { tell(player, 'Mountain construction failed. Keep its area loaded and try again.'); } catch {} }
    finally { mountainBuilding = false; }
  })());
}
function summonMountain(player) {
  if (mountain()) { tell(player, 'Mount Olympus already exists. Operators can run /function olympus/upgrade_mountain to raise the old mountain.'); return; }
  if (player.dimension.id !== 'minecraft:overworld') { tell(player, 'Summon Mount Olympus in the Overworld.'); return; }
  const pos = player.location;
  const m = { x: Math.floor(pos.x) + 33, y: Math.floor(pos.y) - 1, z: Math.floor(pos.z), dimension: player.dimension.id };
  if (m.y < -50 || m.y > 275) { tell(player, 'Choose a surface between Y -49 and 275.'); return; }
  buildMountain(player, m);
}

system.beforeEvents.startup.subscribe((event) => {
  event.itemComponentRegistry.registerCustomComponent('olympus:relic_use', {
    onUse: (useEvent) => {
      const player = useEvent.source;
      const itemId = useEvent.itemStack?.typeId || '';
      const sneaking = player.isSneaking;
      system.run(() => { try { useRelic(player, itemId, sneaking); } catch (e) { fail(e); } });
    },
    onUseOn: (useEvent) => {
      const player = useEvent.source;
      const itemId = useEvent.itemStack?.typeId || '';
      const sneaking = player.isSneaking;
      system.run(() => { try { useRelic(player, itemId, sneaking); } catch (e) { fail(e); } });
    }
  });
});
world.afterEvents.itemUse.subscribe((event) => {
  try { useRelic(event.source, event.itemStack?.typeId || ''); } catch (e) { fail(e); }
});
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  if (!event.isFirstEvent) return;
  const m = mountain();
  const b = event.block.location;
  const player = event.player;
  if (event.itemStack && temporaryBlock(player.dimension.id,b)) { event.cancel = true; return; }
  const t = temple();
  if (t && player.dimension.id === (t.dimension || 'minecraft:overworld') && forgeBlock(b) && event.block.typeId === 'minecraft:smithing_table') {
    event.cancel = true;
    system.run(() => { try { showForge(player); } catch (e) { fail(e); } });
    return;
  }
  if (t && player.dimension.id === (t.dimension || 'minecraft:overworld') && atThrone(b) && event.block.typeId === 'minecraft:sea_lantern') {
    event.cancel = true;
    system.run(() => { try { showThrone(player); } catch (e) { fail(e); } });
    return;
  }
  if (t && player.dimension.id === (t.dimension || 'minecraft:overworld') && event.block.typeId === 'minecraft:enchanting_table') {
    const god = GODS.find(g => { const [dx, dy, dz] = TEMPLE_ALTARS[g]; return b.x === t.x+dx && b.y === t.y+dy && b.z === t.z+dz; });
    if (god) {
      event.cancel = true;
      system.run(() => { try { showTempleAltar(player, god); } catch (e) { fail(e); } });
      return;
    }
  }
  if (m && player.dimension.id === m.dimension && b.x === m.x + 3 && b.y === m.y + (m.height || 16) + 1 &&
      b.z === m.z && event.block.typeId === 'minecraft:enchanting_table') {
    event.cancel = true;
    system.run(() => { try { showAltar(player); } catch (e) { fail(e); } });
    return;
  }
  const itemId = event.itemStack?.typeId || '';
  if (itemId !== 'olympus:mountain_sigil' && itemId !== 'olympus:temple_seal' && itemId !== 'olympus:crown_control' && !GODS.some(god => itemId === `olympus:${god}_relic`)) return;
  event.cancel = true;
  const sneaking = player.isSneaking;
  system.run(() => { try { useRelic(player, itemId, sneaking); } catch (e) { fail(e); } });
});
world.afterEvents.entityHitEntity.subscribe((event) => {
  const player = event.damagingEntity;
  const target = event.hitEntity;
  if (player.typeId !== 'minecraft:player' || role(player) !== 'dionysus') return;
  if (!CONFIG.friendlyFire && target.typeId === 'minecraft:player') return;
  const targetKey = `${player.id}:${target.id}`;
  if ((dionysusTargetCooldowns.get(targetKey) || 0) > now()) return;
  try {
    const unusedDebuffs = CONFIG.dionysusDebuffs.filter(id => !target.getEffect(id));
    const unusedBuffs = CONFIG.dionysusBuffs.filter(id => !player.getEffect(id));
    const debuffPool = unusedDebuffs.length ? unusedDebuffs : CONFIG.dionysusDebuffs;
    const buffPool = unusedBuffs.length ? unusedBuffs : CONFIG.dionysusBuffs;
    const debuff = debuffPool[Math.floor(Math.random() * debuffPool.length)];
    const buff = buffPool[Math.floor(Math.random() * buffPool.length)];
    const stacks = nextMadnessStacks(player.getDynamicProperty(key('madnessStacks')), player.getDynamicProperty(key('madnessLast')), now());
    const debuffLevel = Math.min(3, (target.getEffect(debuff)?.amplifier || 0) + 1);
    const buffLevel = Math.min(3, (player.getEffect(buff)?.amplifier || 0) + 1);
    effect(target, debuff, 180, debuffLevel);
    effect(player, buff, 180, buffLevel);
    godPenalty(player, 'nausea', 25 + stacks * 8, Math.min(4, Math.floor(stacks / 2)));
    const blinded = Math.random() < dionysusBlindnessChance(stacks);
    if (blinded) godPenalty(player, 'blindness', 4 + Math.floor(stacks / 2));
    player.setDynamicProperty(key('madnessStacks'), stacks);
    player.setDynamicProperty(key('madnessLast'), now());
    safeTeleport(player);
    dionysusTargetCooldowns.set(targetKey, now() + CONFIG.dionysusSameTargetCooldownSeconds * 1000);
    tell(player, `Divine Madness: ${debuff} ${debuffLevel + 1} on ${target.typeId}; ${buff} ${buffLevel + 1} on you. Madness ${stacks}/10${blinded ? ' — BLINDED' : ''}.`);
    showFlair(player, 'dionysus', true);
  } catch (e) { fail(e); }
});
world.afterEvents.playerBreakBlock.subscribe((event) => {
  const player = event.player;
  if (role(player) !== 'hephaestus' || event.itemStackBeforeBreak?.getDynamicProperty(key('divineFortune')) !== true) return;
  try {
    showFlair(player, 'hephaestus');
    const drop = divineOreDrop(event.brokenBlockPermutation.type.id);
    if (drop && Math.random() < 0.35) {
      const b = event.block.location;
      player.dimension.spawnItem(new ItemStack(drop, 1), { x: b.x + 0.5, y: b.y + 0.5, z: b.z + 0.5 });
    }
  } catch (e) { fail(e); }
});
world.beforeEvents.playerBreakBlock.subscribe((event) => {
  if (temporaryBlock(event.player.dimension.id,event.block.location)) event.cancel = true;
});
world.beforeEvents.explosion.subscribe((event) => {
  const blocks = event.getImpactedBlocks();
  if (blocks.some(block => temporaryBlock(event.dimension.id,block.location)))
    event.setImpactedBlocks(blocks.filter(block => !temporaryBlock(event.dimension.id,block.location)));
});
world.afterEvents.entityHurt.subscribe((event) => { try { onForgeHurt(event); } catch (e) { if (CONFIG.debug) fail(e); } });
world.afterEvents.projectileHitEntity.subscribe((event) => {
  const shooter = event.source;
  if (event.projectile.typeId !== 'minecraft:arrow' || shooter?.typeId !== 'minecraft:player' || role(shooter) !== 'apollo') return;
  if (heldItem(shooter)?.nameTag !== '§eApollo’s Solar Bow') return;
  const target = event.getEntityHit().entity;
  if (!target || (!CONFIG.friendlyFire && target.typeId === 'minecraft:player')) return;
  try {
    target.applyDamage(sunlight(shooter) ? 6 : 2, { cause: EntityDamageCause.projectile, damagingEntity: shooter });
    cosmeticFlair(shooter, 'apollo');
  } catch (e) { if (CONFIG.debug) fail(e); }
});
world.afterEvents.itemReleaseUse.subscribe((event) => {
  if (role(event.source) === 'poseidon' && event.itemStack?.nameTag === '§bPoseidon’s Tidecaller') {
    const player = event.source;
    cosmeticFlair(player, 'poseidon');
    system.runTimeout(() => {
      try {
        if (role(player) !== 'poseidon' || (!player.isInWater && !inRain(player))) return;
        const velocity = player.getVelocity();
        if (Math.hypot(velocity.x, velocity.y, velocity.z) < 0.65) return; // Native Riptide actually launched.
        const view = player.getViewDirection();
        player.applyImpulse({ x: view.x * 0.85, y: Math.max(0.08, view.y * 0.35), z: view.z * 0.85 });
        showFlair(player, 'poseidon', true);
      } catch (e) { if (CONFIG.debug) fail(e); }
    }, 2);
  }
  if (role(event.source) === 'apollo' && event.itemStack?.nameTag === '§eApollo’s Solar Bow') cosmeticFlair(event.source, 'apollo');
});
world.afterEvents.weatherChange.subscribe((event) => {
  if (!event.dimension.endsWith('overworld')) return;
  currentWeather = event.newWeather;
  world.setDynamicProperty(key('weather'), currentWeather);
});
world.afterEvents.entityDie.subscribe((event) => { try { transferOnDeath(event); } catch (e) { fail(e); } });
world.afterEvents.playerLeave.subscribe((event) => { try { crownOwnerLeft(event.playerId); } catch (e) { fail(e); } });
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (!event.id.startsWith('olympus:')) return;
  const player = event.sourceEntity;
  if (!player || player.typeId !== 'minecraft:player') return;
  try {
    if (event.id === 'olympus:reset') reset(player);
    if (event.id === 'olympus:setup') setupTemple(player);
    if (event.id === 'olympus:crown_setup') { if (!temple()) setupTemple(player); crownSetup(player); }
    if (event.id === 'olympus:crown_status') showStatus(player);
    if (event.id === 'olympus:crown_reset') resetCrown(player);
    if (event.id === 'olympus:crown_recover') recoverCrown(player);
    if (event.id === 'olympus:crown_glory') showLeaderboard(player);
    if (event.id === 'olympus:crown_help') crownHelp(player);
    if (event.id === 'olympus:assign') {
      const god = event.message.trim().toLowerCase();
      if (!GODS.includes(god)) { tell(player, `Unknown god: ${god}`); return; }
      claim(player, god);
    }
    if (event.id === 'olympus:status') {
      tell(player, `v${PACK_VERSION} script active. Your role: ${role(player) || 'none'}. Temple: ${temple() ? 'placed' : 'not placed'}. Mountain: ${mountain() ? 'built' : 'not built'}. Claimed: ${GODS.filter(g => owner(g)).map(nameOf).join(', ') || 'none'}.`);
      if (role(player) === 'hermes') tell(player, `Your Slow Falling is ${hermesSlowfallEnabled(player) ? 'ON' : 'OFF'}. Sneak-use your relic to toggle it.`);
      if (role(player) === 'poseidon') tell(player, `Your Tidal Sprint is ${poseidonSpeedEnabled(player) ? 'ON' : 'OFF'}. Sneak-use your relic to toggle it.`);
    }
    if (event.id === 'olympus:controls') tell(player, role(player) ? CONTROLS[role(player)] : 'Reserve a god at its temple altar, gather the offering, and return within 10 minutes.');
    if (event.id === 'olympus:upgrade_mountain') {
      const old = mountain();
      if (!old) { tell(player, 'No Mount Olympus has been summoned yet.'); return; }
      if (old.height === NEW_MOUNTAIN_HEIGHT) { tell(player, 'Mount Olympus is already at the new height.'); return; }
      if (player.dimension.id !== old.dimension || Math.abs(player.location.x - old.x) > 70 || Math.abs(player.location.z - old.z) > 70) {
        tell(player, 'Stand near the existing mountain in its dimension before upgrading.'); return;
      }
      if (old.y > 275) { tell(player, 'This mountain is too high to add the temple below world height limits.'); return; }
      buildMountain(player, old);
    }
  } catch (e) { fail(e); }
});
world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) {
    try {
      event.player.setDynamicProperty(key('flightUntil'), undefined);
      hermesTurboTick.delete(event.player.id);
    } catch {}
    return;
  }
  system.runTimeout(() => {
    try {
      const god = role(event.player);
      tell(event.player, god ? `Welcome back, ${nameOf(god)}.` : 'Welcome! Visit the Hall of Eight Gods, reserve an altar, and return with its offering.');
      if (god) tell(event.player, CONTROLS[god]);
    }
    catch (e) { if (CONFIG.debug) fail(e); }
  }, 40);
});
let auraCycle = 0;
system.runInterval(() => {
  const players = world.getAllPlayers();
  for (const player of players) updatePlayer(player);
  if (++auraCycle % 2 === 0) for (const player of players) {
    const god = role(player);
    if (god && !player.getEffect('invisibility')) showFlair(player, god);
  }
  const m = mountain();
  if (m && players.some(player => player.dimension.id === m.dimension &&
      Math.abs(player.location.x - m.x) < 40 && Math.abs(player.location.z - m.z) < 40)) {
    try { restockSummitChest(m); } catch (e) { if (CONFIG.debug) fail(e); }
  }
}, 40);
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    suppressOldPenalties(player);
    updateFlight(player);
    if (role(player) === 'hermes') { hermesFallProtection(player); hermesMotion(player); }
    if (role(player) === 'poseidon') { poseidonMotion(player); poseidonFallProtection(player); }
  }
}, 1);
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    if (role(player) === 'dionysus') refillDionysusBoneMeal(player);
    protectOwnedGear(player);
  }
}, 5);
system.runInterval(() => {
  const current = now();
  for (const [targetKey, expiry] of dionysusTargetCooldowns) if (expiry <= current) dionysusTargetCooldowns.delete(targetKey);
}, 400);
system.runInterval(() => { try { crownTick(); } catch (e) { fail(e); } }, 100);
system.runInterval(() => { try { cleanCrownDrops(); } catch (e) { if (CONFIG.debug) fail(e); } }, 400);
system.runInterval(() => { try { crownFlair(); } catch (e) { if (CONFIG.debug) fail(e); } }, 40);
system.runInterval(() => { try { crownDominionTick(); } catch (e) { fail(e); } }, 10);
system.runInterval(() => { try { dominionFlair(); } catch (e) { if (CONFIG.debug) fail(e); } }, 40);
system.runInterval(() => { try { forgeEquipmentTick(); } catch (e) { if (CONFIG.debug) fail(e); } }, 10);
system.runInterval(() => { for (const player of world.getAllPlayers()) if (['hades','poseidon'].includes(role(player))) updatePlayer(player); }, 10);
system.runInterval(() => { try { revealCrown(); } catch (e) { fail(e); } }, 6000);
