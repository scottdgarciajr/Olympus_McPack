import {NEW_GODS} from './new_gods.js';
// Each god kill adds one gift or burden until Kratos dies. Copies persist on Kratos,
// independently of the victim's connection, and repeated effects do not stack.
const POWERS = {
  ...Object.fromEntries(Object.entries(NEW_GODS).map(([god,spec])=>[god,spec.stolen])),
  hermes: [['Traveler speed','speed',2],['Traveler burden','weakness',1]],
  zeus: [['Stolen lightning','olympus:lightning',0],['Thunder burden','mining_fatigue',1]],
  poseidon: [['Sea blessing','conduit_power',0],['Tidal haste','haste',1],['Dryland burden','slowness',1]],
  hades: [['Underworld ward','fire_resistance',0],['Night sight','night_vision',0],['Sun burden','weakness',1]],
  ares: [['War strength','strength',0],['War guard','resistance',0],['War burden','slowness',1]],
  apollo: [['Solar focus','haste',0],['Oracle sight','night_vision',0],['Shadow burden','weakness',1]],
  hephaestus: [['Forge haste','haste',1],['Forge burden','weakness',1]],
  dionysus: [['Madness renewal','regeneration',0],['Madness burden','nausea',0]]
};
const TEMP='olympus:kratosTemp';
const UNTIL='olympus:kratosUntil';
const LASTING='olympus:kratosLasting';
function choose(god) { const pool=POWERS[god]; return pool?.[Math.floor(Math.random()*pool.length)]; }
function apply(player,power,seconds) {
  if (!power || power[1].startsWith('olympus:')) return;
  const active=player.getEffect(power[1]);
  if (!active || active.amplifier<=power[2]) player.addEffect(power[1],seconds*20,{amplifier:power[2],showParticles:false});
}
function read(player,key) { try { return JSON.parse(player.getDynamicProperty(key)||'null'); } catch { return null; } }
function lastingEntries(player) {
  const saved=read(player,LASTING);
  // Previous releases stored one power, or an uncompressed list of powers.
  const old=Array.isArray(saved) ? (typeof saved[0]==='string' ? [saved] : saved) : [];
  const entries=Array.isArray(saved?.entries) ? saved.entries : old.map(power=>[power,1]);
  return entries.filter(([power,count])=>Array.isArray(power) && typeof power[0]==='string' &&
    typeof power[1]==='string' && Number.isInteger(power[2]) && Number.isSafeInteger(count) && count>0);
}
function lastingCopies(player) { return lastingEntries(player).map(([power])=>power); }
export function kratosStrike(attacker,victim,god) {
  if (!god || god==='kratos') return;
  const power=choose(god);
  if (!power) return;
  attacker.setDynamicProperty(TEMP,JSON.stringify(power));
  attacker.setDynamicProperty(UNTIL,Date.now()+8000);
  apply(attacker,power,8);
  attacker.sendMessage(`§4God Slayer: stole ${power[0]} from ${victim.name} for 8 seconds.`);
}
export function kratosKill(attacker,god) {
  const power=choose(god);
  if (!power) return;
  const entries=lastingEntries(attacker);
  const existing=entries.find(([copy])=>copy[0]===power[0] && copy[1]===power[1] && copy[2]===power[2]);
  if (existing) existing[1]++;
  else entries.push([power,1]);
  attacker.setDynamicProperty(LASTING,JSON.stringify({entries}));
  apply(attacker,power,5);
  const total=entries.reduce((sum,[,count])=>sum+count,0);
  attacker.sendMessage(`§4God Slayer: gained ${power[0]} until death. ${total} kill ${total===1?'copy':'copies'} held.`);
}
export function kratosTick(player) {
  const strongest=new Map();
  for (const power of lastingCopies(player)) {
    if (!strongest.has(power[1]) || strongest.get(power[1])[2]<power[2]) strongest.set(power[1],power);
  }
  for (const power of strongest.values()) apply(player,power,5);
  const until=Number(player.getDynamicProperty(UNTIL)||0);
  if (until>Date.now()) {
    const temporary=read(player,TEMP);
    if (temporary) apply(player,temporary,Math.min(3,Math.ceil((until-Date.now())/1000)));
  } else if (until) {
    player.setDynamicProperty(TEMP,undefined);
    player.setDynamicProperty(UNTIL,undefined);
  }
}
export function kratosDeath(player) {
  for (const key of [TEMP,UNTIL,LASTING]) player.setDynamicProperty(key,undefined);
}
export function kratosStatus(player) {
  const entries=lastingEntries(player),temp=read(player,TEMP),seconds=Math.ceil((Number(player.getDynamicProperty(UNTIL)||0)-Date.now())/1000);
  const counts=new Map();
  for (const [power,count] of entries) counts.set(power[0],(counts.get(power[0])||0)+count);
  const names=[...counts].map(([name,count])=>count>1?`${name} ×${count}`:name);
  const total=entries.reduce((sum,[,count])=>sum+count,0);
  return `Lasting (${total}): ${names.join(', ')||'none'}; temporary: ${seconds>0?`${temp?.[0]} (${seconds}s)`:'none'}`;
}
export function kratosHasLightning(player) {
  const temp=read(player,TEMP);
  return lastingCopies(player).some(power=>power[1]==='olympus:lightning') || Number(player.getDynamicProperty(UNTIL)||0)>Date.now() && temp?.[1]==='olympus:lightning';
}
export function kratosUsePower(player,weather) {
  const temp=read(player,TEMP);
  if (!lastingCopies(player).some(power=>power[1]==='olympus:lightning') && !(Number(player.getDynamicProperty(UNTIL)||0)>Date.now() && temp?.[1]==='olympus:lightning')) return false;
  const thunder=player.dimension.id==='minecraft:overworld' && weather==='Thunder';
  const remaining=Number(player.getDynamicProperty('olympus:kratosLightningUntil')||0)-Date.now();
  if (remaining>0) { player.sendMessage(`§eStolen lightning returns in ${Math.ceil(remaining/1000)}s.`); return true; }
  const target=player.getEntitiesFromViewDirection({maxDistance:24}).find(hit=>hit.entity.id!==player.id && hit.entity.typeId!=='minecraft:item')?.entity;
  const block=player.getBlockFromViewDirection({maxDistance:24})?.block;
  const aim=target?.location||block?.location;
  if (!aim) { player.sendMessage('§eAim at a target or block within 24 blocks.'); return true; }
  player.dimension.spawnEntity('minecraft:lightning_bolt',target?aim:{x:aim.x+0.5,y:aim.y+1,z:aim.z+0.5});
  player.setDynamicProperty('olympus:kratosLightningUntil',Date.now()+(thunder?5000:180000));
  player.sendMessage('§4Stolen lightning strikes!');
  return true;
}
