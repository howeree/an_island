/* Seeded balance regression: players see their hand and public forecast only. */
global.window=global;
require('../js/data.js'); require('../js/ecosystem.js');
const E=Ecosystem, assert=require('node:assert/strict');
function playable(s) { return s.deck.hand.filter(i=>{const c=E.getCard(i.cardId,s);return c.cost<=s.energy&&(!c.hurt||s.hp>c.hurt);}); }
function choose(s) {
  const d=E.defense(s), options=playable(s);
  let best=null, value=-Infinity;
  for(const i of options) {
    const c=E.getCard(i.cardId,s), p=E.previewCard(s,c);
    let score=Math.min(d.damage,p.block)*1.6 + Math.min(s.maxHp-s.hp,p.heal)*1.25 - p.hurt*1.3;
    score+=p.draw*2.5 + p.energy*4;
    score+=Math.min(Math.max(0,24-s.research),p.research)*.7;
    score+=Math.max(0,Math.min(6-s.seeds,p.seeds))*1.2;
    if(p.build) score += s.habitats[p.build]<2 ? (s.day<=20?13:10) : 5;
    if(p.build && p.build==='forest') score+=2;
    if(p.combo) score+=1;
    const follow=s.deck.hand.some(other=>{
      const next=E.getCard(other.cardId,s);
      return other.uid!==i.uid&&next.route===E.nextRoute[c.route]&&next.cost<=s.energy-c.cost+p.energy;
    });
    if(follow) score+=3;
    score-=c.cost*.35;
    if(score>value){value=score;best=i.uid;}
  }
  return value>0 ? best : null;
}
function camp(s,style) {
  const opts=E.rewardOptions(s);
  if(style==='random') { E.reward(s,'add',opts[Math.floor(E.random(s)*opts.length)],opts); return; }
  if(s.hp<21) { E.reward(s,'rest');return; }
  for(const id of ['forest','wetland','meadow','rain','compost']) {
    if(!s.upgrades[id]) { E.reward(s,'upgrade',id); return; }
  }
  E.reward(s,'rest');
}
function run(seed,style) {
  const s=E.createInitialState(seed);
  while(s.status==='playing') {
    for(let step=0;step<20;step++) {
      const list=playable(s);
      const uid=style==='planned'?choose(s):style==='random'&&list.length?list[Math.floor(E.random(s)*list.length)].uid:null;
      if(!uid) break;
      assert(E.play(s,uid));
    }
    if(style==='planned') while(s.energy&&E.defense(s).damage>0) E.guard(s);
    E.endDay(s);
    if(s.rewardPending) camp(s,style);
  }
  return s;
}
if(require.main===module) {
  const counts={planned:0,random:0,idle:0}, stats={};
  for(const style of Object.keys(counts)) {
    let hp=0,days=0;
    for(let seed=1;seed<=200;seed++){const s=run(seed,style);if(s.status==='won')counts[style]++;hp+=s.hp;days+=s.day;}
    stats[style]={wins:counts[style],games:200,meanHP:Math.round(hp/200),meanDays:Math.round(days/200)};
  }
  console.log(JSON.stringify(stats,null,2));
  assert(counts.planned>=160,'A simple transparent planning policy should win at least 80% of seeds');
  assert(counts.random<=100,'Random play should not reliably win the expedition');
  assert(counts.idle===0,'Skipping turns must not win');
}
module.exports={choose,run};
