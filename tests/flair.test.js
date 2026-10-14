import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FLAIR, flairPoints } from '../behavior_pack/scripts/flair.js';

test('every god has a distinct, bounded cosmetic signature', () => {
  const gods = ['hermes', 'zeus', 'poseidon', 'hades', 'ares', 'apollo', 'hephaestus', 'dionysus', 'kratos'];
  assert.deepEqual(Object.keys(FLAIR), gods);
  const shapes = new Set();
  for (const god of gods) {
    const points = flairPoints(god);
    assert.ok(points.length >= 20 && points.length <= 80, `${god} point count`);
    assert.ok(points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z) && Math.abs(point.x) <= 1.5 && Math.abs(point.y) <= 1.2 && Math.abs(point.z) <= 0.7), `${god} bounded coordinates`);
    assert.ok(FLAIR[god].color.every(channel => channel >= 0 && channel <= 1), `${god} valid color`);
    shapes.add(JSON.stringify(points));
  }
  assert.equal(shapes.size, gods.length);
});
