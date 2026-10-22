(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function fitScene(scene){
  scene.querySelectorAll('.about-title-row').forEach(row=>{
   const text=row.firstElementChild;text.style.transform='none';text.style.fontSize=`${row.clientHeight/.86}px`;
   const width=text.getBoundingClientRect().width;if(width)text.style.transform=`scaleX(${row.clientWidth/width})`;
  });
 }
 document.querySelectorAll('.about-scene').forEach(scene=>{fitScene(scene);new ResizeObserver(()=>fitScene(scene)).observe(scene);document.fonts.ready.then(()=>fitScene(scene));});
 const hero=document.querySelector('.hero'),template=document.getElementById('about-destination');
 if(!hero||!template)return;
 let busy=false,overlay=null,safety=0;
 let originals=[];
 function clean(){
  clearTimeout(safety);originals.forEach(({node,value})=>{if(value)node.style.visibility=value;else node.style.removeProperty('visibility');});originals=[];
  overlay?.remove();overlay=null;busy=false;document.documentElement.classList.remove('about-is-morphing');document.querySelector('main')?.removeAttribute('aria-busy');
 }
 async function openAbout(url){
  if(busy)return;busy=true;
  let navigating=false;
  function go(){
   if(navigating)return;navigating=true;clearTimeout(safety);
   try{sessionStorage.removeItem('shadow-page-transition');sessionStorage.setItem('shadow-about-morph',JSON.stringify({path:url.pathname,time:Date.now()}));}catch{}
   location.assign(url.href);
  }
  try{
   const sources=[...hero.querySelectorAll('[data-morph-key]')].map(node=>({node,rect:node.getBoundingClientRect(),key:node.dataset.morphKey}));
   overlay=document.createElement('div');overlay.className='about-morph-overlay about-page';overlay.setAttribute('aria-hidden','true');overlay.append(template.content.cloneNode(true));document.body.append(overlay);
   const shell=overlay.querySelector('.about-target-shell');fitScene(shell.querySelector('.about-scene'));
   const animations=[],settled=[];
   for(const {node,rect,key} of sources){
    const target=shell.querySelector(`[data-morph-key="${key}"]`);if(!rect.width||!rect.height)continue;
    const exiting=key.startsWith('word-');if(!exiting&&!target)continue;
    const destination=target?.getBoundingClientRect();
    const piece=document.createElement('div');piece.className='about-morph-piece';piece.style.width=`${rect.width}px`;piece.style.height=`${rect.height}px`;
    const computed=getComputedStyle(node);piece.style.fontFamily=computed.fontFamily;piece.style.fontWeight=computed.fontWeight;piece.style.color=computed.color;piece.style.letterSpacing=getComputedStyle(node.firstElementChild).letterSpacing;piece.style.webkitTextStroke=computed.webkitTextStroke;piece.style.setProperty('--tilt',computed.getPropertyValue('--tilt'));
    const snapshot=node.cloneNode(true);snapshot.removeAttribute('id');snapshot.removeAttribute('data-morph-key');snapshot.removeAttribute('data-parallax');snapshot.querySelectorAll('[id]').forEach(child=>child.removeAttribute('id'));
    Object.assign(snapshot.style,{position:'absolute',left:'0',top:'0',right:'auto',bottom:'auto',width:'100%',height:'100%',margin:'0',transform:'none',visibility:'visible',lineHeight:'.81'});
    piece.append(snapshot);overlay.append(piece);
    originals.push({node,value:node.style.visibility});node.style.visibility='hidden';
    if(exiting){
     // A continuous upward departure: no mid-animation turn, shrink or return.
     const endY=Math.min(rect.top,-rect.height*1.7-80);
     animations.push(piece.animate([
      {transform:`translate3d(${rect.left}px,${rect.top}px,0)`},
      {transform:`translate3d(${rect.left}px,${endY}px,0)`}
     ],{duration:1250,easing:'cubic-bezier(.32,0,.2,1)',fill:'forwards'}));
    }else{
     const sx=destination.width/rect.width,sy=destination.height/rect.height;
     animations.push(piece.animate([
      {transform:`translate(${rect.left}px,${rect.top}px) scale(1,1)`},
      {transform:`translate(${destination.left}px,${destination.top}px) scale(${sx},${sy})`}
     ],{duration:1250,easing:'cubic-bezier(.22,.65,.25,1)',fill:'forwards'}));
     settled.push({target,piece});
    }
   }
   document.documentElement.classList.add('about-is-morphing');document.querySelector('main').setAttribute('aria-busy','true');
   animations.push(overlay.animate([{backgroundColor:'rgba(49,63,46,0)'},{backgroundColor:'#313f2e'}],{duration:1100,easing:'ease-in-out',fill:'forwards'}));
   animations.push(shell.querySelector('.site-header').animate([{opacity:0},{opacity:1}],{delay:180,duration:650,fill:'forwards'}));
   animations.push(shell.querySelector('.about-reading').animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'none'}],{delay:420,duration:830,easing:'cubic-bezier(.22,.65,.25,1)',fill:'forwards'}));
   shell.querySelector('footer').animate([{opacity:0},{opacity:1}],{delay:800,duration:450,fill:'forwards'});
   overlay.addEventListener('wheel',event=>{event.preventDefault();event.stopPropagation();},{passive:false});
   safety=setTimeout(go,2200);
   await Promise.all(animations.map(animation=>animation.finished));
   settled.forEach(({target,piece})=>{target.style.visibility='visible';piece.remove();});go();
  }catch{clean();go();}
 }
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank'||link.hasAttribute('download'))return;
  const url=new URL(link.href,location.href);if(url.origin!==location.origin||!url.pathname.endsWith('/about.html')||reduced.matches)return;
  event.preventDefault();openAbout(url);
 },{capture:true});
 addEventListener('pageshow',event=>{if(event.persisted)clean();});
})();
