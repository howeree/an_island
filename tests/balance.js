/* Seeded balance regression. This player uses only visible hand, status and forecast. */
global.window=global;
require('../js/data.js'); require('../js/ecosystem.js');
const E=Ecosystem, D=IslandData, assert=require('node:assert/strict');
function playable(s) { return s.deck.hand.filter(i=>{const c=E.getCard(i.cardId,s);return E.effectiveCost(s,c)<=s.energy&&(!c.hurt||s.hp>c.hurt);}); }
function decision(s, uid) {
  const c=E.getCard(s.deck.hand.find(i=>i.uid===uid).cardId,s);
  if(c.speciesChoice) {
    const ids=E.speciesOptions(s).map(x=>x.id);
    const species=['bee','owl','frog','fox','waterbird','rabbit'].find(id=>ids.includes(id));
    return {species:species||'observe'};
  }
  if(c.facilityChoice) {
    const options=E.facilityOptions(s).map(x=>x.id);
    const facility=['field_lab','weather_station','ranger_camp','seed_bank','reservoir'].find(id=>options.includes(id));
    if(!facility) return {};
    return {facility,replace:s.facilities.length>=3?['seed_bank','reservoir','ranger_camp'].find(id=>s.facilities.includes(id))||s.facilities[0]:undefined};
  }
  return {};
}
function chooseMove(s) {
  const damage=E.defense(s).damage, options=playable(s);
  let best=null, bestScore=0;
  for(const i of options) {
    const c=E.getCard(i.cardId,s), choice=decision(s,i.uid), p=E.previewCard(s,c,choice);
    let score=Math.min(damage,p.block)*1.9 + Math.min(s.maxHp-s.hp,p.heal)*1.3 - p.hurt*2.3;
    score+=p.draw*2.5 + p.energy*4;
    score+=Math.min(Math.max(0,(3-s.topics.length)*5-s.research),p.research)*1.35;
    score+=Math.min(Math.max(0,5-s.seeds),Math.max(0,p.seeds))*1.2;
    score+=Math.min(Math.max(0,5-s.moisture),Math.max(0,p.moisture))*.85;
    score+=p.forecast*(damage>=3?2.5:1.2);
    score-=Math.max(0,p.pressure)*(s.pressure>=4?3:1.2);
    score+=Math.max(0,-p.pressure)*(s.pressure>=4?4:1.2);
    if(p.build) score+=s.habitats[p.build]<2 ? 24+(s.day>=18?8:0)+(p.build==='meadow'&&s.day<12?6:0) : 3;
    if(c.build&&!p.build&&s.habitats[c.build]<2) score+=5;
    if(p.species) score+=['bee','owl'].includes(p.species)?34:9;
    if(c.speciesChoice&&choice.species==='observe') score-=s.day<22?10:0;
    if(p.facility) score+=s.facilities.length<3?21:5;
    if(p.combo) score+=2;
    if(c.id==='survey'&&s.deck.draw.length+s.deck.discard.length===0) score-=10;
    score-=E.effectiveCost(s,c)*.6;
    if(score>bestScore){bestScore=score;best={uid:i.uid,choice};}
  }
  return best;
}
function choose(s){return chooseMove(s)?.uid||null;}
function completeAvailable(s){for(const t of D.topics)if(E.topicStatus(s,t.id).ready)E.completeTopic(s,t.id);}
function camp(s,style) {
  const opts=E.rewardOptions(s);
  if(style==='random') { E.reward(s,'add',opts[Math.floor(E.random(s)*opts.length)],opts); return; }
  if(s.hp<16) { E.reward(s,'rest');return; }
  for(const id of ['meadow','wetland','forest','rain','species_scout','compost']) {
    if(!s.upgrades[id]) { E.reward(s,'upgrade',id); return; }
  }
  E.reward(s,'rest');
}
function run(seed,style) {
  const s=E.createInitialState(seed);
  while(s.status==='playing') {
    completeAvailable(s);
    for(let step=0;step<20;step++) {
      const list=playable(s);
      const move=style==='planned'?chooseMove(s):style==='random'&&list.length?{uid:list[Math.floor(E.random(s)*list.length)].uid}:null;
      if(!move) break;
      assert(E.play(s,move.uid,move.choice||{}));
      completeAvailable(s);
    }
    if(style==='planned') {
      while(s.forecastTokens&&E.defense(s).damage>0) E.mitigate(s);
      while(s.energy&&E.defense(s).damage>0) E.guard(s);
    }
    E.endDay(s);
    if(s.rewardPending) camp(s,style);
  }
  return s;
}
if(require.main===module) {
  const counts={planned:0,random:0,idle:0}, stats={};
  for(const style of Object.keys(counts)) {
    let hp=0,days=0,topics=0;
    for(let seed=1;seed<=200;seed++){const s=run(seed,style);if(s.status==='won')counts[style]++;hp+=s.hp;days+=s.day;topics+=s.topics.length;}
    stats[style]={wins:counts[style],games:200,meanHP:Math.round(hp/200),meanDays:Math.round(days/200),meanTopics:+(topics/200).toFixed(1)};
  }
  console.log(JSON.stringify(stats,null,2));
  assert(counts.planned>=140,'A transparent planning policy should win most seeds');
  assert(counts.random<=30,'Random play should not reliably win the expedition');
  assert(counts.idle===0,'Skipping turns must not win');
}
module.exports={choose,chooseMove,decision,completeAvailable,run};
