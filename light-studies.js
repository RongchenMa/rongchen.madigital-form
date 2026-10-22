(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const defs=document.createElement('div');defs.setAttribute('aria-hidden','true');
 defs.innerHTML='<svg class="light-filter-defs" xmlns="http://www.w3.org/2000/svg"><defs><filter id="cast-pink" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 .91 0 0 0 0 .28 0 0 0 0 .58 0 0 0 1 0"/></filter><filter id="cast-green" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 .20 0 0 0 0 .48 0 0 0 0 .28 0 0 0 1 0"/></filter></defs></svg>';document.body.prepend(defs);
 const hero=document.querySelector('.hero');
 if(hero){
  const objects=[...hero.querySelectorAll('.word-object')].map(word=>{
   const projection=document.createElement('div');projection.className='word-projection';projection.setAttribute('aria-hidden','true');projection.append(word.querySelector('.word-tilt').cloneNode(true));word.prepend(projection);
   return {word,projection};
  });
  const note=document.createElement('span');note.className='hero-light-note';note.textContent=matchMedia('(pointer:fine)').matches?'MOVE THE LIGHT':'LIGHT / COLOUR / SHADOW';hero.append(note);
  let frame=0,active=true,last=0,lightX=0,lightY=0,targetX=0,targetY=0;
  function rest(){const rect=hero.getBoundingClientRect();targetX=rect.width*.12;targetY=-rect.height*.26;}
  rest();lightX=targetX;lightY=targetY;
  // For an object plane at height h and a point light at height H, the ground
  // projection is S = P + h/(H-h) * (P-L). One light and height ratio serve both words.
  const heightRatio=.28;
  function paint(){
   const surface=hero.getBoundingClientRect();
   objects.forEach(({word,projection})=>{
    const rect=word.getBoundingClientRect();const centerX=rect.left-surface.left+rect.width/2,centerY=rect.top-surface.top+rect.height/2;
    const dx=(centerX-lightX)*heightRatio,dy=(centerY-lightY)*heightRatio;
    projection.style.transform=`translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) scale(${1+heightRatio})`;
    projection.style.setProperty('--shadow-blur',`${Math.min(2.7,.8+Math.hypot(dx,dy)*.006).toFixed(2)}px`);
   });
  }
  function wake(){if(!frame&&active&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
  function tick(now){frame=0;const dt=Math.min(48,Math.max(1,now-last));last=now;const ease=reduced.matches?1:1-Math.exp(-dt/135);lightX+=(targetX-lightX)*ease;lightY+=(targetY-lightY)*ease;paint();if(Math.abs(targetX-lightX)+Math.abs(targetY-lightY)>.2)frame=requestAnimationFrame(tick);}
  hero.addEventListener('pointermove',event=>{if(event.pointerType==='touch'||reduced.matches)return;const rect=hero.getBoundingClientRect();targetX=event.clientX-rect.left;targetY=event.clientY-rect.top;wake();},{passive:true});
  hero.addEventListener('pointerleave',()=>{rest();wake();});
  addEventListener('resize',()=>{rest();lightX=targetX;lightY=targetY;paint();},{passive:true});
  new IntersectionObserver(entries=>{active=entries[0].isIntersecting;if(active)wake();else{cancelAnimationFrame(frame);frame=0;}}).observe(hero);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
  reduced.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;rest();lightX=targetX;lightY=targetY;paint();});paint();
 }
 const study=document.querySelector('.acetate-study');
 if(study){
  const stage=study.querySelector('.acetate-stage'),density=study.querySelector('#layer-density');
  const buttons=[...study.querySelectorAll('[data-study]')],pages=[...study.querySelectorAll('[data-page-study]')];
  let pointerX=0,pointerY=0,wheel=0,x=18,y=14,frame=0,visible=false,last=0;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function wake(){if(!frame&&visible&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
  function tick(now){
   frame=0;const dt=Math.min(48,now-last);last=now;
   const rect=stage.getBoundingClientRect();const progress=clamp((innerHeight*.55-rect.top)/Math.max(1,innerHeight+rect.height),-.6,.6);
   const tx=18+pointerX+wheel+progress*48,ty=10+pointerY+progress*32;
   const ease=reduced.matches?1:1-Math.exp(-dt/130);x+=(tx-x)*ease;y+=(ty-y)*ease;
   stage.style.setProperty('--sheet-x',`${x.toFixed(2)}px`);stage.style.setProperty('--sheet-y',`${y.toFixed(2)}px`);stage.style.setProperty('--sheet-angle',`${(x*.018).toFixed(3)}deg`);
   if(Math.abs(tx-x)+Math.abs(ty-y)>.1)wake();
  }
  stage.addEventListener('pointermove',event=>{const rect=stage.getBoundingClientRect();pointerX=(event.clientX-rect.left-rect.width/2)/rect.width*70;pointerY=(event.clientY-rect.top-rect.height/2)/rect.height*42;wake();},{passive:true});
  stage.addEventListener('pointerleave',()=>{pointerX=pointerY=0;wake();});
  stage.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey)return;const unit=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;wheel=clamp(wheel+(event.deltaY+event.deltaX)*unit*.06,-55,55);wake();},{passive:true});
  stage.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();if(event.key==='Home'){wheel=pointerX=pointerY=0;}else if(event.key==='ArrowLeft'||event.key==='ArrowRight')wheel=clamp(wheel+(event.key==='ArrowRight'?8:-8),-55,55);else pointerY=clamp(pointerY+(event.key==='ArrowDown'?8:-8),-25,25);wake();});
  buttons.forEach(button=>button.addEventListener('click',()=>{buttons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));pages.forEach(page=>page.hidden=page.dataset.pageStudy!==button.dataset.study);pointerX=pointerY=wheel=0;wake();}));
  function ink(){stage.style.setProperty('--density',density.value/100);study.querySelector('#density-value').textContent=`${density.value}%`;}
  density.addEventListener('input',ink);ink();addEventListener('scroll',wake,{passive:true});addEventListener('resize',wake,{passive:true});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'100px'}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
 }
 document.querySelectorAll('.specimen-glyph').forEach((glyph,index)=>{
  function echo(){
   if(reduced.matches)return;
   const current=getComputedStyle(glyph);
   for(let i=0;i<3;i++){
    const trail=document.createElement('span');trail.className='glyph-echo';trail.setAttribute('aria-hidden','true');trail.style.setProperty('--morph',current.getPropertyValue('--morph'));trail.style.setProperty('--ink',current.getPropertyValue('--ink'));
    trail.append(glyph.querySelector(':scope>.custom-letter').cloneNode(true),glyph.querySelector(':scope>.druk-letter').cloneNode(true));glyph.prepend(trail);
    const direction=index%2?-1:1;
    const animation=trail.animate([{opacity:.3-i*.06,transform:'translate(0,0) rotate(0)'},{opacity:.13,offset:.35},{opacity:0,transform:`translate(${direction*(28+i*18)}px,${24+i*14}px) rotate(${direction*(7+i*3)}deg)`}],{duration:850+i*160,easing:'cubic-bezier(.16,.7,.3,1)'});
    animation.finished.catch(()=>{}).then(()=>trail.remove());
   }
   const all=[...glyph.querySelectorAll('.glyph-echo')];while(all.length>6)all.pop().remove();
  }
  glyph.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')echo();});glyph.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')echo();});glyph.addEventListener('click',echo);glyph.addEventListener('focus',()=>{if(glyph.matches(':focus-visible'))echo();});
 });
})();
