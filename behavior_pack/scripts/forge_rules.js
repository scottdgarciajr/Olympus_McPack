export function forgeRequirements(recipe,cost) {
  const result={[recipe.ingredient]:1};
  for(const id of ['diamond','emerald','lapis_lazuli','netherite_ingot'])if(cost[id])result[`minecraft:${id}`]=(result[`minecraft:${id}`]||0)+cost[id];
  for(const [id,count] of Object.entries(cost.materials||{}))result[`minecraft:${id}`]=(result[`minecraft:${id}`]||0)+count;
  return result;
}
export const BUILDING_BLOCKS=new Set([
  'stone','cobblestone','cobbled_deepslate','deepslate_bricks','stone_bricks','bricks','quartz_block','smooth_quartz','smooth_stone','sandstone','red_sandstone','glass','dirt','grass_block',
  ...['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','pale_oak','bamboo','crimson','warped'].map(id=>`${id}_planks`),
  ...['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'].map(id=>`${id}_concrete`)
].map(id=>`minecraft:${id}`));
export const CROPS={
  'minecraft:wheat_seeds':{block:'minecraft:wheat',max:7},
  'minecraft:carrot':{block:'minecraft:carrots',max:7},
  'minecraft:potato':{block:'minecraft:potatoes',max:7},
  'minecraft:beetroot_seeds':{block:'minecraft:beetroot',max:7}
};
export function salvageNuggets(item) {
  const iron={iron_shovel:1,iron_axe:3,iron_pickaxe:3,iron_hoe:2,iron_sword:2,iron_helmet:5,iron_chestplate:8,iron_leggings:7,iron_boots:4};
  const units=iron[item?.typeId?.replace('minecraft:','')];
  if(!units || item.getDynamicProperty('olympus:bound_owner') || item.getDynamicProperty('olympus:combination') || item.lockMode==='inventory')return 0;
  if(item.getComponent('minecraft:enchantable')?.getEnchantments()?.length)return 0;
  const durability=item.getComponent('minecraft:durability');if(!durability)return 0;
  return Math.max(0,Math.floor(units*9*0.5*(1-durability.damage/durability.maxDurability)));
}
export function cartDriveVelocity(input,view,fuel,inWater,onGround) {
  if(fuel<=0 || inWater || !onGround)return undefined;
  const magnitude=Math.hypot(input.x,input.y),amount=Math.min(1,magnitude);if(amount<0.15)return undefined;
  const horizontal=Math.hypot(view.x,view.z)||1,fx=view.x/horizontal,fz=view.z/horizontal;
  return {x:(fx*input.y+fz*input.x)/Math.max(magnitude,1)*0.32,z:(fz*input.y-fx*input.x)/Math.max(magnitude,1)*0.32};
}
