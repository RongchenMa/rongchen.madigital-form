(() => {
 'use strict';
 const root=document.documentElement;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const key='shadow-page-transition';
 let navigating=false, timer;
 function clean(){root.classList.remove('is-leaving','is-arriving','is-revealing');navigating=false;}
 if(root.classList.contains('is-arriving')) {
  try{sessionStorage.removeItem(key);}catch{}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   root.classList.add('is-revealing');
   timer=setTimeout(clean,900);
  }));
 }
 // Prefetch only on intent; normal links still work without JavaScript.
 document.addEventListener('pointerover',event=>{
  const a=event.target.closest('a[href]');
  if(!a||a.dataset.prefetched)return;
  const url=new URL(a.href,location.href);
  if(url.origin!==location.origin||url.pathname===location.pathname||!url.pathname.endsWith('.html'))return;
  a.dataset.prefetched='true';
  const link=document.createElement('link');link.rel='prefetch';link.href=url.href;document.head.append(link);
 },{passive:true});
 document.addEventListener('click',event=>{
  const a=event.target.closest('a[href]');
  if(!a||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||a.target==='_blank'||a.hasAttribute('download'))return;
  const url=new URL(a.href,location.href);
  if(url.origin!==location.origin||url.pathname===location.pathname||!url.pathname.endsWith('.html')||reduced.matches)return;
  event.preventDefault();if(navigating)return;
  clearTimeout(timer);clean();navigating=true;
  let color='#ffffff';
  if(url.pathname.endsWith('/about.html')){color='#313f2e';}
  else if(/\/chapters(?:-green)?\.html$/.test(url.pathname)){
   const tone=window.SHADOW_PALETTE.nextTone(url.pathname.endsWith('chapters-green.html'));
   try{sessionStorage.setItem('shadow-next-chapters-tone',tone);}catch{}
   color=window.SHADOW_PALETTE.colors[tone];
  }else if((document.body.classList.contains('chapters-page')||document.body.classList.contains('about-page')))color=getComputedStyle(document.body).backgroundColor;
  root.style.setProperty('--wipe-color',color);
  root.classList.add('is-leaving');
  timer=setTimeout(()=>{
   try{sessionStorage.setItem(key,JSON.stringify({path:url.pathname,color,time:Date.now()}));}catch{}
   location.assign(url.href);
   setTimeout(clean,2500);
  },660);
 });
 addEventListener('pageshow',event=>{if(event.persisted){clearTimeout(timer);clean();}});
})();
