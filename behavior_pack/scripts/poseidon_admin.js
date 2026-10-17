const KEY='olympus:poseidon_clutch_settings';
export function rainClutchSize(world){const size=read(world).size;return Array.isArray(size)&&size.length===3&&size.every((n,i)=>Number.isInteger(n)&&n>=1&&n<=(i===2?3:5))?size:[3,3,2];}
function read(world){try{return JSON.parse(world.getDynamicProperty(KEY)||'{"enabled":true,"players":{}}');}catch{return {enabled:true,players:{}};}}
export function rainClutchEnabled(world,name) {
  const settings=read(world);return settings.players?.[name.toLowerCase()] ?? settings.enabled!==false;
}
export function rainClutchCommand(world,message) {
  const sizeMatch=String(message||'').trim().match(/^size\s+(single|default|large|\d+(?:x|\s+)\d+(?:x|\s+)\d+)$/i);
  if(sizeMatch){
    const value=sizeMatch[1].toLowerCase(),size=value==='single'?[1,1,1]:['default','large'].includes(value)?[3,3,2]:value.split(/x|\s+/).map(Number);
    if(size.some(n=>n<1)||size[0]>5||size[1]>5||size[2]>3)return 'Size limits: width/depth 1–5, height 1–3. Order: width depth height.';
    const settings=read(world);settings.size=size;world.setDynamicProperty(KEY,JSON.stringify(settings));
    return `Rain clutch size: ${size[0]}x${size[1]} footprint, ${size[2]} tall. ${size.every(n=>n===1)?'Original single-water mode (brief natural flow).':'Contained pool; no spreading.'} Five-second cleanup; rain only; no Slow Falling.`;
  }
  const match=String(message||'status').trim().match(/^(on|off|status|reset)(?:\s+(.+))?$/i);
  if(!match)return 'Usage: /scriptevent olympus:poseidon_clutch on|off|status|reset [player name], or size single|default|width depth height';
  const action=match[1].toLowerCase(),name=match[2]?.replace(/^"|"$/g,'').trim(),settings=read(world);
  settings.players ||= {};
  if(action==='status')return name?`Poseidon rain clutch for ${name}: ${rainClutchEnabled(world,name)?'ON':'OFF'} (global default: ${settings.enabled?'ON':'OFF'}).`:
    `Poseidon rain clutch default: ${settings.enabled?'ON':'OFF'}. Size (width/depth/height): ${rainClutchSize(world).join('x')}. Disabled players: ${Object.keys(settings.players).filter(name=>settings.players[name]===false).join(', ')||'none'}.`;
  if(action==='reset') {
    if(name)delete settings.players[name.toLowerCase()];else {settings.enabled=true;settings.players={};settings.size=[3,3,2];}
  } else if(name)settings.players[name.toLowerCase()]=action==='on';
  else {settings.enabled=action==='on';settings.players={};}
  world.setDynamicProperty(KEY,JSON.stringify(settings));
  return rainClutchCommand(world,`status${name?' '+name:''}`);
}
