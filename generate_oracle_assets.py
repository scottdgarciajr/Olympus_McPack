"""Build animated Oracle mesh edges from pinned, MIT-licensed vanilla models.

Run with --reference path/to/bedrock-samples-v1.21.120.4.zip. Generated files
are committed/bundled; normal builds do not download or require this reference.
"""
import argparse
import copy
import json
import re
import zipfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent
parser = argparse.ArgumentParser()
parser.add_argument('--reference', required=True)
args = parser.parse_args()
archive = zipfile.ZipFile(args.reference)
prefix = 'bedrock-samples-1.21.120.4/'

def read(name):
    raw = archive.read(prefix + name).decode('utf-8-sig')
    raw = re.sub(r'"(?:\\.|[^"\\])*"|//[^\n]*|/\*[\s\S]*?\*/',
                 lambda m: '' if m[0].startswith(('//', '/*')) else m[0], raw)
    return json.loads(raw)

def write(path, data):
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')

models = {}
controllers = {}
for name in archive.namelist():
    relative = name.removeprefix(prefix)
    if relative.startswith('resource_pack/models/entity/') and name.endswith('.json'):
        data = read(relative)
        for geometry in data.get('minecraft:geometry', []):
            models[geometry['description']['identifier']] = geometry
        for key, value in data.items():
            if key.startswith('geometry.'):
                models[key.split(':')[0]] = {'description': {'identifier': key.split(':')[0],
                    'texture_width': value.get('texturewidth', 64), 'texture_height': value.get('textureheight', 64),
                    **{field:value[field] for field in ('visible_bounds_width','visible_bounds_height','visible_bounds_offset') if field in value}},
                    'bones': value.get('bones', []), '_parent': key.partition(':')[2]}
    if relative.startswith('resource_pack/render_controllers/') and name.endswith('.json'):
        controllers.update(read(relative).get('render_controllers', {}))

def resolve(identifier, visited=None):
    visited = set() if visited is None else visited
    if identifier not in models or identifier in visited:
        return None
    visited.add(identifier)
    result = copy.deepcopy(models[identifier])
    parent = result.pop('_parent', '')
    if parent:
        base = resolve(parent, visited)
        if base:
            bones = {bone['name']: bone for bone in base['bones']}
            for bone in result['bones']:
                bones[bone['name']] = {**bones.get(bone['name'], {}), **bone}
            result['bones'] = list(bones.values())
    return result

generated_models = {}
def edges(identifier):
    if identifier in generated_models:
        return generated_models[identifier]
    original = resolve(identifier)
    if not original:
        return None
    outline_id = 'geometry.olympus.oracle.' + identifier.removeprefix('geometry.')
    outline = copy.deepcopy(original)
    outline['description']['identifier'] = outline_id
    outline['description'].update(texture_width=1, texture_height=1)
    for bone in outline['bones']:
        bars = []
        for cube in bone.get('cubes', []):
            if not all(isinstance(n, (int, float)) for n in cube.get('origin', [])+cube.get('size', [])):
                continue
            inflate = cube.get('inflate', bone.get('inflate', 0)) + 0.025
            low = [n-inflate for n in cube['origin']]
            size = [max(0.035, n+inflate*2) for n in cube['size']]
            thickness = 0.055
            for axis in range(3):
                others = [n for n in range(3) if n != axis]
                for a in (0, 1):
                    for b in (0, 1):
                        origin = list(low)
                        dims = [thickness]*3
                        dims[axis] = size[axis]
                        origin[others[0]] += a*(size[others[0]]-thickness)
                        origin[others[1]] += b*(size[others[1]]-thickness)
                        bar = {'origin': origin, 'size': dims, 'uv': [0, 0]}
                        for field in ('rotation', 'pivot'):
                            if field in cube:
                                bar[field] = cube[field]
                        bars.append(bar)
        bone['cubes'] = bars
        bone.pop('inflate', None)
        bone.pop('texture_meshes', None)
    write('resource_pack/models/entity/oracle/'+outline_id.removeprefix('geometry.')+'.geo.json',
          {'format_version': '1.12.0', 'minecraft:geometry': [outline]})
    generated_models[identifier] = outline_id
    return outline_id

