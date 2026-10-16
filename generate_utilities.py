"""Generate the utility catalog, custom item icons/definitions and cart assets."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
ROOT=Path(__file__).parent
BP=ROOT/'behavior_pack'; RP=ROOT/'resource_pack'
catalog=json.loads((ROOT/'forge_utilities.json').read_text(encoding='utf-8'))
def write(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')
(BP/'scripts'/'forge_catalog.js').write_text('// Generated from forge_utilities.json.\nexport const UTILITY_RECIPES='+json.dumps(catalog,ensure_ascii=False,indent=2)+';\nexport const UTILITY_COSTS=Object.fromEntries(UTILITY_RECIPES.map(r=>[r.id,r.cost]));\n',encoding='utf-8')
texture_path=RP/'textures'/'item_texture.json'
textures=json.loads(texture_path.read_text(encoding='utf-8'))
for index,recipe in enumerate(catalog):
    identifier=recipe['output']; icon='olympus_'+identifier.split(':')[1]
    components={'minecraft:display_name':{'value':recipe['name']},'minecraft:icon':icon,'minecraft:max_stack_size':1,'minecraft:glint':True}
    if recipe['durability']:
        components['minecraft:durability']={'max_durability':recipe['durability']}
        components['minecraft:repairable']={'repair_items':[{'items':['minecraft:iron_ingot'],'repair_amount':32}]}
    if recipe['id']=='lantern_helmet':
        components.update({'minecraft:wearable':{'slot':'slot.armor.head','protection':2},'minecraft:enchantable':{'slot':'armor_head','value':10}})
    else:
        components.update({'minecraft:interact_button':'Use Utility','olympus:forge_item_use':{}})
    write(BP/'items'/f"{identifier.split(':')[1]}.json",{'format_version':'1.21.90','minecraft:item':{'description':{'identifier':identifier,'menu_category':{'category':'equipment'}},'components':components}})
    image=Image.new('RGBA',(16,16),(0,0,0,0));draw=ImageDraw.Draw(image)
    color=recipe['color'];edge='#493c32';bright='#ffe6a2'
    draw.rectangle((6,7,9,14),fill=edge);draw.rectangle((7,7,8,13),fill=color)
    if recipe['id']=='lantern_helmet':
        draw.rectangle((2,4,13,10),fill=edge);draw.rectangle((3,3,12,8),fill=color);draw.rectangle((7,1,9,5),fill=bright);draw.rectangle((3,9,5,12),fill=color);draw.rectangle((10,9,12,12),fill=color)
    elif recipe['id']=='trackless_cart':
        draw.polygon([(1,5),(14,5),(12,11),(3,11)],fill=edge);draw.rectangle((3,6,12,9),fill=color)
        for x in [4,10]:draw.rectangle((x,12,x+2,14),fill='#b8b9bd')
    elif recipe['id'] in ['wayfinder','masons_level','thermal_lens']:
        draw.ellipse((2,1,13,12),fill=edge);draw.ellipse((3,2,12,11),fill=color);draw.line((8,3,6,9),fill=bright,width=2)
    elif recipe['id']=='trail_spool':
        draw.rectangle((3,2,12,12),fill=edge)
        for y in range(3,12,2):draw.line((4,y,11,y),fill=color,width=1)
        draw.line((11,12,14,14),fill=bright,width=1)
    else:
        draw.polygon([(2,2),(11,1),(14,4),(10,7),(5,6)],fill=edge)
        draw.line((3,3,10,2,12,4,9,5),fill=color,width=2);draw.point((5+index%5,4),fill=bright)
    target=RP/'textures'/'items'/'forge'/f"{recipe['id']}.png";target.parent.mkdir(parents=True,exist_ok=True);image.save(target)
    textures['texture_data'][icon]={'textures':f"textures/items/forge/{recipe['id']}"}
write(texture_path,textures)
helmet=Image.new('RGBA',(64,32),'#ad8052');ImageDraw.Draw(helmet).rectangle((6,5,9,10),fill='#ffdb70')
helmet.save(RP/'textures'/'items'/'forge'/'lantern_worn.png')
write(RP/'models'/'entity'/'lantern_helmet.geo.json',{'format_version':'1.16.0','minecraft:geometry':[{'description':{'identifier':'geometry.olympus.lantern_helmet','texture_width':64,'texture_height':32},'bones':[{'name':'helmet','pivot':[0,0,0],'binding':'q.item_slot_to_bone_name(context.item_slot)','cubes':[{'origin':[-4.5,24,-4.5],'size':[9,8,9],'inflate':0.05,'uv':[0,0]},{'origin':[-1,28,-6],'size':[2,3,2],'uv':[0,0]}]}]}]})
write(RP/'attachables'/'lantern_helmet.player.json',{'format_version':'1.19.80','minecraft:attachable':{'description':{'identifier':'olympus:forge_lantern_helmet','materials':{'default':'armor','enchanted':'armor_enchanted'},'textures':{'default':'textures/items/forge/lantern_worn','enchanted':'textures/misc/enchanted_item_glint'},'geometry':{'default':'geometry.olympus.lantern_helmet'},'scripts':{'parent_setup':'variable.helmet_layer_visible = 0.0;'},'render_controllers':['controller.render.armor']}}})
write(BP/'entities'/'trackless_cart.json',{'format_version':'1.21.90','minecraft:entity':{'description':{'identifier':'olympus:trackless_cart','is_spawnable':False,'is_summonable':True},'components':{
    'minecraft:type_family':{'family':['olympus_cart','inanimate']},'minecraft:health':{'value':20,'max':20},'minecraft:collision_box':{'width':0.98,'height':0.7},'minecraft:physics':{'has_gravity':True},
    'minecraft:pushable':{'is_pushable':True,'is_pushable_by_piston':True},'minecraft:movement':{'value':0.32},'minecraft:movement.basic':{},
    'minecraft:variable_max_auto_step':{'base_value':1.01,'controlled_value':1.01,'jump_prevented_value':0.5625},
    'minecraft:rideable':{'seat_count':1,'family_types':['player'],'pull_in_entities':False,'interact_text':'Ride Clockwork Cart','seats':[{'position':[0,0.1,0]}]},
    'minecraft:nameable':{},'minecraft:loot':{'table':'loot_tables/trackless_cart.json'}
}}})
write(BP/'loot_tables'/'trackless_cart.json',{'pools':[{'rolls':1,'entries':[{'type':'item','name':'olympus:forge_trackless_cart','weight':1}]}]})
write(RP/'entity'/'trackless_cart.entity.json',{'format_version':'1.10.0','minecraft:client_entity':{'description':{
    'identifier':'olympus:trackless_cart','materials':{'default':'minecart'},'textures':{'default':'textures/entity/minecart'},'geometry':{'default':'geometry.minecart'},'render_controllers':['controller.render.minecart']
}}})
print(f'Generated {len(catalog)} utility creations and trackless cart assets.')

write(BP/'blocks'/'forge_lantern_light.json',{'format_version':'1.21.120','minecraft:block':{'description':{'identifier':'olympus:forge_lantern_light'},'components':{'minecraft:geometry':'minecraft:geometry.full_block','minecraft:material_instances':{'*':{'texture':'olympus_clutch_invisible','render_method':'alpha_blend','ambient_occlusion':False,'face_dimming':False}},'minecraft:collision_box':False,'minecraft:selection_box':False,'minecraft:light_dampening':0,'minecraft:light_emission':12,'minecraft:destructible_by_mining':False,'minecraft:destructible_by_explosion':False}}})
