import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {weatherProbeLocation,createWeatherReader,zeusUnderground,lightningAim} from '../behavior_pack/scripts/storm.js';
import {bucketClutch,forgetEnvironment} from '../behavior_pack/scripts/sea_light.js';
import {CONFIG} from '../behavior_pack/scripts/config.js';
import {movementDirection} from '../behavior_pack/scripts/rules.js';
import {playerCooldownTimers} from '../behavior_pack/scripts/cooldown_notifications.js';
const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8');

test('live weather initializes during existing rain, updates to thunder/clear, and ignores stale saved weather',()=>{
  let state='unknown',spawns=0,removed=0;
  const probe={isValid:true,teleport(){},getProperty:()=>state};
  const dimension={getPlayers:()=>[{location:{x:1,y:70,z:1}}],getEntities:()=>[{remove(){removed++;}}],spawnEntity(){spawns++;return probe;}};
  const world={getDimension:()=>dimension,getDynamicProperty(){throw Error('Saved weather must not be read');}};
  const reader=createWeatherReader();reader.tick(world,1);assert.equal(reader.get(),'Clear');
  state='rain';reader.tick(world,2);assert.equal(reader.get(),'Rain');
  state='thunder';reader.tick(world,3);assert.equal(reader.get(),'Thunder');
  reader.set('Clear',4);reader.tick(world,5);assert.equal(reader.get(),'Clear','weather event wins over stale probe');
  state='clear';reader.tick(world,7);assert.equal(reader.get(),'Clear');
  probe.isValid=false;reader.tick(world,8);assert.equal(spawns,2);assert.equal(removed,1);
});

test('native weather sensor uses vanilla precipitation/thunderstorm filters and expires without script cleanup',()=>{
  const entity=JSON.parse(readFileSync(new URL('../behavior_pack/entities/weather_sensor.json',import.meta.url),'utf8'))['minecraft:entity'];
  const triggers=entity.components['minecraft:environment_sensor'].triggers;
  const native=JSON.stringify(triggers);
  assert.match(native,/precipitation/);assert.match(native,/thunderstorm/);
  assert.equal(entity.components['minecraft:timer'].time,120);
  assert.ok(entity.component_groups['olympus:despawn']['minecraft:instant_despawn']);
});

test('a fresh server runtime discovers existing rain and clutches ordinary falls without local weather data',()=>{
  const inRainSource=source.slice(source.indexOf('function inRain('),source.indexOf('function zeusStorm('));
  for(const id of ['new-dedicated-server','new-realm-world']) {
    let nativeWeather='rain',nativeWet='wet',roof=60;
    const dimension={id:'minecraft:overworld',getPlayers:()=>[player],getEntities:()=>[],
      getTopmostBlock:()=>({location:{y:roof}}),getBlock:()=>({typeId:"minecraft:air",isAir:true}),getBlockFromRay:()=>({face:'Up',block:{location:{x:0,y:64,z:0}}}),
      spawnEntity:()=>({isValid:true,teleport(){},getProperty:name=>name==='olympus:weather'?nativeWeather:nativeWet,remove(){}})};
    const player={id,location:{x:0,y:69,z:0},dimension,getVelocity:()=>({x:0,y:-1.8,z:0}),sendMessage(){}};
    const server={getDimension:()=>dimension,getDynamicProperty(){throw Error('Must not depend on saved/local weather data');}};
    const reader=createWeatherReader();reader.tick(server,1,[player]);reader.tick(server,2,[player]);
    const inRain=new Function('weather','liveWeather',inRainSource+';return inRain;')(()=>reader.get(),reader);
    assert.equal(inRain(player),true,'server starts in existing rain with no weather-change event');
    forgetEnvironment(player.id);assert.equal(bucketClutch(player,inRain(player),()=>false,()=>true),true,'ordinary exposed rainy fall needs no trident signal');
    roof=80;assert.equal(inRain(player),false,'roofs still exclude rain');roof=60;
    nativeWet='dry';reader.tick(server,3,[player]);assert.equal(inRain(player),false,'native local probes exclude dry biomes');
    nativeWeather='clear';reader.set('Clear',4);reader.tick(server,5,[player]);assert.equal(inRain(player),false);
    forgetEnvironment(player.id);
  }
});