supported = []
new_controllers = {}
for name in archive.namelist():
    relative = name.removeprefix(prefix)
    if not relative.startswith('resource_pack/entity/') or not name.endswith('.json'):
        continue
    client = read(relative)
    description = client.get('minecraft:client_entity', {}).get('description', {})
    identifier = description.get('identifier', '')
    type_name = identifier.removeprefix('minecraft:')
    behavior_path = 'behavior_pack/entities/'+type_name+'.json'
    if prefix+behavior_path not in archive.namelist():
        continue
    behavior = read(behavior_path)
    if identifier!='minecraft:player' and 'minecraft:health' not in json.dumps(behavior):
        continue
    geometries = description.get('geometry', {})
    if not edges(geometries.get('default', '')):
        continue
    geometry_keys = {}
    for key, value in list(geometries.items()):
        outline = edges(value)
        if outline:
            geometries['oracle_'+key] = outline
            geometry_keys[key.lower()] = 'oracle_'+key
    description.setdefault('materials', {})['oracle'] = 'olympus_oracle_glow'
    description.setdefault('textures', {})['oracle'] = 'textures/entity/oracle_gold'
    entries = description.get('render_controllers', [])
    chosen = 'controller.render.player.third_person' if type_name == 'player' else None
    for entry in entries:
        key = entry if isinstance(entry, str) else next(iter(entry))
        if not chosen and key in controllers and 'geometry' in controllers[key]:
            chosen = key
    base = copy.deepcopy(controllers.get(chosen, {'geometry':'Geometry.default'}))
    def remap(value):
        if isinstance(value, str):
            return re.sub(r'(?i)geometry\.([a-z0-9_]+)',
                lambda match: 'Geometry.'+geometry_keys.get(match[1].lower(), 'oracle_default'), value)
        if isinstance(value, list):
            return [remap(item) for item in value]
        if isinstance(value, dict):
            return {key:remap(item) for key,item in value.items()}
        return value
    controller = {'geometry': remap(base.get('geometry', 'Geometry.default')),
        'materials': [{'*':'Material.oracle'}], 'textures':['Texture.oracle'],
        'is_hurt_color': {'r':0,'g':0,'b':0,'a':0}}
    if 'arrays' in base and 'geometries' in base['arrays']:
        controller['arrays'] = {'geometries': remap(base['arrays']['geometries'])}
    if 'part_visibility' in base:
        controller['part_visibility'] = base['part_visibility']
    controller_id = 'controller.render.olympus.oracle.'+Path(relative).stem
    new_controllers[controller_id] = controller
    description.setdefault('render_controllers', []).append({controller_id: "query.property('olympus:oracle_visible')"})
    behavior['minecraft:entity']['description'].setdefault('properties', {})['olympus:oracle_visible'] = {
        'type':'bool', 'default':False, 'client_sync':True}
    if identifier=='minecraft:player':
        definition=behavior['minecraft:entity']
        definition['description']['properties']['olympus:wet_environment']={'type':'bool','default':False}
        sensor=definition['components'].setdefault('minecraft:environment_sensor', {'triggers':[]})
        if isinstance(sensor['triggers'],dict):sensor['triggers']=[sensor['triggers']]
        for wet in (True,False):
            event='olympus:environment_wet' if wet else 'olympus:environment_dry'
            sensor['triggers'].append({'filters':{'all_of':[
                {'test':'in_water_or_rain','subject':'self','value':wet},
                {'test':'bool_property','domain':'olympus:wet_environment','value':not wet}]},'event':event})
            definition.setdefault('events',{})[event]={'set_property':{'olympus:wet_environment':wet}}
    write(behavior_path, behavior)
    write(relative, client)
    supported.append(identifier)

