import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kratosStrike, kratosKill, kratosDeath, kratosStatus } from '../behavior_pack/scripts/kratos.js';

function player() {
  const props=new Map(), effects=[];
  return {props,effects,messages:[],getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),
    getEffect:()=>undefined,addEffect:(...args)=>effects.push(args),sendMessage(message){this.messages.push(message);}};
}
test('Kratos gets an eight-second theft and one lasting copy cleared on death',()=>{
  const k=player();
  kratosStrike(k,{name:'Zeus'},'zeus');
  assert.ok(k.props.get('olympus:kratosUntil')>=Date.now()+7900);
  assert.match(kratosStatus(k),/temporary: .*\(8s\)/);
  kratosKill(k,'hades');
  const first=JSON.parse(k.props.get('olympus:kratosLasting'));
  kratosKill(k,'ares');
  const second=JSON.parse(k.props.get('olympus:kratosLasting'));
  assert.ok(first && second);
  assert.ok(k.effects.length>=3);
  kratosDeath(k);
  assert.equal(k.props.get('olympus:kratosLasting'),undefined);
  assert.equal(k.props.get('olympus:kratosTemp'),undefined);
});
