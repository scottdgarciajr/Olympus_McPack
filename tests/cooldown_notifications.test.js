import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCooldownNotifier,playerCooldownTimers} from '../behavior_pack/scripts/cooldown_notifications.js';
function fixture(){const messages=[],props=new Map();return {messages,props,player:{id:'one',sendMessage:m=>messages.push(m),getDynamicProperty:k=>props.get(k)}};}
const timer=(until,id='rage',label='War Rage')=>({id,label,until});
test('a used ability announces completion once, never every polling tick',()=>{
 const {player,messages}=fixture(),n=createCooldownNotifier();n.update(player,'ares',[timer(300000)],0);
 for(let now=1000;now<300000;now+=1000)n.update(player,'ares',[timer(300000)],now);
 assert.equal(messages.length,0);n.update(player,'ares',[timer(300000)],300000);
 for(let now=301000;now<400000;now+=1000)n.update(player,'ares',[timer(300000)],now);
 assert.equal(messages.length,1);assert.match(messages[0],/Ready again: War Rage/);
});
test('simultaneous cooldowns combine and later completions respect the ten-second chat gap',()=>{
 const {player,messages}=fixture(),n=createCooldownNotifier();const timers=[timer(5000),timer(5000,'oracle','Oracle'),timer(7000,'flare','Solar Flare')];
 n.update(player,'apollo',timers,0);n.update(player,'apollo',timers,5000);assert.equal(messages.length,1);assert.match(messages[0],/War Rage, Oracle/);
 n.update(player,'apollo',timers,7000);assert.equal(messages.length,1);n.update(player,'apollo',timers,15000);assert.equal(messages.length,2);assert.match(messages[1],/Solar Flare/);
});
test('reusing an ability clears its queued ready notice until the new cooldown ends',()=>{
 const {player,messages}=fixture(),n=createCooldownNotifier();n.update(player,'zeus',[timer(5000)],0);n.update(player,'zeus',[timer(5000)],5000);
 n.update(player,'zeus',[timer(11000)],6000);n.update(player,'zeus',[timer(11000)],11000);
 n.update(player,'zeus',[timer(25000)],12000);n.update(player,'zeus',[timer(25000)],15000);assert.equal(messages.length,1);
 n.update(player,'zeus',[timer(25000)],25000);assert.equal(messages.length,2);
});
test('old expired timers on login do not spam; cancellation, role changes and disconnect clear tracking',()=>{
 const {player,messages}=fixture(),n=createCooldownNotifier();n.update(player,'ares',[timer(1000)],10000);assert.equal(messages.length,0);
 n.update(player,'ares',[timer(20000)],11000);n.update(player,'ares',[timer(0)],12000);n.update(player,'ares',[timer(0)],21000);assert.equal(messages.length,0);
 n.update(player,'ares',[timer(30000)],22000);n.update(player,'apollo',[timer(30000)],31000);assert.equal(messages.length,0);
 n.update(player,'apollo',[timer(40000)],32000);n.retain([]);n.update(player,'apollo',[timer(40000)],41000);assert.equal(messages.length,0);
});
test('collector reads real ability, forge, utility and Crown timers, while ignoring rapid gadget/per-target spam',()=>{
 const {player,props}=fixture();for(const [id,value] of Object.entries({cd_apolloOracle:100,lightFlightReady:200,forge_water_ready:300,utility_cd_thermal_lens:400,utility_cd_builder_wand:500}))props.set('olympus:'+id,value);
 const crown=[timer(600,'crown_1_authority','Divine Authority')],timers=playerCooldownTimers(player,'apollo',{crown});
 assert.equal(timers.find(t=>t.id==='cd_apolloOracle').until,100);assert.equal(timers.find(t=>t.id==='forge_water').until,300);
 assert.equal(timers.find(t=>t.id==='utility_thermal_lens').until,400);assert.ok(timers.some(t=>t.id==='crown_1_authority'));assert.ok(!timers.some(t=>t.id.includes('builder_wand')));
 assert.equal(playerCooldownTimers(player,'apollo',{sun:true}).find(t=>t.id==='lightflight').until,0);
 props.set('olympus:cd_zeusLightning',5000);props.set('olympus:cd_zeusStormLightning',1000);props.set('olympus:cd_zeusFlight',6000);
 const storm=playerCooldownTimers(player,'zeus',{storm:true});assert.equal(storm.find(t=>t.id==='lightning').until,1000);assert.equal(storm.find(t=>t.id==='flight').until,0);
 assert.equal(playerCooldownTimers(player,'zeus').find(t=>t.id==='lightning').until,5000);
});
