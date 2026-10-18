// Probe entities must never occupy a player: a zero collision box is not a
// guarantee that native attacks/launches ignore an entity at the same position.
export function weatherProbeLocation(dimension,player,players) {
  const p=player.location,min=dimension.heightRange?.min??-64,max=(dimension.heightRange?.max??320)-2;
  for(const [dx,dy,dz] of [[0,24,0],[0,48,0],[24,24,0],[-24,24,0],[0,24,24],[0,24,-24]]) {
    const at={x:p.x+dx,y:Math.min(max,Math.max(min+2,p.y+dy)),z:p.z+dz};
    if(players.every(other=>Math.hypot(at.x-other.location.x,at.y-other.location.y,at.z-other.location.z)>=12))return at;
  }
  return undefined;
}

// Stable API weather reader. The native sensor works even when the server
// starts during rain; weatherChange alone cannot initialize that state.
export function createWeatherReader() {
  let value = 'Clear', sensor, observedTick = -1, initialized=false, currentTick=0;
  const rainSensors=new Map();
  const rainEvidence=new Map();
  return {
    set(next, tick) { value = next; observedTick = tick; if(next==='Clear')rainEvidence.clear(); },
    confirmRain(player,tick) {
      value=value==='Thunder'?'Thunder':'Rain';observedTick=tick;
      rainEvidence.set(player.id,tick+20);
    },
    get() { return value; },
    rain(player) {
      if((rainEvidence.get(player.id)||-1)>=currentTick)return true;
      try {
        const probe=rainSensors.get(player.id);
        if(!probe?.isValid)return undefined;
        const state=probe.getProperty('olympus:rain');
        return state==='wet'?true:state==='dry'?false:undefined;
      } catch { return undefined; }
    },
    tick(world, tick, rainPlayers=[]) {
      currentTick=tick;
      const dimension = world.getDimension('overworld');
      const players=dimension.getPlayers(),player=players[0];
      const active=new Set(rainPlayers.filter(p=>p.dimension.id==='minecraft:overworld').map(p=>p.id));
      for(const [id,probe] of rainSensors)if(!active.has(id)) {
        try{probe.remove();}catch{}rainSensors.delete(id);
      }
      for(const [id,until] of rainEvidence)if(until<tick || !active.has(id))rainEvidence.delete(id);
      if (!player) return;
      try {
        if(!initialized) {
          for(const old of dimension.getEntities({type:'olympus:weather_sensor'}))old.remove();
          initialized=true;
        }
        const at=weatherProbeLocation(dimension,player,players);
        if(!at){try{sensor?.remove();}catch{}sensor=undefined;for(const probe of rainSensors.values())try{probe.remove();}catch{}rainSensors.clear();return;}
        if (!sensor || !sensor.isValid) {
          sensor = dimension.spawnEntity('olympus:weather_sensor', at);
        }
        sensor.teleport(at);
        const state = sensor.getProperty('olympus:weather');
        // Allow native environment sensors time to catch up after an event.
        if (state !== 'unknown' && tick - observedTick > 2) {
          value = {clear:'Clear',rain:'Rain',thunder:'Thunder'}[state] || value;
        }
      } catch { sensor = undefined; }
      for(const p of rainPlayers)if(active.has(p.id))try{
        const at=weatherProbeLocation(dimension,p,players);
        if(!at){try{rainSensors.get(p.id)?.remove();}catch{}rainSensors.delete(p.id);continue;}
        let probe=rainSensors.get(p.id);
        if(!probe?.isValid){probe=dimension.spawnEntity('olympus:weather_sensor',at);rainSensors.set(p.id,probe);}
        probe.teleport(at);
      }catch{rainSensors.delete(p.id);}
    }
  };
}

export function zeusUnderground(player) {
  if (player.location.y >= (player.dimension.heightRange?.max||320)-2) return false;
  // Look for a natural ceiling, including mountain caves above sea level.
  // Wooden roofs and tree canopies do not count as being underground.
  try {
    const hit=player.dimension.getBlockFromRay(
      {x:player.location.x,y:player.location.y+1.8,z:player.location.z},
      {x:0,y:1,z:0},{maxDistance:Math.min(128,Math.max(1,(player.dimension.heightRange?.max||320)-player.location.y-2)),includeLiquidBlocks:false,includePassableBlocks:false});
    const natural=new Set(['stone','deepslate','tuff','granite','diorite','andesite','dirt','grass_block','sand','red_sand','sandstone','red_sandstone','gravel','clay','terracotta','netherrack','basalt','blackstone','soul_sand','soul_soil','bedrock','end_stone','dripstone_block','calcite','moss_block','rooted_dirt']);
    return !!hit?.block && natural.has(hit.block.typeId.replace('minecraft:',''));
  } catch { return false; }
}

export function lightningAim(player, range=384, random=Math.random) {
  // Jitter the ray itself: terrain blocks targeting and distance magnifies
  // error. No distant entity lock-on or strikes through intervening walls.
  const view=player.getViewDirection();
  const yaw=(random()-0.5)*0.06, pitch=(random()-0.5)*0.06;
  let direction={x:view.x+yaw,y:view.y+pitch,z:view.z+(random()-0.5)*0.06};
  const length=Math.hypot(direction.x,direction.y,direction.z);
  direction={x:direction.x/length,y:direction.y/length,z:direction.z/length};
  const origin=player.getHeadLocation();
  const hit=player.dimension.getBlockFromRay(origin,direction,{maxDistance:range,includeLiquidBlocks:true,includePassableBlocks:false});
  const offset=hit?.faceLocation || {x:0.5,y:1,z:0.5};
  const point=hit?.block && {x:hit.block.location.x+offset.x,y:hit.block.location.y+offset.y,z:hit.block.location.z+offset.z};
  const distance=point ? Math.hypot(point.x-origin.x,point.y-origin.y,point.z-origin.z) : range;
  const target=player.dimension.getEntitiesFromRay(origin,direction,{maxDistance:Math.min(range,distance)})
    .find(h=>h.entity.id!==player.id && !['minecraft:item','olympus:weather_sensor'].includes(h.entity.typeId));
  if(target && (!hit || target.distance < distance)) return target.entity.location;
  if(!hit?.block) return undefined;
  return point;
}
