/* Pointer regression: off-centre grab stays anchored; cancel/short drag never plays. */
global.window=global;
const handlers={},wh={},elements=new Map();
function classes(){const v=new Set();return{add:(...x)=>x.forEach(i=>v.add(i)),remove:(...x)=>x.forEach(i=>v.delete(i)),contains:x=>v.has(x),toggle:(x,on)=>on?v.add(x):v.delete(x)};}
const body={classList:classes(),appendChild(el){el.parentNode=this;}};
const parent={insertBefore(el){el.parentNode=this;},replaceChild(){}};
const zone={classList:classes()};
global.document={body,addEventListener:(type,fn)=>handlers[type]=fn,querySelector:q=>q==='#play-drop-zone'?zone:null,
createElement:()=>({style:{},className:'',replaceWith(c){c.parentNode=parent;}})};
global.addEventListener=(t,f)=>wh[t]=f;
global.localStorage={getItem:()=>null,setItem(){}};
require('../js/data.js');require('../js/ecosystem.js');
global.IslandUI={showScreen(){},isModalOpen:()=>false};
require('../js/main.js');
const assert=require('node:assert/strict');
let used=[];Game.selectCard=uid=>used.push(uid);
function card(){
 const c={dataset:{cardUid:'test-card'},style:{},classList:classes(),parentNode:parent,
 getBoundingClientRect:()=>({left:70,top:400,width:174,height:244}),setPointerCapture(){},removeAttribute(){this.style={};}};
 c.closest=q=>q==='[data-card-uid]'?c:null;return c;
}
function event(c,x,y){return{target:c,button:0,pointerId:1,clientX:x,clientY:y,preventDefault(){}};}
let c=card();
handlers.pointerdown(event(c,110,450));
handlers.pointermove(event(c,135,360));
assert.equal(c.style.left,'95px','Grab offset X must stay 40px from card edge');
assert.equal(c.style.top,'310px','Grab offset Y must stay 50px from card edge');
assert.equal(c.classList.contains('ready-to-play'),true);
handlers.pointercancel(event(c,135,360));
assert.equal(used.length,0);assert.equal(c.parentNode,parent);assert(!body.classList.contains('card-drag-active'));
c=card();handlers.pointerdown(event(c,110,450));handlers.pointermove(event(c,110,430));handlers.pointerup(event(c,110,430));
assert.equal(used.length,0);
c=card();handlers.pointerdown(event(c,110,450));handlers.pointermove(event(c,110,365));handlers.pointerup(event(c,110,365));
assert.deepEqual(used,['test-card']);assert.equal(c.parentNode,parent);
c=card(); c.inlineStyle='--fan-angle:-4.4deg;--fan-drop:10px';
c.getAttribute=()=>c.inlineStyle; c.setAttribute=(_,value)=>{c.inlineStyle=value;};
handlers.pointerdown(event(c,110,450));handlers.pointermove(event(c,135,360));handlers.pointercancel(event(c,135,360));
assert.equal(c.inlineStyle,'--fan-angle:-4.4deg;--fan-drop:10px','Cancelled drag restores fan position');
console.log('Drag OK: cursor anchor, short drag, cancellation, release, and DOM restoration.');
