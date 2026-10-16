import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { lightPower, seaEnvironment, clearEnvironment, bucketClutch, forgetEnvironment, poseidonMiningHaste } from '../behavior_pack/scripts/sea_light.js';
import { poseidonSwimCruise } from '../behavior_pack/scripts/poseidon_swim.js';
import { CONFIG } from '../behavior_pack/scripts/config.js';
import { movementDirection } from '../behavior_pack/scripts/rules.js';

test('real Poseidon passive code applies valid visible Strength and Haste in water and rain',()=>{
  const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8');
  const effectsSource=source.slice(source.indexOf('function effect('),source.indexOf('function suppressOldPenalties('));
  const passiveSource=source.slice(source.indexOf('function updatePlayer('),source.indexOf('function safeTeleport('));
  const errors=[],effects=new Map([['slow_falling',{amplifier:0,duration:1200}]]);let raining=false;
  const player={id:'poseidon',isInWater:true,
    dimension:{id:'minecraft:overworld',getBiome:()=>({id:'minecraft:forest'})},
    getEffect:id=>effects.get(id),removeEffect:id=>effects.delete(id),
    addEffect:(id,duration,options)=>{
      // Model the pinned Bedrock API: Java-only effects must throw.
      assert.ok(['conduit_power','strength','haste','night_vision','weakness','slowness'].includes(id),`unsupported Bedrock effect ${id}`);
      effects.set(id,{...options,duration});
    }};
  const run=new Function('CONFIG','role','crowned','suppressOldPenalties','inRain','system','godBuffs','godPenalties','fail','poseidonMiningHaste','EquipmentSlot',
    `${effectsSource}\n${passiveSource}\nreturn updatePlayer;`)
    (CONFIG,()=> 'poseidon',()=>false,()=>{},()=>raining,{currentTick:100},new Map(),new Map(),e=>errors.push(e),poseidonMiningHaste,{Head:'Head'});
  run(player);assert.equal(errors.length,0);assert.equal(effects.has('slow_falling'),false,'Poseidon always clears Slow Falling');
  assert.equal(effects.get('strength').amplifier,1);
  assert.equal(effects.get('haste').amplifier,0,'real Haste stays low to preserve attack animations');
  assert.equal(effects.get('conduit_power').amplifier,17,'only mining compensation scales with water penalties');
  player.isInWater=false;raining=true;run(player);
  assert.equal(effects.has('night_vision'),false,'water vision ends immediately on leaving water');
  assert.equal(effects.get('strength').amplifier,1);
  assert.equal(effects.get('haste').amplifier,1);
  raining=false;run(player);
  assert.equal(effects.has('strength'),false);assert.equal(effects.has('haste'),false);assert.equal(effects.has('conduit_power'),false);
});

test('a stale wet sensor cannot keep rain powers active after weather clears',()=>{
  const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8');
  const body=source.slice(source.indexOf('function inRain('),source.indexOf('function zeusStorm('));
  const check=new Function('weather',`${body};return inRain;`)(()=> 'Clear');
  assert.equal(check({dimension:{id:'minecraft:overworld'},isInWater:false,getProperty:()=>true}),false);
});

test('Zeus Y220 storm power bypasses clear-weather cooldown but keeps five-second lightning interval',()=>{
  const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8');
  const storm=source.slice(source.indexOf('function zeusStorm('),source.indexOf('function submerged('));
  const cooldown=source.slice(source.indexOf('function remaining('),source.indexOf('function mountain('));
  let weather='Clear',time=10000;
  const props=new Map([['cd_zeusLightning',999999],['cd_zeusFlight',999999]]);
  const player={location:{y:219},dimension:{id:'minecraft:overworld'},getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),onScreenDisplay:{setActionBar(){}}};
  const runtime=new Function('weather','CONFIG','now','key','cooldownRemaining','abilityNeedsCooldown','crownCooldownSeconds',
    `${storm}\n${cooldown}\nreturn {zeusStorm,zeusThunder,ready,startCooldown};`)
    (()=>weather,CONFIG,()=>time,k=>k,(expiry,now)=>Math.max(0,(expiry||0)-now),(_ability,storm)=>!storm,(_p,n)=>n);
  assert.equal(runtime.zeusStorm(player),false);
  player.location.y=220;assert.equal(runtime.zeusStorm(player),true);assert.equal(runtime.zeusThunder(player),true);
  assert.equal(runtime.ready(player,'zeusLightning','Lightning'),true);
  runtime.startCooldown(player,'zeusLightning');assert.equal(props.get('cd_zeusStormLightning'),15000);
  assert.equal(runtime.ready(player,'zeusLightning','Lightning'),false);
  time=15000;assert.equal(runtime.ready(player,'zeusLightning','Lightning'),true);
  assert.equal(runtime.ready(player,'zeusFlight','Flight'),true);
  player.dimension.id='minecraft:nether';assert.equal(runtime.zeusStorm(player),false);
});