test('Poseidon rain probes are independent per player and removed on role change or dimension exit',()=>{
  const first={id:'forest',location:{x:0,y:70,z:0},dimension:{id:'minecraft:overworld'}};
  const second={id:'desert',location:{x:500,y:70,z:0},dimension:{id:'minecraft:overworld'}};
  const probes=[];
  const dimension={getPlayers:()=>[first,second],getEntities:()=>[],spawnEntity(){
    const probe={isValid:true,wet:'unknown',teleport(){},getProperty:id=>id==='olympus:weather'?'rain':probe.wet,remove(){probe.isValid=false;}};
    probes.push(probe);return probe;
  }};
  const reader=createWeatherReader(),world={getDimension:()=>dimension};
  reader.tick(world,1,[first,second]);assert.equal(reader.rain(first),undefined);
  probes[1].wet='wet';probes[2].wet='dry';reader.tick(world,2,[first,second]);
  assert.equal(reader.get(),'Rain');assert.equal(reader.rain(first),true);assert.equal(reader.rain(second),false);
  second.dimension.id='minecraft:nether';reader.tick(world,3,[first,second]);assert.equal(probes[2].isValid,false);
  reader.tick(world,4,[]);assert.equal(probes[1].isValid,false);
});

test('rain buffs do not depend on optional biome API; cover and clearing still disable rain',()=>{
  let weather='Rain',roof=65;
  const body=source.slice(source.indexOf('function inRain('),source.indexOf('function zeusStorm('));
  const inRain=new Function('weather','liveWeather',body+';return inRain;')(()=>weather,{rain:()=>undefined});
  const player={location:{x:0,y:70,z:0},dimension:{id:'minecraft:overworld',getTopmostBlock:()=>({location:{y:roof}})}};
  assert.equal(inRain(player),true,'server without getBiome still sees rain');
  player.dimension.getBiome=()=>{throw Error('Biome lookup unavailable');};assert.equal(inRain(player),true);
  roof=80;assert.equal(inRain(player),false);roof=65;weather='Clear';assert.equal(inRain(player),false);
  weather='Thunder';assert.equal(inRain(player),true);
  player.dimension.id='minecraft:nether';assert.equal(inRain(player),false);
});

test('Zeus sky flight renews only in its domain, then becomes a limited descent and cooldown',()=>{
  let time=10000,sky=true;
  const props=new Map([['flightUntil',9000]]),impulses=[],cooldowns=[];
  const player={location:{y:230},dimension:{id:'minecraft:overworld'},isSprinting:true,
    getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),
    inputInfo:{getButtonState:()=>1,getMovementVector:()=>({x:0,y:1})},
    getVelocity:()=>({x:0,y:0,z:0}),getViewDirection:()=>({x:0,y:0,z:1}),applyImpulse:v=>impulses.push(v)};
  const body=source.slice(source.indexOf('function updateFlight('),source.indexOf('function updatePlayer('));
  const update=new Function('CONFIG','now','key','role','apolloPower','effect','InputButton','ButtonState','movementDirection','fail','zeusStorm','startCooldown',body+';return updateFlight;')
    (CONFIG,()=>time,k=>k,()=> 'zeus',()=>({sun:false,lit:true}),()=>{},{Jump:'jump',Sneak:'sneak'},{Pressed:1},movementDirection,e=>{throw e;},()=>sky,(_p,id)=>cooldowns.push(id));
  update(player);assert.equal(props.get('flightUntil'),25000);assert.equal(impulses.length,2);
  time=100000;update(player);assert.equal(props.get('flightUntil'),115000);
  sky=false;player.location.y=200;update(player);assert.deepEqual(cooldowns,['zeusFlight']);
  time+=1000;update(player);assert.equal(props.get('flightUntil'),115000,'limited flight cannot renew on ground');
  time=115001;update(player);assert.equal(props.get('flightUntil'),undefined);
  for(const dim of ['minecraft:nether','minecraft:the_end']){
    player.dimension.id=dim;props.set('flightUntil',time+15000);update(player);assert.equal(props.get('flightUntil'),time+15000);
    time+=15001;update(player);assert.equal(props.get('flightUntil'),undefined);
  }
});

