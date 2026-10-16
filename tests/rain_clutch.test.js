import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bucketClutch,forgetEnvironment} from '../behavior_pack/scripts/sea_light.js';
import {rememberRainWater,cleanupRainWater,CLUTCH_WATER} from '../behavior_pack/scripts/rain_water.js';

const key=p=>[Math.floor(p.x),Math.floor(p.y),Math.floor(p.z)].join(',');
function scene(id,solids,location,velocity) {
  const blocks=new Map(solids.map(p=>[key(p),'minecraft:stone'])),placed=[];
  const blockAt=p=>({location:{x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z)},
    get typeId(){return blocks.get(key(p))||'minecraft:air';},
    get isAir(){return !blocks.has(key(p));},get isLiquid(){return blocks.get(key(p))===CLUTCH_WATER;},setWaterlogged(){},
    setType(type){if(type==='minecraft:air')blocks.delete(key(p));else blocks.set(key(p),type);}});
  const dimension={id:'minecraft:overworld',getBlock:blockAt,
    getBlockFromRay:(origin,direction,options)=>{
      let previous={x:Math.floor(origin.x),y:Math.floor(origin.y),z:Math.floor(origin.z)};
      for(let distance=0;distance<=options.maxDistance;distance+=0.02) {
        const at={x:origin.x+direction.x*distance,y:origin.y+direction.y*distance,z:origin.z+direction.z*distance},block=blockAt(at);
        if(!block.isAir && !block.isLiquid)return {block,face:previous.y>block.location.y?'Up':'West'};
        previous=block.location;
      }
    }};
  const player={id,location,dimension,getVelocity:()=>velocity,
    getComponent(){throw Error('no inventory required');},setProperty(){throw Error('no damage immunity');},
    setDynamicProperty(){throw Error('no grace timer');},sendMessage(){}};
  const clutch=blocked=>bucketClutch(player,true,blocked||(()=>false),(_dim,p)=>placed.push({...p}));
  return {player,velocity,blocks,placed,clutch};
}
const flat=()=>Array.from({length:61},(_,x)=>Array.from({length:9},(_,z)=>({x:x-10,y:0,z:z-4}))).flat();
test('rain water tracks fast diagonal sprint landing instead of the column left behind',()=>{
  const {clutch,placed,blocks}=scene('fast',flat(),{x:0.5,y:8,z:0.5},{x:3,y:-2.5,z:0.7});
  assert.equal(clutch(),true);assert.ok(placed.some(p=>p.x>=7));
  assert.ok(placed.length>=18 && placed.length<=48,'wide two-high cushion is bounded');
  assert.equal(blocks.get('8,0,2'),'minecraft:stone','terrain remains intact');
});
test('a second airborne trident launch can trigger a fresh landing cushion in the same fall',()=>{
  const {clutch,placed,player,velocity}=scene('riptide',flat(),{x:0.5,y:8,z:0.5},{x:3,y:-2.5,z:0});
  assert.equal(clutch(),true);const first=placed.length;
  player.location={x:30.5,y:7,z:0.5};velocity.x=-3;
  assert.equal(clutch(),true);assert.ok(placed.length>first);
  assert.ok(placed.slice(first).some(p=>p.x>20),'new trajectory has its own water');
});
test('block-corner contact receives water on every touching column',()=>{
  const ground=[{x:0,y:0,z:0},{x:1,y:0,z:0},{x:0,y:0,z:1},{x:1,y:0,z:1}];
  const {clutch,blocks}=scene('corner',ground,{x:1,y:4,z:1},{x:0,y:-1.2,z:0});
  assert.equal(clutch(),true);
  for(const at of ground)assert.equal(blocks.get(key({...at,y:1})),CLUTCH_WATER);
});
test('a one-block gap between two ledges gets water inside the gap as well as above it',()=>{
  const {clutch,blocks}=scene('gap',[{x:0,y:0,z:0},{x:2,y:0,z:0}],{x:1.5,y:4,z:0.5},{x:0,y:-1.2,z:0});
  assert.equal(clutch(),true);assert.equal(blocks.get('1,1,0'),CLUTCH_WATER);
  assert.equal(blocks.get('1,0,0'),CLUTCH_WATER,'water fills the empty space between blocks');
  assert.equal(blocks.get('0,0,0'),'minecraft:stone');assert.equal(blocks.get('2,0,0'),'minecraft:stone');
});
test('protected placements remain blocked, and no floor means no immunity fallback',()=>{
  let setup=scene('protected',flat(),{x:0.5,y:5,z:0.5},{x:0,y:-2,z:0});
  assert.equal(setup.clutch(()=>true),false);assert.equal(setup.placed.length,0);
  setup=scene('void',[],{x:0.5,y:5,z:0.5},{x:0,y:-2,z:0});
  assert.equal(setup.clutch(),false);assert.equal(setup.placed.length,0);
  forgetEnvironment('void');
});
test('many simultaneous cushions shard cleanup records below the string limit and all expire',()=>{
  const props=new Map(),water=new Map();
  const world={getDynamicPropertyIds:()=>[...props.keys()],getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),
    getDimension:()=>({getBlock:p=>({typeId:water.get(key(p)),setWaterlogged(){},setType:t=>water.set(key(p),t)})})};
  for(let x=0;x<24;x++)for(let y=0;y<8;y++)for(let z=0;z<8;z++) {
    const at={x,y,z};water.set(key(at),CLUTCH_WATER);rememberRainWater(world,'minecraft:overworld',at,0);
  }
  assert.equal(props.size,3);assert.ok([...props.values()].every(value=>value.length<32767));
  cleanupRainWater(world,2000);assert.ok([...water.values()].every(type=>type==='minecraft:air'));
  assert.ok([...props.values()].every(value=>value===undefined));
});
