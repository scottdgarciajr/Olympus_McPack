import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cooldownRemaining, abilityNeedsCooldown, claimRejection, aresStrengthAmplifier, aresResistanceAmplifier, movementDirection, nextMadnessStacks, dionysusBlindnessChance, dionysusBuffAmplifier, divineOreDrop, stockMissingRelics } from '../behavior_pack/scripts/rules.js';
import { CONFIG } from '../behavior_pack/scripts/config.js';

test('new ability cooldowns and damage caps stay within the requested balance', () => {
  assert.deepEqual([CONFIG.cooldownSeconds.apolloSolarFlare,CONFIG.cooldownSeconds.apolloOracle,CONFIG.cooldownSeconds.hadesHellfire],[45,120,15]);
  assert.equal(CONFIG.solarFlare.areaDamage,4);
  assert.equal(CONFIG.hellfire.damage,6);
  assert.equal(CONFIG.hermesLeapAmplifier,1);
});

test('cooldowns expire and stay independent by stored expiry', () => {
  const now = 1_000_000;
  assert.equal(cooldownRemaining(now + 300_000, now), 300_000);
  assert.equal(cooldownRemaining(now + 180_000, now), 180_000);
  assert.equal(cooldownRemaining(now - 1, now), 0);
});

test('Zeus flight bypasses cooldown in wet weather, while lightning has its own weather rule', () => {
  assert.equal(abilityNeedsCooldown('zeusLightning', true), true);
  assert.equal(abilityNeedsCooldown('zeusFlight', true), false);
  assert.equal(abilityNeedsCooldown('zeusLightning', false), true);
  assert.equal(abilityNeedsCooldown('zeusFlight', false), true);
  assert.equal(abilityNeedsCooldown('aresRage', true), true);
});

test('combinations have substantial configurable costs', () => {
  for (const cost of Object.values(CONFIG.combinations)) {
    assert.ok(cost.xp >= 24);
    assert.ok(cost.diamond >= 10);
    assert.ok(cost.emerald >= 12);
    assert.ok(cost.lapis_lazuli >= 20);
  }
});

test('role claiming works anywhere while enforcing exclusivity', () => {
  const claim = (role, owner, count) => claimRejection(role, owner, count, 8, false);
  assert.equal(claim('', '', 0), '');
  assert.equal(claim('', 'Scott', 1), 'god_taken');
  assert.equal(claim('zeus', '', 1), 'already_assigned');
  assert.equal(claim('', '', 8), 'full');
  assert.equal(claim('', '', 7), '');
  assert.equal(claimRejection('', 'Scott', 2, 8, true), '');
});

test('Ares rage boosts strength and resistance only while active', () => {
  assert.equal(aresStrengthAmplifier(10_000, 9_999), 4);
  assert.equal(aresStrengthAmplifier(10_000, 10_000), 1);
  assert.equal(aresStrengthAmplifier(undefined, 10_000), 1);
  assert.equal(aresResistanceAmplifier(10_000, 9_999), 2);
  assert.equal(aresResistanceAmplifier(10_000, 10_000), 1);
});

test('left and right movement match the input vector while facing cardinal directions', () => {
  const left = { x: 1, y: 0 }, right = { x: -1, y: 0 };
  assert.deepEqual(movementDirection(left, { x: 0, z: -1 }), { x: -1, z: 0 });
  assert.deepEqual(movementDirection(right, { x: 0, z: -1 }), { x: 1, z: 0 });
  assert.deepEqual(movementDirection(left, { x: 1, z: 0 }), { x: 0, z: -1 });
  assert.deepEqual(movementDirection(right, { x: 1, z: 0 }), { x: 0, z: 1 });
});

test('Dionysus madness builds to ten stacks and adds blindness risk', () => {
  assert.equal(nextMadnessStacks(0, 1000, 2000), 1);
  assert.equal(nextMadnessStacks(1, 1000, 26000), 2);
  assert.equal(nextMadnessStacks(4, 1000, 26000), 5);
  assert.equal(nextMadnessStacks(10, 1000, 26000), 10);
  assert.equal(nextMadnessStacks(3, 1000, 122000), 1);
  assert.equal(dionysusBlindnessChance(2), 0);
  assert.ok(dionysusBlindnessChance(8) > dionysusBlindnessChance(4));
  assert.equal(dionysusBlindnessChance(10), 0.65);
});

test('Dionysus keeps strong random buffs without stacking healing and defense to IV', () => {
  const caps=CONFIG.dionysusBuffAmplifierCaps;
  assert.equal(dionysusBuffAmplifier('regeneration',undefined,caps),1);
  assert.equal(dionysusBuffAmplifier('regeneration',1,caps),1);
  assert.equal(dionysusBuffAmplifier('resistance',1,caps),2);
  assert.equal(dionysusBuffAmplifier('resistance',2,caps),2);
  assert.equal(dionysusBuffAmplifier('strength',3,caps),3);
  assert.equal(CONFIG.dionysusRegenerationSeconds,60);
});

test('Divine Fortune bonus applies only to eligible ore drops', () => {
  assert.equal(divineOreDrop('minecraft:deepslate_diamond_ore'), 'minecraft:diamond');
  assert.equal(divineOreDrop('minecraft:iron_ore'), 'minecraft:raw_iron');
  assert.equal(divineOreDrop('minecraft:stone'), undefined);
});

test('summit chest stocks each relic, refills missing ones, and preserves other items', () => {
  const slots = Array(27).fill(undefined);
  const chest = {
    size: slots.length,
    getItem: slot => slots[slot],
    addItem: item => {
      const slot = slots.findIndex(value => !value);
      if (slot < 0) return item;
      slots[slot] = item;
      return undefined;
    }
  };
  const gods = ['hermes', 'zeus', 'poseidon', 'hades', 'ares', 'apollo', 'hephaestus', 'dionysus'];
  const createItem = typeId => ({ typeId });
  assert.equal(stockMissingRelics(chest, gods, createItem), true);
  assert.deepEqual(slots.slice(0, 8).map(item => item.typeId), gods.map(god => `olympus:${god}_relic`));
  slots[0] = { typeId: 'minecraft:diamond' };
  assert.equal(stockMissingRelics(chest, gods, createItem), true);
  assert.equal(slots[0].typeId, 'minecraft:diamond');
  assert.equal(slots.filter(item => item?.typeId === 'olympus:hermes_relic').length, 1);
  assert.equal(stockMissingRelics(chest, gods, createItem), true);
  assert.equal(slots.filter(Boolean).length, 9);
});
