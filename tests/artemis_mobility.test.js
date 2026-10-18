import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artemisDoubleJump,artemisInvisibility,forgetArtemis,artemisSprint,artemisMobilityAvailable} from '../behavior_pack/scripts/artemis_mobility.js';
import {CONFIG} from '../behavior_pack/scripts/config.js';

function player() {
  let effect;const calls=[];
  const p={id:'invisible-test',calls,getEffect:()=>effect,addEffect(id,duration,options){calls.push(['add',id,duration]);effect={duration,...options};},removeEffect(id){calls.push(['remove',id]);effect=undefined;},external(duration){effect={duration,amplifier:0};}};
  forgetArtemis(p.id);return p;
}
test('invisibility toggles on/off and refreshes only the short effect it owns',()=>{
  const p=player();artemisInvisibility(p,true,0,true);assert.equal(p.getEffect().duration,60);
  p.getEffect().duration=10;artemisInvisibility(p,true,50,true);assert.equal(p.getEffect().duration,60);
  artemisInvisibility(p,false,51,true);assert.equal(p.getEffect(),undefined);
  assert.deepEqual(p.calls.map(([kind])=>kind),['add','add','remove']);
});
test('external invisibility potions are neither shortened nor removed by Artemis toggle',()=>{
  const p=player();p.external(1200);artemisInvisibility(p,true,1,true);artemisInvisibility(p,false,2,true);
  assert.equal(p.getEffect().duration,1200);assert.equal(p.calls.length,0);
  p.external(10);artemisInvisibility(p,true,3,true);artemisInvisibility(p,false,4,true);assert.equal(p.getEffect().duration,10);
  p.external(undefined);forgetArtemis(p.id);
});
test('a potion replacing the managed effect survives turning invisibility off',()=>{
  const p=player();artemisInvisibility(p,true,1,true);p.external(1000);artemisInvisibility(p,false,2,true);assert.equal(p.getEffect().duration,1000);
});

test('sprint targets 1.22 with horizontal thrust and leaves other god speeds unchanged',()=>{
  assert.equal(CONFIG.artemisSprintSpeed,1.22);assert.equal(CONFIG.hermesSprintSpeed,1.3);
  assert.equal(CONFIG.poseidonSwimSpeed,1.08);assert.equal(CONFIG.apolloSunFlightSpeed,1.2);
  const v={x:0,y:0.4,z:0},impulses=[];
  const p={isSprinting:true,isOnGround:true,inputInfo:{getMovementVector:()=>({x:0,y:1})},getViewDirection:()=>({x:1,y:0,z:0}),getVelocity:()=>v,applyImpulse:i=>{v.x+=i.x;v.z+=i.z;impulses.push(i);}};
  for(let t=0;t<10;t++)artemisSprint(p,CONFIG.artemisSprintSpeed,true);
  assert.ok(Math.abs(v.x-1.22)<0.0001);assert.equal(v.y,0.4);assert.ok(impulses.every(i=>i.y===0));
  for(const flag of ['isSneaking','isInWater','isGliding','isFlying']) {p[flag]=true;assert.equal(artemisSprint(p,1.22,true),false);p[flag]=false;}
  p.isOnGround=false;assert.equal(artemisSprint(p,1.22,true),false);p.isOnGround=true;p.isSprinting=false;assert.equal(artemisSprint(p,1.22,true),false);
  p.isSprinting=true;v.x=2;assert.equal(artemisSprint(p,1.22,true),false,'do not brake external launches');
});


test('mobility is available at night, in daytime darkness, and in other dimensions; bright Overworld day disables it',()=>{
 let light=15;const p=player();p.dimension={id:'minecraft:overworld',getLightLevel:()=>light};p.getHeadLocation=()=>({x:0,y:1,z:0});
 assert.equal(artemisMobilityAvailable(p,true),false);assert.equal(artemisMobilityAvailable(p,false),true);
 light=3;assert.equal(artemisMobilityAvailable(p,true),true);light=4;assert.equal(artemisMobilityAvailable(p,true),false);
 for(const dimension of ['minecraft:nether','minecraft:the_end']) {p.dimension.id=dimension;assert.equal(artemisMobilityAvailable(p,true),true);}
 artemisInvisibility(p,true,0,true);assert.ok(p.getEffect());artemisInvisibility(p,true,1,false);assert.equal(p.getEffect(),undefined,'managed invisibility ends immediately outside allowed conditions');
 assert.equal(artemisSprint({get inputInfo(){throw Error('ineligible sprint must not read controls');}},1.22,false),false);
});

function jumper(){const impulses=[];const p={id:'jump-test',dimension:{id:'minecraft:overworld'},isOnGround:true,getVelocity:()=>({x:1,y:-1,z:2}),applyImpulse:v=>impulses.push(v)};forgetArtemis(p.id);return {p,impulses,jump:(pressed,dark=true)=>artemisDoubleJump(p,pressed,dark)};}
test('darkness double jump needs a second press, allows one extra jump and resets on landing',()=>{
 const s=jumper();s.jump(false);s.jump(true);s.p.isOnGround=false;assert.equal(s.jump(true),false,'holding native jump is not an extra press');
 s.jump(false);assert.equal(s.jump(true),true);assert.deepEqual(s.impulses,[{x:0,y:1.55,z:0}]);s.jump(false);assert.equal(s.jump(true),false,'no third jump');
 s.p.isOnGround=true;s.jump(false);s.p.isOnGround=false;assert.equal(s.jump(true),true);assert.equal(s.impulses.length,2);
});
test('brightness blocks the extra jump; darkness becoming available midair still permits one deliberate press',()=>{
 const s=jumper();s.jump(false);s.p.isOnGround=false;assert.equal(s.jump(true,false),false);assert.equal(s.impulses.length,0);
 s.jump(false);assert.equal(s.jump(true,true),true);
});
test('water, climbing, flight, gliding, fresh airborne spawns and dimension changes cannot mint extra jumps',()=>{
 for(const flag of ['isInWater','isClimbing','isFlying','isGliding']) {const s=jumper();s.jump(false);s.p.isOnGround=false;s.p[flag]=true;assert.equal(s.jump(true),false);s.p[flag]=false;s.jump(false);assert.equal(s.jump(true),false);}
 const s=jumper();s.p.isOnGround=false;assert.equal(s.jump(true),false);s.jump(false);assert.equal(s.jump(true),false);
 s.p.isOnGround=true;s.jump(false);s.p.isOnGround=false;s.p.dimension.id='minecraft:nether';assert.equal(s.jump(true),false);
});
test('double jump preserves a faster upward launch and horizontal momentum',()=>{
 const s=jumper();s.jump(false);s.p.isOnGround=false;s.p.getVelocity=()=>({x:3,y:2,z:4});assert.equal(s.jump(true),true);assert.equal(s.impulses.length,0);
});
