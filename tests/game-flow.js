/* Coordinator regression including async input guard and a complete played campaign. */
global.window=global;
const elements=new Map();
global.document={addEventListener(){},querySelector(){return null;}};
global.addEventListener=()=>{};
global.localStorage={getItem:k=>elements.get(k)||null,setItem:(k,v)=>elements.set(k,v)};
require('../js/data.js');require('../js/ecosystem.js');
let resultShown=false, modal=false, openedSpecies=false, openedExchange=false, visualDraws=[], swappedOut=[];
global.IslandUI={
  showScreen(){},render(_s,_game,visual){visualDraws=visual?.drawnUids||[];},toast(){},closeModal(){modal=false;},isModalOpen:()=>modal,
  renderResults(){resultShown=true;},playCardAnimation:()=>new Promise(r=>setTimeout(r,0)),
  playSwapAnimation(uids){swappedOut=uids;return Promise.resolve();},
  flashCombo(){},openCamp(){modal=true;},openDeck(){},openGuide(){},startTutorial(){},confirmNew(){},
  openSpecies(){openedSpecies=true;modal=true;},openFacilities(){modal=true;},openReplaceFacility(){modal=true;},openExchange(){openedExchange=true;modal=true;},openTopics(){},openSystems(){}
};
global.IslandAudio={choice(){}};
require('../js/main.js');
const assert=require('node:assert/strict'),{chooseMove}=require('./balance.js');
(async()=>{
  Game.startNew(888);
  const exchange=Ecosystem.instance(Game.state,'targeted_exchange'), target=Game.state.deck.hand[0].uid;
  Game.state.deck.hand.push(exchange);
  await Game.selectCard(exchange.uid);assert(openedExchange&&modal,'Exchange card must ask which hand card to replace');
  assert.equal(Game.state.cardsPlayed,0,'Opening a choice cannot spend a card');
  await Game.chooseExchange(exchange.uid,target);
  assert(Game.state.deck.played.some(c=>c.uid===target),'Chosen card leaves the hand until tomorrow');
  assert.equal(visualDraws.length,2,'Cards drawn by an effect receive entrance animation');
  await Game.swapHand();
  assert(swappedOut.length>0,'Daily exchange animates cards leaving the hand');
  assert(visualDraws.length>0,'Daily exchange animates replacement cards');
  Game.startNew(999); Game.endRound();
  assert.equal(visualDraws.length,5,'Cards drawn for the next day receive entrance animation');
  Game.startNew(777);
  const uid=Game.state.deck.hand[0].uid;
  const first=Game.selectCard(uid);
  Game.endRound(); await Game.selectCard(uid);
  await first;
  assert.equal(Game.state.day,1,'Cannot end while an animation is processing');
  assert.equal(Game.state.cardsPlayed,1,'Double input cannot spend/play twice');
  Game.resume(); assert.equal(Game.state.cardsPlayed,1,'Resume includes the last card played');
  while(Game.state.status==='playing'){
    for(const t of IslandData.topics) if(Ecosystem.topicStatus(Game.state,t.id).ready)Game.completeTopic(t.id);
    for(let i=0;i<20;i++){
      const move=chooseMove(Game.state);if(!move)break;
      const c=Ecosystem.getCard(Game.state.deck.hand.find(x=>x.uid===move.uid).cardId,Game.state);
      if(c.speciesChoice&&!openedSpecies){
        await Game.selectCard(move.uid);assert(openedSpecies&&modal,'Species card opens a choice before spending');
        await Game.choosePermanent('species',move.uid,move.choice.species);
      } else await Game.selectCard(move.uid,move.choice);
      for(const t of IslandData.topics)if(Ecosystem.topicStatus(Game.state,t.id).ready)Game.completeTopic(t.id);
    }
    while(Game.state.forecastTokens&&Ecosystem.defense(Game.state).damage)Game.action('mitigate');
    while(Game.state.energy&&Ecosystem.defense(Game.state).damage)Game.action('guard');
    Game.endRound();
    if(Game.state.rewardPending){
      const oldDay=Game.state.day;Game.endRound();assert.equal(Game.state.day,oldDay);
      const upgrade=['meadow','wetland','forest','rain','species_scout','compost'].find(id=>!Game.state.upgrades[id]);
      Game.chooseReward(Game.state.hp<16||!upgrade?'rest':'upgrade',upgrade);
    }
  }
  assert(resultShown);assert.equal(Game.state.status,'won');assert.equal(Game.state.day,30);
  assert.equal(Game.state.history.length,30);
  console.log('Game flow OK: full victory, async input guard, camp pause, save/resume.');
})().catch(e=>{console.error(e);process.exitCode=1;});
