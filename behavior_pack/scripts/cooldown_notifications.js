const GOD_TIMERS={
  hermes:[['cd_hermesPearl','Divine Pearl']],
  ares:[['cd_aresRage','War Rage']],
  apollo:[['cd_apolloSolarFlare','Solar Flare'],['cd_apolloOracle','Oracle’s Sight']],
  hades:[['cd_hadesHellfire','Hellfire']],
  dionysus:[['harvestRestockUntil','Divine Harvest refill']]
};
export function playerCooldownTimers(player,god,{storm=false,sun=false,stolenLightning=false,crown=[]}={}) {
  const read=id=>Number(player.getDynamicProperty('olympus:'+id)||0);
  const timers=(GOD_TIMERS[god]||[]).map(([id,label])=>({id,label,until:read(id)}));
  if(god==='zeus'){
    timers.push({id:'lightning',label:'Lightning Strike',until:Math.max(read('cd_zeusStormLightning'),storm?0:read('cd_zeusLightning'))});
    timers.push({id:'flight',label:'Zeus Flight',until:storm?0:read('cd_zeusFlight')});
  }
  if(god==='apollo')timers.push({id:'lightflight',label:'Lightflight',until:sun?0:read('lightFlightReady')});
  if(god==='kratos'&&stolenLightning)timers.push({id:'stolenLightning',label:'Stolen Lightning',until:read('kratosLightningUntil')});
  for(const [id,label] of [['ore','Ore Pulse'],['fire','Cinderbolt'],['magnet','Magnetwood Pull'],['water','Undertow Surge']])
    timers.push({id:'forge_'+id,label,until:read('forge_'+id+'_ready')});
  // Short gadget timers and per-target combat timers intentionally stay quiet.
  for(const [id,label] of [['harvest_sickle','Autumn Harvest Sickle'],['thermal_lens','Thermal Safety Lens']])
    timers.push({id:'utility_'+id,label,until:read('utility_cd_'+id)});
  return timers.concat(crown);
}

export function createCooldownNotifier({minimumGapMs=10000}={}) {
  const players=new Map();
  return {
    update(player,god,timers,now=Date.now()) {
      let state=players.get(player.id);
      if(!state || state.god!==god){state={god,entries:new Map(),pending:new Map(),lastSent:-Infinity};players.set(player.id,state);}
      const active=new Set(timers.map(timer=>timer.id));
      for(const id of state.entries.keys())if(!active.has(id)){state.entries.delete(id);state.pending.delete(id);}
      for(const {id,label,until} of timers) {
        if(!Number.isFinite(until)||until<=0){state.entries.delete(id);state.pending.delete(id);continue;}
        let entry=state.entries.get(id);
        if(!entry || entry.until!==until){entry={until,armed:until>now};state.entries.set(id,entry);state.pending.delete(id);}
        if(until>now){state.pending.delete(id);continue;}
        if(entry.armed){entry.armed=false;state.pending.set(id,label);}
      }
      if(!state.pending.size || now-state.lastSent<minimumGapMs)return;
      player.sendMessage(`§6[Olympus] §aReady again: ${[...new Set(state.pending.values())].join(', ')}.`);
      state.pending.clear();state.lastSent=now;
    },
    retain(ids){const online=new Set(ids);for(const id of players.keys())if(!online.has(id))players.delete(id);}
  };
}
