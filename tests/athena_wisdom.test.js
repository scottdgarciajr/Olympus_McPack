import {test} from 'node:test';
import assert from 'node:assert/strict';
import {athenaKillExperience,athenaKillFromEvent} from '../behavior_pack/scripts/athena_wisdom.js';
function player(){const properties=new Map();let xp=0;return {typeId:'minecraft:player',properties,get xp(){return xp;},getDynamicProperty:k=>properties.get(k),setDynamicProperty:(k,v)=>properties.set(k,v),addExperience:n=>xp+=n};}
const victim=(id,type='zombie')=>({id,typeId:'minecraft:'+type});
test('Athena earns raw XP on eligible credited kills, without granting levels or passive XP',()=>{
 const p=player();assert.equal(athenaKillExperience(p,victim('a'),1000),2);assert.equal(athenaKillExperience(p,victim('b','cow'),1001),1);assert.equal(p.xp,3);
 for(const type of ['player','villager','wolf','item','armor_stand'])assert.equal(athenaKillExperience(p,victim(type,type),1002),0);
 assert.equal(athenaKillExperience(p,{id:'probe',typeId:'olympus:weather_sensor'},1002),0);assert.equal(p.xp,3);
});
test('bonus has a rolling 40-XP/minute cap, deduplicates kills and persists across reconnect wrappers',()=>{
 const p=player();assert.equal(athenaKillExperience(p,victim('a'),1000),2);assert.equal(athenaKillExperience(p,victim('a'),1001),0);
 for(let i=0;i<30;i++)athenaKillExperience(p,victim('z'+i),1002);assert.equal(p.xp,40);
 assert.equal(athenaKillExperience({...p},victim('new'),2000),0);assert.equal(athenaKillExperience(p,victim('after'),62000),2);assert.equal(p.xp,42);
});
test('only Athena gets melee/projectile credit; non-player and other-god kills are excluded',()=>{
 const p=player(),event={deadEntity:victim('a'),damageSource:{damagingEntity:p}};
 assert.equal(athenaKillFromEvent(event,()=> 'apollo',1000),0);assert.equal(p.xp,0);
 assert.equal(athenaKillFromEvent(event,()=> 'athena',1000),2);
 const arrow={deadEntity:victim('b'),damageSource:{damagingProjectile:{getComponent:()=>({owner:p})}}};assert.equal(athenaKillFromEvent(arrow,()=> 'athena',1001),2);
 assert.equal(athenaKillFromEvent({deadEntity:victim('c'),damageSource:{damagingEntity:{typeId:'minecraft:wolf'}}},()=> 'athena',1001),0);
});
test('failed native XP rewards restore the cap ledger and do not create a permanent deduction',()=>{
 const p=player();p.addExperience=()=>{throw Error('XP rejected');};assert.throws(()=>athenaKillExperience(p,victim('a'),1000),/XP rejected/);
 assert.equal([...p.properties.values()].filter(Boolean).length,0);
});
