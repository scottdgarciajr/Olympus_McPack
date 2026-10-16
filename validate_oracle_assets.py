"""Validate Oracle property, model and controller linkage without Minecraft."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).parent
BP = ROOT/'behavior_pack'
RP = ROOT/'resource_pack'
def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

models = {}
for path in (RP/'models/entity/oracle').glob('*.json'):
    for model in read(path)['minecraft:geometry']:
        models[model['description']['identifier']] = model
        assert all('texture_meshes' not in bone for bone in model['bones']), path
        for bone in model['bones']:
            for cube in bone.get('cubes',[]):
                assert len(cube['origin'])==3 and all(size>0 for size in cube['size']), path
controllers = read(RP/'render_controllers/oracle.render_controllers.json')['render_controllers']
supported = json.loads(re.search(r'new Set\((\[.*\])\)',(BP/'scripts/oracle_types.js').read_text())[1])
assert 'minecraft:player' in supported
for entity_type in supported:
    definition=read(BP/'entities'/f'{entity_type.split(":")[1]}.json')['minecraft:entity']
    prop=definition['description']['properties']['olympus:oracle_visible']
    assert prop=={'type':'bool','default':False,'client_sync':True}, entity_type
count=0
for path in (RP/'entity').glob('*.json'):
    description=read(path)['minecraft:client_entity']['description']
    if description['identifier'] not in supported:
        continue
    geometries=description['geometry']
    for key, identifier in geometries.items():
        if key.startswith('oracle_'):
            assert identifier in models, (path, identifier)
    for entry in description['render_controllers']:
        if not isinstance(entry, dict):continue
        name=next(iter(entry))
        if not name.startswith('controller.render.olympus.oracle.'):continue
        assert entry[name]=="query.property('olympus:oracle_visible')",path
        controller=controllers[name]
        for key in re.findall(r'(?i)Geometry\.([a-z_0-9]+)',json.dumps(controller)):
            assert key.lower() in {name.lower() for name in geometries}, (path,key)
        count+=1
material=read(RP/'materials/oracle.material')['materials']['olympus_oracle_glow:entity_emissive_alpha']
assert material['depthFunc']=='Always'
assert (RP/'textures/entity/oracle_gold_mer.png').is_file()
player=read(BP/'entities/player.json')['minecraft:entity']
assert player['description']['properties']['olympus:wet_environment']['default'] is False
assert player['events']['olympus:environment_wet']['set_property']['olympus:wet_environment'] is True
assert 'olympus:rain_fall_guard' not in player['description']['properties']
assert 'olympus:clutch_fall_guard' not in player['description']['properties']
assert 'minecraft:damage_sensor' not in player['components']
print(f'PASS: Oracle linkage for {len(supported)} types, {count} client definitions, {len(models)} animated edge models; native rain sensor.')
