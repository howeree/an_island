/* First-run spotlight: click advances, skip exits, and completion is remembered. */
global.window=global;
const assert=require('node:assert/strict'), nodes=new Map(), storage=new Map();
function classes(){const set=new Set();return{add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle:(x,on)=>on?set.add(x):set.delete(x)};}
function node(){
  const result={style:{},classList:classes(),listeners:{},innerHTML:'',offsetWidth:320,offsetHeight:130,
    addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(key,value){this[key]=value;},
    getBoundingClientRect(){return{left:100,top:120,right:300,bottom:170};},
    scrollIntoView(){},focus(){this.focused=true;},closest(){return this;}};
  return result;
}
global.document={querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},addEventListener(){}};
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=800;
global.matchMedia=()=>({matches:true});
global.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
require('../js/data.js');require('../js/ecosystem.js');require('../js/ui.js');
assert(IslandUI.startTutorial({auto:true}));
const overlay=nodes.get('#tutorial-overlay'), panel=nodes.get('#tutorial-panel'), skip=nodes.get('#tutorial-skip');
assert(overlay.classList.contains('open'));assert.match(panel.innerHTML,/1 \/ 6/);
assert.equal(overlay['aria-hidden'],'false');
overlay.listeners.click({target:panel});assert.match(panel.innerHTML,/2 \/ 6/);
let stopped=false;skip.listeners.click({stopPropagation(){stopped=true;}});
assert(stopped);assert(!overlay.classList.contains('open'));
assert.equal(storage.get('island-tutorial-v1-seen'),'1');
assert.equal(IslandUI.startTutorial({auto:true}),false,'Seen tutorial does not interrupt the next new game');
assert(IslandUI.startTutorial(),'Guide can be replayed manually');
for(let step=2;step<=6;step++){overlay.listeners.click({target:panel});assert.match(panel.innerHTML,new RegExp(step+' \\/ 6'));}
overlay.listeners.click({target:panel});assert(!overlay.classList.contains('open'),'Finishing step 6 closes the guide');
IslandUI.flashCombo(1);const combo=nodes.get('#combo-banner');assert.match(combo.innerHTML,/GOOD!/);assert(combo.classList.contains('combo-good'));
IslandUI.flashCombo(2);assert.match(combo.innerHTML,/GREAT!/);assert(combo.classList.contains('combo-great'));
IslandUI.flashCombo(3);assert.match(combo.innerHTML,/EXCELLENT!/);assert.match(combo.innerHTML,/生态连携 ×3/);assert(combo.classList.contains('combo-excellent'));
console.log('Tutorial OK: first-run spotlight, click to advance, skip, persistence, replay.');
