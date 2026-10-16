"""Validate the editable pack and produce the installable .mcaddon archive."""
from pathlib import Path
import json
import subprocess
import uuid
import zipfile
import runpy

ROOT = Path(__file__).parent
BP = ROOT / 'behavior_pack'
RP = ROOT / 'resource_pack'
OUT = ROOT / 'dist' / 'Olympus_SMP_FINAL.mcaddon'
GODS = ('hermes', 'zeus', 'poseidon', 'hades', 'ares', 'apollo', 'hephaestus', 'dionysus', 'kratos')

def check(condition, message):
    if not condition:
        raise AssertionError(message)

def read_json(path):
    with path.open(encoding='utf-8') as f:
        return json.load(f)

bp = read_json(BP / 'manifest.json')
rp = read_json(RP / 'manifest.json')
runpy.run_path(str(ROOT / 'validate_oracle_assets.py'))
for pack in (bp,rp):
    version='.'.join(map(str,pack['header']['version']))
    check(f'v{version}' in pack['header']['name'] and f'v{version}' in pack['header']['description'], 'Pack name/description must identify the exact build')
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
check(any(d.get('module_name') == '@minecraft/server' and d.get('version') == '2.3.0' for d in bp['dependencies']), 'Wrong Script API dependency')
check(any(d.get('module_name') == '@minecraft/server-ui' and d.get('version') == '2.0.0' for d in bp['dependencies']), 'Missing UI API dependency')

texture_index = read_json(RP / 'textures' / 'item_texture.json')['texture_data']
clutch=read_json(BP/'blocks'/'clutch_water.json')['minecraft:block']['components']
check(clutch['minecraft:collision_box'] is False, 'Clutch water must not stop player movement')
flow=clutch['minecraft:liquid_detection']['detection_rules'][0]
check(flow['can_contain_liquid'] and set(flow['stops_liquid_flowing_from_direction'])=={'up','down','north','south','east','west'}, 'Clutch water must contain real water without spreading')
check((RP/'textures'/'blocks'/'clutch_invisible.png').is_file(), 'Clutch carrier texture missing')
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
for command in ('give_all', 'help', 'status', 'reset', 'summon_mountain', 'controls', 'upgrade_mountain', 'setup', 'crown_setup', 'crown_status', 'crown_reset', 'crown_recover', 'crown_glory', 'crown_help','creative_kit'):
    path = BP / 'functions' / 'olympus' / (command + '.mcfunction')
    check(path.is_file() and path.stat().st_size > 0, f'Function {command} missing')
check((BP / 'functions' / 'olympus' / 'setup.mcfunction').read_text().strip() == 'scriptevent olympus:setup', 'Temple setup function missing')
check(read_json(BP / 'items' / 'creative_test_kit.json')['minecraft:item']['components'].get('olympus:creative_test_kit_use') == {}, 'Creative god/Crown menu item missing')
check(read_json(BP / 'items' / 'war_trophy.json')['minecraft:item']['description']['identifier'] == 'olympus:war_trophy', 'PvP trophy missing')
check('olympus:open_god' in script and 'olympus:release_god' in script, 'Operator role sharing tools missing')
check(read_json(BP / 'items' / 'crown.json')['minecraft:item']['components']['minecraft:wearable']['slot'] == 'slot.armor.head', 'Crown is not wearable')
check((RP / 'attachables' / 'crown.player.json').exists(), 'Crown worn model missing')
check((BP / 'scripts' / 'crown.js').exists(), 'Crown manager missing')
crown_script=(BP/'scripts'/'crown.js').read_text(encoding='utf-8')
check(crown_script.count('domain:')==8 and 'olympus:war_trophy' in crown_script, 'Eight-domain Crown trial missing')
check('s.crowns.push' in crown_script and 'crownSerial' in crown_script, 'Multiple Crown ownership missing')
check("api.takeOffering(player,'minecraft:dragon_egg',1)" in crown_script and 's.dragonUses=' in crown_script and 'recordDragonVictory' in script, 'Consumable Dragon Egg or victory gate missing')
forge_recipe = read_json(BP / 'recipes' / 'divine_forge.json')['minecraft:recipe_shaped']
check(forge_recipe['pattern'] == ['III', 'ICI', 'III'] and
      forge_recipe['result']['item'] == 'olympus:divine_forge', 'Portable forge recipe missing')
