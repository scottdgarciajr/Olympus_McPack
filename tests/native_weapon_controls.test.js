import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeChargeWeapon} from '../behavior_pack/scripts/rules.js';
const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');

test('native charged weapons bypass Hall interaction cancellation without adding clutch use hooks',()=>{
 let handler;
 const world={beforeEvents:{playerInteractWithBlock:{subscribe:fn=>handler=fn}}};
 const body=source.slice(source.indexOf('world.beforeEvents.playerInteractWithBlock.subscribe('),source.indexOf('world.afterEvents.entityHitEntity.subscribe('));
 new Function('world','nativeChargeWeapon','mountain','temple','temporaryBlock','isForge','inHall','GODS','hearthTool',body)
  (world,nativeChargeWeapon,()=>undefined,()=>undefined,()=>false,()=>false,()=>true,[],()=>undefined);
 for(const typeId of ['minecraft:trident','minecraft:bow','minecraft:crossbow']) {
  const event={isFirstEvent:true,itemStack:{typeId},player:{dimension:{id:'minecraft:overworld'}},block:{location:{x:1,y:5,z:1},typeId:'minecraft:quartz_block'},cancel:false};
  handler(event);assert.equal(event.cancel,false,`${typeId} must keep its native use path when aimed at Hall blocks`);
 }
 const building={isFirstEvent:true,itemStack:{typeId:'minecraft:stone'},player:{dimension:{id:'minecraft:overworld'}},block:{location:{x:1,y:5,z:1},typeId:'minecraft:quartz_block'},cancel:false};
 handler(building);assert.equal(building.cancel,true,'ordinary building/use protection remains');
});

test('gear protection uses archived 3.4.4 maintenance with its original inventory lock',()=>{
 const body=source.slice(source.indexOf('function protectOwnedGear('),source.indexOf('function divineFortunePickaxe('));
 assert.equal(body.replace(/\r\n/g,'\n'),readFileSync(new URL('fixtures/protect_owned_gear_3.4.4.txt',import.meta.url),'utf8').replace(/\r\n/g,'\n'));
});
