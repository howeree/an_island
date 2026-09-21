/* Regression tests for the actual expedition rules. */
global.window = global;
require('../js/data.js'); require('../js/ecosystem.js');
const assert = require('node:assert/strict'), E = Ecosystem;
function fresh() { return E.createInitialState(123); }
function give(s, id) { const c = E.instance(s, id); s.deck.hand.push(c); return c.uid; }
{
  const s = fresh();
  E.play(s, s.deck.hand.find(c => c.cardId === 'rain').uid);
  assert.equal(E.previewCard(s, E.getCard('flowers',s)).block, 5);
  E.play(s, s.deck.hand.find(c => c.cardId === 'flowers').uid);
  E.play(s, s.deck.hand.find(c => c.cardId === 'seed').uid);
  assert.equal(s.combos, 2); assert.equal(s.block, 16); assert.equal(s.research, 5);
  const expected = E.defense(s).damage;
  E.endDay(s); assert.equal(s.day,2); assert.equal(s.history[0].damage,expected);
}
{
  const s = fresh(); s.seeds=0; s.energy=20;
  E.play(s,give(s,'meadow')); assert.equal(s.seeds,3); assert.equal(s.habitats.meadow,0);
  E.play(s,give(s,'meadow')); assert.equal(s.habitats.meadow,1);
  s.seeds=12;
  E.play(s,give(s,'forest')); E.play(s,give(s,'wetland'));
  assert.deepEqual(s.habitats,{water:1,meadow:1,forest:1});
  s.habitats.meadow=3;
  const before=s.block; E.play(s,give(s,'meadow')); assert(s.block>=before+8);
  assert.equal(s.habitats.meadow,3);
}
{
  const s=fresh(), keep=s.deck.hand[0].uid; s.retained=keep;
  E.endDay(s); assert(s.deck.hand.some(c=>c.uid===keep)); assert.equal(s.deck.hand.length,5); assert.equal(s.energy,4);
  const ids=s.deck.hand.map(c=>c.uid); E.swap(s); assert.equal(s.energy,3); assert.equal(s.swapped,true); assert.equal(E.swap(s),false);
  assert(new Set(Object.values(s.deck).flat().map(c=>c.uid)).size===10);
  assert.notDeepEqual(ids,s.deck.hand.map(c=>c.uid));
}
{
  const s=fresh(); s.deck.draw=[]; s.deck.discard=[]; s.deck.hand=[];
  const uid=give(s,'survey'); E.play(s,uid);
  assert.equal(s.deck.hand.length,0,'An already played card cannot recycle within one day');
  s.hp=3; const effort=give(s,'effort'); assert.equal(E.play(s,effort),false);
}
{
  const s=fresh(); s.day=5;
  E.endDay(s); assert.equal(s.rewardPending,true);
  assert.equal(E.endDay(s),false); assert.equal(E.play(s,s.deck.hand[0].uid),false);
  assert.equal(E.reward(s,'add','rescue',[]),false);
  assert(E.reward(s,'upgrade','rain')); assert.equal(E.getCard('rain',s).block,9);
  assert.equal(s.rewardPending,false);
}
{
  const s=fresh(), build=s.deck.hand.find(c=>c.cardId==='meadow');
  s.rewardPending=true;
  assert.equal(E.canRemove(s,build.uid),false);
  assert.equal(E.reward(s,'remove',build.uid),false,'Cannot remove the last unfinished construction card');
  s.habitats.meadow=2;assert(E.canRemove(s,build.uid));
  assert(E.reward(s,'remove',build.uid));
}
{
  const s=fresh(); s.day=30; s.block=100; s.habitats={water:2,forest:2,meadow:0}; s.research=24;
  E.endDay(s); assert.equal(s.status,'won');
  assert.equal(E.endDay(s),false);
  const missed=fresh(); missed.day=30; missed.block=100; E.endDay(missed); assert.equal(missed.status,'unfinished');
  const lost=fresh(); lost.hp=1; E.endDay(lost); assert.equal(lost.status,'lost');
}
{
  const s=fresh(); s.day=2; s.habitats={water:2,meadow:2,forest:2}; s.hp=30; s.block=30;
  E.endDay(s); assert.equal(s.hp,31); assert.equal(s.seeds,5); assert.equal(s.block,6);
  const replay=JSON.parse(JSON.stringify(s));
  E.endDay(s); E.endDay(replay); assert.deepEqual(s,replay,'Save/resume must preserve forecast and draw RNG');
}
console.log('Rules OK: combos, recovery, caps, retain, redraw, no infinite draw, camp, victory/loss, persistence.');