test('only the exposed Y220+ or thunder domain bypasses normal cooldowns, ordinary rain does not',()=>{
  let sky=false;
  const props=new Map([['cd_zeusFlight',999999],['cd_zeusLightning',999999]]);
  const player={dimension:{id:'minecraft:overworld'},location:{y:70},getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),onScreenDisplay:{setActionBar(){}}};
  const body=source.slice(source.indexOf('function remaining('),source.indexOf('function mountain('));
  const run=new Function('now','key','CONFIG','cooldownRemaining','zeusStorm','zeusThunder','abilityNeedsCooldown','crownCooldownSeconds',body+';return {ready,startCooldown};')
    (()=>10000,k=>k,CONFIG,(expiry,t)=>Math.max(0,(expiry||0)-t),()=>sky,()=>sky,()=>true,(_p,n)=>n);
  assert.equal(run.ready(player,'zeusFlight','Flight'),false);assert.equal(run.ready(player,'zeusLightning','Lightning'),false);
  sky=true;assert.equal(run.ready(player,'zeusFlight','Flight'),true);run.startCooldown(player,'zeusFlight');assert.equal(props.get('cd_zeusFlight'),999999);
  assert.equal(run.ready(player,'zeusLightning','Lightning'),true);run.startCooldown(player,'zeusLightning');assert.equal(props.get('cd_zeusStormLightning'),15000);assert.equal(props.get('cd_zeusLightning'),55000);
  assert.equal(run.ready(player,'zeusLightning','Lightning'),false,'five-second anti-spam interval remains');
  sky=false;assert.equal(run.ready(player,'zeusLightning','Lightning'),false,'descent cannot bypass the ground timer');
  const timers=playerCooldownTimers({...player,getDynamicProperty:k=>props.get(k.replace('olympus:',''))},'zeus');assert.equal(timers.find(t=>t.id==='flight').until,999999);
  props.delete('cd_zeusFlight');run.startCooldown(player,'zeusFlight');assert.equal(props.get('cd_zeusFlight'),100000);
  player.dimension.id='minecraft:nether';assert.equal(run.ready(player,'zeusFlight','Flight'),false);
});

test('actual Zeus domain requires exposure and Y220+ OR thunder, never rain or another dimension',()=>{
  let weather='Clear',exposed=true;
  const body=source.slice(source.indexOf('function zeusStorm('),source.indexOf('function submerged('));
  const power=new Function('weather','skyExposed',body+';return zeusStorm;')(()=>weather,()=>exposed);
  const player={location:{y:219},dimension:{id:'minecraft:overworld'}};
  assert.equal(power(player),false);weather='Rain';assert.equal(power(player),false);weather='Thunder';assert.equal(power(player),true);
  exposed=false;assert.equal(power(player),false);exposed=true;weather='Clear';player.location.y=220;assert.equal(power(player),true);
  for(const dim of ['minecraft:nether','minecraft:the_end']){player.dimension.id=dim;assert.equal(power(player),false);}
});

