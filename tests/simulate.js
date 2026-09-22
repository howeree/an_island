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
  assert.equal(s.combos, 2); assert.equal(s.block, 15); assert.equal(s.research, 4);
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
  const ids=s.deck.hand.map(c=>c.uid);
  assert(E.swap(s)); assert.equal(s.energy,4,'First exchange is free'); assert.equal(s.swapsUsed,1);
  assert(E.swap(s)); assert.equal(s.energy,3,'Second exchange costs one energy'); assert.equal(s.swapsUsed,2);
  assert.equal(E.swap(s),false,'Third exchange is not allowed');
  assert(new Set(Object.values(s.deck).flat().map(c=>c.uid)).size===14);
  assert.notDeepEqual(ids,s.deck.hand.map(c=>c.uid));
  E.endDay(s); assert.equal(s.swapsUsed,0,'Daily exchange allowance resets next day');
}
{
  const s=fresh(); s.energy=0;
  assert(E.swap(s),'Free exchange works at zero energy'); assert.equal(s.energy,0);
  assert.equal(E.swap(s),false,'Paid second exchange needs one energy');
  s.energy=1; assert(E.swap(s)); assert.equal(s.energy,0);
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
  assert(E.reward(s,'upgrade','rain')); assert.equal(E.getCard('rain',s).block,7);
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
  const s=fresh(); s.day=30; s.block=100; s.topics=IslandData.topics.map(t=>t.id);
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
{
  const s=fresh(); s.energy=12; s.moisture=7;
  assert.match(E.effectText(E.previewCard(s,E.getCard('rain',s))),/水分\+1 · 压力\+1/);
  E.play(s,give(s,'rain')); assert.equal(s.moisture,8); assert.equal(s.pressure,1,'Excess water adds pressure');
  s.day=6; s.moisture=2; s.habitats.water=0; E.endDay(s); assert.equal(s.moisture,0); assert.equal(s.pressure,2,'Drought drains moisture and adds pressure');
}
{
  const s=fresh(); s.energy=20; s.habitats={water:2,meadow:2,forest:2}; s.research=16;
  s.safeNights.water=1; s.safeNights.forest=1; s.combos=3;
  assert(E.play(s,give(s,'species_scout'),{species:'bee'}).species==='bee');
  assert(E.play(s,give(s,'species_scout'),{species:'owl'}).species==='owl');
  assert(E.completeTopic(s,'water_cycle')); assert(E.completeTopic(s,'pollinator_web')); assert(E.completeTopic(s,'forest_balance'));
  assert.equal(s.research,1); assert.equal(E.objectives(s).topics,3);
}
{
  const s=fresh(); s.energy=20;
  for(const id of ['seed_bank','weather_station','ranger_camp']) assert(E.play(s,give(s,'facility_plan'),{facility:id}));
  const uid=give(s,'facility_plan'); assert.equal(E.play(s,uid,{facility:'field_lab'}),false,'Full facilities require explicit replacement');
  assert(E.play(s,uid,{facility:'field_lab',replace:'seed_bank'}));
  assert.deepEqual(s.facilities,['weather_station','ranger_camp','field_lab']);
  s.forecastTokens=2; const attack=E.defense(s).attack; assert(E.mitigate(s)); assert.equal(E.defense(s).attack,Math.max(0,attack-3));
}
{
  const s=fresh(); s.habitats.meadow=2;
  assert(E.play(s,give(s,'species_scout'),{species:'rabbit'}));
  s.day=3; E.endDay(s); assert.equal(s.pressure,1,'Unbalanced rabbit population raises pressure');
  s.pressure=10; assert(E.defense(s).overload===4);
}
{
  const s=fresh(), uid=give(s,'water_drive'); s.moisture=4;
  const p=E.previewCard(s,E.getCard('water_drive',s));
  assert.equal(p.moisture,-2); assert.equal(p.energy,1);
  E.play(s,uid); assert.equal(s.energy,4); assert.equal(s.moisture,2); assert.equal(s.forecastTokens,1);
  s.moisture=1; const fallback=E.previewCard(s,E.getCard('water_drive',s));
  assert.equal(fallback.energy,0); assert.equal(fallback.block,4);
  E.play(s,give(s,'water_drive')); assert.equal(s.moisture,1); assert.equal(s.energy,4);
}
{
  const s=fresh(), refresh=give(s,'hand_refresh'), old=s.deck.hand.filter(x=>x.uid!==refresh).map(x=>x.uid), count=s.deck.draw.length;
  const p=E.play(s,refresh); assert.equal(p.redrawHand,old.length); assert.equal(s.deck.hand.length,Math.min(old.length,count));
  assert(old.every(uid=>s.deck.played.some(x=>x.uid===uid)),'Exchanged cards stay out of the current draw cycle');
  assert(old.every(uid=>!s.deck.hand.some(x=>x.uid===uid)));
  const all=Object.values(s.deck).flat().map(x=>x.uid); assert.equal(new Set(all).size,all.length,'Redraw preserves every card exactly once');
}
{
  const s=fresh(), exchange=give(s,'targeted_exchange'), target=s.deck.hand[0].uid;
  assert.equal(E.play(s,exchange,{replaceCard:exchange}),false,'Cannot exchange the card being played');
  const p=E.play(s,exchange,{replaceCard:target}); assert.equal(p.draw,2);
  assert(!s.deck.hand.some(x=>x.uid===target)); assert(s.deck.played.some(x=>x.uid===target));
  const skip=give(s,'targeted_exchange'), before=s.deck.hand.length, forecast=s.forecastTokens;
  E.play(s,skip,{replaceCard:'skip'}); assert.equal(s.forecastTokens,forecast+1); assert.equal(s.deck.hand.length,before-1);
}
{
  const s=fresh(); s.day=6;
  assert(E.rewardOptions(s).includes('relay'),'First camp offers the new energy card');
}
{
  const s=fresh(), uid=give(s,'relay'); s.energy=0; s.lastRoute='water';
  const before=Object.values(s.deck).flat().length;
  assert.equal(E.getCard('relay',s).cost,0);
  assert(E.play(s,uid)); assert.equal(s.energy,1); assert.equal(s.lastRoute,'water');
  assert(s.deck.played.some(c=>c.uid===uid)); assert.equal(E.play(s,uid),false,'Zero-cost energy cannot replay today');
  assert.equal(Object.values(s.deck).flat().length,before);
  s.upgrades.relay=true; const stronger=give(s,'relay');
  assert(E.play(s,stronger)); assert.equal(s.energy,2); assert.equal(s.block,3);
}
console.log('Rules OK: combos, construction, ecology, topics, facilities, weather, camp, victory/loss, persistence.');
