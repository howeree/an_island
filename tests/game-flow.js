/* Coordinator regression including async input guard and a complete played campaign. */
global.window=global;
const elements=new Map();
global.document={addEventListener(){},querySelector(){return null;}};
global.addEventListener=()=>{};
global.localStorage={getItem:k=>elements.get(k)||null,setItem:(k,v)=>elements.set(k,v)};
require('../js/data.js');require('../js/ecosystem.js');
let resultShown=false, modal=false;
global.IslandUI={
  showScreen(){},render(){},toast(){},closeModal(){modal=false;},isModalOpen:()=>modal,
  renderResults(){resultShown=true;},playCardAnimation:()=>new Promise(r=>setTimeout(r,0)),
  flashCombo(){},openCamp(){modal=true;},openDeck(){},openGuide(){},confirmNew(){}
};
global.IslandAudio={choice(){}};
require('../js/main.js');
const assert=require('node:assert/strict'),{choose}=require('./balance.js');
(async()=>{
  Game.startNew(777);
  const uid=Game.state.deck.hand[0].uid;
  const first=Game.selectCard(uid);
  Game.endRound(); await Game.selectCard(uid);
  await first;
  assert.equal(Game.state.day,1,'Cannot end while an animation is processing');
  assert.equal(Game.state.cardsPlayed,1,'Double input cannot spend/play twice');
  Game.resume(); assert.equal(Game.state.cardsPlayed,1,'Resume includes the last card played');
  while(Game.state.status==='playing'){
    for(let i=0;i<20;i++){const uid=choose(Game.state);if(!uid)break;await Game.selectCard(uid);}
    while(Game.state.energy&&Ecosystem.defense(Game.state).damage)Game.action('guard');
    Game.endRound();
    if(Game.state.rewardPending){
      const oldDay=Game.state.day;Game.endRound();assert.equal(Game.state.day,oldDay);
      const upgrade=['forest','wetland','meadow','rain','compost'].find(id=>!Game.state.upgrades[id]);
      Game.chooseReward(Game.state.hp<21||!upgrade?'rest':'upgrade',upgrade);
    }
  }
  assert(resultShown);assert.equal(Game.state.status,'won');assert.equal(Game.state.day,30);
  assert.equal(Game.state.history.length,30);
  console.log('Game flow OK: full victory, async input guard, camp pause, save/resume.');
})().catch(e=>{console.error(e);process.exitCode=1;});
