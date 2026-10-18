export const ATHENA_XP_BONUS={hostile:2,animal:1,maximum:40,windowMs:60000};
const KEY='olympus:athena_wisdom_xp';
const hostile=new Set(['zombie','husk','drowned','zombie_villager','skeleton','stray','bogged','wither_skeleton','creeper','spider','cave_spider','enderman','endermite','silverfish','slime','magma_cube','blaze','ghast','phantom','witch','pillager','vindicator','evocation_illager','ravager','vex','piglin','piglin_brute','zombified_piglin','zombie_pigman','hoglin','zoglin','guardian','elder_guardian','shulker','breeze','warden','wither','ender_dragon'].map(id=>'minecraft:'+id));
const animals=new Set(['cow','pig','sheep','chicken','rabbit','cod','salmon','pufferfish','tropicalfish'].map(id=>'minecraft:'+id));

export function athenaKillExperience(player,victim,time=Date.now()) {
  const amount=hostile.has(victim?.typeId)?ATHENA_XP_BONUS.hostile:animals.has(victim?.typeId)?ATHENA_XP_BONUS.animal:0;
  if(!amount||!victim.id)return 0;
  const previous=player.getDynamicProperty(KEY);let entries;
  try{entries=JSON.parse(previous||'[]');}catch{entries=[];}
  if(!Array.isArray(entries))entries=[];
  entries=entries.filter(e=>Array.isArray(e)&&Number.isFinite(e[0])&&e[0]<=time&&time-e[0]<ATHENA_XP_BONUS.windowMs&&Number.isFinite(e[2])&&e[2]>0);
  if(entries.some(e=>e[1]===victim.id))return 0;
  const earned=entries.reduce((sum,e)=>sum+e[2],0),bonus=Math.min(amount,Math.max(0,ATHENA_XP_BONUS.maximum-earned));
  if(!bonus)return 0;
  // Persist the cap before granting XP. Failed native rewards restore the ledger.
  player.setDynamicProperty(KEY,JSON.stringify([...entries,[time,victim.id,bonus]]));
  try{player.addExperience(bonus);}catch(error){player.setDynamicProperty(KEY,previous);throw error;}
  player.onScreenDisplay?.setActionBar(`§bWisdom: +${bonus} bonus XP (${earned+bonus}/40 this minute)`);
  return bonus;
}

export function athenaKillFromEvent(event,role,time=Date.now()) {
  let killer=event.damageSource?.damagingEntity;
  if(killer?.typeId!=='minecraft:player')try{killer=event.damageSource?.damagingProjectile?.getComponent('minecraft:projectile')?.owner;}catch{}
  if(killer?.typeId!=='minecraft:player'||role(killer)!=='athena')return 0;
  return athenaKillExperience(killer,event.deadEntity,time);
}
