import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanChests } from '../behavior_pack/scripts/oracle_esp.js';
test('chest scanner finds all three chest kinds, skips unloaded blocks, and visits positions once',()=>{
  const seen=new Set();
  const dimension={getBlock:p=>{
    const key=`${p.x},${p.y},${p.z}`; assert.ok(!seen.has(key));seen.add(key);
    if(p.y<0)throw Error('unloaded');
    return {typeId:p.x===0 && p.y===0?['minecraft:trapped_chest','minecraft:chest','minecraft:ender_chest'][p.z+1]:'minecraft:stone'};
  }};
  const chests=[...scanChests(dimension,{x:0,y:0,z:0},1)].filter(Boolean);
  assert.equal(chests.length,3);
  assert.ok(chests.some(p=>p.z===0));
});
