"""Prevent the addon from replacing Minecraft's native entity/weapon animations."""
import json
from pathlib import Path
ROOT=Path(__file__).parent
for folder,kind in [('resource_pack/entity','minecraft:client_entity'),('behavior_pack/entities','minecraft:entity'),('behavior_pack/items','minecraft:item')]:
    for path in (ROOT/folder).rglob('*.json'):
        description=json.loads(path.read_text(encoding='utf-8'))[kind]['description']
        assert not description['identifier'].startswith('minecraft:'),(path,'vanilla override would replace native behavior/rendering')
for folder,key in [('resource_pack/animations','animations'),('resource_pack/animation_controllers','animation_controllers'),('resource_pack/render_controllers','render_controllers')]:
    for path in (ROOT/folder).rglob('*.json'):
        for identifier in json.loads(path.read_text(encoding='utf-8')).get(key,{}):
            assert '.olympus.' in identifier,(path,identifier,'native controller/animation override')
combat=(ROOT/'behavior_pack/scripts/divine_combat.js').read_text(encoding='utf-8')
assert 'drawOracleCompass' in combat and 'oracleParticle' in combat
assert 'setPropertyOverrideForEntity' not in combat and 'oracle_render' not in combat
assert (ROOT/'resource_pack/particles/oracle_glimmer.json').is_file()
print('PASS: no vanilla entity/item/animation/controller overrides; Oracle uses private compass/trail particles. Minecraft owns native animation playback.')
