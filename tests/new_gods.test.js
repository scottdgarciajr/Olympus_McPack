import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NEW_GODS, newGodTick, useNewGod, installNewAltars, artemisPower} from '../behavior_pack/scripts/new_gods.js';
import {CONFIG} from '../behavior_pack/scripts/config.js';
import {isPersonalGodItem} from '../behavior_pack/scripts/god_items.js';
import {playerCooldownTimers} from '../behavior_pack/scripts/cooldown_notifications.js';
import {kratosKill, kratosStatus} from '../behavior_pack/scripts/kratos.js';
import {readFileSync} from 'node:fs';

function player() {
  const props=new Map(), effects=new Map(), calls=[];
  return {calls, effects, getDynamicProperty:k=>props.get(k), setDynamicProperty:(k,v)=>props.set(k,v),
    getEffect:k=>effects.get(k), addEffect(id,duration,options){calls.push([id,duration,options]);effects.set(id,{duration,...options});},sendMessage(){}};
}
function activate(p,god,ready=true) {
  const cooldowns=[];
  useNewGod(p,god,{ready:()=>ready,startCooldown:(_p,id)=>cooldowns.push(id),now:1000,tell(){},flair(){}});
  return cooldowns;
}
function tick(p,god,now=1000,night=true) {
  const buffs=[],penalties=[],cleared=[];
  newGodTick(p,god,{now,night,buff:(_p,...args)=>buffs.push(args),penalty:(_p,...args)=>penalties.push(args),clearBuff:(_p,id)=>cleared.push(id)});
  return {buffs,penalties,cleared};
}
test('each addition has locked equipment, persistent cooldown notices and a Kratos gift/burden pool',()=>{
  for(const [god,spec] of Object.entries(NEW_GODS)) {
    const p=player();
    assert.ok(isPersonalGodItem({typeId:`olympus:${god}_relic`}));
    assert.ok(CONFIG.cooldownSeconds[spec.ability]>=120);
    p.setDynamicProperty(`olympus:cd_${spec.ability}`,12345);
    assert.ok(playerCooldownTimers(p,god).some(t=>t.until===12345&&t.label===spec.label));
    kratosKill(p,god);
    assert.match(kratosStatus(p),/Lasting \(1\)/);
    assert.equal(spec.stolen.length,2);
    assert.ok(spec.stolen.some(([,id])=>['weakness','mining_fatigue'].includes(id)));
  }
});
test('the real player update and relic handler dispatch all three new roles',()=>{
  const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8');
  const updateSource=source.slice(source.indexOf('function updatePlayer('),source.indexOf('function safeTeleport('));
  const specialSource=source.slice(source.indexOf('function special('),source.indexOf('function useRelic('));
  for(const god of Object.keys(NEW_GODS)) {
    const p=player();p.dimension={id:'minecraft:overworld'};
    const buffs=[],penalties=[];
    const update=new Function('CONFIG','role','suppressOldPenalties','newGodTick','godBuff','godPenalty','clearGodBuff','clearGodPenalty','daylight','now','fail',updateSource+';return updatePlayer;')
      (CONFIG,()=>god,()=>{},newGodTick,(_p,...args)=>buffs.push(args),(_p,...args)=>penalties.push(args),()=>{},()=>{},()=>false,()=>1000,error=>{throw error;});
    update(p);assert.ok(buffs.length);assert.equal(penalties.length,god==='artemis'?0:1);
    const cooldowns=[];
    const special=new Function('useNewGod','ready','startCooldown','now','tell','showFlair','fail','artemisEnvironment',specialSource+';return special;')
      (useNewGod,()=>true,(_p,id)=>cooldowns.push(id),()=>1000,()=>{},()=>{},error=>{throw error;},()=>({active:true}));
    special(p,god,false);assert.deepEqual(cooldowns,[NEW_GODS[god].ability]);
    assert.equal(p.calls.length,NEW_GODS[god].active.length);
  }
});
test('cooldown rejection grants no effects or timer; successful effects are bounded and self-only',()=>{
  for(const [god,spec] of Object.entries(NEW_GODS)) {
    const p=player();assert.deepEqual(activate(p,god,false),[]);assert.equal(p.calls.length,0);
    assert.equal(p.getDynamicProperty('olympus:newGodUntil'),undefined);
    assert.deepEqual(activate(p,god),[spec.ability]);
    assert.equal(p.getDynamicProperty('olympus:newGodUntil'),1000+spec.seconds*1000);
    assert.ok(p.calls.every(([,duration,{amplifier}])=>duration<=240&&amplifier<=2));
    assert.ok(p.calls.every(([id])=>id!=='strength'));
  }
});
test('passives cannot cancel Athena or Artemis bursts and return after expiration',()=>{
  for(const god of ['athena','artemis']) {
    const p=player(),spec=NEW_GODS[god];activate(p,god);
    assert.ok(!tick(p,god,2000).buffs.some(([id])=>id===spec.active[0][0]));
    assert.ok(tick(p,god,1000+spec.seconds*1000).buffs.some(([id,level])=>id===spec.passive[0][0]&&level===spec.passive[0][1]));
    assert.equal(tick(p,god).penalties.length,god==='artemis'?0:1);
  }
});
test('Hestia regeneration never refreshes on passive ticks and stronger/longer external effects survive activation',()=>{
  const p=player();activate(p,'hestia');
  for(let t=2000;t<=10000;t+=1000)assert.ok(!tick(p,'hestia',t).buffs.some(([id])=>id==='regeneration'));
  assert.equal(p.calls.filter(([id])=>id==='regeneration').length,1);
  for(const god of Object.keys(NEW_GODS)) {
    const q=player();for(const [id,amplifier] of NEW_GODS[god].active)q.effects.set(id,{amplifier:amplifier+1,duration:999});
    activate(q,god);assert.equal(q.calls.length,0);
    for(const [id,amplifier] of NEW_GODS[god].active)q.effects.set(id,{amplifier,duration:999});
    activate(q,god);assert.equal(q.calls.length,0);
  }
});
test('Artemis night vision is conditional; no passive or active grants fall immunity',()=>{
  const p=player();assert.ok(tick(p,'artemis',1000,true).buffs.some(([id])=>id==='night_vision'));
  assert.deepEqual(tick(p,'artemis',1000,false).cleared,['speed','night_vision']);
  assert.ok(![...NEW_GODS.artemis.passive,...NEW_GODS.artemis.active].some(([id])=>id==='slow_falling'||id==='resistance'));
});
test('Artemis receives night or low-light powers and daytime weakness, never flight',()=>{
  const p=player();let light=15;
  p.dimension={getLightLevel:()=>light};p.getHeadLocation=()=>({x:0,y:1,z:0});
  assert.equal(artemisPower(p,true).active,true,'night remains powered beside torches');
  assert.equal(artemisPower(p,false).active,false);
  assert.deepEqual(tick(p,'artemis',1000,false).penalties,[['weakness',3,2]]);
  light=3;assert.equal(artemisPower(p,false).active,true,'daytime cave darkness powers Artemis');
  assert.ok(tick(p,'artemis',1000,false).buffs.some(([id])=>id==='night_vision'));
  let used=false;
  useNewGod(p,'artemis',{moonPower:()=>({active:false}),tell(){},ready(){used=true;}});
  assert.equal(used,false,'bright daytime cannot spend Huntstride cooldown');
  assert.ok(![...NEW_GODS.artemis.passive,...NEW_GODS.artemis.active].some(([id])=>['levitation','slow_falling'].includes(id)));
});
test('old Hall migration is repeatable and preserves obstructed or unloaded altar footprints',()=>{
  const blocks=new Map();let writes=0;
  const dim={getBlock(pos){const k=JSON.stringify(pos);if(!blocks.has(k))blocks.set(k,{isAir:true,typeId:'minecraft:air',setType(type){this.typeId=type;this.isAir=false;writes++;}});return blocks.get(k);}};
  const origin={x:0,y:0,z:0};assert.deepEqual(installNewAltars(dim,origin),[]);assert.equal(writes,9);
  assert.deepEqual(installNewAltars(dim,origin),[]);assert.equal(writes,9);
  const obstruction=dim.getBlock({x:10,y:4,z:6});obstruction.typeId='minecraft:chest';
  assert.deepEqual(installNewAltars(dim,origin),['athena']);assert.equal(obstruction.typeId,'minecraft:chest');assert.equal(writes,9);
  assert.deepEqual(installNewAltars({getBlock:()=>undefined},origin),Object.keys(NEW_GODS));
});


test('altar upgrade reports absolute locations, partial obstruction and native errors to the player',()=>{
 const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('function ensureNewAltars('),source.indexOf('function ensureForgeStation('));
 const messages=[];let obstruction=['athena'],error;
 const run=new Function('temple','world','installNewAltars','NEW_GODS','nameOf','tell','fail',body+';return ensureNewAltars;')
  (()=>({x:100,y:64,z:200,dimension:'minecraft:overworld'}),{getDimension:()=>({})},()=>{if(error)throw error;return obstruction;},NEW_GODS,g=>g,(_p,m)=>messages.push(m),()=>{});
 run({});assert.ok(messages.some(m=>m.includes('athena altar: BLOCKED or unloaded at 110, 69, 206')));assert.ok(messages.some(m=>m.includes('artemis altar: READY at 116, 69, 206')));assert.ok(!messages.some(m=>m.includes('Upgrade complete')));
 messages.length=0;obstruction=[];run({});assert.ok(messages.some(m=>m.includes('Upgrade complete')));
 messages.length=0;error=Error('chunk not loaded');run({});assert.ok(messages.some(m=>m.includes('Altar upgrade failed: chunk not loaded')));
});