test('Zeus has sky combat buffs, no ground buffs and Mining Fatigue II in mines and other dimensions',()=>{
  const effects=new Map(),buffs=new Map(),penalties=new Map();let storm=false,ceiling='minecraft:stone';
  const player={id:'zeus',location:{x:0,y:100,z:0},dimension:{id:'minecraft:overworld',getBlockFromRay:()=>ceiling?{block:{typeId:ceiling}}:undefined},getEffect:id=>effects.get(id),removeEffect:id=>effects.delete(id),addEffect:(id,duration,options)=>effects.set(id,{...options,duration})};
  const effectSource=source.slice(source.indexOf('function effect('),source.indexOf('function suppressOldPenalties('));
  const body=source.slice(source.indexOf('function updatePlayer('),source.indexOf('function safeTeleport('));
  const update=new Function('role','crowned','suppressOldPenalties','zeusUnderground','zeusStorm','system','godBuffs','godPenalties','CONFIG','fail',effectSource+body+';return updatePlayer;')
    (()=> 'zeus',()=>false,()=>{},zeusUnderground,()=>storm,{currentTick:10},buffs,penalties,CONFIG,e=>{throw e;});
  update(player);assert.equal(effects.get('mining_fatigue').amplifier,1);assert.equal(effects.has('strength'),false);
  ceiling=undefined;update(player);assert.equal(effects.has('mining_fatigue'),false);
  storm=true;update(player);assert.equal(effects.get('strength').amplifier,1);assert.equal(effects.get('resistance').amplifier,0);
  storm=false;update(player);assert.equal(effects.has('strength'),false);assert.equal(effects.has('resistance'),false);
  for(const dim of ['minecraft:nether','minecraft:the_end']) {player.dimension.id=dim;update(player);assert.equal(effects.get('mining_fatigue').amplifier,1);}
  player.dimension.id='minecraft:overworld';ceiling='minecraft:stone';player.location.y=230;assert.equal(zeusUnderground(player),true,'high caves still count as underground');
});

test('lightning reaches ground from Y220, spreads with range, and cannot target through terrain',()=>{
  let wall=false,entityDistance=300,ray,entityLimit;
  const player={id:'zeus',getHeadLocation:()=>({x:0.5,y:221.5,z:0.5}),getViewDirection:()=>({x:0,y:-1,z:0}),dimension:{
    getBlockFromRay:(origin,direction,options)=>{ray={origin,direction,...options};return {block:{location:{x:0,y:wall?200:63,z:0}},faceLocation:{x:0.5,y:1,z:0.5}};},
    getEntitiesFromRay:(_o,_d,options)=>{entityLimit=options.maxDistance;return [{distance:entityDistance,entity:{id:'enemy',typeId:'minecraft:player',location:{x:0.5,y:180,z:0.5}}}];}}};
  assert.deepEqual(lightningAim(player,384,()=>0.5),{x:0.5,y:64,z:0.5});assert.equal(ray.maxDistance,384);assert.equal(entityLimit,157.5);
  lightningAim(player,384,()=>1);assert.ok(Math.abs(ray.direction.x*157.5)>4,'high-altitude strikes can miss by multiple blocks');
  wall=true;entityDistance=40;assert.equal(lightningAim(player,384,()=>0.5).y,201,'terrain blocks enemy below it');
  entityDistance=10;assert.equal(lightningAim(player,384,()=>0.5).y,180,'unobstructed enemy can be struck');
});

test('held-trident falls stay protected after rain clears',()=>{
  const player={id:'riptide-clutch',location:{x:0,y:5,z:0},getVelocity:()=>({x:0,y:-1.8,z:0}),sendMessage(){},dimension:{id:'minecraft:overworld',getBlock:()=>({typeId:"minecraft:air",isAir:true}),getBlockFromRay:()=>({face:'Up',block:{location:{x:0,y:0,z:0}}})}};
  const clutch=rain=>bucketClutch(player,rain,()=>false,()=>true,[3,3,2],true,true);
  forgetEnvironment(player.id);forgetEnvironment(player.id);assert.equal(clutch(true),true);assert.equal(clutch(true),false);
  forgetEnvironment(player.id);assert.equal(clutch(false),true);assert.equal(clutch(true),false);
  forgetEnvironment(player.id);
});

