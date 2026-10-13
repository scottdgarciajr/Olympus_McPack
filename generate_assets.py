"""Generate fixed pack metadata, relic definitions, commands and simple pixel icons."""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).parent
BP = ROOT / 'behavior_pack'
RP = ROOT / 'resource_pack'
VERSION = [1, 9, 0]
GODS = {
    'hermes': ('Hermes Winged Relic', '#f4cf58'),
    'zeus': ('Zeus Thunder Relic', '#f4eb7b'),
    'poseidon': ('Poseidon Sea Relic', '#36b4e1'),
    'hades': ('Hades Underworld Relic', '#67599a'),
    'ares': ('Ares War Relic', '#df5555'),
    'apollo': ('Apollo Sun Relic', '#ffb94b'),
    'hephaestus': ('Hephaestus Forge Relic', '#da8e4d'),
    'dionysus': ('Dionysus Goblet Relic', '#b06bd5'),
}
RELIC_BUTTONS = {
    'hermes': 'Use: Pearl / Sneak: Glide Toggle',
    'zeus': 'Use: Lightning / Sneak: Flight',
    'poseidon': 'Use: Powers / Sneak: Swim Toggle',
    'hades': 'View Underworld powers',
    'ares': 'Use: War Rage',
    'apollo': 'Use: Sunflight',
    'hephaestus': 'View Forge powers',
    'dionysus': 'Use: Madness Guide / Infinite Bone Meal',
}

