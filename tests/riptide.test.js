import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {bucketClutch,forgetEnvironment} from '../behavior_pack/scripts/sea_light.js';
const source=readFileSync(new URL('../behavior_pack/scripts/main.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const fixture=name=>readFileSync(new URL('fixtures/'+name,import.meta.url),'utf8').replace(/\r\n/g,'\n');

test('Poseidon movement and gear maintenance exactly match the working 3.4.4 archive',()=>{
  for(const [start,end,file] of [['function poseidonMotion(','function remaining(','poseidon_motion_3.4.4.txt'],['function protectOwnedGear(','function divineFortunePickaxe(','protect_owned_gear_3.4.4.txt']]) {
    assert.equal(source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start))).replace(/\r\n/g,'\n'),fixture(file));
  }
  assert.equal(readFileSync(new URL('../behavior_pack/scripts/poseidon_swim.js',import.meta.url),'utf8').replace(/\r\n/g,'\n'),fixture('poseidon_swim_3.4.4.txt'));
});
test('original Tidecaller release behavior is restored exactly; water placement is separate',()=>{
  const start=source.indexOf('world.afterEvents.itemReleaseUse.subscribe('),end=source.indexOf("  if ((role(event.source) === 'apollo'",start);
  const body=source.slice(start,end).split('subscribe((event) => {\n')[1];
  assert.equal(body,fixture('poseidon_release_3.4.4.txt'));
  assert.doesNotMatch(body,/bucketClutch|armRiptide|confirmRain|observeRiptide|setItem/);
  assert.doesNotMatch(source,/riptide_repair|repairTidecallerItem|beginRiptideCharge|riptideBusy|observeRiptide|itemStartUse\.subscribe|itemStopUse\.subscribe/);
  assert.equal(existsSync(new URL('../behavior_pack/scripts/riptide_observer.js',import.meta.url)),false);
  assert.match(source,/rainClutchEnabled\(world,player.name\),heldItem\(player\)\?\.typeId==='minecraft:trident'/);
});
test('held-trident fallback cushions a dangerous fall without rain, launch signals, enchantment reads or item writes',()=>{
  let velocity={x:0,y:2,z:0},held=true,pools=0;
  const p={id:'held',location:{x:0,y:5,z:0},getVelocity:()=>velocity,sendMessage(){},
    getComponent(){throw Error('clutch cannot inspect or modify a trident');},applyImpulse(){throw Error('clutch cannot affect movement');},
    dimension:{id:'minecraft:overworld',getBlock:()=>({typeId:"minecraft:air",isAir:true}),getBlockFromRay:()=>({face:'Up',block:{location:{x:0,y:0,z:0}}})}};
  forgetEnvironment(p.id);
  const clutch=(rain=false,enabled=true)=>bucketClutch(p,rain,()=>false,()=>{pools++;return true;},[3,3,2],enabled,held);
  assert.equal(clutch(),false,'ascending never places water');velocity={x:0,y:-1.8,z:0};
  assert.equal(clutch(),true);assert.equal(clutch(),false);assert.equal(pools,1);
  p.isOnGround=true;clutch();p.isOnGround=false;assert.equal(clutch(),true,'next fall holding a trident qualifies');
  held=false;assert.equal(clutch(),false,'putting away trident ends dry protection');
  assert.equal(clutch(true),true,'rain remains independent');assert.equal(clutch(true,false),false,'admin disable overrides both');
});
test('existing Hall upgrade command is operator-only, uses saved Hall, and does not rebuild it',()=>{
  const marker="    if(event.id==='olympus:upgrade_gods') {";
  const body=source.slice(source.indexOf(marker),source.indexOf("    if (event.id === 'olympus:crown_setup')"));
  let upgraded=0,exists=true,operator=false;
  const player={get playerPermissionLevel(){return operator?2:1;}};
  const run=new Function('event','player','tell','temple','ensureNewAltars','PlayerPermissionLevel','fail',body);
  const invoke=()=>run({id:'olympus:upgrade_gods'},player,()=>{},()=>exists?{x:0,y:0,z:0}:undefined,()=>upgraded++,{Operator:2},e=>{throw e;});
  invoke();assert.equal(upgraded,0);operator=true;exists=false;invoke();assert.equal(upgraded,0);
  exists=true;invoke();assert.equal(upgraded,1);
  operator=false;Object.defineProperty(player,"playerPermissionLevel",{value:3});invoke();assert.equal(upgraded,1,"custom permission is not automatically operator");
  assert.doesNotMatch(source,/\.isOp\(/);
  assert.doesNotMatch(body,/placeTemple|reset\(/);
});



test('Tidecaller creation, native enchantments, item delivery and death protection match 3.4.4',()=>{
 assert.equal(source.slice(source.indexOf('function giveItem('),source.indexOf('function isOwnedGear(')),fixture('tidecaller_delivery_3.4.4.txt'));
 assert.equal(source.split('\n').find(line=>line.includes("if (god === 'poseidon') giveItem(player, enchantedItem("))+'\n',fixture('tidecaller_creation_3.4.4.txt'));
});
