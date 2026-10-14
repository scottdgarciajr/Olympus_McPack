import { world, system, ItemStack, EquipmentSlot, WeatherType, MolangVariableMap } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { activateDominion, dismissDominion, dominionState, dominionTick } from './dominion.js';
import { CONFIG } from './config.js';

const CROWN = 'olympus:crown';
const CONTROL = 'olympus:crown_control';
const STATE = 'olympus:crown_state';
const SERIAL = 'olympus:crownSerial';
export const CROWN_OFFERINGS = [
  { id:'minecraft:ender_pearl', domain:'Hermes — travel' },
  { id:'minecraft:lightning_rod', domain:'Zeus — storms' },
  { id:'minecraft:heart_of_the_sea', domain:'Poseidon — sea' },
  { id:'minecraft:blaze_rod', domain:'Hades — Nether' },
  { id:'olympus:war_trophy', domain:'Ares — PvP victory' },
  { id:'minecraft:daylight_detector', domain:'Apollo — sunlight' },
  { id:'minecraft:netherite_ingot', domain:'Hephaestus — mining and forge' },
  { id:'minecraft:glistering_melon_slice', domain:'Dionysus — harvest and brewing' }
];
const AUTHORITY_MS = 300000;
const WEATHER_MS = 120000;
const GLORY_MS = 900000;
let api;
let busy = false;
const lastSeen = new Map();

const time = () => Date.now();
const announce = message => world.sendMessage(`§6[Olympus]§r ${message}`);
function state() {
  try {
    const s=JSON.parse(world.getDynamicProperty(STATE) || '{}');
    if (!Array.isArray(s.crowns)) s.crowns=s.ownerId ? [{serial:1,ownerId:s.ownerId,ownerName:s.ownerName,ownerGod:s.ownerGod,
      authorityUntil:s.authorityUntil||0,dominionUntil:s.dominionUntil||0,lastTransfer:s.lastTransfer}] : [];
    return s;
  } catch { return { corrupt: true, crowns:[] }; }
}
function save(value) { world.setDynamicProperty(STATE, JSON.stringify(value)); }
function matches(record,player) { return !!player && (record.ownerId===player.id ||
  (!!record.ownerName && record.ownerName===player.name && record.ownerGod===api.role(player))); }
