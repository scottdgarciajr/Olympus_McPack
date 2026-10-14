import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findMadnessLanding } from '../behavior_pack/scripts/teleport.js';

const origin={x:0,y:64,z:0};
function dimension(floorId='minecraft:stone',feetAir=true,headAir=true) {
  return {
    getBlockFromRay:()=>({face:'Up',block:{typeId:floorId,isAir:false,isLiquid:false,location:{x:8,y:63,z:0}}}),
    getBlock:({y})=>({isAir:y===64?feetAir:headAir})
  };
}

test('Madness finds a solid safe floor using the supported raycast API', () => {
  assert.deepEqual(findMadnessLanding(dimension(),origin,8,16,()=>0),{x:8.5,y:64,z:0.5});
});

test('Madness refuses blocked or hazardous landings', () => {
  assert.equal(findMadnessLanding(dimension('minecraft:stone',false),origin,8,16,()=>0),undefined);
  assert.equal(findMadnessLanding(dimension('minecraft:magma'),origin,8,16,()=>0),undefined);
  assert.equal(findMadnessLanding(dimension('minecraft:oak_fence'),origin,8,16,()=>0),undefined);
});