test('Tidal Sprint preserves upward momentum and gives jump priority when exiting water',()=>{
  const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8');
  const body=source.slice(source.indexOf('function poseidonMotion('),source.indexOf('function remaining('));
  const impulses=[];
  let jumping=false,input={x:0,y:1},view={x:1,y:0,z:0},velocity={x:0,y:0.3,z:0};
  const player={id:'swim-exit',isInWater:true,isSprinting:true,location:{x:0,y:0,z:0},
    inputInfo:{getMovementVector:()=>input,getButtonState:()=>jumping?1:0},
    getViewDirection:()=>view,getVelocity:()=>velocity,applyImpulse:v=>impulses.push(v)};
  const motion=new Function('inRain','poseidonSpeedEnabled','InputButton','ButtonState','movementDirection','CONFIG','poseidonTrailTick','system','MolangVariableMap','fail','poseidonSwimCruise','tidalEnvironment','recordTidalBoost',`${body};return poseidonMotion;`)
    (()=>false,()=>true,{Jump:'jump'},{Pressed:1},movementDirection,CONFIG,new Map(),{currentTick:0},class {},e=>{throw e;},poseidonSwimCruise,()=>{},()=>{});
  player.isSprinting=false;motion(player);assert.equal(impulses.length,1);assert.ok(impulses[0].x<=0.04,'only gentle cruise without sprint');
  player.isSprinting=true;
  motion(player);
  assert.equal(impulses.at(-1).y,0,'level swimming must not brake a jump');
  jumping=true;view={x:0.8,y:-0.6,z:0};velocity={x:0,y:0,z:0};
  motion(player);
  assert.equal(impulses.at(-1).y,0.2,'jump must override looking down');
  assert.ok(impulses.at(-1).x<=0.45,'bank exit must ease horizontal thrust');
  input={x:0,y:0};motion(player);
  assert.equal(impulses.at(-1).y,0.2,'jump works without forward input');
  velocity.y=0.8;motion(player);
  assert.equal(impulses.at(-1).y,0,'jump never brakes existing upward momentum');
  player.isSprinting=false;const released=impulses.length;motion(player);
  assert.equal(impulses.length,released,'idle input adds no cruise thrust');
  input={x:0,y:1};motion(player);assert.ok(impulses.at(-1).x<=0.04,'releasing sprint leaves only gentle cruise');
  player.isSprinting=true;
  player.isInWater=false;const before=impulses.length;motion(player);
  assert.equal(impulses.length,before,'exit assistance stops on land');
});

test('Apollo distinguishes sun, torchlight, dark, and night without caching stale light',()=>{
  let light=0;
  const player={id:'light-test',getHeadLocation:()=>({x:0,y:2,z:0}),dimension:{getLightLevel:()=>light}};
  assert.deepEqual(lightPower(player,true,true,1),{sun:true,lit:true,weak:false,level:0});
  light=8;
  assert.equal(lightPower(player,false,true,2).lit,true);
  assert.equal(lightPower(player,false,true,2).weak,false);
  assert.equal(lightPower(player,false,false,3).weak,true);
  light=0;
  assert.equal(lightPower(player,false,true,4).lit,false);
  assert.equal(lightPower(player,false,true,4).weak,true);
  forgetEnvironment(player.id);
});

test('swimming preserves existing food instead of feeding Poseidon, and fog cleans up',()=>{
  const commands=[];
  const attr=value=>({currentValue:value,setCurrentValue(v){this.currentValue=v;}});
  const hunger=attr(12),saturation=attr(3),exhaustion=attr(2);
  const player={id:'swimmer',isSwimming:true,isInWater:true,runCommand:s=>commands.push(s),
    getComponent:id=>({'minecraft:player.hunger':hunger,'minecraft:player.saturation':saturation,'minecraft:player.exhaustion':exhaustion}[id])};
  seaEnvironment(player,true);
  assert.equal(hunger.currentValue,12); assert.equal(exhaustion.currentValue,0);
  hunger.currentValue=11; saturation.currentValue=2; exhaustion.currentValue=3;
  seaEnvironment(player,true);
  assert.equal(hunger.currentValue,12); assert.equal(saturation.currentValue,3);
  assert.equal(commands.filter(c=>c.includes('push')).length,1);
  player.isSwimming=false; seaEnvironment(player,true); hunger.currentValue=10;
  player.isSwimming=true; seaEnvironment(player,true);
  assert.equal(hunger.currentValue,10);
  clearEnvironment(player);
  assert.match(commands.at(-1),/remove olympus_poseidon_water/);
});

