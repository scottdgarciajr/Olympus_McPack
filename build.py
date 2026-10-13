"""Validate the editable pack and produce the installable .mcaddon archive."""
from pathlib import Path
import json
import subprocess
import uuid
import zipfile

ROOT = Path(__file__).parent
BP = ROOT / 'behavior_pack'
RP = ROOT / 'resource_pack'
OUT = ROOT / 'dist' / 'Olympus_SMP_FINAL.mcaddon'
GODS = ('hermes', 'zeus', 'poseidon', 'hades', 'ares', 'apollo', 'hephaestus', 'dionysus')

def check(condition, message):
    if not condition:
        raise AssertionError(message)

def read_json(path):
    with path.open(encoding='utf-8') as f:
        return json.load(f)

bp = read_json(BP / 'manifest.json')
rp = read_json(RP / 'manifest.json')
all_uuids = [bp['header']['uuid'], rp['header']['uuid']]
for pack in (bp, rp):
    check(pack['format_version'] == 2, 'Manifest version must be 2')
    check(pack['header']['min_engine_version'] >= [1, 21, 90], 'Engine too old for flattened custom components')
    for module in pack['modules']:
        all_uuids.append(module['uuid'])
        if module['type'] == 'script':
            check((BP / module['entry']).exists(), 'Script entry missing')
for value in all_uuids:
    uuid.UUID(value)
check(len(set(all_uuids)) == len(all_uuids), 'Duplicate manifest UUID')
check(any(d.get('uuid') == rp['header']['uuid'] for d in bp['dependencies']), 'Missing RP dependency')
check(any(d.get('module_name') == '@minecraft/server' and d.get('version') == '2.0.0' for d in bp['dependencies']), 'Wrong Script API dependency')
check(any(d.get('module_name') == '@minecraft/server-ui' and d.get('version') == '2.0.0' for d in bp['dependencies']), 'Missing UI API dependency')

texture_index = read_json(RP / 'textures' / 'item_texture.json')['texture_data']
script = (BP / 'scripts' / 'main.js').read_text(encoding='utf-8')
for god in GODS:
    item = read_json(BP / 'items' / f'{god}_relic.json')['minecraft:item']
    check(item['description']['identifier'] == f'olympus:{god}_relic', f'Wrong {god} item ID')
    check('olympus:relic_use' in item['components'], f'{god} is not usable')
    icon = item['components']['minecraft:icon']
    check(icon in texture_index, f'Missing {god} texture mapping')
    check((RP / (texture_index[icon]['textures'] + '.png')).exists(), f'Missing {god} texture')
    check(f"'{god}'" in script, f'Missing {god} script mapping')
    check(f'give @s olympus:{god}_relic 1' in (BP / 'functions' / 'olympus' / 'give_all.mcfunction').read_text(), f'Missing {god} giveaway')
sigil = read_json(BP / 'items' / 'mountain_sigil.json')['minecraft:item']
check(sigil['description']['identifier'] == 'olympus:mountain_sigil', 'Missing mountain sigil')
check('olympus:relic_use' in sigil['components'], 'Mountain sigil is not usable')
sigil_icon = sigil['components']['minecraft:icon']
check(sigil_icon in texture_index and (RP / (texture_index[sigil_icon]['textures'] + '.png')).exists(), 'Mountain sigil texture missing')
seal = read_json(BP / 'items' / 'temple_seal.json')['minecraft:item']
check(seal['description']['identifier'] == 'olympus:temple_seal', 'Temple seal ID missing')
check('olympus:relic_use' in seal['components'], 'Temple seal is not usable')
seal_icon = seal['components']['minecraft:icon']
check(seal_icon in texture_index and (RP / (texture_index[seal_icon]['textures'] + '.png')).exists(), 'Temple seal texture missing')
for command in ('give_all', 'help', 'status', 'reset', 'summon_mountain', 'controls', 'upgrade_mountain', 'setup', 'crown_setup', 'crown_status', 'crown_reset', 'crown_recover', 'crown_glory', 'crown_help'):
    path = BP / 'functions' / 'olympus' / (command + '.mcfunction')
    check(path.is_file() and path.stat().st_size > 0, f'Function {command} missing')
check((BP / 'functions' / 'olympus' / 'setup.mcfunction').read_text().strip() == 'scriptevent olympus:setup', 'Temple setup function missing')
check(read_json(BP / 'items' / 'crown.json')['minecraft:item']['components']['minecraft:wearable']['slot'] == 'slot.armor.head', 'Crown is not wearable')
check((RP / 'attachables' / 'crown.player.json').exists(), 'Crown worn model missing')
check((BP / 'scripts' / 'crown.js').exists(), 'Crown manager missing')
structure_path = BP / 'structures' / 'olympus' / 'hall_of_eight.mcstructure'
check(structure_path.is_file() and structure_path.stat().st_size > 10000, 'Bedrock temple structure missing')
check((BP / 'functions' / 'olympus' / 'give_all.mcfunction').read_text().count('give @s ') == 8, 'Kit must contain eight relics')
check('system.afterEvents.scriptEventReceive' in script, 'Admin script events disconnected')
check('system.runInterval' in script and 'entityHitEntity' in script, 'Gameplay event loop missing')
check('claimRejection(old, owner(god)' in script and 'not_at_summit' not in script, 'Relic claims must work anywhere')

for path in (BP / 'scripts').glob('*.js'):
    subprocess.run(['node', '--check', str(path)], check=True)
subprocess.run(['node', '--test', str(ROOT / 'tests' / 'rules.test.js'), str(ROOT / 'tests' / 'flair.test.js')], check=True, stdout=subprocess.DEVNULL)

OUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as archive:
    for folder, prefix in ((BP, 'behavior_pack'), (RP, 'resource_pack')):
        for path in folder.rglob('*'):
            if path.is_file():
                archive.write(path, f'{prefix}/{path.relative_to(folder).as_posix()}')
with zipfile.ZipFile(OUT) as archive:
    check(archive.testzip() is None, 'ZIP CRC failure')
    names = set(archive.namelist())
    check('behavior_pack/manifest.json' in names and 'resource_pack/manifest.json' in names, 'Nested or missing pack root')
    check('behavior_pack/structures/olympus/hall_of_eight.mcstructure' in names, 'Temple was not bundled')
    check(not any('/st_' in name or 'super_tnt' in name for name in names), 'Destructive Combine Anything content must not be bundled')
    check(len(names) == len(set(names)), 'Duplicate ZIP entries')
print(f'PASS: manifests, UUIDs, {len(GODS)} relics, functions, textures, JS syntax, rule tests, ZIP. Built {OUT} ({OUT.stat().st_size:,} bytes)')
