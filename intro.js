(() => {
 'use strict';
 const root = document.documentElement;
 const overlay = document.querySelector('.site-intro');
 const replay = document.querySelector('.intro-replay');
 if (!overlay || !replay) { root.classList.remove('intro-active'); return; }
 const skip = overlay.querySelector('.intro-skip');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const content = [...document.body.children].filter(node => node.matches('header,main,footer'));
 const key = 'shadow-intro-seen-v2';
 let running = false, timer = 0, returnFocus = null, stored = [];
 let oldOverflow = '', oldPadding = '';
 clearTimeout(window.shadowIntroFallback);
 // Contour tracing turns a signed density field into smooth, genuinely merging shapes.
 // No video, filters, image sequence, dependencies, or permanent render loop.
 const canvas = overlay.querySelector('.intro-fluid');
 const ctx = canvas?.getContext('2d', {alpha:true});
 let frame = 0, started = 0, viewportWidth = 0, viewportHeight = 0;
 let columns = 0, rows = 0, cellX = 0, cellY = 0, field;
 const duration = 3100;
 const clamp01 = value => Math.max(0,Math.min(1,value));
 const smooth = value => { const t=clamp01(value); return t*t*(3-2*t); };
 function resizeCanvas() {
  viewportWidth = innerWidth; viewportHeight = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(viewportWidth*ratio); canvas.height = Math.round(viewportHeight*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
  const cell = Math.max(7,Math.min(14,Math.min(viewportWidth,viewportHeight)/65));
  columns=Math.ceil(viewportWidth/cell);rows=Math.ceil(viewportHeight/cell);
  cellX=viewportWidth/columns;cellY=viewportHeight/rows;
  field=new Float32Array((columns+1)*(rows+1));
 }
 function traceContours() {
  const nodes=new Map(),horizontal=(rows+1)*columns,threshold=1.1;
  const table=[[],[[3,0]],[[0,1]],[[3,1]],[[1,2]],null,[[0,2]],[[3,2]],[[2,3]],[[0,2]],null,[[1,2]],[[1,3]],[[0,1]],[[3,0]],[]];
  function edge(row,col,side,values) {
   let id,x,y,a,b;
   if(side===0){id=row*columns+col;x=col*cellX;y=row*cellY;a=values[0];b=values[1];}
   else if(side===1){id=horizontal+row*(columns+1)+col+1;x=(col+1)*cellX;y=row*cellY;a=values[1];b=values[2];}
   else if(side===2){id=(row+1)*columns+col;x=col*cellX;y=(row+1)*cellY;a=values[3];b=values[2];}
   else{id=horizontal+row*(columns+1)+col;x=col*cellX;y=row*cellY;a=values[0];b=values[3];}
   if(!nodes.has(id)){
    const fraction=clamp01((threshold-a)/(b-a||1));
    nodes.set(id,{x:x+((side===0||side===2)?fraction*cellX:0),y:y+((side===1||side===3)?fraction*cellY:0),neighbours:[]});
   }
   return id;
  }
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const offset=row*(columns+1)+col;
   const v=[field[offset],field[offset+1],field[offset+columns+2],field[offset+columns+1]];
   const code=(v[0]>=threshold?1:0)|(v[1]>=threshold?2:0)|(v[2]>=threshold?4:0)|(v[3]>=threshold?8:0);
   let pairs=table[code];
   if(code===5)pairs=(v[0]+v[1]+v[2]+v[3])/4>=threshold?[[0,1],[2,3]]:[[3,0],[1,2]];
   if(code===10)pairs=(v[0]+v[1]+v[2]+v[3])/4>=threshold?[[3,0],[1,2]]:[[0,1],[2,3]];
   for(const [a,b] of pairs){const first=edge(row,col,a,v),second=edge(row,col,b,v);nodes.get(first).neighbours.push(second);nodes.get(second).neighbours.push(first);}
  }
  const visited=new Set(),contours=[];
  for(const [start,node] of nodes){
   if(visited.has(start))continue;
   const points=[];let current=start,previous=-1;
   while(current!==undefined&&!visited.has(current)){
    const n=nodes.get(current);visited.add(current);points.push(n);
    const next=n.neighbours.find(id=>id!==previous);previous=current;current=next;
   }
   if(points.length>4)contours.push(points);
  }
  return contours;
 }
 function spline(points) {
  const n=points.length;ctx.moveTo(points[0].x,points[0].y);
  for(let i=0;i<n;i++){
   const a=points[(i+n-1)%n],b=points[i],c=points[(i+1)%n],d=points[(i+2)%n];
   ctx.bezierCurveTo(b.x+(c.x-a.x)/6,b.y+(c.y-a.y)/6,c.x-(d.x-b.x)/6,c.y-(d.y-b.y)/6,c.x,c.y);
  }
  ctx.closePath();
 }
 function render(elapsed) {
  if(!ctx)return;
  const w=viewportWidth,h=viewportHeight,time=elapsed/1000;
  const size=Math.min(w*.72,h*.78),growth=.78+.22*smooth(time/.58);
  const radii=[.18,.19,.20,.18,.16,.13];
  const phases=[0,1.4,3.1,4.8,2.5,5.7];
  const baseX=[-.40,-.22,.02,.23,.40,.06],baseY=[-.15,.08,-.16,.04,.15,.22];
  const blobs=radii.map((radius,i)=>({
   x:w*.5+size*(baseX[i]+.10*Math.sin(time*1.85+phases[i])),
   y:h*.49+size*(baseY[i]+.14*Math.cos(time*1.62+phases[i])),
   radius:size*radius*growth*(.93+.10*Math.sin(time*2.1+i)),
   aspect:.8+.35*Math.sin(time*1.25+i*.8)**2
  }));
  // One broad moving channel keeps the contour open and fluid, without dotted holes.
  const voids=[{x:w*.5+size*.14*Math.sin(time*1.8),y:h*.49+size*.10*Math.cos(time*1.6),radius:size*.23*growth}];
  for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
   const x=col*cellX,y=row*cellY;let value=0;
   for(const blob of blobs){const dx=x-blob.x,dy=(y-blob.y)/blob.aspect;value+=blob.radius*blob.radius/(dx*dx+dy*dy+1);}
   for(const hole of voids){const dx=x-hole.x,dy=y-hole.y;value-=hole.radius*hole.radius/(dx*dx+dy*dy+2);}
   field[row*(columns+1)+col]=value;
  }
  const contours=traceContours();
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#071f18';ctx.fillRect(0,0,w,h);
  ctx.save();ctx.translate(size*(.075+.025*Math.sin(time*1.6)),size*(.065+.025*Math.cos(time*1.7)));
  ctx.beginPath();contours.forEach(spline);ctx.fillStyle='#000000';ctx.fill('evenodd');ctx.restore();
  ctx.beginPath();contours.forEach(spline);ctx.fillStyle='#ee71aa';ctx.fill('evenodd');
  const reveal=smooth((time-2.12)/.98);
  if(reveal>0){
   const radius=Math.hypot(w,h)*.92*reveal,points=[];
   for(let i=0;i<64;i++){
    const angle=i/64*Math.PI*2;
    const r=radius*(1+.12*Math.sin(angle*3+time*2)+.075*Math.cos(angle*5-time*1.4));
    points.push({x:w*.5+Math.cos(angle)*r,y:h*.49+Math.sin(angle)*r});
   }
   ctx.save();ctx.globalCompositeOperation='destination-out';ctx.beginPath();spline(points);ctx.fill();ctx.restore();
  }
 }
 function startFluid() {
  if(!ctx)return;
  resizeCanvas();render(reduced.matches?850:0);
  overlay.style.background='transparent';
  if(reduced.matches)return;
  started=performance.now();
  function tick(now){
   if(!running)return;
   const elapsed=now-started;render(Math.min(duration,elapsed));
   if(elapsed<duration)frame=requestAnimationFrame(tick);
   else frame=0;
  }
  frame=requestAnimationFrame(tick);
 }
 function stopFluid(){cancelAnimationFrame(frame);frame=0;overlay.style.removeProperty('background');}
 addEventListener('resize',()=>{if(running&&ctx)resizeCanvas();},{passive:true});

 function finish({focus = true} = {}) {
  if (!running) { root.classList.remove('intro-active','intro-running','intro-reduced'); return; }
  clearTimeout(timer); running = false; stopFluid();
  root.classList.remove('intro-active','intro-running','intro-reduced');
  overlay.hidden = true; overlay.setAttribute('aria-hidden','true');
  stored.forEach(({node,inert}) => { node.inert = inert; }); stored = [];
  document.body.style.overflow = oldOverflow;
  document.body.style.paddingRight = oldPadding;
  try { sessionStorage.setItem(key,'1'); } catch {}
  if (focus && returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  returnFocus = null;
 }
 function play(automatic = false) {
  if (running) return;
  running = true;
  returnFocus = automatic ? null : document.activeElement;
  oldOverflow = document.body.style.overflow;
  oldPadding = document.body.style.paddingRight;
  const gap = Math.max(0, innerWidth - document.documentElement.clientWidth);
  const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
  document.body.style.overflow = 'hidden';
  if (gap) document.body.style.paddingRight = `${padding + gap}px`;
  stored = content.map(node => ({node,inert:node.inert}));
  stored.forEach(({node}) => { node.inert = true; });
  overlay.hidden = false; overlay.setAttribute('aria-hidden','false');
  root.classList.remove('intro-running','intro-reduced');
  root.classList.add('intro-active');
  if (reduced.matches) root.classList.add('intro-reduced');
  void overlay.offsetWidth;
  root.classList.add('intro-running');
  startFluid();
  skip.focus({preventScroll:true});
  // Finishes even when animationend is unavailable or the tab is backgrounded.
  timer = setTimeout(() => finish({focus:!automatic}), reduced.matches ? 240 : 3140);
 }
 replay.addEventListener('click', () => play(false));
 skip.addEventListener('click', () => finish());
 document.addEventListener('keydown', event => {
  if (!running) return;
  if (event.key === 'Escape') { event.preventDefault(); finish(); }
  else if (event.key === 'Tab') { event.preventDefault(); skip.focus({preventScroll:true}); }
 }, true);
 function preventScroll(event) {
  if (!running || event.ctrlKey || event.metaKey) return;
  event.preventDefault(); event.stopImmediatePropagation();
 }
 addEventListener('wheel', preventScroll, {capture:true,passive:false});
 addEventListener('touchmove', preventScroll, {capture:true,passive:false});
 reduced.addEventListener('change', event => { if (event.matches && running) finish(); });
 addEventListener('pagehide', () => finish({focus:false}));
 addEventListener('pageshow', event => { if (event.persisted) finish({focus:false}); });
 if (root.classList.contains('intro-active')) {
  if (reduced.matches) { root.classList.remove('intro-active'); try { sessionStorage.setItem(key,'1'); } catch {} }
  else play(true);
 }
})();
