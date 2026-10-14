"""Generate a lower chamber that extends the existing Hall of Eight Gods."""
from pathlib import Path
import struct

SIZE=(13,8,13)
BLOCKS={}
def put(x,y,z,name):
    if 0<=x<13 and 0<=y<8 and 0<=z<13: BLOCKS[x,y,z]='minecraft:'+name
def box(x1,y1,z1,x2,y2,z2,name):
    for x in range(x1,x2+1):
        for y in range(y1,y2+1):
            for z in range(z1,z2+1): put(x,y,z,name)
# Reuse the existing Hall's rectangular colonnade and plinth grammar in a
# darker material palette. The floor and roof connect to the Hall above.
box(0,0,0,12,0,12,'polished_deepslate')
box(0,7,0,12,7,12,'deepslate_bricks')
for y in range(1,7):
    for n in range(13):
        for x,z in ((n,0),(n,12),(0,n),(12,n)): put(x,y,z,'polished_blackstone_bricks')
for x in (1,11):
    for z in (1,11):
        box(x,1,z,x,6,z,'chiseled_deepslate')
for x in range(2,11):
    put(x,0,2,'sculk'); put(x,0,10,'sculk')
for z in range(3,10):
    put(2,0,z,'sculk'); put(10,0,z,'sculk')
for x,z in ((3,3),(9,3),(3,9),(9,9)):
    put(x,1,z,'soul_lantern')
box(5,1,3,7,1,5,'crying_obsidian')
put(6,2,4,'netherite_block')  # Kratos altar, global Hall offset (16,-5,23)
# Scaffolding shaft at global Hall offset (16,*,27), visible from upstairs.
for y in range(1,8): put(6,y,8,'scaffolding')

def name(v):
    b=v.encode('utf-8'); return struct.pack('<H',len(b))+b
def tag(t,k,p): return bytes([t])+name(k)+p
def integer(k,v): return tag(3,k,struct.pack('<i',v))
def string(k,v): return tag(8,k,name(v))
def compound(k,b): return tag(10,k,b+b'\0')
def list_tag(k,t,items): return tag(9,k,bytes([t])+struct.pack('<i',len(items))+b''.join(items))
palette=sorted(set(BLOCKS.values())|{'minecraft:air'})
lookup={v:i for i,v in enumerate(palette)}
primary=[struct.pack('<i',lookup[BLOCKS.get((x,y,z),'minecraft:air')]) for x in range(13) for y in range(8) for z in range(13)]
secondary=[struct.pack('<i',-1)]*len(primary)
entries=[string('name',b)+compound('states',b'')+integer('version',18168865)+b'\0' for b in palette]
structure=(list_tag('block_indices',9,[bytes([3])+struct.pack('<i',len(primary))+b''.join(primary),bytes([3])+struct.pack('<i',len(secondary))+b''.join(secondary)])
    +list_tag('entities',10,[])+compound('palette',compound('default',list_tag('block_palette',10,entries)+compound('block_position_data',b''))))
root=integer('format_version',1)+list_tag('size',3,[struct.pack('<i',n) for n in SIZE])
root+=compound('structure',structure)+list_tag('structure_world_origin',3,[struct.pack('<i',0)]*3)
path=Path(__file__).parent/'behavior_pack'/'structures'/'olympus'/'forbidden_vault.mcstructure'
path.write_bytes(b'\x0a\x00\x00'+root+b'\x00')
print(path)