def relic_icon(god, color):
    scale = 4
    im = Image.new('RGBA', (32 * scale, 32 * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box = lambda coords: tuple(round(value * scale) for value in coords)
    pts = lambda coords: [(round(x * scale), round(y * scale)) for x, y in coords]
    ink, light = '#f9f2d5', '#ffffff'
    d.polygon(pts([(16, 1), (29, 8), (27, 24), (16, 31), (5, 24), (3, 8)]), fill=color, outline='#241d30', width=2 * scale)
    d.ellipse(box((7, 6, 25, 25)), fill='#202033', outline='#f8e5ad', width=scale)
    if god == 'hermes':
        for side in (-1, 1):
            d.polygon(pts([(16, 17), (16 + side * 7, 10), (16 + side * 9, 13), (16 + side * 5, 17)]), fill=light)
            d.line(pts([(16, 17), (16 + side * 8, 12)]), fill=color, width=scale)
        d.ellipse(box((14, 17, 18, 21)), fill=color)
    elif god == 'zeus':
        d.polygon(pts([(17, 7), (11, 17), (16, 17), (13, 25), (23, 13), (18, 13), (21, 7)]), fill=light)
    elif god == 'poseidon':
        d.line(pts([(16, 24), (16, 10)]), fill=color, width=2 * scale)
        d.line(pts([(10, 15), (22, 15)]), fill=light, width=2 * scale)
        for x in (10, 16, 22):
            d.line(pts([(x, 15), (x, 9)]), fill=light, width=2 * scale)
    elif god == 'hades':
        d.ellipse(box((11, 10, 21, 20)), fill=light)
        d.rectangle(box((13, 18, 19, 23)), fill=light)
        for x in (13, 19):
            d.ellipse(box((x - 1, 13, x + 1, 15)), fill='#202033')
    elif god == 'ares':
        for a, b in [((10, 23), (22, 10)), ((22, 23), (10, 10))]:
            d.line(pts([a, b]), fill=light, width=2 * scale)
        d.line(pts([(10, 11), (13, 11)]), fill=color, width=2 * scale)
        d.line(pts([(19, 11), (22, 11)]), fill=color, width=2 * scale)
    elif god == 'apollo':
        d.ellipse(box((12, 12, 20, 20)), fill=color, outline=light, width=scale)
        for dx, dy in [(-10, 0), (10, 0), (0, -10), (0, 10), (-7, -7), (7, -7), (-7, 7), (7, 7)]:
            d.line(pts([(16 + dx * .65, 16 + dy * .65), (16 + dx, 16 + dy)]), fill=light, width=scale)
    elif god == 'hephaestus':
        d.polygon(pts([(10, 10), (21, 10), (21, 15), (17, 18), (10, 15)]), fill=light)
        d.line(pts([(17, 16), (12, 24)]), fill=color, width=3 * scale)
    elif god == 'dionysus':
        d.polygon(pts([(9, 10), (23, 10), (20, 18), (17, 21), (15, 21), (12, 18)]), fill=color, outline=light)
        d.line(pts([(16, 21), (16, 24), (12, 24), (20, 24)]), fill=light, width=scale)
        d.ellipse(box((18, 11, 20, 13)), fill=light)
    return im.resize((32, 32), Image.Resampling.LANCZOS)

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')

bp_uuid = 'a06ad1f9-8b44-4af1-995a-95dc9c684c25'
rp_uuid = 'def06a91-6e05-457a-a359-714565d4c32c'
write_json(BP / 'manifest.json', {
    'format_version': 2,
    'header': {'name': 'Olympus SMP Behavior', 'description': 'Eight Greek god roles and Mount Olympus', 'uuid': bp_uuid, 'version': VERSION, 'min_engine_version': [1, 21, 90]},
    'modules': [
        {'type': 'data', 'uuid': '45604c22-4d55-478e-beb7-fca61db38eaf', 'version': VERSION},
        {'type': 'script', 'language': 'javascript', 'entry': 'scripts/main.js', 'uuid': 'c6515f3a-93dc-4971-987c-ad95b689d22f', 'version': VERSION}
    ],
    'dependencies': [{'module_name': '@minecraft/server', 'version': '2.0.0'}, {'module_name': '@minecraft/server-ui', 'version': '2.0.0'}, {'uuid': rp_uuid, 'version': VERSION}],
    'metadata': {'authors': ['Olympus SMP'], 'product_type': 'addon'}
})
write_json(RP / 'manifest.json', {
    'format_version': 2,
    'header': {'name': 'Olympus SMP Resources', 'description': 'Relic icons for Olympus SMP', 'uuid': rp_uuid, 'version': VERSION, 'min_engine_version': [1, 21, 90]},
    'modules': [{'type': 'resources', 'uuid': '148f6c15-a3b3-4f02-9c59-ff3af25c3e40', 'version': VERSION}],
    'metadata': {'authors': ['Olympus SMP'], 'product_type': 'addon'}
})

texture_data = {}
for god, (label, color) in GODS.items():
    identifier = f'olympus:{god}_relic'
    write_json(BP / 'items' / f'{god}_relic.json', {
        'format_version': '1.21.90',
        'minecraft:item': {
            'description': {'identifier': identifier, 'menu_category': {'category': 'items'}},
            'components': {
                'minecraft:display_name': {'value': label},
                'minecraft:icon': f'olympus_{god}',
                'minecraft:max_stack_size': 1,
                'minecraft:interact_button': RELIC_BUTTONS[god],
                'olympus:relic_use': {}
            }
        }
    })
    texture_data[f'olympus_{god}'] = {'textures': f'textures/items/{god}_relic'}
    relic_icon(god, color).save(RP / 'textures' / 'items' / f'{god}_relic.png')

write_json(BP / 'items' / 'mountain_sigil.json', {
    'format_version': '1.21.90',
    'minecraft:item': {
        'description': {'identifier': 'olympus:mountain_sigil', 'menu_category': {'category': 'items'}},
        'components': {
            'minecraft:display_name': {'value': 'Mount Olympus Summoning Sigil'},
            'minecraft:icon': 'olympus_mountain',
            'minecraft:max_stack_size': 1,
            'minecraft:interact_button': 'Summon Mount Olympus',
            'olympus:relic_use': {}
        }
    }
})
texture_data['olympus_mountain'] = {'textures': 'textures/items/mountain_sigil'}
im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.polygon([(2, 29), (16, 3), (30, 29)], fill='#a8afbb', outline='#3a3b50', width=2)
d.polygon([(11, 13), (16, 3), (21, 13), (17, 11), (14, 15)], fill='#ffffff')
im.save(RP / 'textures' / 'items' / 'mountain_sigil.png')
write_json(RP / 'textures' / 'item_texture.json', {'resource_pack_name': 'Olympus SMP', 'texture_name': 'atlas.items', 'texture_data': texture_data})

functions = BP / 'functions' / 'olympus'
functions.mkdir(parents=True, exist_ok=True)
(functions / 'give_all.mcfunction').write_text('tellraw @s {"rawtext":[{"text":"Olympus kit: clear eight inventory slots. Use a relic anywhere to claim; if air use does nothing, aim at any block and use. Overflow may drop at your feet."}]}\n' + '\n'.join(f'give @s olympus:{g}_relic 1' for g in GODS) + '\n', encoding='utf-8')
(functions / 'summon_mountain.mcfunction').write_text('give @s olympus:mountain_sigil 1\ntellraw @s {"rawtext":[{"text":"Use the sigil in a large clear area in the Overworld. Mount Olympus rises 33 blocks east of you."}]}\n', encoding='utf-8')
(functions / 'help.mcfunction').write_text('tellraw @s {"rawtext":[{"text":"Olympus: /function olympus/give_all gives eight relics. Take one and use it anywhere to claim a god; if air-use does nothing, use it on any block. /function olympus/summon_mountain gives the mountain sigil. Olympus has a summit altar and stocked chest as another way to choose. /function olympus/controls shows role controls. /function olympus/status, /function olympus/reset, and /function olympus/upgrade_mountain are operator tools."}]}\n', encoding='utf-8')
(functions / 'status.mcfunction').write_text('tellraw @s {"rawtext":[{"text":"Olympus function layer loaded. Script diagnostic follows:"}]}\nscriptevent olympus:status\n', encoding='utf-8')
(functions / 'reset.mcfunction').write_text('scriptevent olympus:reset\n', encoding='utf-8')
(functions / 'controls.mcfunction').write_text('scriptevent olympus:controls\n', encoding='utf-8')
(functions / 'upgrade_mountain.mcfunction').write_text('scriptevent olympus:upgrade_mountain\n', encoding='utf-8')
print('Generated pack assets and functions.')