check(read_json(BP / 'items' / 'divine_forge.json')['minecraft:item']['components'].get('olympus:forge_place') == {}, 'Portable forge placement hook missing')
test_kit = read_json(BP / 'items' / 'hephaestus_test_kit.json')['minecraft:item']
check(test_kit['description']['menu_category']['category'] == 'items' and
      test_kit['components'].get('olympus:hephaestus_test_kit_use') == {}, 'Creative Hephaestus test kit missing')
check(test_kit['components']['minecraft:icon'] in texture_index and
      'creativeForgeSamples()' in script and "toLowerCase()!=='creative'" in script, 'Test kit artwork or Creative-only guard missing')
for item in ('forge_sword_pickaxe', 'forge_fireball_pickaxe', 'forge_water_boots', 'forge_magnet_axe'):
    definition = read_json(BP / 'items' / f'{item}.json')['minecraft:item']
    check(definition['description']['identifier'] == f'olympus:{item}' and
          definition['description']['menu_category']['category'] == 'equipment', f'{item} custom item missing')
    texture = texture_index[definition['components']['minecraft:icon']]['textures']
    check((RP / f'{texture}.png').exists(), f'{item} artwork missing')
    if item != 'forge_water_boots':
        check(definition['components'].get('olympus:forge_item_use') == {}, f'{item} power hook missing')
check((RP / 'attachables' / 'forge_water_boots.player.json').exists() and
      (RP / 'models' / 'entity' / 'forge_water_boots.json').exists() and
      (RP / 'textures' / 'entity' / 'forge_water_boots.png').exists(), 'Custom worn boots missing')
forge_bolt = read_json(BP / 'entities' / 'forge_firebolt.json')['minecraft:entity']
check(forge_bolt['component_groups']['olympus:exploding']['minecraft:explode']['breaks_blocks'], 'Forge firebolt must damage terrain')
bolt = read_json(BP / 'entities' / 'hellfire_bolt.json')['minecraft:entity']
check(bolt['component_groups']['olympus:exploding']['minecraft:explode']['breaks_blocks'], 'Hellfire must damage terrain')
check(read_json(RP / 'entity' / 'hellfire_bolt.entity.json')['minecraft:client_entity']['description']['textures']['default'] == 'textures/items/fireball', 'Fireball appearance missing')
check('world.beforeEvents.playerBreakBlock.subscribe' in script and 'inHall(dimension,location)' in script, 'Hall break protection missing')
structure_path = BP / 'structures' / 'olympus' / 'hall_of_eight.mcstructure'
check(structure_path.is_file() and structure_path.stat().st_size > 10000, 'Bedrock temple structure missing')
check((BP / 'structures' / 'olympus' / 'forbidden_vault.mcstructure').stat().st_size > 1000, 'Kratos lower chamber missing')
check('ensureForbiddenVault(player)' in script and "showTempleAltar(player,'kratos')" in script, 'Lower altar is disconnected')
check((BP / 'functions' / 'olympus' / 'give_all.mcfunction').read_text().count('give @s ') == 9, 'Kit must contain nine relics')
check('system.afterEvents.scriptEventReceive' in script, 'Admin script events disconnected')
check('system.runInterval' in script and 'entityHitEntity' in script, 'Gameplay event loop missing')
check('claimRejection(old, owner(god)' in script and 'not_at_summit' not in script, 'Relic claims must work anywhere')

for path in (BP / 'scripts').glob('*.js'):
    subprocess.run(['node', '--check', str(path)], check=True)
subprocess.run(['node', '--test', str(ROOT / 'tests')], check=True, stdout=subprocess.DEVNULL)

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