function records(value,player) { return value.crowns.filter(c=>matches(c,player)); }
function serial(item) { return item?.typeId===CROWN ? Number(item.getDynamicProperty(SERIAL)||1) : 0; }
function wornRecord(value,player) { const n=serial(equipment(player)?.getEquipment(EquipmentSlot.Head)); return records(value,player).find(c=>c.serial===n); }
function activeRecord(value,player) { return wornRecord(value,player)||records(value,player)[0]; }
function owns(value,player) { return records(value,player).length>0; }
function ownerPlayer(record) { return world.getAllPlayers().find(p=>matches(record,p)); }
function inventory(player) { return player.getComponent('minecraft:inventory')?.container; }
function equipment(player) { return player.getComponent('minecraft:equippable'); }
function isCrown(item) { return item?.typeId === CROWN; }
function makeCrown(n) {
  const item = new ItemStack(CROWN, 1);
  item.keepOnDeath = true;
  item.setDynamicProperty(SERIAL,n);
  item.setLore([`§6Crown of Olympus #${n}`, '§7Wear to gain Divine Authority.', '§7Use its control seal to command the world.']);
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
function hasItem(player, id, n=0) {
  const bag = inventory(player);
  if (bag) for (let i = 0; i < bag.size; i++) if (bag.getItem(i)?.typeId === id && (!n || serial(bag.getItem(i))===n)) return true;
  const gear = equipment(player);
  return [EquipmentSlot.Head, EquipmentSlot.Offhand].some(slot => gear?.getEquipment(slot)?.typeId === id && (!n || serial(gear.getEquipment(slot))===n));
}
function pruneOwner(player, owned) {
  const bag = inventory(player), gear = equipment(player);
  const allowed=new Set(owned.map(c=>c.serial)), seen=new Set();
  for (const slot of [EquipmentSlot.Head, EquipmentSlot.Offhand]) {
    const item=gear?.getEquipment(slot), n=serial(item);
    if (n && (!allowed.has(n)||seen.has(n))) gear.setEquipment(slot,undefined);
    else if (n) seen.add(n);
  }
  if (bag) for (let i = 0; i < bag.size; i++) {
    const item=bag.getItem(i), n=serial(item);
    if (n && (!allowed.has(n)||seen.has(n))) bag.setItem(i,undefined);
    else if (n) seen.add(n);
  }
  if (!owned.length) removeItems(player,CONTROL);
  else {
    let found=gear?.getEquipment(EquipmentSlot.Offhand)?.typeId===CONTROL;
    if (bag) for (let i=0;i<bag.size;i++) if (bag.getItem(i)?.typeId===CONTROL) {
      if (found) bag.setItem(i,undefined); else found=true;
    }
  }
}
function grant(player, owned=records(state(),player)) {
  const bag = inventory(player);
  if (!bag) return false;
  let complete=true;
  for (const c of owned) if (!hasItem(player,CROWN,c.serial)) {
    const head=equipment(player)?.getEquipment(EquipmentSlot.Head);
    if (!head) equipment(player)?.setEquipment(EquipmentSlot.Head,makeCrown(c.serial));
    else if (bag.addItem(makeCrown(c.serial))) complete=false;
  }
  if (owned.length && !hasItem(player,CONTROL) && bag.addItem(makeControl())) complete=false;
  return complete;
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
  const c=wornRecord(s,player);
  return !!c && !!api.role(player) && api.role(player)===c.ownerGod;
}
export function crownOwner(player) { return owns(state(),player); }
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
function offeringsText(player) { return CROWN_OFFERINGS.map(o=>`${api.offeringCount(player,o.id)?'§a✓':'§c✗'} §r${o.domain}: ${o.id.replace(/^(minecraft|olympus):/,'').replaceAll('_',' ')}`).join('\n'); }
function hasOfferings(player) { return CROWN_OFFERINGS.every(o=>api.offeringCount(player,o.id)>=1); }
function takeOfferings(player) {
  const taken=[];
  try {
    for (const o of CROWN_OFFERINGS) {
      if (!api.takeOffering(player,o.id,1)) throw new Error(`Could not consume ${o.id}`);
      taken.push(o.id);
    }
    return true;
  } catch (e) {
    for (const id of taken) inventory(player)?.addItem(new ItemStack(id,1));
    api.fail(e); return false;
  }
}
function refundOfferings(player) { for (const o of CROWN_OFFERINGS) inventory(player)?.addItem(new ItemStack(o.id,1)); }
export function showLeaderboard(player) {
  const s = state();
  const rows = Object.entries(s.glory || {}).sort((a,b) => b[1].points-a[1].points)
    .map(([id,g], i) => `${i+1}. ${g.name} (${g.god}) — ${g.points} Glory${s.crowns.some(c=>c.ownerId===id) ? ' §6★' : ''}`);
  new ActionFormData().title('§6Olympian Glory').body(rows.join('\n') || 'No Glory has been earned yet.').button('Close').show(player).catch(api.fail);
}
function claim(player) {
  if (busy || state().crowns.length || state().corrupt || !nearThrone(player) || !api.role(player)) { player.sendMessage('§cThe first Crown cannot be claimed now.'); return; }
  if (!hasOfferings(player)) { player.sendMessage('§cBring all eight domain offerings shown at the throne.'); return; }
  busy = true;
  let charged=false,saved=false;
  try {
    if (state().crowns.length || !takeOfferings(player)) return;
    charged=true;
    const s = state();
    s.crowns.push({serial:1,ownerId:player.id,ownerName:player.name,ownerGod:api.role(player),authorityUntil:0,dominionUntil:0,lastTransfer:time()});
    s.claimed = true; s.lastTransfer = time();
    lastSeen.clear();
    save(s);
    saved=true;
    if (!grant(player)) player.sendMessage('§eClear an inventory slot and use /function olympus/crown_recover. Your ownership is safe.');
    announce(`§6THE THRONE HAS BEEN CLAIMED! §e${player.name} wears the first Crown of Olympus!`);
    try { player.dimension.playSound('random.levelup', player.location); } catch {}
    for (const p of world.getAllPlayers()) p.onScreenDisplay.setTitle('§6THE THRONE HAS BEEN CLAIMED', { subtitle: `${player.name} has ascended!`, stayDuration: 80 });
  } catch (e) {
    if (charged && !saved) refundOfferings(player);
    api.fail(e);
    player.sendMessage('§cCrown claim failed. Offerings were returned where inventory space allowed.');
  } finally { busy = false; }
}
function duplicate(player,recipient) {
  const s=state();
  if (busy || s.corrupt || !s.crowns.length || !nearThrone(player) || !crowned(player) || !recipient || !api.role(recipient) || owns(s,recipient)) {
    player.sendMessage('§cA crowned owner at the throne must choose another claimed god without a Crown.'); return;
  }
  if (api.offeringCount(player,'minecraft:dragon_egg')<1 || !hasOfferings(player)) {
    player.sendMessage('§cBring a Dragon Egg catalyst and all eight domain offerings. The egg is not consumed.'); return;
  }
  busy=true;
  let charged=false,saved=false;
  try {
    if (!takeOfferings(player)) return;
    charged=true;
    const n=Math.max(0,...s.crowns.map(c=>c.serial))+1;
    s.crowns.push({serial:n,ownerId:recipient.id,ownerName:recipient.name,ownerGod:api.role(recipient),authorityUntil:0,dominionUntil:0,lastTransfer:time()});
    save(s);
    saved=true;
    if (!grant(recipient)) recipient.sendMessage('§eClear an inventory slot and use /function olympus/crown_recover.');
    announce(`${player.name} forged Crown #${n} for ${recipient.name} with the Dragon Egg catalyst!`);
  } catch (e) { if (charged && !saved) refundOfferings(player); api.fail(e); player.sendMessage('§cCrown duplication failed. Check Crown Status.'); }
  finally { busy=false; }
}
function duplicateMenu(player) {
  if (!crowned(player) || !nearThrone(player)) { player.sendMessage('§cWear your Crown beside the Hall throne.'); return; }
  const s=state(), candidates=world.getAllPlayers().filter(p=>p.id!==player.id && api.role(p) && !owns(s,p));
  if (!candidates.length) { player.sendMessage('§eAnother claimed god without a Crown must be online to receive the new one.'); return; }
  const form=new ActionFormData().title('§6FORGE ANOTHER CROWN')
    .body(`The Dragon Egg is a reusable catalyst. Each new Crown consumes all eight domain offerings. Choose its new owner.\n\n${offeringsText(player)}\n${api.offeringCount(player,'minecraft:dragon_egg')?'§a✓':'§c✗'} Dragon Egg catalyst`);
  for (const p of candidates) form.button(`${p.name} — ${api.role(p)}`);
  form.button('Cancel').show(player).then(r=>{ if (r.selection!==undefined && r.selection<candidates.length) duplicate(player,candidates[r.selection]); }).catch(api.fail);
}
export function showThrone(player) {
  const s = state();
  if (s.corrupt) { player.sendMessage('§cCrown record needs operator recovery.'); return; }
  if (s.crowns.length) {
    new ActionFormData().title('§6THE THRONE OF OLYMPUS')
      .body(`${s.crowns.length} Crown${s.crowns.length===1?'':'s'} forged. Defeat a holder in PvP or forge another with the Dragon Egg and eight fresh offerings.`)
      .button('Forge another Crown').button('Crown status').button('Glory leaderboard').button('Close').show(player)
      .then(r => { if (r.selection === 0) duplicateMenu(player); if (r.selection === 1) showStatus(player); if (r.selection === 2) showLeaderboard(player); }).catch(api.fail);
    return;
  }
  new ActionFormData().title('§6THE THRONE OF OLYMPUS')
    .body(`The throne stands empty. Bring one offering from each of the eight domains.\n\n${offeringsText(player)}\n\n${api.role(player) ? 'God assigned' : '§cClaim a god first'}`)
    .button('Claim the Crown').button('Cancel').show(player)
    .then(r => { if (r.selection === 0) claim(player); }).catch(api.fail);
}
export function showStatus(player) {
  const s = state();
  const own = owns(s,player);
  const active = own && crowned(player);
  const c = activeRecord(s,player);
  const cd = format((c?.authorityUntil || 0) - time());
  const g = glory(s, player.id);
  const holders=s.crowns.map(c=>`#${c.serial} ${c.ownerName} (${c.ownerGod})`).join(', ') || 'Unclaimed';
  const body = `Holders: ${holders}\nYour Crown: ${active ? `#${c.serial} worn` : own ? 'owned, unequipped' : 'not owned'}\nBenefits: ${active ? c.ownerGod === 'zeus' ? 'Time, weather and Dominion' : 'Weakness suppression, half god cooldowns, authority, Dominion' : 'inactive'}\nDivine Authority: ${cd}\nDominion: ${format((c?.dominionUntil || 0)-time())}${dominionState().active ? ' (active)' : ''}\nWeather: ${api.weather()}\nTime: ${world.getTimeOfDay()}\nYour Glory: ${g.points}`;
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
    .body(`Command the land itself for ${CONFIG.dominion.durationSeconds} seconds within ${CONFIG.dominion.radius} blocks. Cooldown: ${format((activeRecord(state(),player)?.dominionUntil || 0)-time())}.`)
    .button('Underworld Dominion').button('Overworld Dominion').button(active ? 'Dismiss active Dominion' : 'Cancel')
    .show(player).then(r => {
      if (r.selection === 0) commandDominion(player,'underworld');
      if (r.selection === 1) commandDominion(player,'overworld');
      if (r.selection === 2 && active && crowned(player)) dismissDominion();
    }).catch(api.fail);
}
function commandDominion(player,mode) {
  const s = state();
  const c=wornRecord(s,player);
  if (!c || !crowned(player)) { player.sendMessage('§cWear a Crown you own to command Dominion. Check Crown Status for ownership.'); return; }
  if (c.dominionUntil > time()) { player.sendMessage(`§eDominion returns in ${format(c.dominionUntil-time())}.`); return; }
  if (dominionState().active || dominionState().records?.length) { player.sendMessage('§cA Dominion is active or its terrain is still recovering.'); return; }
  const result=activateDominion(player,mode,c.serial);
  if (!result.ok) { player.sendMessage(`§c${result.reason} No cooldown was spent.`); return; }
  c.dominionUntil = time()+CONFIG.dominion.cooldownSeconds*1000;
  save(s);
  announce(`${player.name} has invoked ${mode === 'underworld' ? 'Underworld' : 'Overworld'} Dominion!`);
}
function submenu(player, kind) {
  const choices = kind === 'time' ? ['Summon Day', 'Summon Night'] : ['Clear Skies', 'Summon Rain', 'Summon Thunderstorm'];
  const form = new ActionFormData().title(kind === 'time' ? '§6Sun and Moon' : '§6Command the Skies')
    .body(`Your Crown's cooldown: ${format((activeRecord(state(),player)?.authorityUntil || 0)-time())}`);
  for (const choice of choices) form.button(choice);
  form.button('Back').show(player).then(r => {
    if (r.selection === choices.length) { showStatus(player); return; }
    if (r.selection !== undefined) command(player, kind, r.selection);
  }).catch(api.fail);
}
function command(player, kind, choice) {
  const s = state();
  const c=wornRecord(s,player);
  if (!c || !crowned(player) || player.dimension.id !== 'minecraft:overworld') { player.sendMessage('§cWear your own crown in the Overworld. Check Crown Status for ownership.'); return; }
  if ((c.authorityUntil || 0) > time()) { player.sendMessage(`§eDivine Authority returns in ${format(c.authorityUntil-time())}.`); return; }
  try {
    if (kind === 'time') world.setTimeOfDay(choice === 0 ? 1000 : 13000);
    else {
      const choices = [WeatherType.Clear, WeatherType.Rain, WeatherType.Thunder];
      const previous = s.weatherOverride?.previous || api.weather();
      world.getDimension('overworld').setWeather(choices[choice], 2400);
      api.setWeather(choices[choice]);
      s.weatherOverride = { previous, until: time() + WEATHER_MS };
    }
    c.authorityUntil = time() + AUTHORITY_MS;
    save(s);
    announce(kind === 'time' ? 'The Crowned Olympian has commanded the sun and moon!' : 'The Crowned Olympian has commanded the skies!');
  } catch (e) { api.fail(e); player.sendMessage('§cDivine Authority failed; its cooldown was not consumed.'); }
}
export function resetCrown(player) {
  dismissDominion();
  for (const p of world.getAllPlayers()) { removeItems(p, CROWN); removeItems(p, CONTROL); }
  cleanDrops();
  const s = state();
  save({ glory: s.glory || {}, claimed: false, crowns:[] });
  lastSeen.clear();
  player.sendMessage('§6Crown reset. The Trial of Ascension is available again. Glory was preserved.');
}
export function recoverCrown(player) {
  const s = state();
  if (s.corrupt) { player.sendMessage('§cCrown record is corrupt. Restore a world backup or use /function olympus/crown_reset for a new trial.'); return; }
  if (!s.crowns.length) { player.sendMessage('§eCrown unclaimed. Visit the Hall throne.'); return; }
  for (const p of world.getAllPlayers()) pruneOwner(p,records(s,p));
  cleanDrops();
  for (const p of world.getAllPlayers()) if (owns(s,p)) grant(p,records(s,p));
  player.sendMessage(`§aReconciled ${s.crowns.length} Crown records. Offline owners retain theirs.`);
}
export function transferOnDeath(event) {
  const victim = event.deadEntity;
  const s = state();
  if (victim.typeId !== 'minecraft:player' || !owns(s,victim)) return;
  const taken=records(s,victim);
  dismissDominion();
  const source = event.damageSource;
  const direct = source?.damagingEntity;
  let projectileOwner;
  try { projectileOwner = source?.damagingProjectile?.getComponent('minecraft:projectile')?.owner; } catch {}
  const killer = direct?.typeId === 'minecraft:player' ? direct : projectileOwner;
  if (killer?.typeId === 'minecraft:player' && killer.id !== victim.id && api.role(killer)) {
    for (const c of taken) { c.ownerId=killer.id; c.ownerName=killer.name; c.ownerGod=api.role(killer); c.lastTransfer=time(); }
    lastSeen.clear();
    save(s);
    system.run(() => {
      try { if (!grant(killer,records(state(),killer))) killer.sendMessage('§eClear inventory space, then use /function olympus/crown_recover. Ownership is yours.'); } catch (e) { api.fail(e); }
      try { removeItems(victim,CROWN); removeItems(victim,CONTROL); } catch {}
      try { cleanDrops(); } catch (e) { api.fail(e); }
    });
    announce(`§e${killer.name} has slain ${victim.name} and seized ${taken.length} Crown${taken.length===1?'':'s'}!`);
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
  let changed=false;
  for (const c of s.crowns) {
    const p=ownerPlayer(c);
    if (p && c.ownerId!==p.id) { c.ownerId=p.id; changed=true; }
  }
  if (changed) save(s);
  for (const p of world.getAllPlayers()) {
    if ((p.getComponent('minecraft:health')?.currentValue || 0) > 0) {
      const owned=records(s,p);
      pruneOwner(p,owned);
      if (owned.length) grant(p,owned);
    }
  }
  for (const holder of world.getAllPlayers()) {
    if (!crowned(holder)) { lastSeen.delete(holder.id); continue; }
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
}
export function crownDominionTick() {
  const s = state();
  const d=dominionState();
  const c=s.crowns.find(c=>c.serial===d.serial);
  const holder=c&&ownerPlayer(c);
  dominionTick(c?.ownerId,!!holder && crowned(holder) && wornRecord(s,holder)?.serial===c.serial);
}
export function crownOwnerLeft(playerId) { if (dominionState().ownerId === playerId) dismissDominion(); }
export function cleanCrownDrops() { cleanDrops(); }
export function revealCrown() {
  const s = state();
  for (const c of s.crowns) {
    const p = ownerPlayer(c);
    if (!p) { announce(`Crown #${c.serial}: ${c.ownerName} is offline.`); continue; }
    announce(`Crown #${c.serial} is held by ${p.name} near X: ${Math.round(p.location.x/100)*100}, Z: ${Math.round(p.location.z/100)*100} (${p.dimension.id.replace('minecraft:','')}).`);
  }
}
export function crownFlair() {
  const p = throne();
  if (!p || !world.getAllPlayers().some(player => player.dimension.id === p.dimension && Math.abs(player.location.x-p.x) < 18 && Math.abs(player.location.z-p.z) < 18)) return;
  const color = new MolangVariableMap();
  color.setColorRGB('variable.color', { red: 1, green: 0.72, blue: 0.15 });
  world.getDimension(p.dimension).spawnParticle('minecraft:colored_flame_particle', { x: p.x+0.5, y: p.y+1.5, z: p.z+0.5 }, color);
}
export function crownHelp(player) { player.sendMessage('§6Crown: claim at the Hall throne with eight domain offerings. Each extra Crown needs another eight offerings and a reusable Dragon Egg catalyst. Wear your Crown and use its control seal. /function olympus/crown_status opens the menu.'); }
export function crownSetup(player) { player.sendMessage('§6The Crown throne is the existing gold and sea lantern center of the Hall. /function olympus/setup places the Hall and prepares the Trial.'); }
export function crownControl(player) { showStatus(player); }
