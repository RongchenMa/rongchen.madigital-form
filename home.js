(() => {
 'use strict';
 const hero = document.querySelector('.hero');
 const rows = [...document.querySelectorAll('.title-row')];
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const fine = matchMedia('(pointer: fine)');
 const layerNodes = [...document.querySelectorAll('[data-parallax]')];
 let layers = [], max = 0, heroEnd = 0;
 function fitTitle() {
  rows.forEach(row => {
   const text = row.firstElementChild;
   text.style.transform = 'none';
   text.style.fontSize = `${row.clientHeight / .86}px`;
   const width = text.getBoundingClientRect().width;
   if (width) text.style.transform = `scaleX(${row.clientWidth / width})`;
  });
 }
 function pageTop(node) {
  let y = 0;
  for (let n = node; n; n = n.offsetParent) y += n.offsetTop;
  return y;
 }
 function measure() {
  fitTitle();
  max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
  heroEnd = pageTop(hero) + hero.offsetHeight;
  layers = layerNodes.map(node => {
   const section = node.dataset.parallaxScope === 'section' ? node.closest('section') : null;
   return {node, rate:Number(node.dataset.parallax), section,
    origin:section ? pageTop(section) - innerHeight * .32 : 0,
    straightFrom:section ? pageTop(section) - innerHeight * .8 : 0};
  });
 }
 // Keep an unrounded scroll position: repeatedly reading rounded native scrollY can produce tiny stalls.
 let current = scrollY, target = current, animated = false;
 let displayed = current, frame = 0, last = 0;
 const clamp = value => Math.max(0, Math.min(value, max));
 function wake() { if (!frame) { last = performance.now(); frame = requestAnimationFrame(tick); } }
 function tick(now) {
  const dt = Math.min(48, Math.max(1, now - last)); last = now;
  if (animated) {
   target = clamp(target);
   current += (target - current) * (1 - Math.exp(-dt / 145));
   if (Math.abs(target - current) < .25) { current = target; animated = false; }
   scrollTo({top:current,behavior:'instant'});
  } else current = scrollY;
  displayed += (current - displayed) * (1 - Math.exp(-dt / 65));
  layers.forEach(layer => {
   const distance = layer.section
    ? Math.max(-220, Math.min(700, displayed - layer.origin))
    : Math.min(displayed, heroEnd);
   const shift = reduced.matches ? 0 : distance * layer.rate;
   layer.node.style.transform = `translate3d(0,${shift.toFixed(3)}px,0)`;
   if (layer.section) {
    const progress = Math.max(0, Math.min(1, (displayed-layer.straightFrom)/(innerHeight*.72)));
    const angle = reduced.matches ? 0 : -7*(1-progress);
    layer.node.style.setProperty('--frame-rotation', `${angle.toFixed(3)}deg`);
   }
  });
  if (animated || Math.abs(current - displayed) > .08) frame = requestAnimationFrame(tick);
  else frame = 0;
 }
 function release() { animated = false; current = target = scrollY; }
 addEventListener('wheel', event => {
  if (reduced.matches || !fine.matches || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
  event.preventDefault();
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
  const delta = event.deltaY * unit;
  if (!animated) current = target = scrollY;
  // A reversal responds immediately instead of waiting for the previous glide to finish.
  if ((target-current) * delta < 0) target = current;
  target = clamp(target + delta); animated = true; wake();
 }, {passive:false});
 addEventListener('scroll', () => { if (!animated) current = target = scrollY; wake(); }, {passive:true});
 addEventListener('pointerdown', release, {passive:true});
 addEventListener('touchstart', release, {passive:true});
 addEventListener('keydown', release);
 document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  const dest = document.getElementById(link.getAttribute('href').slice(1));
  if (!dest || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); release();
  target = clamp(pageTop(dest) - (dest.id === 'top' ? 0 : 30));
  history.pushState(null,'',link.getAttribute('href'));
  if (reduced.matches) scrollTo({top:target,behavior:'instant'});
  else { animated = true; wake(); }
 }));
 addEventListener('resize', () => { release(); measure(); wake(); }, {passive:true});
 addEventListener('pageshow', () => { release(); measure(); wake(); });
 reduced.addEventListener('change', () => { release(); wake(); });
 document.fonts.ready.then(() => { measure(); wake(); });
 new ResizeObserver(() => { measure(); wake(); }).observe(hero);
 measure(); wake();

 // Manual browsing and the existing automatic crossfade share the same two image buffers.
 const slideshow=document.querySelector('.slideshow');
 if(!slideshow)return;
 const windowNode=slideshow.querySelector('.slide-window');
 const images=[...slideshow.querySelectorAll('.slide-image')];
 const counter=slideshow.querySelector('.slide-counter');
 const announcement=slideshow.querySelector('.slide-announcement');
 const buttons=[...slideshow.querySelectorAll('[data-slide-step]')];
 const photos=Array.from({length:10},(_,i)=>`assets/homepage/home-${String(i+1).padStart(2,'0')}.webp`);
 let index=0,requested=0,active=0,timer=0,visible=false,paused=reduced.matches,busy=false,hovering=false,focused=false,revision=0,prepared=[];
 const wrap=value=>(value+photos.length)%photos.length;
 function prepareAdjacent(){prepared=[wrap(index-1),wrap(index+1)].map(i=>{const img=new Image();img.src=photos[i];img.decode().catch(()=>{});return img;});}
 function sync(){clearTimeout(timer);timer=0;if(visible&&!paused&&!busy&&!hovering&&!focused&&!document.hidden)timer=setTimeout(()=>show(wrap(index+1),false),3400);}
 async function show(target,manual=true){
  requested=wrap(target);const nextIndex=requested;const ticket=++revision;
  clearTimeout(timer);busy=true;
  slideshow.classList.toggle('is-manual',manual);
  const next=images[1-active];
  try{
   next.src=photos[nextIndex];await next.decode();
   if(ticket!==revision)return;
   if(!manual&&(!visible||paused||hovering||focused||document.hidden)){requested=index;return;}
   const previous=images[active];next.classList.add('is-active');previous.classList.remove('is-active');
   active=1-active;index=nextIndex;
   next.alt=`Pink and green shadow photograph ${index+1} of ${photos.length}`;next.removeAttribute('aria-hidden');
   previous.alt='';previous.setAttribute('aria-hidden','true');
   counter.textContent=`${String(index+1).padStart(2,'0')} / ${photos.length}`;
   if(manual)announcement.textContent=`Photograph ${index+1} of ${photos.length}`;
   prepareAdjacent();
  }catch{if(ticket===revision)requested=index;}
  finally{if(ticket===revision){busy=false;sync();}}
 }
 function step(direction){show(wrap(requested+direction),true);}
 function iconAt(x,y,previous){windowNode.style.setProperty('--browse-x',x);windowNode.style.setProperty('--browse-y',y);windowNode.classList.toggle('is-previous',previous);}
 windowNode.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;hovering=true;windowNode.classList.add('is-browsing');sync();});
 windowNode.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;const rect=windowNode.getBoundingClientRect();const x=event.clientX-rect.left,y=event.clientY-rect.top;iconAt(`${x}px`,`${y}px`,x<rect.width/2);windowNode.classList.add('is-browsing');},{passive:true});
 windowNode.addEventListener('pointerleave',()=>{hovering=false;windowNode.classList.remove('is-browsing');sync();});
 buttons.forEach(button=>{
  const direction=Number(button.dataset.slideStep);
  button.addEventListener('click',()=>step(direction));
  button.addEventListener('focus',()=>{focused=button.matches(':focus-visible');if(focused){iconAt(direction<0?'25%':'75%','50%',direction<0);windowNode.classList.add('has-browse-focus');}sync();});
 });
 windowNode.addEventListener('focusout',()=>{requestAnimationFrame(()=>{focused=windowNode.contains(document.activeElement)&&document.activeElement.matches(':focus-visible');if(!focused)windowNode.classList.remove('has-browse-focus');sync();});});
 windowNode.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}else if(event.key==='Home'||event.key==='End'){event.preventDefault();show(event.key==='Home'?0:photos.length-1,true);}});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{rootMargin:'100px'}).observe(slideshow);
 document.addEventListener('visibilitychange',sync);
 reduced.addEventListener('change',event=>{paused=event.matches;sync();});
 prepareAdjacent();sync();
})();
