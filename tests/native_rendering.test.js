import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,existsSync} from 'node:fs';
const base=new URL('../',import.meta.url);
test('no player, mob or vanilla item definitions replace Minecraft native rendering or behavior',()=>{
 for(const [folder,kind] of [['resource_pack/entity/','minecraft:client_entity'],['behavior_pack/entities/','minecraft:entity'],['behavior_pack/items/','minecraft:item']])
  for(const name of readdirSync(new URL(folder,base)).filter(name=>name.endsWith('.json'))){
   const d=JSON.parse(readFileSync(new URL(folder+name,base),'utf8'))[kind].description;
   assert.ok(d.identifier.startsWith('olympus:'),`${folder}${name}: native definitions must belong to Minecraft`);
  }
 assert.equal(existsSync(new URL('resource_pack/entity/player.entity.json',base)),false);
 assert.equal(existsSync(new URL('behavior_pack/entities/player.json',base)),false);
});
test('Oracle retains compass and trail particles without entity outlines, property overrides or marker spawning',()=>{
 const source=readFileSync(new URL('behavior_pack/scripts/divine_combat.js',base),'utf8');
 assert.match(source,/drawOracleCompass\(player,v\.targets,chests\)/);assert.match(source,/compassColors\.chest/);
 assert.doesNotMatch(source,/oracle_render|updateOracleEdges|clearOracleEdges|setPropertyOverrideForEntity|spawnEntity\('olympus:oracle_chest'/);
 assert.equal(existsSync(new URL('resource_pack/particles/oracle_glimmer.json',base)),true);
});
test('old Oracle chest markers despawn on upgrade instead of keeping obsolete render entities',()=>{
 const d=JSON.parse(readFileSync(new URL('behavior_pack/entities/oracle_chest.json',base),'utf8'))['minecraft:entity'];
 assert.deepEqual(d.components['minecraft:instant_despawn'],{});
});
