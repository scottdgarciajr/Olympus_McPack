import { world, BlockPermutation, MolangVariableMap } from '@minecraft/server';
import { CONFIG } from './config.js';

const KEY = 'olympus:dominion';
const UNDER = new Set(['minecraft:grass_block','minecraft:dirt','minecraft:coarse_dirt','minecraft:podzol']);
const OVER = new Set(['minecraft:netherrack']);
let firstTick = true;
let callback = () => {};
const now = () => Date.now();
function read() { try { return JSON.parse(world.getDynamicProperty(KEY) || '{}'); } catch { return { corrupt:true }; } }
function write(value) { world.setDynamicProperty(KEY,JSON.stringify(value)); }
function blockKey(dim,p) { return `${dim}:${p.x},${p.y},${p.z}`; }
export function configureDominion(fail) { callback = fail; }
export function dominionState() { return read(); }
export function inUnderworldDominion(player) {
  const s = read();
  if (!s.active || s.mode !== 'underworld' || s.until <= now() || player.dimension.id !== s.dimension) return false;
  const p = player.location, c = s.center;
  return Math.hypot(p.x-c.x,p.z-c.z) <= CONFIG.dominion.radius && Math.abs(p.y-c.y) <= 8;
}
export function temporaryBlock(dim,p) {
  const s = read();
  return !!s.records?.some(r => {
    if (r.dimension !== dim) return false;
    const d = Math.abs(r.location.x-p.x)+Math.abs(r.location.y-p.y)+Math.abs(r.location.z-p.z);
    return d === 0 || ((r.to === 'minecraft:water' || r.to === 'minecraft:lava') && d === 1);
  });
}
function candidate(block,mode,dimension) {
  if (!block) return;
  const type = block.typeId;
  if (mode === 'underworld' && UNDER.has(type)) return 'minecraft:netherrack';
  if (mode === 'overworld' && OVER.has(type)) return dimension.id === 'minecraft:nether' ? 'minecraft:dirt' : 'minecraft:grass_block';
  if (dimension.id !== 'minecraft:overworld') return;
  if (mode === 'underworld' && type === 'minecraft:water') return 'minecraft:lava';
  if (mode === 'overworld' && type === 'minecraft:lava') return 'minecraft:water';
}
function plan(player,mode) {
  const dimension = player.dimension, center = player.location;
  const radius = CONFIG.dominion.radius, fluids = [], terrain=[];
  const baseY=Math.floor(center.y);
  for (let dx=-radius; dx<=radius; dx++) for (let dz=-radius; dz<=radius; dz++) {
    if (dx*dx+dz*dz>radius*radius) continue;
    for (const dy of [0,-1,1,-2,2,-3,3]) {
      const location={x:Math.floor(center.x)+dx,y:baseY+dy,z:Math.floor(center.z)+dz};
      try {
        const block=dimension.getBlock(location), target=candidate(block,mode,dimension);
        if (!target) continue;
        const record={dimension:dimension.id,location,from:block.typeId,states:block.permutation.getAllStates(),to:target};
        if (block.typeId==='minecraft:water'||block.typeId==='minecraft:lava') fluids.push(record);
        else if (dy===-1||dy===-2||dy===0) terrain.push(record);
      } catch {}
    }
  }
  // Water and lava have priority so a full land transformation cannot starve them.
  return [...fluids,...terrain].slice(0,CONFIG.dominion.maxBlocks);
}
function restore(s) {
  const remaining = [];
  for (const r of s.records || []) {
    try {
      const block = world.getDimension(r.dimension).getBlock(r.location);
      if (!block) { remaining.push(r); continue; }
      // A player or explosion changed the block. Preserve that change.
      if (block.typeId === r.to) block.setPermutation(BlockPermutation.resolve(r.from,r.states));
    } catch (e) { remaining.push(r); callback(e); }
  }
  s.records = remaining;
  write(s);
  return remaining.length === 0;
}
export function dismissDominion() {
  const s = read();
  if (!s.active && !s.records?.length) return;
  s.active = false;
  write(s);
  restore(s);
}
export function activateDominion(player,mode,serial) {
  const old = read();
  if (old.corrupt || old.active || old.records?.length) return {ok:false,reason:'Another Dominion is active or still restoring.'};
  if (!['underworld','overworld'].includes(mode) || !['minecraft:overworld','minecraft:nether'].includes(player.dimension.id)) return {ok:false,reason:'Dominion is unavailable in this dimension.'};
  if (mode === 'underworld' && player.dimension.id !== 'minecraft:overworld') return {ok:false,reason:'Underworld Dominion requires the Overworld.'};
  const records = plan(player,mode);
  if (!records.length) return {ok:false,reason:'No convertible terrain or fluid is within 3 blocks of your height. Move closer to water, lava, grass, dirt, or netherrack.'};
  const s = {active:true,mode,ownerId:player.id,serial,center:{...player.location},dimension:player.dimension.id,
    until:now()+CONFIG.dominion.durationSeconds*1000,records};
  firstTick = false;
  // Write-ahead restoration record survives interruption during block edits.
  write(s);
  let changed = 0;
  for (const r of records) {
    try {
      const block = world.getDimension(r.dimension).getBlock(r.location);
      if (block?.typeId === r.from) { block.setType(r.to); changed++; }
    } catch (e) { callback(e); }
  }
  if (!changed) { dismissDominion(); return {ok:false,reason:'Nearby blocks could not be converted.'}; }
  try { player.dimension.playSound(mode === 'underworld' ? 'mob.ghast.fireball' : 'random.levelup',player.location); } catch {}
  for (const p of world.getAllPlayers()) if (p.dimension.id === player.dimension.id && Math.hypot(p.location.x-s.center.x,p.location.z-s.center.z) < radiusOf())
    p.onScreenDisplay.setActionBar(mode === 'underworld' ? '§4Underworld Dominion surrounds you' : '§aOverworld Dominion surrounds you');
  return {ok:true,changed};
}
function radiusOf() { return CONFIG.dominion.radius + 8; }
export function dominionTick(ownerId,ownerEquipped) {
  const s = read();
  if (s.corrupt) return;
  if (firstTick) { firstTick = false; if (s.active) { dismissDominion(); return; } }
  if (s.active && (s.until <= now() || s.ownerId !== ownerId || !ownerEquipped)) { dismissDominion(); return; }
  if (!s.active && s.records?.length) restore(s);
}
export function dominionFlair() {
  const s = read();
  if (!s.active || s.until <= now()) return;
  const dimension = world.getDimension(s.dimension);
  if (!dimension.getPlayers().length) return;
  const color = new MolangVariableMap();
  color.setColorRGB('variable.color',s.mode === 'underworld' ? {red:1,green:0.18,blue:0.04} : {red:0.2,green:0.9,blue:0.45});
  for (let i=0;i<8;i++) {
    const a=i*Math.PI/4, r=CONFIG.dominion.radius;
    try { dimension.spawnParticle('minecraft:colored_flame_particle',{x:s.center.x+Math.cos(a)*r,y:s.center.y+0.3,z:s.center.z+Math.sin(a)*r},color); } catch {}
  }
}
