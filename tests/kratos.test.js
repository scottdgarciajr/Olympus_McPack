import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kratosStrike, kratosKill, kratosTick, kratosDeath, kratosStatus } from '../behavior_pack/scripts/kratos.js';

function player() {
  const props=new Map(), effects=[];
  return {props,effects,messages:[],getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v),
    getEffect:()=>undefined,addEffect:(...args)=>effects.push(args),sendMessage(message){this.messages.push(message);}};
}
test('Kratos gains one uncapped lasting copy per god kill, including burdens, until death',()=>{
  const k=player(),random=Math.random;
  try {
    Math.random=()=>0;
    kratosStrike(k,{name:'Zeus'},'zeus');
    assert.ok(k.props.get('olympus:kratosUntil')>=Date.now()+7900);
    assert.match(kratosStatus(k),/temporary: .*(8s|7s)/);
    kratosKill(k,'hades');
    Math.random=()=>0.99;
    kratosKill(k,'hades');
    for (let i=0;i<12;i++) kratosKill(k,'ares');
    const entries=JSON.parse(k.props.get('olympus:kratosLasting')).entries;
    assert.equal(entries.reduce((sum,[,count])=>sum+count,0),14);
    assert.equal(entries[0][0][0],'Underworld ward');
    assert.equal(entries[1][0][0],'Sun burden');
    assert.equal(entries.find(([copy])=>copy[1]==='slowness')[1],12);
    k.effects.length=0;
    kratosTick(k);
    assert.equal(k.effects.filter(([id])=>id==='slowness').length,1);
    assert.match(kratosStatus(k),/Lasting \(14\)/);
    kratosDeath(k);
    assert.equal(k.props.get('olympus:kratosLasting'),undefined);
    assert.equal(k.props.get('olympus:kratosTemp'),undefined);
  } finally { Math.random=random; }
});

test('Kratos migrates the previous single lasting copy on the next kill',()=>{
  const k=player();
  k.setDynamicProperty('olympus:kratosLasting',JSON.stringify(['Old blessing','speed',1]));
  kratosKill(k,'hades');
  const entries=JSON.parse(k.props.get('olympus:kratosLasting')).entries;
  assert.equal(entries.length,2);
  assert.equal(entries[0][0][0],'Old blessing');
});
