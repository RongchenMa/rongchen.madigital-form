(() => {
 'use strict';
 const track=document.querySelector('.photo-reel-track'),group=document.querySelector('.photo-set'),surface=document.querySelector('.photo-reel-window');
 if(!track||!group||!surface)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let width=1,offset=0,touchX=0,touchY=0,touchAxis=null,direction=1,visible=true,touching=false,frame=0,last=0;
 const autoSpeed=28;
 function wake(){if(!frame&&visible&&!document.hidden&&!reduced.matches){last=performance.now();frame=requestAnimationFrame(tick);}}
 function tick(now){frame=0;const dt=Math.min(48,Math.max(0,now-last));last=now;if(!touching){offset+=direction*autoSpeed*dt/1000;paint();}if(visible&&!document.hidden&&!reduced.matches)frame=requestAnimationFrame(tick);}
 function paint(){offset=((offset%width)+width)%width;track.style.transform=`translate3d(${-offset.toFixed(3)}px,0,0)`;}
 function move(delta){if(delta)direction=Math.sign(delta);offset+=delta;paint();wake();}
 function measure(){const old=width;width=group.getBoundingClientRect().width||1;offset=offset/old*width;paint();wake();}
 // Manual deltas still map directly; a separate, constant-speed loop supplies automatic motion.
 addEventListener('wheel',event=>{
  if(event.ctrlKey||event.metaKey||event.target.closest('input,textarea,select,video,[contenteditable=true]'))return;
  if(!event.target.closest('.photos-main')&&document.documentElement.scrollHeight>innerHeight+1)return;
  const delta=Math.abs(event.deltaY)>=Math.abs(event.deltaX)?event.deltaY:event.deltaX;
  if(!delta)return;
  if(event.cancelable)event.preventDefault();
  const unit=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;
  move(delta*unit);
 },{passive:false});
 surface.addEventListener('touchstart',event=>{const touch=event.touches[0];if(!touch)return;touchX=touch.clientX;touchY=touch.clientY;touchAxis=null;touching=true;},{passive:true});
 surface.addEventListener('touchmove',event=>{
  const touch=event.touches[0];if(!touch)return;
  const dx=touchX-touch.clientX,dy=touchY-touch.clientY;
  if(!touchAxis&&Math.abs(dx)+Math.abs(dy)>0)touchAxis=Math.abs(dx)>Math.abs(dy)?'x':'y';
  if(event.cancelable)event.preventDefault();
  move(touchAxis==='x'?dx:dy);touchX=touch.clientX;touchY=touch.clientY;
 },{passive:false});
 surface.addEventListener('touchend',()=>{touching=false;wake();},{passive:true});
 surface.addEventListener('touchcancel',()=>{touching=false;wake();},{passive:true});
 surface.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  const steps={ArrowDown:64,ArrowRight:64,ArrowUp:-64,ArrowLeft:-64,PageDown:surface.clientWidth*.8,PageUp:-surface.clientWidth*.8};
  if(event.key in steps){event.preventDefault();move(steps[event.key]);}
  else if(event.key==='Home'){event.preventDefault();offset=0;paint();}
  else if(event.key==='End'){event.preventDefault();offset=Math.max(0,width-surface.clientWidth);paint();}
 });
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();else{cancelAnimationFrame(frame);frame=0;}}).observe(surface);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
 reduced.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;wake();});
 document.querySelectorAll('.photo-set:first-child img').forEach(img=>img.addEventListener('load',measure));
 document.fonts.ready.then(measure);new ResizeObserver(measure).observe(group);addEventListener('resize',measure,{passive:true});measure();
})();