test('rain clutch needs no inventory, activates only in exposed rain, and respects protected land and Nether',()=>{
  let water=false,remembered=0;
  const air={get isAir(){return !water;},setType:type=>{water=type==='minecraft:water';},setWaterlogged(){}};
  const player={id:'rain-fall',location:{x:0,y:20,z:0},isInWater:false,getVelocity:()=>({x:0,y:-1.8,z:0}),
    getComponent:()=>{throw Error('rain clutch must never access inventory');},
    dimension:{id:'minecraft:overworld',
      getBlockFromRay:origin=>origin.y-3>5?undefined:{face:'Up',block:{location:{x:0,y:3,z:0},isAir:false,isLiquid:false}},
      getBlock:at=>at.y===4?air:{isAir:true}}};
  const clutch=(raining,blocked=false)=>bucketClutch(player,raining,()=>blocked,()=>remembered++);
  assert.equal(clutch(true),false);player.location.y=6;
  assert.equal(clutch(false),false);assert.equal(water,false,'dry weather cannot clutch');
  assert.equal(clutch(true,true),false);assert.equal(water,false,'protected land cannot be altered');
  assert.equal(clutch(true),true);assert.equal(water,true);assert.equal(remembered,1);
  player.isInWater=true;assert.equal(clutch(true),false,'clutch ends once the player enters water');player.isInWater=false;
  forgetEnvironment(player.id);water=false;player.dimension.id='minecraft:nether';
  assert.equal(clutch(true),false);assert.equal(water,false);
});

test('Sunflight runs indefinitely, torch flight expires, and darkness cancels immediately',()=>{
  const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8');
  const body=source.slice(source.indexOf('function updateFlight('),source.indexOf('function updatePlayer('));
  let time=10000, power={sun:true,lit:true}, impulses=[];
  const props=new Map([['flightUntil',9000]]);
  const player={isSprinting:true,getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),
    inputInfo:{getButtonState:()=>0,getMovementVector:()=>({x:0,y:1})},
    getViewDirection:()=>({x:1,y:0,z:0}),getVelocity:()=>({x:0,y:0,z:0}),applyImpulse:v=>impulses.push(v)};
  const update=new Function('now','role','key','apolloPower','CONFIG','effect','InputButton','ButtonState','movementDirection',`${body}; return updateFlight;`)
    (()=>time,()=> 'apollo',k=>k,()=>power,CONFIG,()=>{}, {Jump:'jump',Sneak:'sneak'},{Pressed:1},()=>({x:1,z:0}));
  update(player); assert.equal(props.get('flightUntil'),15000);assert.equal(impulses.at(-1).x,0.28);
  player.isSprinting=false;update(player);assert.equal(impulses.at(-1).x,CONFIG.apolloFlightWalkSpeed);
  player.isSprinting=true;
  time=100000;update(player);assert.equal(props.get('flightUntil'),105000);
  power={sun:false,lit:true};time=105001;update(player);assert.equal(props.get('flightUntil'),undefined);
  props.set('flightUntil',200000);power={sun:false,lit:false};update(player);assert.equal(props.get('flightUntil'),undefined);
});

test('rain clutch never grants fall immunity, resistance, slow falling or teleport protection',()=>{
  const definition=JSON.parse(readFileSync(new URL('../behavior_pack/entities/player.json',import.meta.url),'utf8'))['minecraft:entity'];
  assert.equal(definition.description.properties['olympus:rain_fall_guard'],undefined);
  assert.equal(definition.description.properties['olympus:clutch_fall_guard'],undefined);
  assert.equal(definition.components['minecraft:damage_sensor'],undefined);
  const clutch=readFileSync(new URL('../behavior_pack/scripts/sea_light.js',import.meta.url),'utf8').split('export function bucketClutch(')[1];
  assert.doesNotMatch(clutch,/addEffect|setProperty|setDynamicProperty|teleport|clearVelocity|applyImpulse/);
});

test('water mining compensation stays modest across floating, grounding and Aqua Affinity',()=>{
  let underwater=true,affinity=false;
  const player={isInWater:true,isOnGround:true,getHeadLocation:()=>({x:0,y:2,z:0}),
    dimension:{getBlock:()=>({typeId:underwater?'minecraft:water':'minecraft:air'})},
    getComponent:()=>({getEquipment:()=>({getComponent:()=>({getEnchantment:()=>affinity?{}:undefined})})})};
  for(const floating of [false,true])for(const wet of [false,true])for(const helmet of [false,true]) {
    player.isOnGround=!floating;underwater=wet;affinity=helmet;
    const amp=poseidonMiningHaste(player,'Head',CONFIG.poseidonMiningSpeedTarget);
    const penalty=(wet&&!helmet?5:1)*(floating?5:1);
    const relativeSpeed=1.2**(amp+1)/penalty;
    assert.ok(relativeSpeed>=1.06 && relativeSpeed<1.28,`modest relative speed ${relativeSpeed}`);
  }
});
