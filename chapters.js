(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const durations=[36,48,40,65,60];
 const rows=[...document.querySelectorAll('.marquee-row')].map((node,i)=>({node,tracks:[...node.querySelectorAll('.marquee-track')],group:node.querySelector('.marquee-group'),width:1,offset:0,speed:1,hover:false,focus:false,visible:true,direction:i%2?-1:1,duration:durations[i]}));
 let frame=0,last=0;
 function measure(){rows.forEach(r=>{const old=r.width;r.width=r.group.getBoundingClientRect().width||1;r.offset=r.offset/old*r.width;});wake();}
 function sync(){wake();}
 function wake(){if(!frame&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
 function tick(now){
  const dt=Math.min(48,Math.max(1,now-last));last=now;let running=false;
  rows.forEach(r=>{
   const target=reduced.matches||r.hover||r.focus?0:1;
   r.speed+=(target-r.speed)*(1-Math.exp(-dt/(target?260:170)));
   if(Math.abs(r.speed-target)<.001)r.speed=target;
   if(r.visible){r.offset=(r.offset+r.direction*r.width/r.duration*r.speed*dt/1000)%r.width;if(r.offset<0)r.offset+=r.width;}
   const transform=`translate3d(${-r.offset}px,0,0)`;
   r.tracks.forEach(t=>t.style.transform=transform);
   if(r.visible&&(r.speed>.001||Math.abs(r.speed-target)>.001)&&!reduced.matches)running=true;
  });
  frame=running?requestAnimationFrame(tick):0;
 }
 rows.forEach(r=>{
  function highlight(){r.node.classList.toggle('is-highlighted',r.hover||r.focus);wake();}
  r.node.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){r.hover=true;highlight();}});
  r.node.addEventListener('pointerleave',()=>{r.hover=false;highlight();});
  r.node.addEventListener('focus',()=>{r.focus=r.node.matches(':focus-visible');highlight();});
  r.node.addEventListener('blur',()=>{r.focus=false;highlight();});
  new IntersectionObserver(entries=>{r.visible=entries[0].isIntersecting;wake();},{rootMargin:'80px'}).observe(r.node);
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
 reduced.addEventListener('change',sync);addEventListener('resize',measure,{passive:true});document.fonts.ready.then(measure);measure();sync();
})();
