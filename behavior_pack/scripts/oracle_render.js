import { ORACLE_TYPES } from './oracle_types.js';
const PROPERTY = 'olympus:oracle_visible';

export function updateOracleEdges(player, vision, targets, chests) {
  vision.outlined ||= new Map();
  vision.chestMarkers ||= new Map();
  const current = new Set();
  for (const target of targets) {
    if (!ORACLE_TYPES.has(target.typeId)) continue;
    current.add(target.id);
    if (vision.outlined.has(target.id)) continue;
    player.setPropertyOverrideForEntity(target, PROPERTY, true);
    vision.outlined.set(target.id, target);
  }
  for (const [id, target] of vision.outlined) if (!current.has(id)) {
    try { player.removePropertyOverrideForEntity(target, PROPERTY); } catch {}
    vision.outlined.delete(id);
  }
  const present = new Set();
  for (const at of chests) {
    const key = `${at.x},${at.y},${at.z}`;
    present.add(key);
    if (vision.chestMarkers.has(key)) continue;
    const marker = player.dimension.spawnEntity('olympus:oracle_chest', at);
    try { player.setPropertyOverrideForEntity(marker, PROPERTY, true); }
    catch (error) { marker.remove(); throw error; }
    vision.chestMarkers.set(key, marker);
  }
  for (const [key, marker] of vision.chestMarkers) if (!present.has(key)) {
    try { marker.remove(); } catch {}
    vision.chestMarkers.delete(key);
  }
}

export function clearOracleEdges(player, vision) {
  for (const target of vision.outlined?.values() || []) {
    try { player?.removePropertyOverrideForEntity(target, PROPERTY); } catch {}
  }
  for (const marker of vision.chestMarkers?.values() || []) { try { marker.remove(); } catch {} }
  vision.outlined?.clear();
  vision.chestMarkers?.clear();
}
