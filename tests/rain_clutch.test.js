import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bucketClutch,forgetEnvironment} from '../behavior_pack/scripts/sea_light.js';
import {rainClutchCommand,rainClutchEnabled} from '../behavior_pack/scripts/poseidon_admin.js';
import {spawnRainWater,cleanupRainWater,CLUTCH_BOUNDARY} from '../behavior_pack/scripts/rain_water.js';
function scene(){
 const cells=new Map(),props=new Map(),events=[];
 const block=p=>({location:{...p},get typeId(){return cells.get(`${p.x},${p.y},${p.z}`)||(p.y<=0?'minecraft:stone':'minecraft:air');},get isAir(){return this.typeId==='minecraft:air';},isLiquidBlocking(){return this.typeId==='minecraft:stone';},setType(type){events.push(type);cells.set(`${p.x},${p.y},${p.z}`,type);}});
 const player={id:'pool',location:{x:0.5,y:5,z:0.5},getVelocity:()=>({x:0,y:-1.8,z:0}),getComponent(){throw Error('No bucket inventory needed');},setProperty(){throw Error('No damage immunity');},addEffect(){throw Error('No Slow Falling');},sendMessage(){},dimension:{id:'minecraft:overworld',getBlock:block,getBlockFromRay:()=>({face:'Up',block:{location:{x:0,y:0,z:0},isAir:false,isLiquid:false}})}};
 forgetEnvironment(player.id);
 const world={getDynamicPropertyIds:()=>[...props.keys()],getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>v===undefined?props.delete(k):props.set(k,v),getDimension:()=>player.dimension};
 const clutch=(rain=true,blocked=false)=>bucketClutch(player,rain,typeof blocked==='function'?blocked:()=>blocked,(dim,points,protect)=>spawnRainWater(world,dim,points,protect,0));
 return {player,cells,clutch,world,props,events};
}
test('clutch creates a 3x3 footprint two blocks tall, sealing flow before native water',()=>{
 const {clutch,cells,events,world}=scene();assert.equal(clutch(),true);
 assert.equal([...cells.values()].filter(type=>type==='minecraft:water').length,18);
 for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)for(let y=1;y<=2;y++)assert.equal(cells.get(`${x},${y},${z}`),'minecraft:water');
 assert.ok(events.slice(0,events.indexOf('minecraft:water')).every(type=>type===CLUTCH_BOUNDARY));
 assert.equal(events.filter(type=>type===CLUTCH_BOUNDARY).length,33,'24 side faces plus 9 top faces; solid floor seals bottom');
 assert.equal(clutch(),false,'once per fall');cleanupRainWater(world,4999);assert.equal(cells.get('0,1,0'),'minecraft:water');
 cleanupRainWater(world,5000);assert.ok([...cells.values()].every(type=>type==='minecraft:air'));
});
test('clutch operates only in rain, not on ground/in water, in Nether, or on protected blocks',()=>{
 for(const change of [s=>{s.player.isOnGround=true;},s=>{s.player.isInWater=true;},s=>{s.player.dimension.id='minecraft:nether';}]){const setup=scene();change(setup);assert.equal(setup.clutch(),false);assert.equal(setup.cells.size,0);}
 let setup=scene();assert.equal(setup.clutch(false),false);setup=scene();assert.equal(setup.clutch(true,true),false);assert.equal(setup.cells.size,0);
});
test('pool refuses protected edges and liquid leaks without changing terrain',()=>{
 let setup=scene();assert.equal(setup.clutch(true,(_dim,p)=>p.x===2),false);assert.equal(setup.cells.size,0);
 setup=scene();setup.cells.set('2,1,0','minecraft:oak_sign');assert.equal(setup.clutch(),false);assert.deepEqual([...setup.cells.entries()],[['2,1,0','minecraft:oak_sign']]);
});
test('failed persistence rolls back all water and edges',()=>{
 const setup=scene();setup.world.setDynamicProperty=()=>{throw Error('storage unavailable');};
 assert.equal(setup.clutch(),false);assert.ok([...setup.cells.values()].every(type=>type==='minecraft:air'));
});
test('shared containment stays until its later pool expires',()=>{
 const setup=scene();assert.equal(setup.clutch(),true);
 const points=[];for(let x=3;x<=5;x++)for(let z=-1;z<=1;z++)for(let y=1;y<=2;y++)points.push({x,y,z});
 assert.equal(spawnRainWater(setup.world,'minecraft:overworld',points,()=>false,1000),18);
 cleanupRainWater(setup.world,5000);assert.equal(setup.cells.get('0,1,0'),'minecraft:air');
 assert.equal(setup.cells.get('3,1,0'),'minecraft:water');assert.equal(setup.cells.get('2,1,0'),CLUTCH_BOUNDARY);
 cleanupRainWater(setup.world,6000);assert.ok([...setup.cells.values()].every(type=>type==='minecraft:air'));
});
test('persistent admin commands disable globally, grant individually and reset',()=>{
 const props=new Map(),world={getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v)};
 assert.equal(rainClutchEnabled(world,'Poseidon'),true);rainClutchCommand(world,'off');assert.equal(rainClutchEnabled({...world},'Poseidon'),false);
 rainClutchCommand(world,'on "Sea King"');assert.equal(rainClutchEnabled(world,'Sea King'),true);assert.equal(rainClutchEnabled(world,'Other'),false);
 rainClutchCommand(world,'reset Sea King');assert.equal(rainClutchEnabled(world,'Sea King'),false);
 rainClutchCommand(world,'on');rainClutchCommand(world,'off Poseidon');assert.equal(rainClutchEnabled(world,'Poseidon'),false);assert.equal(rainClutchEnabled(world,'Other'),true);
 const before=props.get('olympus:poseidon_clutch_settings');rainClutchCommand(world,'invalid');assert.equal(props.get('olympus:poseidon_clutch_settings'),before);
 assert.match(rainClutchCommand(world,'status Poseidon'),/OFF/);rainClutchCommand(world,'reset');assert.equal(rainClutchEnabled(world,'Poseidon'),true);
});
