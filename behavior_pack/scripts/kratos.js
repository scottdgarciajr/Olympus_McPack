// Kratos copies one representative divine gift or burden per strike. A kill
// replaces his single lasting copy; neither copy is tied to the victim being online.
const POWERS = {
  hermes: [['Traveler speed','speed',2],['Traveler burden','weakness',1]],
  zeus: [['Stolen lightning','olympus:lightning',0],['Thunder burden','mining_fatigue',1]],
  poseidon: [['Sea blessing','conduit_power',0],['Tidal grace','dolphins_grace',1],['Dryland burden','slowness',1]],
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
  attacker.setDynamicProperty(LASTING,JSON.stringify(power));
  apply(attacker,power,5);
  attacker.sendMessage(`§4God Slayer: ${power[0]} is yours until death. A later god kill replaces it.`);
}
export function kratosTick(player) {
  const lasting=read(player,LASTING);
  if (lasting) apply(player,lasting,5);
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
  const lasting=read(player,LASTING),temp=read(player,TEMP),seconds=Math.ceil((Number(player.getDynamicProperty(UNTIL)||0)-Date.now())/1000);
  return `Lasting: ${lasting?.[0]||'none'}; temporary: ${seconds>0?`${temp?.[0]} (${seconds}s)`:'none'}`;
}
export function kratosUsePower(player,weather) {
  const lasting=read(player,LASTING),temp=read(player,TEMP);
  if (lasting?.[1]!=='olympus:lightning' && !(Number(player.getDynamicProperty(UNTIL)||0)>Date.now() && temp?.[1]==='olympus:lightning')) return false;
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