test('clutch detection runs outside the native release handler',()=>{
 const begin=source.indexOf('world.afterEvents.itemReleaseUse.subscribe(');
 const end=source.indexOf('world.afterEvents.playerDimensionChange.subscribe',begin);
 assert.doesNotMatch(source.slice(begin,end),/armRiptideClutch|confirmRain|observeRiptideLaunch/);
 assert.match(source,/heldItem\(player\)\?\.typeId==='minecraft:trident'/);
});

test('Zeus can ascend from Y70 within limited flight and automatically keep flying after entering Y220 sky power',()=>{
 let time=1000,velocity={x:0,y:0,z:0};const props=new Map([['flightUntil',16000],['zeusSkyFlight',false]]),cooldowns=[];
 const player={location:{x:0,y:70,z:0},dimension:{id:'minecraft:overworld'},isSprinting:true,
  getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),
  inputInfo:{getButtonState:button=>button==='jump'&&player.location.y<230?1:0,getMovementVector:()=>({x:0,y:0})},
  getVelocity:()=>velocity,getViewDirection:()=>({x:0,y:1,z:0}),applyImpulse:v=>{velocity={x:velocity.x+v.x,y:velocity.y+v.y,z:velocity.z+v.z};}};
 const body=source.slice(source.indexOf('function updateFlight('),source.indexOf('function updatePlayer('));
 const update=new Function('CONFIG','now','key','role','apolloPower','effect','InputButton','ButtonState','movementDirection','fail','zeusStorm','startCooldown',body+';return updateFlight;')
  (CONFIG,()=>time,k=>k,()=> 'zeus',()=>({}),()=>{},{Jump:'jump',Sneak:'sneak'},{Pressed:1},movementDirection,e=>{throw e;},p=>p.dimension.id==='minecraft:overworld'&&p.location.y>=220,(_p,id)=>cooldowns.push(id));
 for(let tick=0;tick<800;tick++) {
  update(player);assert.ok(props.get('flightUntil')>time,`flight unexpectedly expired at Y${player.location.y}`);
  player.location.y+=velocity.y;velocity.y-=0.01;time+=50;
 }
 assert.ok(player.location.y>=220);assert.equal(props.get('zeusSkyFlight'),true);assert.deepEqual(cooldowns,[]);
 player.location.y=219;update(player);assert.equal(props.get('flightUntil'),time+15000);assert.deepEqual(cooldowns,['zeusFlight']);
 time+=15001;update(player);assert.equal(props.get('flightUntil'),undefined);
});

test('all weather probe spawns and teleports stay clear of players, including stacked players and world ceiling',()=>{
 const first={id:'one',location:{x:0,y:70,z:0},dimension:{id:'minecraft:overworld'}},second={id:'two',location:{x:0,y:94,z:0},dimension:{id:'minecraft:overworld'}},players=[first,second],locations=[];
 const dimension={heightRange:{min:-64,max:320},getPlayers:()=>players,getEntities:()=>[],spawnEntity(_id,at){locations.push({...at});return {isValid:true,teleport:p=>locations.push({...p}),getProperty:id=>id==='olympus:weather'?'rain':'wet',remove(){}};}};
 const reader=createWeatherReader();reader.tick({getDimension:()=>dimension},1,players);reader.tick({getDimension:()=>dimension},2,players);
 assert.ok(locations.length>=6);for(const at of locations)assert.ok(players.every(p=>Math.hypot(at.x-p.location.x,at.y-p.location.y,at.z-p.location.z)>=12));
 first.location.y=319;const at=weatherProbeLocation(dimension,first,players);assert.ok(at.y<320);assert.ok(Math.hypot(at.x-first.location.x,at.y-first.location.y,at.z-first.location.z)>=12);
 assert.equal(reader.get(),'Rain');assert.equal(reader.rain(first),true);
});
test('weather code never spawns or teleports a sensor onto a player position',()=>{
 const code=readFileSync(new URL('../behavior_pack/scripts/storm.js',import.meta.url),'utf8');assert.doesNotMatch(code,/spawnEntity\('olympus:weather_sensor',\s*(?:player|p)\.location|teleport\((?:player|p)\.location\)/);
});
