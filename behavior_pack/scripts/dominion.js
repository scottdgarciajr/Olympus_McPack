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
function safeFluid(block, dimension) {
  const p = block.location;
  // A single source in a stone basin cannot spread sideways or downward.
  const neighbors = [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,-1,0]];
  try {
    if (block.permutation.getState('liquid_depth') !== 0) return false;
    if (!neighbors.every(([x,y,z]) => {
      const n = dimension.getBlock({x:p.x+x,y:p.y+y,z:p.z+z});
      return n && ['minecraft:stone','minecraft:deepslate','minecraft:tuff'].includes(n.typeId);
    })) return false;
    const above = dimension.getBlock({x:p.x,y:p.y+1,z:p.z});
    return !!above?.isAir;
  } catch { return false; }
}
function candidate(block,mode,dimension) {
  if (!block) return;
  const type = block.typeId;
  if (mode === 'underworld' && UNDER.has(type)) return 'minecraft:netherrack';
  if (mode === 'overworld' && OVER.has(type)) return dimension.id === 'minecraft:nether' ? 'minecraft:dirt' : 'minecraft:grass_block';
  if (dimension.id !== 'minecraft:overworld') return;
  if (mode === 'underworld' && type === 'minecraft:water' && safeFluid(block,dimension)) return 'minecraft:lava';
  if (mode === 'overworld' && type === 'minecraft:lava' && safeFluid(block,dimension)) return 'minecraft:water';
}
function plan(player,mode) {
  const dimension = player.dimension, center = player.location;
  const radius = CONFIG.dominion.radius, records = [];
  const y = Math.floor(center.y)-1;
  for (let dx=-radius; dx<=radius; dx++) for (let dz=-radius; dz<=radius; dz++) {
    if (dx*dx+dz*dz>radius*radius || records.length>=CONFIG.dominion.maxBlocks) continue;
    const location = {x:Math.floor(center.x)+dx,y,z:Math.floor(center.z)+dz};
    let block;
    try { block = dimension.getBlock(location); } catch { continue; }
    let target = candidate(block,mode,dimension);
    if (!target && dimension.id === 'minecraft:overworld') {
      const waterLevel = {x:location.x,y:location.y+1,z:location.z};
      try {
        const fluid = dimension.getBlock(waterLevel);
        target = candidate(fluid,mode,dimension);
        if (target) { block = fluid; location.y++; }
      } catch {}
    }
    if (!target) continue;
    records.push({dimension:dimension.id,location,from:block.typeId,states:block.permutation.getAllStates(),to:target});
  }
  return records;
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
export function activateDominion(player,mode) {
  const old = read();
  if (old.corrupt || old.active || old.records?.length) return false;
  if (!['underworld','overworld'].includes(mode) || !['minecraft:overworld','minecraft:nether'].includes(player.dimension.id)) return false;
  if (mode === 'underworld' && player.dimension.id !== 'minecraft:overworld') return false;
  const records = plan(player,mode);
  if (!records.length) return false;
  const s = {active:true,mode,ownerId:player.id,center:{...player.location},dimension:player.dimension.id,
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
  if (!changed) { dismissDominion(); return false; }
  try { player.dimension.playSound(mode === 'underworld' ? 'mob.ghast.fireball' : 'random.levelup',player.location); } catch {}
  for (const p of world.getAllPlayers()) if (p.dimension.id === player.dimension.id && Math.hypot(p.location.x-s.center.x,p.location.z-s.center.z) < radiusOf())
    p.onScreenDisplay.setActionBar(mode === 'underworld' ? '§4Underworld Dominion surrounds you' : '§aOverworld Dominion surrounds you');
  return true;
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
