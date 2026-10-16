import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bucketClutch,forgetEnvironment} from '../behavior_pack/scripts/sea_light.js';
import {rainClutchCommand,rainClutchEnabled} from '../behavior_pack/scripts/poseidon_admin.js';
function scene(){
 const cells=new Map(),registered=[];
 const block=p=>({location:{x:Math.floor(p.x),y:p.y,z:Math.floor(p.z)},get typeId(){return cells.get(`${Math.floor(p.x)},${p.y},${Math.floor(p.z)}`)||'minecraft:air';},get isAir(){return this.typeId==='minecraft:air';},setType(type){cells.set(`${Math.floor(p.x)},${p.y},${Math.floor(p.z)}`,type);}});
 const player={id:'single',location:{x:0.5,y:5,z:0.5},getVelocity:()=>({x:0,y:-1.8,z:0}),getComponent(){throw Error('No bucket inventory needed');},setProperty(){throw Error('No damage immunity');},addEffect(){throw Error('No Slow Falling');},sendMessage(){},dimension:{id:'minecraft:overworld',getBlock:block,getBlockFromRay:()=>({face:'Up',block:{location:{x:0,y:0,z:0},isAir:false,isLiquid:false}})}};
 forgetEnvironment(player.id);
 const clutch=(rain=true,blocked=false)=>bucketClutch(player,rain,()=>blocked,(_dim,p)=>registered.push(p));
 return {player,cells,registered,clutch};
}
test('reverted clutch places just one ordinary water source per fall with no slowing or immunity',()=>{
 const {clutch,cells,registered}=scene();assert.equal(clutch(),true);assert.deepEqual([...cells.entries()],[['0,1,0','minecraft:water']]);assert.equal(registered.length,1);assert.equal(clutch(),false);
});
test('clutch operates only in rain, not on ground/in water, in Nether, or on protected blocks',()=>{
 for(const change of [s=>{s.player.isOnGround=true;},s=>{s.player.isInWater=true;},s=>{s.player.dimension.id='minecraft:nether';}]){const setup=scene();change(setup);assert.equal(setup.clutch(true),false);assert.equal(setup.cells.size,0);}
 let setup=scene();assert.equal(setup.clutch(false),false);setup=scene();assert.equal(setup.clutch(true,true),false);assert.equal(setup.cells.size,0);
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
