import { world, system, ItemStack, EquipmentSlot, WeatherType, MolangVariableMap } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { activateDominion, dismissDominion, dominionState, dominionTick } from './dominion.js';
import { CONFIG } from './config.js';

const CROWN = 'olympus:crown';
const CONTROL = 'olympus:crown_control';
const STATE = 'olympus:crown_state';
const OFFERINGS = ['minecraft:gold_ingot', 'minecraft:iron_ingot', 'minecraft:emerald', 'minecraft:lapis_lazuli'];
const AUTHORITY_MS = 300000;
const WEATHER_MS = 120000;
const GLORY_MS = 900000;
let api;
let busy = false;
const lastSeen = new Map();

const time = () => Date.now();
const announce = message => world.sendMessage(`§6[Olympus]§r ${message}`);
function state() {
  try { return JSON.parse(world.getDynamicProperty(STATE) || '{}'); } catch { return { corrupt: true }; }
}
function save(value) { world.setDynamicProperty(STATE, JSON.stringify(value)); }
function ownerPlayer(value = state()) { return world.getAllPlayers().find(p => p.id === value.ownerId); }
function inventory(player) { return player.getComponent('minecraft:inventory')?.container; }
function equipment(player) { return player.getComponent('minecraft:equippable'); }
function isCrown(item) { return item?.typeId === CROWN; }
function makeCrown() {
  const item = new ItemStack(CROWN, 1);
  item.keepOnDeath = true;
  item.setLore(['§6The singular Crown of Olympus', '§7Wear to gain Divine Authority.', '§7Use its control seal to command the world.']);
  return item;
}
function makeControl() {
  const item = new ItemStack(CONTROL, 1);
  item.keepOnDeath = true;
  return item;
}
function removeItems(player, id) {
  const bag = inventory(player);
  if (bag) for (let i = 0; i < bag.size; i++) if (bag.getItem(i)?.typeId === id) bag.setItem(i, undefined);
  const gear = equipment(player);
  for (const slot of [EquipmentSlot.Head, EquipmentSlot.Offhand]) {
    if (gear?.getEquipment(slot)?.typeId === id) gear.setEquipment(slot, undefined);
  }
}
function hasItem(player, id) {
  const bag = inventory(player);
  if (bag) for (let i = 0; i < bag.size; i++) if (bag.getItem(i)?.typeId === id) return true;
  const gear = equipment(player);
  return [EquipmentSlot.Head, EquipmentSlot.Offhand].some(slot => gear?.getEquipment(slot)?.typeId === id);
}
function pruneOwner(player, id) {
  const bag = inventory(player), gear = equipment(player);
  let found = false;
  for (const slot of [EquipmentSlot.Head, EquipmentSlot.Offhand]) {
    if (gear?.getEquipment(slot)?.typeId !== id) continue;
    if (found) gear.setEquipment(slot, undefined);
    else found = true;
  }
  if (!bag) return;
  for (let i = 0; i < bag.size; i++) {
    if (bag.getItem(i)?.typeId !== id) continue;
    if (found) bag.setItem(i, undefined);
    else found = true;
  }
}
function grant(player) {
  const bag = inventory(player);
  if (!bag) return false;
  if (!hasItem(player, CROWN)) {
    const head = equipment(player)?.getEquipment(EquipmentSlot.Head);
    if (!head && equipment(player)?.setEquipment(EquipmentSlot.Head, makeCrown())) {}
    else if (bag.addItem(makeCrown())) return false;
  }
  if (!hasItem(player, CONTROL) && bag.addItem(makeControl())) return false;
  return true;
}
function cleanDrops() {
  for (const dim of ['overworld', 'nether', 'the_end']) {
    for (const entity of world.getDimension(dim).getEntities({ type: 'minecraft:item' })) {
      const id = entity.getComponent('minecraft:item')?.itemStack?.typeId;
      if (id === CROWN || id === CONTROL) entity.remove();
    }
  }
}
export function configureCrown(callbacks) { api = callbacks; }
export function crowned(player) {
  const s = state();
  return s.ownerId === player.id && !!api.role(player) && api.role(player) === s.ownerGod && isCrown(equipment(player)?.getEquipment(EquipmentSlot.Head));
}
export function crownOwner(player) { return state().ownerId === player.id; }
export function crownCooldownSeconds(player, seconds) {
  return crowned(player) && api.role(player) !== 'zeus' ? Math.ceil(seconds / 2) : seconds;
}
function throne() {
  const t = api.temple();
  return t && { x: t.x + 16, y: t.y + 2, z: t.z + 16, dimension: t.dimension || 'minecraft:overworld' };
}
export function atThrone(block) {
  const p = throne();
  return p && block.x === p.x && block.y === p.y && block.z === p.z;
}
function nearThrone(player) {
  const p = throne(), l = player.location;
  return p && player.dimension.id === p.dimension && Math.abs(l.x-p.x) < 5 && Math.abs(l.y-p.y) < 5 && Math.abs(l.z-p.z) < 5;
}
function format(ms) {
  const n = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(n/60)}m ${n%60}s`;
}
function glory(value, id) { return value.glory?.[id] || { name: '', god: '', points: 0, progress: 0 }; }
export function showLeaderboard(player) {
  const s = state();
  const rows = Object.entries(s.glory || {}).sort((a,b) => b[1].points-a[1].points)
    .map(([id,g], i) => `${i+1}. ${g.name} (${g.god}) — ${g.points} Glory${id === s.ownerId ? ' §6★' : ''}`);
  new ActionFormData().title('§6Olympian Glory').body(rows.join('\n') || 'No Glory has been earned yet.').button('Close').show(player).catch(api.fail);
}
function claim(player) {
  if (busy || state().ownerId || state().corrupt || !nearThrone(player) || !api.role(player)) { player.sendMessage('§cThe crown cannot be claimed now.'); return; }
  if (OFFERINGS.some(id => api.offeringCount(player, id) < 1)) { player.sendMessage('§cYou need all four offerings.'); return; }
  busy = true;
  const taken = [];
  try {
    if (state().ownerId) return;
    for (const id of OFFERINGS) {
      if (!api.takeOffering(player, id, 1)) throw new Error(`Could not consume ${id}`);
      taken.push(id);
    }
    const s = state();
    s.ownerId = player.id; s.ownerName = player.name; s.ownerGod = api.role(player);
    s.claimed = true; s.lastTransfer = time();
    lastSeen.clear();
    save(s);
    if (!grant(player)) player.sendMessage('§eClear an inventory slot and use /function olympus/crown_recover. Your ownership is safe.');
    announce(`§6THE THRONE HAS BEEN CLAIMED! §e${player.name}, ${s.ownerGod}, wears the Crown of Olympus!`);
    try { player.dimension.playSound('random.levelup', player.location); } catch {}
    for (const p of world.getAllPlayers()) p.onScreenDisplay.setTitle('§6THE THRONE HAS BEEN CLAIMED', { subtitle: `${player.name} has ascended!`, stayDuration: 80 });
  } catch (e) {
    if (!state().ownerId) for (const id of taken) inventory(player)?.addItem(new ItemStack(id, 1));
    api.fail(e);
    player.sendMessage('§cCrown claim failed. Offerings were returned where inventory space allowed.');
  } finally { busy = false; }
}
export function showThrone(player) {
  const s = state();
  if (s.corrupt) { player.sendMessage('§cCrown record needs operator recovery.'); return; }
  if (s.ownerId) {
    new ActionFormData().title('§6THE THRONE OF OLYMPUS')
      .body(`Claimed by ${s.ownerName} (${s.ownerGod}). Defeat the holder in PvP to seize the Crown.`)
      .button('Crown status').button('Glory leaderboard').button('Close').show(player)
      .then(r => { if (r.selection === 0) showStatus(player); if (r.selection === 1) showLeaderboard(player); }).catch(api.fail);
    return;
  }
  const lines = OFFERINGS.map(id => `${api.offeringCount(player,id) ? '§a✓' : '§c✗'} §r${id.slice(10).replaceAll('_',' ')}`);
  new ActionFormData().title('§6THE THRONE OF OLYMPUS')
    .body(`The throne of the gods stands empty. Bring the four offerings and claim authority over Olympus.\n\n${lines.join('\n')}\n\n${api.role(player) ? 'God assigned' : '§cClaim a god first'}`)
    .button('Claim the Crown').button('Cancel').show(player)
    .then(r => { if (r.selection === 0) claim(player); }).catch(api.fail);
}
export function showStatus(player) {
  const s = state();
  const own = s.ownerId === player.id;
  const active = own && crowned(player);
  const cd = format((s.authorityUntil || 0) - time());
  const g = glory(s, player.id);
  const body = `Holder: ${s.ownerName || 'Unclaimed'} (${s.ownerGod || 'none'})\nCrown: ${active ? 'worn' : own ? 'owned, unequipped' : 'not owned'}\nBenefits: ${active ? s.ownerGod === 'zeus' ? 'Time, weather and Dominion' : 'Weakness suppression, half god cooldowns, authority, Dominion' : 'inactive'}\nDivine Authority: ${cd}\nDominion: ${format((s.dominionUntil || 0)-time())}${dominionState().active ? ' (active)' : ''}\nWeather: ${api.weather()}\nTime: ${world.getTimeOfDay()}\nYour Glory: ${g.points}`;
  new ActionFormData().title('§6CROWN OF OLYMPUS').body(body)
    .button('Command the Sun and Moon').button('Command the Skies').button('Dimensional Dominion').button('View Crown Status').button('Glory Leaderboard').button('Close')
    .show(player).then(r => {
      if (r.selection === 0) submenu(player, 'time');
      if (r.selection === 1) submenu(player, 'weather');
      if (r.selection === 2) dominionMenu(player);
      if (r.selection === 3) showStatus(player);
      if (r.selection === 4) showLeaderboard(player);
    }).catch(api.fail);
}
function dominionMenu(player) {
  const active = dominionState().active;
  new ActionFormData().title('§6DIMENSIONAL DOMINION')
    .body(`Command the land itself for ${CONFIG.dominion.durationSeconds} seconds within ${CONFIG.dominion.radius} blocks. Cooldown: ${format((state().dominionUntil || 0)-time())}.`)
    .button('Underworld Dominion').button('Overworld Dominion').button(active ? 'Dismiss active Dominion' : 'Cancel')
    .show(player).then(r => {
      if (r.selection === 0) commandDominion(player,'underworld');
      if (r.selection === 1) commandDominion(player,'overworld');
      if (r.selection === 2 && active && crowned(player)) dismissDominion();
    }).catch(api.fail);
}
function commandDominion(player,mode) {
  const s = state();
  if (s.ownerId !== player.id || !crowned(player)) { player.sendMessage('§cWear your own Crown to command Dominion.'); return; }
  if (s.dominionUntil > time()) { player.sendMessage(`§eDominion returns in ${format(s.dominionUntil-time())}.`); return; }
  if (dominionState().active || dominionState().records?.length) { player.sendMessage('§cA Dominion is active or its terrain is still recovering.'); return; }
  if (!activateDominion(player,mode)) { player.sendMessage('§cNo safe natural terrain was available here. No cooldown was spent.'); return; }
  s.dominionUntil = time()+CONFIG.dominion.cooldownSeconds*1000;
  save(s);
  announce(`${player.name} has invoked ${mode === 'underworld' ? 'Underworld' : 'Overworld'} Dominion!`);
}
function submenu(player, kind) {
  const choices = kind === 'time' ? ['Summon Day', 'Summon Night'] : ['Clear Skies', 'Summon Rain', 'Summon Thunderstorm'];
  const form = new ActionFormData().title(kind === 'time' ? '§6Sun and Moon' : '§6Command the Skies')
    .body(`Shared cooldown: ${format((state().authorityUntil || 0)-time())}`);
  for (const choice of choices) form.button(choice);
  form.button('Back').show(player).then(r => {
    if (r.selection === choices.length) { showStatus(player); return; }
    if (r.selection !== undefined) command(player, kind, r.selection);
  }).catch(api.fail);
}
function command(player, kind, choice) {
  const s = state();
  if (s.ownerId !== player.id || !crowned(player) || player.dimension.id !== 'minecraft:overworld') { player.sendMessage('§cWear your own crown in the Overworld.'); return; }
  if ((s.authorityUntil || 0) > time()) { player.sendMessage(`§eDivine Authority returns in ${format(s.authorityUntil-time())}.`); return; }
  try {
    if (kind === 'time') world.setTimeOfDay(choice === 0 ? 1000 : 13000);
    else {
      const choices = [WeatherType.Clear, WeatherType.Rain, WeatherType.Thunder];
      const previous = api.weather();
      world.getDimension('overworld').setWeather(choices[choice], 2400);
      api.setWeather(choices[choice]);
      s.weatherOverride = { previous, until: time() + WEATHER_MS };
    }
    s.authorityUntil = time() + AUTHORITY_MS;
    save(s);
    announce(kind === 'time' ? 'The Crowned Olympian has commanded the sun and moon!' : 'The Crowned Olympian has commanded the skies!');
  } catch (e) { api.fail(e); player.sendMessage('§cDivine Authority failed; its cooldown was not consumed.'); }
}
export function resetCrown(player) {
  dismissDominion();
  for (const p of world.getAllPlayers()) { removeItems(p, CROWN); removeItems(p, CONTROL); }
  cleanDrops();
  const s = state();
  save({ glory: s.glory || {}, claimed: false });
  lastSeen.clear();
  player.sendMessage('§6Crown reset. The Trial of Ascension is available again. Glory was preserved.');
}
export function recoverCrown(player) {
  const s = state();
  if (s.corrupt) { player.sendMessage('§cCrown record is corrupt. Restore a world backup or use /function olympus/crown_reset for a new trial.'); return; }
  if (!s.ownerId) { player.sendMessage('§eCrown unclaimed. Visit the Hall throne.'); return; }
  for (const p of world.getAllPlayers()) if (p.id !== s.ownerId) { removeItems(p,CROWN); removeItems(p,CONTROL); }
  cleanDrops();
  const holder = ownerPlayer(s);
  if (holder) { grant(holder); player.sendMessage(`§aCrown reconciled for ${holder.name}.`); }
  else player.sendMessage(`§e${s.ownerName} is offline; ownership is preserved and gear will return on login.`);
}
export function transferOnDeath(event) {
  const victim = event.deadEntity;
  const s = state();
  if (victim.typeId !== 'minecraft:player' || s.ownerId !== victim.id) return;
  dismissDominion();
  const source = event.damageSource;
  const direct = source?.damagingEntity;
  let projectileOwner;
  try { projectileOwner = source?.damagingProjectile?.getComponent('minecraft:projectile')?.owner; } catch {}
  const killer = direct?.typeId === 'minecraft:player' ? direct : projectileOwner;
  if (killer?.typeId === 'minecraft:player' && killer.id !== victim.id && api.role(killer)) {
    s.ownerId = killer.id; s.ownerName = killer.name; s.ownerGod = api.role(killer); s.lastTransfer = time();
    lastSeen.clear();
    save(s);
    system.run(() => {
      try { if (!grant(killer)) killer.sendMessage('§eClear an inventory slot to receive the Crown and its control seal. Ownership is yours.'); } catch (e) { api.fail(e); }
      try { removeItems(victim,CROWN); removeItems(victim,CONTROL); } catch {}
      try { cleanDrops(); } catch (e) { api.fail(e); }
    });
    announce(`§e${killer.name} has slain ${victim.name} and seized the Crown!`);
  } else {
    system.run(() => {
      try { removeItems(victim,CROWN); removeItems(victim,CONTROL); } catch {}
      try { cleanDrops(); } catch (e) { api.fail(e); }
    });
  }
}
export function crownTick() {
  const s = state(), current = time();
  if (s.weatherOverride?.until <= current) {
    try { world.getDimension('overworld').setWeather(s.weatherOverride.previous, 12000); api.setWeather(s.weatherOverride.previous); }
    catch (e) { api.fail(e); }
    delete s.weatherOverride; save(s);
  }
  const holder = ownerPlayer(s);
  for (const p of world.getAllPlayers()) {
    if (p.id === s.ownerId) {
      if ((p.getComponent('minecraft:health')?.currentValue || 0) > 0) { pruneOwner(p,CROWN); pruneOwner(p,CONTROL); grant(p); }
    }
    else { removeItems(p,CROWN); removeItems(p,CONTROL); }
  }
  if (!holder || !crowned(holder)) { lastSeen.clear(); return; }
  const previous = lastSeen.get(holder.id) || current;
  const t = api.temple(), l = holder.location;
  const protectedZone = t && holder.dimension.id === (t.dimension || 'minecraft:overworld') && Math.abs(l.x-(t.x+16)) <= 20 && Math.abs(l.z-(t.z+16)) <= 20;
  if (!protectedZone) {
    const g = glory(s, holder.id);
    g.name = holder.name; g.god = api.role(holder);
    g.progress += Math.min(5000, current-previous);
    while (g.progress >= GLORY_MS) { g.progress -= GLORY_MS; g.points++; holder.sendMessage('§6+1 Olympian Glory!'); }
    s.glory = s.glory || {}; s.glory[holder.id] = g; save(s);
  }
  lastSeen.set(holder.id, current);
}
export function crownDominionTick() {
  const s = state();
  const holder = ownerPlayer(s);
  dominionTick(s.ownerId,!!holder && crowned(holder));
}
export function crownOwnerLeft(playerId) { if (state().ownerId === playerId) dismissDominion(); }
export function cleanCrownDrops() { cleanDrops(); }
export function revealCrown() {
  const s = state();
  if (!s.ownerId) return;
  const p = ownerPlayer(s);
  if (!p) { announce(`${s.ownerName}, the crown holder, is offline.`); return; }
  announce(`The Crown is held by ${p.name} near X: ${Math.round(p.location.x/100)*100}, Z: ${Math.round(p.location.z/100)*100} (${p.dimension.id.replace('minecraft:','')}).`);
}
export function crownFlair() {
  const p = throne();
  if (!p || !world.getAllPlayers().some(player => player.dimension.id === p.dimension && Math.abs(player.location.x-p.x) < 18 && Math.abs(player.location.z-p.z) < 18)) return;
  const color = new MolangVariableMap();
  color.setColorRGB('variable.color', { red: 1, green: 0.72, blue: 0.15 });
  world.getDimension(p.dimension).spawnParticle('minecraft:colored_flame_particle', { x: p.x+0.5, y: p.y+1.5, z: p.z+0.5 }, color);
}
export function crownHelp(player) { player.sendMessage('§6Crown: visit the Hall center with gold, iron, emerald and lapis. Wear it, use the control seal, and defend it in PvP. /function olympus/crown_status opens the menu.'); }
export function crownSetup(player) { player.sendMessage('§6The Crown throne is the existing gold and sea lantern center of the Hall. /function olympus/setup places the Hall and prepares the Trial.'); }
export function crownControl(player) { showStatus(player); }
