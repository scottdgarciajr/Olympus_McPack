import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanChests } from '../behavior_pack/scripts/oracle_esp.js';
import { updateOracleEdges, clearOracleEdges } from '../behavior_pack/scripts/oracle_render.js';
import { readFileSync } from 'node:fs';

test('Oracle outlines actual entities only for its viewer, retains native animation, and cleans up',()=>{
  const overrides=[],removed=[],vision={};
  const viewer={setPropertyOverrideForEntity:(...args)=>overrides.push(args),removePropertyOverrideForEntity:(...args)=>removed.push(args)};
  const zombie={id:'zombie',typeId:'minecraft:zombie'};
  const other={id:'player',typeId:'minecraft:player'};
  updateOracleEdges(viewer,vision,[zombie,other],[]);
  assert.deepEqual(overrides.map(([entity])=>entity),[zombie,other]);
  updateOracleEdges(viewer,vision,[zombie,other],[]);assert.equal(overrides.length,2);
  updateOracleEdges(viewer,vision,[other],[]);assert.equal(removed[0][0],zombie);
  clearOracleEdges(viewer,vision);assert.equal(removed[1][0],other);
  const client=JSON.parse(readFileSync(new URL('../resource_pack/entity/zombie.entity.json',import.meta.url),'utf8'))['minecraft:client_entity'].description;
  assert.ok(client.animations.move,'vanilla bone animations retained');
  assert.ok(client.render_controllers.some(entry=>typeof entry==='object' && Object.values(entry).includes("query.property('olympus:oracle_visible')")));
  const body=JSON.parse(readFileSync(new URL('../behavior_pack/entities/zombie.json',import.meta.url),'utf8'))['minecraft:entity'];
  assert.equal(body.description.properties['olympus:oracle_visible'].default,false);
  assert.equal(body.description.properties['olympus:oracle_visible'].client_sync,true);
});

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