write('resource_pack/render_controllers/oracle.render_controllers.json',
      {'format_version':'1.10.0', 'render_controllers':new_controllers})
write('resource_pack/materials/oracle.material', {'materials':{'version':'1.0.0',
      'olympus_oracle_glow:entity_emissive_alpha': {'depthFunc':'Always', '+states':['DisableDepthWrite']}}})
models['geometry.olympus.chest_source'] = {'description':{'identifier':'geometry.olympus.chest_source'},
    'bones':[{'name':'chest','pivot':[0,0,0],'cubes':[{'origin':[1,0,1],'size':[14,14,14]}]}]}
chest_geometry=edges('geometry.olympus.chest_source')
write('behavior_pack/entities/oracle_chest.json',{'format_version':'1.21.90','minecraft:entity':{
    'description':{'identifier':'olympus:oracle_chest','is_spawnable':False,'is_summonable':True,
        'properties':{'olympus:oracle_visible':{'type':'bool','default':False,'client_sync':True}}},
    'components':{'minecraft:collision_box':{'width':0,'height':0},
        'minecraft:physics':{'has_gravity':False,'has_collision':False},
        'minecraft:timer':{'looping':False,'time':20,'time_down_event':{'event':'olympus:expire','target':'self'}}},
    'component_groups':{'olympus:expired':{'minecraft:instant_despawn':{}}},
    'events':{'olympus:expire':{'add':{'component_groups':['olympus:expired']}}}}})
write('resource_pack/entity/oracle_chest.entity.json',{'format_version':'1.10.0','minecraft:client_entity':{
    'description':{'identifier':'olympus:oracle_chest','materials':{'default':'olympus_oracle_glow'},
        'textures':{'default':'textures/entity/oracle_gold'},'geometry':{'default':chest_geometry},
        'render_controllers':[{'controller.render.olympus.oracle_chest':"query.property('olympus:oracle_visible')"}]}}})
write('resource_pack/render_controllers/oracle_chest.render_controllers.json',{'format_version':'1.10.0','render_controllers':{
    'controller.render.olympus.oracle_chest':{'geometry':'Geometry.default','materials':[{'*':'Material.default'}],'textures':['Texture.default']}}})
texture = ROOT/'resource_pack/textures/entity/oracle_gold.png'
texture.parent.mkdir(parents=True,exist_ok=True)
Image.new('RGBA',(1,1),(255,205,35,255)).save(texture)
Image.new('RGB',(1,1),(0,255,255)).save(texture.with_name('oracle_gold_mer.png'))
write('resource_pack/textures/entity/oracle_gold.texture_set.json',{'format_version':'1.16.100',
    'minecraft:texture_set':{'color':'oracle_gold','metalness_emissive_roughness':'oracle_gold_mer'}})
(ROOT/'behavior_pack/scripts/oracle_types.js').write_text(
    '// Generated from Mojang bedrock-samples v1.21.120.4. MIT license bundled.\nexport const ORACLE_TYPES = new Set('+json.dumps(sorted(set(supported)))+');\n',encoding='utf-8')
license_name = next(name for name in archive.namelist() if name.removeprefix(prefix).lower().startswith('license'))
license_path = ROOT/'resource_pack/licenses/Mojang-bedrock-samples-MIT.txt'
license_path.write_bytes(archive.read(license_name))
(ROOT/'resource_pack/licenses/Oracle-source.txt').write_text(
    'Vanilla definitions and model-derived animated mesh edges: https://github.com/Mojang/bedrock-samples/tree/v1.21.120.4\n'
    'Oracle adds a client-synced, default-false property to vanilla definitions. Only Apollo receives per-viewer true overrides.\n'
    'Gold emissive depth-always material implements the documented Bedrock material mechanism used by outline addons.\n',encoding='utf-8')
print(f'Generated native animated Oracle edges for {len(set(supported))} entity types / {len(generated_models)} models.')
