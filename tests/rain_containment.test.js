import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnRainWater,cleanupRainWater,CLUTCH_BOUNDARY} from '../behavior_pack/scripts/rain_water.js';
const key=p=>`${p.x},${p.y},${p.z}`;
function scene() {
  const cells=new Map(),props=new Map(),events=[];let unloaded;
  const type=p=>cells.get(key(p))||(p.y===0?'minecraft:stone':'minecraft:air');
  const dimension={getBlock:p=>{
    if(unloaded===key(p))throw Error('unloaded chunk');
    return {get typeId(){return type(p);},get isAir(){return type(p)==='minecraft:air';},
      isLiquidBlocking:()=>['minecraft:stone',CLUTCH_BOUNDARY].includes(type(p)),
      setType:value=>{events.push({p:{...p},old:type(p),value});cells.set(key(p),value);}};
  }};
  const world={getDimension:()=>dimension,getDynamicPropertyIds:()=>[...props.keys()],
    getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v)};
  const spawn=(positions,now=0,blocked=()=>false)=>spawnRainWater(world,'minecraft:overworld',positions,blocked,now);
  return {world,cells,props,events,type,spawn,setUnloaded:p=>{unloaded=p?key(p):undefined;}};
}
test('ordinary water is placed after invisible fluid edges, with no waterlogging call',()=>{
  const {spawn,type,events}=scene();
  assert.equal(spawn([{x:0,y:1,z:0},{x:1,y:1,z:0}]),2);
  assert.equal(type({x:0,y:1,z:0}),'minecraft:water');assert.equal(type({x:1,y:1,z:0}),'minecraft:water');
  const firstWater=events.findIndex(e=>e.value==='minecraft:water');
  assert.ok(firstWater>0);assert.ok(events.slice(0,firstWater).every(e=>e.value===CLUTCH_BOUNDARY));
  assert.ok(events.slice(firstWater).every(e=>e.value==='minecraft:water'),'all edges precede all native water');
  for(const p of [{x:-1,y:1,z:0},{x:2,y:1,z:0},{x:0,y:2,z:0},{x:0,y:1,z:-1},{x:0,y:1,z:1}])assert.equal(type(p),CLUTCH_BOUNDARY);
});
test('two-second cleanup removes all water across shards before removing any edge',()=>{
  const {world,spawn,type,events}=scene(),positions=[{x:7,y:1,z:0},{x:8,y:1,z:0}];
  spawn(positions);cleanupRainWater(world,1999);assert.equal(type(positions[0]),'minecraft:water');
  events.length=0;cleanupRainWater(world,2000);
  const firstEdge=events.findIndex(e=>e.old===CLUTCH_BOUNDARY && e.value==='minecraft:air');
  assert.ok(firstEdge>=2);assert.ok(events.slice(firstEdge).every(e=>e.old===CLUTCH_BOUNDARY));
  assert.ok(positions.every(p=>type(p)==='minecraft:air'));
});
test('shared edges remain until both neighboring water pockets have expired',()=>{
  const {world,spawn,type}=scene();spawn([{x:0,y:1,z:0}],0);spawn([{x:2,y:1,z:0}],1000);
  cleanupRainWater(world,2000);assert.equal(type({x:0,y:1,z:0}),'minecraft:air');
  assert.equal(type({x:2,y:1,z:0}),'minecraft:water');assert.equal(type({x:1,y:1,z:0}),CLUTCH_BOUNDARY);
  cleanupRainWater(world,3000);assert.equal(type({x:1,y:1,z:0}),'minecraft:air');
});
test('a water source in an unloaded shard keeps its exposed edges until safe cleanup',()=>{
  const {world,spawn,type,setUnloaded}=scene(),source={x:7,y:1,z:0},edge={x:8,y:1,z:0};
  spawn([source]);setUnloaded(source);cleanupRainWater(world,2000);
  assert.equal(type(source),'minecraft:water');assert.equal(type(edge),CLUTCH_BOUNDARY);
  setUnloaded();cleanupRainWater(world,2050);assert.equal(type(source),'minecraft:air');assert.equal(type(edge),'minecraft:air');
});
test('protected edges abort placement, replacement terrain stays, and failed persistence rolls back',()=>{
  let setup=scene();assert.equal(setup.spawn([{x:0,y:1,z:0}],0,(_dim,p)=>p.x===-1),0);assert.equal(setup.events.length,0);
  setup=scene();setup.spawn([{x:0,y:1,z:0}]);setup.cells.set('-1,1,0','minecraft:diamond_block');
  cleanupRainWater(setup.world,2000);assert.equal(setup.type({x:-1,y:1,z:0}),'minecraft:diamond_block');
  setup=scene();setup.world.setDynamicProperty=()=>{throw Error('persistence failed');};
  assert.equal(setup.spawn([{x:0,y:1,z:0}]),0);
  assert.ok([...setup.cells.values()].every(t=>t==='minecraft:air'),'no water or temporary edges left behind');
});
