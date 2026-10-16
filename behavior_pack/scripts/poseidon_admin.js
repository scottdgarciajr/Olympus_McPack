const KEY='olympus:poseidon_clutch_settings';
function read(world){try{return JSON.parse(world.getDynamicProperty(KEY)||'{"enabled":true,"players":{}}');}catch{return {enabled:true,players:{}};}}
export function rainClutchEnabled(world,name) {
  const settings=read(world);return settings.players?.[name.toLowerCase()] ?? settings.enabled!==false;
}
export function rainClutchCommand(world,message) {
  const match=String(message||'status').trim().match(/^(on|off|status|reset)(?:\s+(.+))?$/i);
  if(!match)return 'Usage: /scriptevent olympus:poseidon_clutch on|off|status|reset [player name]';
  const action=match[1].toLowerCase(),name=match[2]?.replace(/^"|"$/g,'').trim(),settings=read(world);
  settings.players ||= {};
  if(action==='status')return name?`Poseidon rain clutch for ${name}: ${rainClutchEnabled(world,name)?'ON':'OFF'} (global default: ${settings.enabled?'ON':'OFF'}).`:
    `Poseidon rain clutch default: ${settings.enabled?'ON':'OFF'}. Disabled players: ${Object.keys(settings.players).filter(name=>settings.players[name]===false).join(', ')||'none'}.`;
  if(action==='reset') {
    if(name)delete settings.players[name.toLowerCase()];else {settings.enabled=true;settings.players={};}
  } else if(name)settings.players[name.toLowerCase()]=action==='on';
  else {settings.enabled=action==='on';settings.players={};}
  world.setDynamicProperty(KEY,JSON.stringify(settings));
  return rainClutchCommand(world,`status${name?' '+name:''}`);
}
