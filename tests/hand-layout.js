/* UI regression: hand cards get a readable fan and newly drawn cards are marked for animation. */
global.window=global;
const assert=require('node:assert/strict');
const nodes=new Map();
function node(){
  const names=new Set();
  const value={style:{},innerHTML:'',textContent:'',disabled:false,
    classList:{add:x=>names.add(x),remove:x=>names.delete(x),contains:x=>names.has(x),toggle:(x,on)=>on?names.add(x):names.delete(x)}};
  value.closest=()=>value;
  return value;
}
global.document={
  querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},
  querySelectorAll(){return[];},addEventListener(){},activeElement:null
};
global.matchMedia=()=>({matches:true});
require('../js/data.js');require('../js/ecosystem.js');require('../js/ui.js');
const s=Ecosystem.createInitialState(321);
const game={getHandCards:()=>s.deck.hand.map(instance=>({instance,card:Ecosystem.getCard(instance.cardId,s)}))};
IslandUI.render(s,game,{drawnUids:[s.deck.hand[1].uid]});
const hand=nodes.get('#action-cards').innerHTML;
assert.match(hand,/--fan-angle:-4\.4deg/);
assert.match(hand,/--fan-angle:4\.4deg/);
assert.match(hand,/--fan-angle:0deg/);
assert.equal((hand.match(/card-dealt/g)||[]).length,1);
IslandUI.playSwapAnimation([s.deck.hand[0].uid]);
assert(nodes.get('[data-card-uid="'+s.deck.hand[0].uid+'"]').classList.contains('card-swap-out'));
console.log('Hand UI OK: symmetrical fan, draw marker, swap-out marker.');
