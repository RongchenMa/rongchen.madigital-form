(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const glyphs=[...document.querySelectorAll('.specimen-glyph')];
 const states=glyphs.map(node=>({node,hover:false,focus:false,held:false,p:0,v:0}));
 let letterFrame=0,letterLast=0;
 function paint(s){
  const p=Math.max(0,Math.min(1,s.p));
  s.node.style.setProperty('--morph',p.toFixed(4));
  s.node.style.setProperty('--ink',Math.min(1,p*1.55).toFixed(4));
 }
 function render(s){
  s.node.setAttribute('aria-pressed',String(s.held));
  if(reduced.matches){s.p=s.hover||s.focus||s.held?1:0;s.v=0;paint(s);}
  else if(!letterFrame){letterLast=performance.now();letterFrame=requestAnimationFrame(animateLetters);}
 }
 function animateLetters(now){
  const dt=Math.min(.04,Math.max(.001,(now-letterLast)/1000));letterLast=now;let running=false;
  states.forEach(s=>{
   const goal=s.hover||s.focus||s.held?1:0;
   // Analytic critically damped spring: reversals continue from the current shape, without a timer jump.
   const omega=15,err=s.p-goal,temp=(s.v+omega*err)*dt,decay=Math.exp(-omega*dt);
   s.p=goal+(err+temp)*decay;s.v=(s.v-omega*temp)*decay;
   if(Math.abs(s.p-goal)<.0004&&Math.abs(s.v)<.005){s.p=goal;s.v=0;}else running=true;
   paint(s);
  });
  letterFrame=running?requestAnimationFrame(animateLetters):0;
 }
 states.forEach(s=>{
  s.node.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){s.hover=true;render(s);}});
  s.node.addEventListener('pointerleave',()=>{s.hover=false;render(s);});
  s.node.addEventListener('focus',()=>{s.focus=s.node.matches(':focus-visible');render(s);});
  s.node.addEventListener('blur',()=>{s.focus=false;render(s);});
  s.node.addEventListener('click',()=>{s.held=!s.held;render(s);});
  s.node.addEventListener('keydown',e=>{if(e.key==='Escape'){s.hover=s.focus=s.held=false;render(s);s.node.blur();}});
 });
 reduced.addEventListener('change',()=>{cancelAnimationFrame(letterFrame);letterFrame=0;states.forEach(render);});
 addEventListener('pagehide',()=>{cancelAnimationFrame(letterFrame);letterFrame=0;});
 addEventListener('pageshow',()=>states.forEach(render));

 const windowNode=document.querySelector('.alphabet-window');
 const track=document.querySelector('.alphabet-track');
 const group=document.querySelector('.alphabet-set');
 let width=1,offset=0,speed=1,targetSpeed=1,hover=false,visible=false,frame=0,last=0;
 function measure(){const old=width;width=group.getBoundingClientRect().width||1;offset=offset/old*width;wake();}
 function wake(){if(!frame&&!document.hidden&&visible&&!reduced.matches){last=performance.now();frame=requestAnimationFrame(tick);}}
 function tick(now){
  const dt=Math.min(48,Math.max(1,now-last));last=now;
  const target=targetSpeed;
  speed+=(target-speed)*(1-Math.exp(-dt/(hover?200:700)));
  if(Math.abs(speed-target)<.001)speed=target;
  offset=(offset+45*speed*dt/1000)%width;if(offset<0)offset+=width;
  track.style.transform=`translate3d(${-offset}px,0,0)`;
  frame=(Math.abs(speed)>.001||Math.abs(speed-target)>.001)&&visible&&!document.hidden&&!reduced.matches?requestAnimationFrame(tick):0;
 }
 windowNode.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')hover=true;});
 windowNode.addEventListener('pointerleave',()=>{hover=false;targetSpeed=1;wake();});
 windowNode.addEventListener('wheel',e=>{
  if(reduced.matches||e.ctrlKey||e.metaKey)return;
  const unit=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;
  targetSpeed=Math.max(-4,Math.min(6,targetSpeed+e.deltaY*unit*.004));wake();
 },{passive:true});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){hover=false;targetSpeed=1;cancelAnimationFrame(frame);frame=0;}else wake();},{rootMargin:'100px'}).observe(windowNode);
 addEventListener('resize',measure,{passive:true});document.fonts.ready.then(measure);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
 reduced.addEventListener('change',()=>{if(reduced.matches){cancelAnimationFrame(frame);frame=0;}else wake();});
 measure();

 const film=document.querySelector('.typeface-film');
 let filmVisible=false;
 function syncFilm(){if(filmVisible&&!document.hidden&&!reduced.matches)film.play().catch(()=>{});else film.pause();}
 new IntersectionObserver(entries=>{filmVisible=entries[0].isIntersecting;syncFilm();},{threshold:.2}).observe(film);
 document.addEventListener('visibilitychange',syncFilm);reduced.addEventListener('change',syncFilm);
})();
