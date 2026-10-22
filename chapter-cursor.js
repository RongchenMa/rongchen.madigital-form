(() => {
 'use strict';
 const cursor=document.querySelector('.chapter-cursor');
 const labels=[...document.querySelectorAll('.cursor-word')];
 const rows=[...document.querySelectorAll('.marquee-row')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let active=-1,frame=0,last=0,hideTimer=0,positioned=false;
 let x=0,y=0,tx=0,ty=0;
 let sizes=[];
 function measure(){sizes=labels.map(node=>({width:node.offsetWidth,height:node.offsetHeight}));}
 function clamp(value,min,max){return Math.max(min,Math.min(value,Math.max(min,max)));}
 function aim(event){
  if(active<0||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
  clearTimeout(hideTimer);
  const size=sizes[active];
  // Keep the artwork above-left of the pointer while preserving a clear viewport edge.
  tx=clamp(event.clientX+18,size.width*.86+16,innerWidth-size.width*.18-16);
  ty=clamp(event.clientY+8,size.height*1.12+size.width*.16+14,innerHeight-20);
  if(!positioned){x=tx;y=ty;positioned=true;cursor.style.transform=`translate3d(${x}px,${y}px,0)`;}
  wake();
 }
 function wake(){if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
 function tick(now){
  const dt=Math.min(48,Math.max(1,now-last));last=now;
  const ease=reduced.matches?1:1-Math.exp(-dt/65);
  x+=(tx-x)*ease;y+=(ty-y)*ease;
  cursor.style.transform=`translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0)`;
  if(active>=0&&Math.abs(tx-x)+Math.abs(ty-y)>.1)frame=requestAnimationFrame(tick);
  else frame=0;
 }
 function show(index,event){
  if(event.pointerType==='touch')return;
  clearTimeout(hideTimer);
  if(active!==index){labels.forEach((node,i)=>node.classList.toggle('is-active',i===index));active=index;}
  aim(event);
 }
 function hide(){
  clearTimeout(hideTimer);
  hideTimer=setTimeout(()=>{labels.forEach(node=>node.classList.remove('is-active'));active=-1;positioned=false;},55);
 }
 rows.forEach((row,index)=>{
  row.addEventListener('pointerenter',event=>show(index,event));
  row.addEventListener('pointermove',event=>{if(event.pointerType!=='touch'){if(active!==index)show(index,event);else aim(event);}});
  row.addEventListener('pointerleave',hide);
 });
 addEventListener('resize',measure,{passive:true});
 addEventListener('blur',hide);
 addEventListener('pagehide',()=>{clearTimeout(hideTimer);cancelAnimationFrame(frame);frame=0;active=-1;positioned=false;labels.forEach(node=>node.classList.remove('is-active'));});
 measure();
})();
