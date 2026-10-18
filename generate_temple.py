"""Create the original Hall of Eight Gods as uncompressed little-endian Bedrock NBT."""
from pathlib import Path
import struct

SIZE = (33, 15, 33)
ALTARS = {
    'hermes': (5, 7, 6), 'zeus': (27, 7, 6),
    'poseidon': (5, 7, 13), 'hades': (27, 7, 13),
    'ares': (5, 7, 20), 'apollo': (27, 7, 20),
    'hephaestus': (5, 7, 27), 'dionysus': (27, 7, 27),
}
COLORS = ['yellow', 'light_blue', 'cyan', 'purple', 'red', 'orange', 'gray', 'magenta']
BLOCKS = {}

def put(x, y, z, block):
    if 0 <= x < SIZE[0] and 0 <= y < SIZE[1] and 0 <= z < SIZE[2]:
        BLOCKS[x, y, z] = 'minecraft:' + block

def box(x1, y1, z1, x2, y2, z2, block):
    for x in range(x1, x2 + 1):
        for y in range(y1, y2 + 1):
            for z in range(z1, z2 + 1):
                put(x, y, z, block)

# Raised marble plinth, a broad central aisle, peristyle, entablature and roof.
box(0, 0, 0, 32, 0, 32, 'stone_bricks')
box(1, 1, 1, 31, 1, 31, 'smooth_stone')
box(2, 2, 2, 30, 2, 30, 'quartz_block')
for z in (0, 1, 2, 30, 31, 32):
    box(14, min(2, z // 1), z, 18, min(2, z // 1), z, 'quartz_block')
for x in (2, 8, 16, 24, 30):
    for z in (2, 8, 16, 24, 30):
        if x in (2, 30) or z in (2, 30):
            box(x, 3, z, x, 10, z, 'quartz_block')
            box(x-1, 3, z-1, x+1, 3, z+1, 'chiseled_quartz_block')
            box(x-1, 10, z-1, x+1, 10, z+1, 'chiseled_quartz_block')
for y in (11, 12):
    box(1, y, 1, 31, y, 31, 'quartz_block' if y == 11 else 'smooth_sandstone')
box(3, 13, 3, 29, 13, 29, 'quartz_block')
box(8, 14, 8, 24, 14, 24, 'smooth_sandstone')
# Open roof well and visible lit central compass. The middle remains unobstructed.
box(12, 11, 12, 20, 14, 20, 'air')
box(15, 2, 15, 17, 2, 17, 'gold_block')
put(16, 2, 16, 'sea_lantern')
for x in (10, 22):
    for z in (5, 12, 19, 26):
        box(x-1, 2, z-1, x+1, 2, z+1, 'polished_andesite')
        put(x, 2, z, 'sea_lantern')
for (god, (x, y, z)), color in zip(ALTARS.items(), COLORS):
    # A distinct colored pedestal supports a non-container interactive altar.
    box(x-1, 3, z-1, x+1, 3, z+1, f'{color}_concrete')
    put(x, 4, z, 'chiseled_quartz_block')
    put(x, 5, z, 'enchanting_table')
    for dx in (-2, 2):
        put(x+dx, 3, z, 'sea_lantern')
# Compact front altars preserve the throne, original bays and vault access.
for x in (10, 16, 22):
    put(x, 3, 6, 'chiseled_quartz_block')
    put(x, 4, 6, 'chiseled_quartz_block')
    put(x, 5, 6, 'enchanting_table')
# The Divine Forge uses the Hall's existing Hephaestus bay.
put(5, 3, 29, 'smithing_table')

def name(value):
    raw = value.encode('utf-8')
    return struct.pack('<H', len(raw)) + raw

def tag(kind, key, payload):
    return bytes([kind]) + name(key) + payload

def int_tag(key, value):
    return tag(3, key, struct.pack('<i', value))

def str_tag(key, value):
    return tag(8, key, name(value))

def compound(key, contents):
    return tag(10, key, contents + b'\0')

def list_tag(key, kind, items):
    return tag(9, key, bytes([kind]) + struct.pack('<i', len(items)) + b''.join(items))

palette = sorted(set(BLOCKS.values()) | {'minecraft:air'})
indices = {value: index for index, value in enumerate(palette)}
primary = [struct.pack('<i', indices[BLOCKS.get((x, y, z), 'minecraft:air')])
           for x in range(SIZE[0]) for y in range(SIZE[1]) for z in range(SIZE[2])]
secondary = [struct.pack('<i', -1)] * len(primary)
palette_tags = [str_tag('name', block) + compound('states', b'') + int_tag('version', 18168865) + b'\0' for block in palette]
structure = (
    list_tag('block_indices', 9, [bytes([3]) + struct.pack('<i', len(primary)) + b''.join(primary),
                                   bytes([3]) + struct.pack('<i', len(secondary)) + b''.join(secondary)])
    + list_tag('entities', 10, [])
    + compound('palette', compound('default', list_tag('block_palette', 10, palette_tags)
                            + compound('block_position_data', b'')))
)
root = int_tag('format_version', 1) + list_tag('size', 3, [struct.pack('<i', n) for n in SIZE])
root += compound('structure', structure) + list_tag('structure_world_origin', 3, [struct.pack('<i', 0)] * 3)
target = Path(__file__).parent / 'behavior_pack' / 'structures' / 'olympus' / 'hall_of_eight.mcstructure'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(b'\x0a\x00\x00' + root + b'\x00')
print(f'{target}: {SIZE}, {len(palette)} block types, {len(BLOCKS)} placed blocks')
